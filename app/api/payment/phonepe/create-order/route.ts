import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin } from "@/lib/supabase";
import { getEffectiveTermsText } from "@/lib/legal";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import {
  sanitizeInput,
  validateCheckoutOrder,
  generateOrderId,
  validateTermsAcceptance,
  insertMarketplaceOrderWithColumnFallback,
} from "@/lib/checkout";
import {
  hasPhonePeKeys,
  createPhonePePayment,
  getSiteUrl,
} from "@/lib/phonepe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

function writeOrders(orders: unknown[]) {
  return setStoreData("orders", "data/orders.json", orders);
}

/**
 * Create a PhonePe Standard Checkout order.
 *
 * Flow: validate input + terms → server-recompute prices (never trust the
 * client total) → create the order row (payment pending) → ask PhonePe
 * for the hosted payment page → return its URL. The frontend navigates
 * the customer's browser to that URL (client-side navigation — PhonePe
 * validates the referrer header, so a server 302 can fail).
 *
 * If the customer is logged in (Authorization: Bearer <supabase token>),
 * the order is linked to their account (user_id + verified email) so it
 * shows in their dashboard. Guests check out with the form email.
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasPhonePeKeys()) {
      return NextResponse.json(
        { error: "Payment is not available right now. Please try again later." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const rawName = body.name;
    const rawPhone = body.phone;
    const rawEmail = body.email;
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const clientAmount = body.totalAmount;
    const rawVisitorId = body.visitor_id;
    const rawSessionId = body.session_id;
    const rawUtmSource = body.utm_source;

    const cleanName = sanitizeInput(rawName);
    const cleanPhone = sanitizeInput(rawPhone).replace(/\D/g, "").slice(-10);
    const cleanEmail = sanitizeInput(rawEmail).toLowerCase();
    const normAttrKey = (v: unknown): string | null => {
      const s = sanitizeInput(typeof v === "string" ? v : null);
      if (!s || s === "anon") return null;
      return s;
    };
    const attrVisitorId = normAttrKey(rawVisitorId);
    const attrSessionId = normAttrKey(rawSessionId);
    const attrUtmSource = normAttrKey(rawUtmSource);

    // Optional logged-in linking: verify the Supabase session server-side.
    // Never trust a client-sent user_id.
    let linkedUserId: string | null = null;
    let verifiedEmail: string | null = null;
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";
    if (accessToken) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
        if (user) {
          linkedUserId = user.id;
          verifiedEmail = (user.email || "").toLowerCase() || null;
        }
      } catch {
        // Invalid/expired token — fall through to guest checkout.
      }
    }
    // A logged-in customer's order belongs to their account email.
    const finalEmail = verifiedEmail || cleanEmail;

    if (!cleanName) {
      return NextResponse.json(
        { success: false, error: "Full name is required." },
        { status: 400 }
      );
    }
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        { success: false, error: "A valid 10-digit Indian mobile number is required." },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!finalEmail || !emailRegex.test(finalEmail)) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const termsError = validateTermsAcceptance(body.terms_accepted);
    if (termsError) {
      return NextResponse.json(
        { success: false, error: termsError },
        { status: 400 }
      );
    }

    // Snapshot which Terms version the customer agreed to.
    const termsAcceptedAt = new Date().toISOString();
    let termsVersion = "default";
    try {
      const settingsData = await getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS) as typeof DEFAULT_SETTINGS & {
        policies?: { terms_of_service?: string };
      };
      const termsText = getEffectiveTermsText(settingsData?.policies);
      termsVersion = crypto.createHash("sha256").update(termsText, "utf8").digest("hex").slice(0, 12);
    } catch {
      // Non-fatal: the acceptance itself is what matters.
    }

    // Server-authoritative price validation (sale % + bundle discount).
    const validation = await validateCheckoutOrder(
      rawItems.map((it: any) => ({
        productId: String(it.id || it.productId || ""),
        quantity: 1,
        title: it.title,
        bundle_items: Array.isArray(it.bundle_items) ? it.bundle_items : undefined,
      })),
      clientAmount
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Order items could not be verified. Please try again." },
        { status: 400 }
      );
    }
    const authoritativeAmount = validation.totalAmount;
    const matchedProduct = validation.items[0];
    const secureDriveUrl = matchedProduct?.drive_url || "";

    // Collision-resistant merchant order id — also the PhonePe merchantOrderId.
    const existingOrdersForIdCheck = await readOrders();
    const existingIds = new Set(
      existingOrdersForIdCheck.flatMap((o: { order_id?: string; id?: string }) => [o.order_id, o.id].filter(Boolean))
    );
    let merchantOrderId = generateOrderId();
    for (let attempts = 0; attempts < 10 && existingIds.has(merchantOrderId); attempts++) {
      merchantOrderId = generateOrderId();
    }

    const newOrder = {
      id: merchantOrderId,
      order_id: merchantOrderId,
      name: cleanName,
      customer_name: cleanName,
      delivery_mode: "both",
      phone: cleanPhone,
      customer_phone: cleanPhone,
      email: finalEmail,
      customer_email: finalEmail,
      course_id: matchedProduct?.id || "",
      course_title: matchedProduct?.title || "Course Bundle",
      exam_name: matchedProduct?.title || "Course Bundle",
      amount: authoritativeAmount,
      drive_url: secureDriveUrl,
      items: validation.items,
      status: "pending",
      delivery_status: "pending",
      payment_status: "pending",
      gateway: "phonepe",
      transaction_id: null,
      user_id: linkedUserId,
      terms_accepted: true,
      terms_accepted_at: termsAcceptedAt,
      terms_version: termsVersion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Primary storage: Supabase marketplace_orders. The gateway-order
    // column is still named razorpay_order_id (legacy) — it now holds the
    // PhonePe merchant order id. Fallback retries keep the order alive
    // when an optional column migration hasn't run yet.
    try {
      const basePayload: Record<string, any> = {
        customer_name: `${cleanName} (${cleanPhone})`,
        customer_email: finalEmail,
        product_id: matchedProduct?.id || "",
        course_title: matchedProduct?.title || "Course Bundle",
        drive_url: secureDriveUrl,
        amount: authoritativeAmount,
        payment_status: "pending",
        razorpay_order_id: merchantOrderId,
        razorpay_payment_id: null,
        delivery_status: "pending",
        terms_accepted: true,
        terms_accepted_at: termsAcceptedAt,
        terms_version: termsVersion,
        visitor_id: attrVisitorId,
        session_id: attrSessionId,
        utm_source: attrUtmSource,
        items: validation.items,
        ...(linkedUserId ? { user_id: linkedUserId } : {}),
      };

      // Strip-and-retry LOOP (lib/checkout.ts): PostgREST reports ONE
      // missing column per failed insert (the first in payload order), so
      // a fixed-order if-chain can miss a group whose check already ran
      // (e.g. course_title fails first, terms next). The loop strips the
      // group named in each error and retries until success or nothing
      // strippable remains.
      const { error: insertErr, strippedGroups } =
        await insertMarketplaceOrderWithColumnFallback(
          async (row) => {
            const { error } = await supabaseAdmin
              .from("marketplace_orders")
              .insert(row);
            return { error };
          },
          basePayload
        );
      if (insertErr) {
        console.error(
          "[phonepe-create] marketplace_orders insert FAILED after stripping:",
          strippedGroups.join(", ") || "none",
          "—",
          insertErr.message,
          "order:",
          merchantOrderId
        );
      }
    } catch (dbErr) {
      console.warn("[phonepe-create] marketplace_orders insert warning:", dbErr);
    }

    // Dual-write backup: JSON order store.
    const orders = await readOrders();
    orders.unshift(newOrder);
    await writeOrders(orders);

    // VERIFY persistence — never start a payment for an order we can't find.
    let persisted = false;
    try {
      const checkOrders = await readOrders();
      persisted = checkOrders.some(
        (o: { order_id?: string; id?: string }) =>
          o.order_id === merchantOrderId || o.id === merchantOrderId
      );
    } catch { /* verification best-effort */ }
    if (!persisted) {
      console.error(`[phonepe-create] CRITICAL: order ${merchantOrderId} NOT retrievable after write.`);
      return NextResponse.json(
        { success: false, error: "Order save failed. Please try again." },
        { status: 500 }
      );
    }

    // Ask PhonePe for the hosted payment page.
    const redirectUrl = `${getSiteUrl()}/payment/success?orderId=${merchantOrderId}`;
    let payResult;
    try {
      payResult = await createPhonePePayment(
        merchantOrderId,
        authoritativeAmount,
        redirectUrl
      );
    } catch (err: unknown) {
      console.error("[phonepe-create] PhonePe pay failed:", err);
      return NextResponse.json(
        {
          success: false,
          error: "Could not start the payment. Please check your connection and try again.",
          merchantOrderId,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl: payResult.redirectUrl,
      merchantOrderId,
      amount: authoritativeAmount,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
