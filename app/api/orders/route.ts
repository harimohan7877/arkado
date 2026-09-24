import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  sanitizeInput,
  validateUtrSubmission,
  validateOrderPrices,
} from "@/lib/payment-gateway";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

async function writeOrders(orders: unknown[]) {
  return setStoreData("orders", "data/orders.json", orders);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await readOrders();
  orders.sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return NextResponse.json({ success: true, orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawName = body.name;
    const rawPhone = body.phone;
    const rawEmail = body.email;
    const rawUtr = body.utr;
    const rawCourseId = body.course_id;
    const rawCourseTitle = body.course_title;
    const delivery_mode = body.delivery_mode;
    const clientAmount = body.amount;

    // 1. Input Sanitization (Anti-XSS / Script Injection)
    const cleanName = sanitizeInput(rawName);
    const cleanPhone = sanitizeInput(rawPhone);
    const cleanEmail = sanitizeInput(rawEmail);
    const cleanUtr = sanitizeInput(rawUtr);
    const course_id = sanitizeInput(rawCourseId);

    if (!cleanName || !course_id) {
      return NextResponse.json(
        { success: false, error: "Name and course are required." },
        { status: 400 }
      );
    }

    const cleanMode = (delivery_mode || "whatsapp").toLowerCase().trim();
    const allowedModes = ["gmail", "whatsapp", "email", "drive"];
    if (!allowedModes.includes(cleanMode)) {
      return NextResponse.json(
        { success: false, error: "Invalid delivery mode. Must be 'gmail' or 'whatsapp'." },
        { status: 400 }
      );
    }

    if (!cleanEmail && (cleanMode === "gmail" || cleanMode === "email")) {
      return NextResponse.json(
        { success: false, error: "Email is required for Gmail delivery." },
        { status: 400 }
      );
    }

    if (!cleanPhone && cleanMode === "whatsapp") {
      return NextResponse.json(
        { success: false, error: "WhatsApp number is required." },
        { status: 400 }
      );
    }

    // 2. Server-Authoritative Price Validation (Anti-Price Tampering)
    const priceCheck = await validateOrderPrices([{ productId: course_id }], typeof clientAmount === "number" ? clientAmount : undefined);
    const matchedProduct = priceCheck.items[0];
    const authoritativeAmount = priceCheck.isValid && matchedProduct
      ? matchedProduct.price
      : (Number(clientAmount) || 99);

    const secureDriveUrl = matchedProduct?.drive_url || "https://drive.google.com";

    // 3. UTR Fraud & Duplicate Check
    let isFlagged = false;
    let flagReason = "";
    if (cleanUtr) {
      const utrCheck = await validateUtrSubmission(cleanUtr);
      if (utrCheck.isDuplicate) {
        isFlagged = true;
        flagReason = "DUPLICATE_UTR: This transaction ref was previously submitted.";
        console.warn(`[FRAUD SUSPICION] Duplicate UTR submitted: ${cleanUtr} by ${cleanPhone}`);
      }
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const order_id = `ARK-${new Date().getFullYear()}-${randomSuffix}`;

    const newOrder = {
      id: order_id,
      order_id,
      name: cleanName,
      customer_name: cleanName,
      delivery_mode: cleanMode,
      phone: cleanPhone,
      customer_phone: cleanPhone,
      email: cleanEmail,
      customer_email: cleanEmail,
      course_id: course_id,
      course_title: matchedProduct?.title || rawCourseTitle || "Course Bundle",
      exam_name: matchedProduct?.title || rawCourseTitle || "Course Bundle",
      amount: authoritativeAmount,
      drive_url: secureDriveUrl,
      status: "pending",
      delivery_status: "pending",
      payment_status: "pending",
      utr: cleanUtr,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Primary Relational Storage: Insert into Supabase marketplace_orders
    try {
      await supabaseAdmin.from("marketplace_orders").insert({
        customer_name: cleanName,
        customer_email: cleanEmail || `${cleanPhone}@arkado.store`,
        product_id: course_id,
        amount: authoritativeAmount,
        payment_status: "pending",
        razorpay_order_id: order_id,
        razorpay_payment_id: cleanUtr || undefined,
        delivery_status: "pending",
      });
    } catch (dbErr) {
      console.warn("[orders-post] marketplace_orders insert warning:", dbErr);
    }

    // 5. Dual-Write Backup: Store in orders JSON & admin_settings
    const orders = await readOrders();
    orders.unshift(newOrder);
    await writeOrders(orders);

    // 6. Notify admin via email (fire-and-forget)
    fetch(new URL(req.url).origin + "/api/notify-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    }).catch((err) => console.error("Failed to notify admin:", err));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { order_id, status, payment_status, delivery_status } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "Missing order_id" },
        { status: 400 }
      );
    }

    const orders = await readOrders();
    const orderIndex = orders.findIndex(
      (o: { order_id: string; id: string }) => o.order_id === order_id || o.id === order_id
    );

    if (orderIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const target = orders[orderIndex];

    if (status) {
      target.status = status;
      if (status === "delivered") target.delivery_status = "delivered";
      if (status === "approved" || status === "paid") target.payment_status = "paid";
    }
    if (payment_status) target.payment_status = payment_status;
    if (delivery_status) target.delivery_status = delivery_status;
    target.updated_at = new Date().toISOString();

    // Sync to Supabase marketplace_orders
    try {
      const updatePayload: Record<string, any> = {};
      if (target.payment_status) updatePayload.payment_status = target.payment_status;
      if (target.delivery_status) updatePayload.delivery_status = target.delivery_status;

      await supabaseAdmin
        .from("marketplace_orders")
        .update(updatePayload)
        .eq("razorpay_order_id", order_id);
    } catch {}

    await writeOrders(orders);

    return NextResponse.json({ success: true, order: target });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const order_id = searchParams.get("order_id");

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "order_id is required" },
        { status: 400 }
      );
    }

    let orders = await readOrders();
    orders = orders.filter((o: { order_id: string; id: string }) => o.order_id !== order_id && o.id !== order_id);
    await writeOrders(orders);

    try {
      await supabaseAdmin.from("marketplace_orders").delete().eq("razorpay_order_id", order_id);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
