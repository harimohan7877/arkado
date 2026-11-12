import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Razorpay from "razorpay";
import {
  hasRazorpayKeys,
  validateGatewayOrder,
  sanitizeInput,
} from "@/lib/payment-gateway";

export async function POST(req: NextRequest) {
  try {
    // 1. Feature Flag / Dormant Check
    if (!hasRazorpayKeys()) {
      return NextResponse.json(
        {
          error: "Payment gateway is currently dormant. Please use manual UPI / WhatsApp checkout.",
          is_gateway_active: false,
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const rawName = body.customerName;
    const rawEmail = body.customerEmail;
    const rawPhone = body.customerPhone || "";
    const products = body.products;
    const clientReportedTotal = typeof body.totalAmount === "number" ? body.totalAmount : undefined;

    const customerName = sanitizeInput(rawName);
    const customerEmail = sanitizeInput(rawEmail);
    const customerPhone = sanitizeInput(rawPhone);

    if (!customerName || !customerEmail || !products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Missing required checkout information." }, { status: 400 });
    }

    // 2. Anti-Price Tampering: Server-Authoritative Price Calculation.
    // validateGatewayOrder applies the SAME pricing law as POST /api/orders
    // (sale % + bundle discount from lib/sale-pricing.ts) — the old
    // validateOrderPrices() path returned raw catalog prices and would
    // have charged full price during a sale. Rejects on total mismatch.
    const itemsToValidate = products.map((p: any) => ({
      productId: String(p.id || p.productId),
      quantity: typeof p.quantity === "number" ? p.quantity : 1,
      title: typeof p.title === "string" ? p.title : undefined,
      bundle_items: Array.isArray(p.bundle_items)
        ? p.bundle_items.map((b: any) => String(typeof b === "string" ? b : b?.id || ""))
        : undefined,
    }));

    const validationResult = await validateGatewayOrder(itemsToValidate, clientReportedTotal);
    if (!validationResult.isValid) {
      return NextResponse.json({ error: validationResult.error || "Order validation failed." }, { status: 400 });
    }

    // Always use the authoritative server total, NEVER the client total
    const authoritativeAmount = validationResult.totalAmount;
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substring(2, 6)}`;

    const order = await razorpay.orders.create({
      amount: Math.round(authoritativeAmount * 100), // In paise
      currency: "INR",
      receipt: receiptId,
      notes: {
        customerName,
        customerEmail,
        customerPhone,
        productIds: validationResult.items.map((i) => i.id).join(","),
      },
    });

    if (!order || !order.id) {
      return NextResponse.json({ error: "Failed to create Razorpay order." }, { status: 500 });
    }

    const razorpayOrderId = order.id;

    // 3. Insert pending records into marketplace_orders.
    // One row per item (per-product analytics); every row carries the full
    // validated lines in `items` so the delivery email can resolve bundle
    // constituents from any single row, like POST /api/orders does.
    // Phone is embedded in customer_name ("Name (phone)"), same as the
    // UTR flow — there is no separate customer_phone column.
    const orderInserts = validationResult.items.map((item) => ({
      customer_name: customerPhone ? `${customerName} (${customerPhone})` : customerName,
      customer_email: customerEmail,
      product_id: item.id,
      course_title: item.title,
      amount: item.price,
      payment_status: "pending",
      razorpay_order_id: razorpayOrderId,
      delivery_status: "pending",
      items: validationResult.items,
    }));

    let { error: dbError } = await supabaseAdmin
      .from("marketplace_orders")
      .insert(orderInserts);

    if (dbError && /items/.test(dbError.message)) {
      // The items-column migration hasn't run yet — retry without it so the
      // order is still created (the bundle fallback in delivery covers it).
      console.warn("[create-marketplace-order] items column missing, retrying without it. Run supabase-migrations/20261017_order_items.sql");
      const fallbackInserts = orderInserts.map(({ items: _it, ...rest }) => rest);
      ({ error: dbError } = await supabaseAdmin
        .from("marketplace_orders")
        .insert(fallbackInserts));
    }

    if (dbError) {
      console.error("[create-marketplace-order] Supabase insert error:", dbError);
      return NextResponse.json({ error: "Database checkout failure." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrderId,
      amount: authoritativeAmount,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
    });
  } catch (err: unknown) {
    console.error("[create-marketplace-order] Unexpected error:", err);
    return NextResponse.json({ error: "Internal order creation error." }, { status: 500 });
  }
}
