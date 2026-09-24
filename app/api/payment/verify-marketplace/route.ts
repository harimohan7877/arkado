import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  hasRazorpayKeys,
  verifyRazorpayPaymentSignature,
} from "@/lib/payment-gateway";
import { getStoreData } from "@/lib/store-data";

export async function POST(req: NextRequest) {
  try {
    if (!hasRazorpayKeys()) {
      return NextResponse.json({ error: "Payment gateway is not active." }, { status: 503 });
    }

    const { orderId, paymentId, signature } = await req.json();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing verification credentials." }, { status: 400 });
    }

    // 1. Timing-Safe Cryptographic Signature Verification (Anti-Timing Attacks)
    const isValidSignature = verifyRazorpayPaymentSignature(orderId, paymentId, signature);
    if (!isValidSignature) {
      console.warn(`[SECURITY ALERT] Invalid payment signature attempt! Order: ${orderId}, Payment: ${paymentId}`);
      return NextResponse.json({ success: false, error: "Invalid payment signature." }, { status: 400 });
    }

    // 2. Idempotency Check: Fetch existing order from marketplace_orders
    const { data: existingOrders, error: fetchErr } = await supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .eq("razorpay_order_id", orderId);

    if (fetchErr || !existingOrders || existingOrders.length === 0) {
      console.error("[verify-marketplace] Order not found in database:", orderId);
      return NextResponse.json({ error: "Order record not found." }, { status: 404 });
    }

    // If already marked as paid (e.g. webhook processed it first), return success idempotently
    const alreadyPaid = existingOrders.every((o) => o.payment_status === "paid");
    if (!alreadyPaid) {
      // 3. Mark payment as 'paid' in marketplace_orders
      const { error: updateErr } = await supabaseAdmin
        .from("marketplace_orders")
        .update({
          payment_status: "paid",
          razorpay_payment_id: paymentId,
        })
        .eq("razorpay_order_id", orderId);

      if (updateErr) {
        console.error("[verify-marketplace] Database status update failed:", updateErr);
        return NextResponse.json({ error: "Failed to update payment status in database." }, { status: 500 });
      }
    }

    // 4. Secure Delivery Link Generation: Look up drive_url for purchased products
    const courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
    const courseMap = new Map<string, any>();
    for (const c of courses) {
      if (c.id) courseMap.set(c.id, c);
      if (c.slug) courseMap.set(c.slug, c);
    }

    const deliveredItems = existingOrders.map((ord) => {
      const course = courseMap.get(ord.product_id);
      return {
        productId: ord.product_id,
        title: course?.title || ord.product_id,
        drive_url: course?.drive_url || "https://drive.google.com",
      };
    });

    return NextResponse.json({
      success: true,
      orderId,
      paymentId,
      deliveredItems,
    });
  } catch (err: unknown) {
    console.error("[verify-marketplace] Unexpected error:", err);
    return NextResponse.json({ error: "Internal verification error." }, { status: 500 });
  }
}
