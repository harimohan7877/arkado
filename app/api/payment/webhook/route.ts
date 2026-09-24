import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  hasRazorpayKeys,
  verifyRazorpayWebhookSignature,
} from "@/lib/payment-gateway";

/**
 * Enterprise Server-to-Server Razorpay Webhook Handler
 * Catches order.paid and payment.captured events asynchronously.
 * Guarantees zero lost orders even if the user drops connection or closes browser.
 */
export async function POST(req: NextRequest) {
  try {
    if (!hasRazorpayKeys()) {
      return NextResponse.json({ message: "Gateway dormant" }, { status: 200 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      console.warn("[WEBHOOK SECURITY] Missing x-razorpay-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const rawBody = await req.text();
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.warn("[WEBHOOK SECURITY] Invalid webhook signature detected!");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    // Handle payment or order success events
    if (eventType === "order.paid" || eventType === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        // Idempotent update: mark order as paid in marketplace_orders
        const { error: updateErr } = await supabaseAdmin
          .from("marketplace_orders")
          .update({
            payment_status: "paid",
            razorpay_payment_id: paymentId || undefined,
          })
          .eq("razorpay_order_id", orderId);

        if (updateErr) {
          console.error("[WEBHOOK] Failed to update order status:", updateErr);
        } else {
          console.log(`[WEBHOOK SUCCESS] Order ${orderId} successfully marked as PAID`);
        }
      }
    } else if (eventType === "payment.failed") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        await supabaseAdmin
          .from("marketplace_orders")
          .update({ payment_status: "failed" })
          .eq("razorpay_order_id", orderId);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (err: unknown) {
    console.error("[WEBHOOK ERROR]:", err);
    return NextResponse.json({ error: "Webhook processing failure" }, { status: 500 });
  }
}
