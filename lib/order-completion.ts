/**
 * PhonePe order completion — the single place that turns a proven PhonePe
 * payment into a delivered order.
 *
 * Used by: the PhonePe webhook (server-to-server, primary), the status
 * route (success page + track-order re-check), and the admin send-link
 * flow indirectly (via deliverOrder).
 *
 * Rules:
 * - Payment truth comes ONLY from PhonePe's Order Status API — never from
 *   the browser redirect or the webhook payload alone. The webhook is the
 *   trigger; the status API is the verdict.
 * - Idempotent: a paid order is never emailed twice. Re-running completion
 *   on a paid order just returns its current delivery state.
 * - Delivery runs exactly once: before any email, deliverPaidOrder takes
 *   an atomic claim (claimDelivery) — a conditional Supabase update that
 *   only one concurrent runner (webhook vs status check) can win.
 * - If the kits' Drive links exist, delivery is instant (deliverOrder:
 *   email + delivered status). If NO link exists for any kit, the order
 *   becomes `pending_link` and the customer gets the "within 1 hour"
 *   email instead — the admin adds the link from Orders → Link Pending.
 */

import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter } from "@/lib/supabase";
import { getPhonePeOrderStatus } from "@/lib/phonepe";
import {
  deliverOrder,
  findMissingKitTitles,
  normalizeGatewayRows,
  resolveDeliverableKits,
  sendPendingLinkEmail,
  type DeliverableKit,
  type NormalizedOrder,
} from "@/lib/deliver-order";
import { notifyAdminNewOrder } from "@/lib/notify";

export interface CompletionResult {
  ok: boolean;
  state: "COMPLETED" | "FAILED" | "PENDING" | "UNKNOWN";
  orderId: string;
  alreadyPaid?: boolean;
  pendingLink?: boolean;
  deliveredItems?: DeliverableKit[];
  transactionId?: string;
  error?: string;
}

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

function writeOrders(data: unknown[]) {
  return setStoreData("orders", "data/orders.json", data);
}

/** Load the order by merchant order id — Supabase first, JSON backup. */
async function loadOrder(
  merchantOrderId: string
): Promise<{ order: NormalizedOrder; fromSupabase: boolean } | null> {
  try {
    const { data: rows } = await supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .eq("razorpay_order_id", merchantOrderId);
    if (Array.isArray(rows) && rows.length > 0) {
      const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
      return { order: normalizeGatewayRows(rows, courses), fromSupabase: true };
    }
  } catch (err) {
    console.warn("[order-completion] Supabase order lookup failed:", err);
  }

  try {
    const orders = await readOrders();
    const found = orders.find(
      (o: Record<string, unknown>) =>
        o.order_id === merchantOrderId || o.id === merchantOrderId
    );
    if (found) {
      return { order: found as NormalizedOrder, fromSupabase: false };
    }
  } catch (err) {
    console.warn("[order-completion] JSON order lookup failed:", err);
  }

  return null;
}

