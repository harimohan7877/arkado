import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import Razorpay from "razorpay";
import {
  hasRazorpayKeys,
  validateOrderPrices,
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

    // 2. Anti-Price Tampering: Server-Authoritative Price Calculation
    // Map items to { productId, quantity }
    const itemsToValidate = products.map((p: any) => ({
      productId: String(p.id || p.productId),
      quantity: typeof p.quantity === "number" ? p.quantity : 1,
    }));

    const validationResult = await validateOrderPrices(itemsToValidate, clientReportedTotal);
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

    // 3. Insert pending records into marketplace_orders
    const orderInserts = validationResult.items.map((item) => ({
      customer_name: customerName,
      customer_email: customerEmail,
      product_id: item.id,
      amount: item.price,
      payment_status: "pending",
      razorpay_order_id: razorpayOrderId,
      delivery_status: "pending",
    }));

    const { error: dbError } = await supabaseAdmin
      .from("marketplace_orders")
      .insert(orderInserts);

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
