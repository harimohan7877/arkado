import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter } from "@/lib/supabase";
import { canTransitionOrderStatus } from "@/lib/checkout";
import { deliverOrder } from "@/lib/deliver-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

function writeOrders(data: unknown[]) {
  return setStoreData("orders", "data/orders.json", data);
}

/**
 * Admin send-link — the manual-delivery step of the PhonePe flow.
 *
 * For a PAID order whose Drive link is pending (delivery_status
 * `pending_link`): the admin pastes the Drive link, this saves it on the
 * order and sends the delivery email at once (deliverOrder).
 *
 * Resend mode (`{ resend: true }`) re-sends the delivery email for an
 * already-delivered order without changing its state.
 *
 * Never sends links for unpaid or failed orders.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    let body: { drive_url?: string; resend?: boolean } = {};
    try {
      body = await req.json();
    } catch {}
    const isResend = body.resend === true;
    const pastedUrl = String(body.drive_url || "").trim();

    const orders = await readOrders();
    let orderIndex = orders.findIndex(
      (o: Record<string, unknown>) => o.id === id || o.order_id === id
    );

    let order = orderIndex !== -1 ? orders[orderIndex] : null;

    // If not found in JSON, search Supabase marketplace_orders
    if (!order) {
      const filter = buildOrderQueryFilter(id);
      const { data: dbOrder } = await supabaseAdmin
        .from("marketplace_orders")
        .select("*")
        .or(filter)
        .limit(1)
        .maybeSingle();

      if (dbOrder) {
        order = {
          id: dbOrder.razorpay_order_id || dbOrder.id,
          order_id: dbOrder.razorpay_order_id || dbOrder.id,
          customer_name: dbOrder.customer_name || "Student",
          name: dbOrder.customer_name || "Student",
          customer_email: dbOrder.customer_email || "",
          email: dbOrder.customer_email || "",
          customer_phone: dbOrder.customer_phone || "",
          phone: dbOrder.customer_phone || "",
          amount: Number(dbOrder.amount) || 0,
          course_id: dbOrder.product_id || "",
          course_title: dbOrder.course_title || "Course Bundle",
          drive_url: dbOrder.drive_url || "",
          items: Array.isArray(dbOrder.items) ? dbOrder.items : [],
          delivery_mode: dbOrder.delivery_mode || "both",
          payment_status: dbOrder.payment_status || "pending",
          delivery_status: dbOrder.delivery_status || "pending",
          created_at: dbOrder.created_at || new Date().toISOString(),
        };
        orders.unshift(order);
        orderIndex = 0;
      }
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const payStatus = (order.payment_status || "pending").toLowerCase();
    const delStatus = (order.delivery_status || order.status || "pending").toLowerCase();

    // State guard: never send links for unpaid/failed orders. Resend
    // requires a delivered order; sending requires a paid order that can
    // still move to delivered (pending or pending_link).
    if (isResend) {
      if (payStatus !== "paid" || delStatus !== "delivered") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot re-send email: order is not delivered (payment: ${order.payment_status || "pending"}, delivery: ${order.delivery_status || "pending"}).`,
          },
          { status: 409 }
        );
      }
    } else {
      if (payStatus !== "paid") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot send the link: order is not paid (payment: ${order.payment_status || "pending"}).`,
          },
          { status: 409 }
        );
      }
      if (!canTransitionOrderStatus(delStatus, "delivered")) {
        return NextResponse.json(
          {
            success: false,
            error: `Order cannot be delivered from its current state (delivery: ${order.delivery_status || "pending"}).`,
          },
          { status: 409 }
        );
      }
    }

    // A Drive link is required unless the order's own items already carry
    // per-kit links (bundle with links stored at purchase time).
    const hasKitLinks =
      Array.isArray(order.items) &&
      order.items.some((li: any) =>
        Array.isArray(li.bundle_items)
          ? li.bundle_items.some((k: any) => k.drive_url)
          : Boolean(li.drive_url)
      );
    const effectiveDriveUrl = pastedUrl || String(order.drive_url || "").trim();
    if (!isResend && !effectiveDriveUrl && !hasKitLinks) {
      return NextResponse.json(
        { success: false, error: "Please paste the Google Drive link for this order." },
        { status: 400 }
      );
    }
    if (pastedUrl && !/^https?:\/\/.{10,}$/.test(pastedUrl)) {
      return NextResponse.json(
        { success: false, error: "Please paste a valid Drive link (https://...)." },
        { status: 400 }
      );
    }

    // Save the pasted link on the order (JSON + Supabase) before delivering.
    if (pastedUrl && !isResend) {
      order.drive_url = pastedUrl;
      if (orderIndex !== -1) {
        orders[orderIndex] = { ...orders[orderIndex], drive_url: pastedUrl };
        await writeOrders(orders);
      }
      try {
        const filter = buildOrderQueryFilter(id);
        await supabaseAdmin
          .from("marketplace_orders")
          .update({ drive_url: pastedUrl })
          .or(filter);
      } catch (err) {
        console.warn("[send-link] Supabase drive_url sync failed:", err);
      }
    }

    const recipientEmail = (order.customer_email || order.email || "").trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return NextResponse.json(
        { error: "Order does not have a valid customer email address." },
        { status: 400 }
      );
    }

    const delivery = await deliverOrder(order, {
      customDriveUrl: effectiveDriveUrl || undefined,
      resend: isResend,
    });

    if (!delivery.ok) {
      return NextResponse.json(
        { success: false, error: delivery.error },
        { status: delivery.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: isResend
        ? `Course notes re-sent to ${recipientEmail}`
        : `Course notes successfully sent to ${recipientEmail}`,
      messageId: delivery.messageId,
      order: delivery.order,
    });
  } catch (err: unknown) {
    console.error("[send-link] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to send the link",
      },
      { status: 500 }
    );
  }
}