/** Write payment/delivery fields to both stores (best-effort per store). */
async function syncOrderState(
  orderId: string,
  patch: Record<string, unknown>
): Promise<void> {
  try {
    const orders = await readOrders();
    const idx = orders.findIndex(
      (o: Record<string, unknown>) => o.order_id === orderId || o.id === orderId
    );
    if (idx !== -1) {
      orders[idx] = {
        ...orders[idx],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      await writeOrders(orders);
    }
  } catch (err) {
    console.warn("[order-completion] JSON state sync failed:", err);
  }

  try {
    // `transaction_id` is a JSON-store field only — the Supabase column
    // is named razorpay_payment_id (legacy). Sending it would fail the
    // whole update, so strip it for the Supabase write.
    const { transaction_id: _jsonOnlyTxnId, ...sbPatch } = patch;
    const { error } = await supabaseAdmin
      .from("marketplace_orders")
      .update(sbPatch)
      .or(buildOrderQueryFilter(orderId));
    if (error) console.warn("[order-completion] Supabase state sync failed:", error.message);
  } catch (err) {
    console.warn("[order-completion] Supabase state sync exception:", err);
  }
}

/**
 * Atomic delivery claim — the duplicate-email guard.
 *
 * Exactly one concurrent runner may deliver an order. The conditional
 * Supabase update (delivery_status != 'delivered') is atomic: the
 * winner's update matches the order's rows, every later runner matches
 * zero rows. The claim deliberately sets 'delivered' (an existing
 * state-machine value — no new status was introduced) BEFORE any email
 * is sent; deliverPaidOrder overwrites it with 'pending_link' when
 * delivery cannot complete, releasing the claim.
 *
 * `client` is injectable for tests; production always uses supabaseAdmin.
 */
export async function claimDelivery(
  orderId: string,
  fromSupabase: boolean,
  client: typeof supabaseAdmin = supabaseAdmin
): Promise<{ claimed: boolean; alreadyDelivered: boolean; error?: string }> {
  if (!fromSupabase) {
    // JSON-only order (Supabase lookup failed): there are no rows to
    // claim atomically. The in-memory delivered guards still apply; the
    // residual race for this rare path is documented, not hidden.
    return { claimed: true, alreadyDelivered: false };
  }
  try {
    const { data, error } = await client
      .from("marketplace_orders")
      .update({ delivery_status: "delivered" })
      .or(buildOrderQueryFilter(orderId))
      .neq("delivery_status", "delivered")
      .select("razorpay_order_id");
    if (error) {
      return { claimed: false, alreadyDelivered: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { claimed: false, alreadyDelivered: true };
    }
    return { claimed: true, alreadyDelivered: false };
  } catch (err) {
    return {
      claimed: false,
      alreadyDelivered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Deliver a paid order: instant email when links exist, else pending_link. */
async function deliverPaidOrder(
  order: NormalizedOrder,
  fromSupabase: boolean
): Promise<{
  pendingLink: boolean;
  deliveredItems: DeliverableKit[];
  claimError?: string;
}> {
  const orderId = String(order.order_id || order.id || "");

  // Atomic delivery claim — FIRST, before any email is sent. The webhook
  // and the status check can run completePhonePeOrder concurrently; both
  // would otherwise read "pending", both email, both mark delivered.
  // The conditional update is the single atomic step: exactly one
  // runner's update matches rows (delivery_status != 'delivered'), the
  // loser gets zero rows and sends nothing. The claim sets 'delivered'
  // up front; if delivery then fails (no links / email error) the code
  // below overwrites it with 'pending_link', releasing the claim so the
  // admin can re-send. Crash window: if the process dies between the
  // claim and the email, the order reads 'delivered' but no email went
  // out — the customer still sees the links on the success page and in
  // the dashboard, and the admin can re-send from Orders.
  const claim = await claimDelivery(orderId, fromSupabase);
  if (!claim.claimed) {
    if (claim.error) {
      return { pendingLink: true, deliveredItems: [], claimError: claim.error };
    }
    // Lost the race — another runner owns delivery (or finished it).
    // Reload and report the current state; send NOTHING here.
    const fresh = await loadOrder(orderId);
    if (fresh) {
      const freshDel = String(
        fresh.order.delivery_status || fresh.order.status || "pending"
      ).toLowerCase();
      if (freshDel === "delivered") {
        const courses = await getStoreData<Array<Record<string, unknown>>>(
          "courses",
          "data/courses.json",
          []
        );
        const kits = resolveDeliverableKits(
          fresh.order,
          courses,
          String(fresh.order.drive_url || "")
        );
        return { pendingLink: false, deliveredItems: kits };
      }
      if (freshDel === "pending_link") {
        return { pendingLink: true, deliveredItems: [] };
      }
    }
    return { pendingLink: true, deliveredItems: [] };
  }

  const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
  const kits = resolveDeliverableKits(order, courses, String(order.drive_url || ""));

  // Partial bundle: some kits linked, some not. Never deliver half a
  // bundle and mark it delivered — same 1-hour promise as no links.
  const missingKitTitles = findMissingKitTitles(order, courses);
  if (kits.length > 0 && missingKitTitles.length > 0) {
    console.warn(
      "[order-completion] Partial bundle — holding for missing kits:",
      missingKitTitles.join(", ")
    );
    await syncOrderState(String(order.order_id || order.id || ""), {
      payment_status: "paid",
      delivery_status: "pending_link",
    });
    const mailed = await sendPendingLinkEmail(order);
    if (!mailed.ok) {
      console.error("[order-completion] pending-link email failed:", mailed.error);
    }
    return { pendingLink: true, deliveredItems: [] };
  }

  if (kits.length > 0) {
    const delivery = await deliverOrder(order);
    if (!delivery.ok) {
      // Payment is proven — a failed email must NOT un-pay the order.
      // Mark it pending_link so the admin sees it and can re-send.
      console.error("[order-completion] deliverOrder failed:", delivery.error);
      await syncOrderState(String(order.order_id || order.id || ""), {
        payment_status: "paid",
        delivery_status: "pending_link",
      });
      return { pendingLink: true, deliveredItems: kits };
    }
    return { pendingLink: false, deliveredItems: delivery.kits };
  }

  // Paid, but no Drive link exists for any kit yet — the 1-hour promise.
  await syncOrderState(String(order.order_id || order.id || ""), {
    payment_status: "paid",
    delivery_status: "pending_link",
  });
  const mailed = await sendPendingLinkEmail(order);
  if (!mailed.ok) {
    console.error("[order-completion] pending-link email failed:", mailed.error);
  }
  return { pendingLink: true, deliveredItems: [] };
}

export async function completePhonePeOrder(
  merchantOrderId: string
): Promise<CompletionResult> {
  const loaded = await loadOrder(merchantOrderId);
  if (!loaded) {
    return {
      ok: false,
      state: "UNKNOWN",
      orderId: merchantOrderId,
      error: "Order not found.",
    };
  }

  const { order, fromSupabase } = loaded;
  const orderId = String(order.order_id || order.id || merchantOrderId);
  const payStatus = String(order.payment_status || "pending").toLowerCase();
  const delStatus = String(order.delivery_status || order.status || "pending").toLowerCase();

  // Already paid — idempotent: just report the current delivery state.
  if (payStatus === "paid") {
    if (delStatus === "delivered") {
      const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
      const kits = resolveDeliverableKits(order, courses, String(order.drive_url || ""));
      return {
        ok: true,
        state: "COMPLETED",
        orderId,
        alreadyPaid: true,
        deliveredItems: kits,
      };
    }
    if (delStatus === "pending_link") {
      return {
        ok: true,
        state: "COMPLETED",
        orderId,
        alreadyPaid: true,
        pendingLink: true,
      };
    }
    // Paid but delivery never ran (e.g. email failed mid-flight) — run it now.
    const done = await deliverPaidOrder(order, fromSupabase);
    if (done.claimError) {
      return { ok: false, state: "UNKNOWN", orderId, error: done.claimError };
    }
    return {
      ok: true,
      state: "COMPLETED",
      orderId,
      alreadyPaid: true,
      pendingLink: done.pendingLink,
      deliveredItems: done.deliveredItems,
    };
  }

  // Not paid yet — ask PhonePe (the only truth).
  let status;
  try {
    status = await getPhonePeOrderStatus(merchantOrderId);
  } catch (err) {
    console.error("[order-completion] PhonePe status check failed:", err);
    return {
      ok: false,
      state: "UNKNOWN",
      orderId,
      error: "Could not confirm the payment with PhonePe. Please try again in a moment.",
    };
  }

  if (status.state === "FAILED") {
    await syncOrderState(orderId, { payment_status: "failed" });
    return { ok: true, state: "FAILED", orderId };
  }

  if (status.state !== "COMPLETED") {
    return { ok: true, state: "PENDING", orderId };
  }

  // COMPLETED — record the payment, then deliver.
  // transaction_id is for the JSON store (admin reads it from there);
  // Supabase keeps the legacy razorpay_payment_id column (stripped
  // inside syncOrderState so its update can't fail on the extra key).
  await syncOrderState(orderId, {
    payment_status: "paid",
    ...(status.transactionId
      ? {
          razorpay_payment_id: status.transactionId,
          transaction_id: status.transactionId,
        }
      : {}),
  });

  // Admin notification (paid orders only — fire-and-forget).
  notifyAdminNewOrder({
    order_id: orderId,
    name: String(order.customer_name || order.name || "Student"),
    email: String(order.customer_email || order.email || ""),
    phone: String(order.customer_phone || order.phone || ""),
    course_title: String(order.course_title || "Course Bundle"),
    amount: Number(order.amount) || 0,
    delivery_mode: String(order.delivery_mode || "both"),
    transaction_id: status.transactionId,
  }).catch((err) => console.error("[order-completion] admin notify failed:", err));

  const done = await deliverPaidOrder(
    {
      ...order,
      payment_status: "paid",
    },
    fromSupabase
  );
  if (done.claimError) {
    return { ok: false, state: "UNKNOWN", orderId, error: done.claimError };
  }
  return {
    ok: true,
    state: "COMPLETED",
    orderId,
    pendingLink: done.pendingLink,
    deliveredItems: done.deliveredItems,
    transactionId: status.transactionId,
  };
}
