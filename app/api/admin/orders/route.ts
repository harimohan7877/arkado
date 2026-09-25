import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readOrders() {
  return getStoreData<any[]>("orders", "data/orders.json", []);
}

function writeOrders(data: unknown[]) {
  return setStoreData("orders", "data/orders.json", data);
}

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawOrders = await readOrders();
  const orderMap = new Map<string, any>();

  // 1. Read from local/JSON first
  for (const o of rawOrders) {
    const key = o.id || o.order_id;
    if (key) orderMap.set(key, o);
  }

  // 2. Dual-read from Supabase marketplace_orders
  try {
    const { data: dbOrders } = await supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (Array.isArray(dbOrders)) {
      for (const d of dbOrders) {
        const key = d.razorpay_order_id || d.id;
        const existing = orderMap.get(key);
        orderMap.set(key, {
          ...(existing || {}),
          id: d.razorpay_order_id || d.id || existing?.id,
          order_id: d.razorpay_order_id || d.id || existing?.order_id,
          customer_name: d.customer_name || existing?.customer_name || "Customer",
          customer_email: d.customer_email || existing?.customer_email || "",
          customer_phone: d.customer_phone || existing?.customer_phone || "",
          delivery_mode: d.delivery_mode || existing?.delivery_mode || "both",
          delivery_status: d.delivery_status || existing?.delivery_status || "pending",
          payment_status: d.payment_status || existing?.payment_status || "pending",
          amount: Number(d.amount) || Number(existing?.amount) || 0,
          course_id: d.product_id || existing?.course_id || "",
          course_title: d.course_title || existing?.course_title || "Course Bundle",
          utr: d.utr || d.razorpay_payment_id || existing?.utr || "",
          drive_url: d.drive_url || existing?.drive_url || "",
          created_at: d.created_at || existing?.created_at || new Date().toISOString(),
          updated_at: d.updated_at || existing?.updated_at || d.created_at || new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("[admin-orders-get] Supabase fetch warning:", err);
  }

  const merged = Array.from(orderMap.values());
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const normalized = merged.map((o: Record<string, unknown>) => ({
    id: (o.id || o.order_id || "") as string,
    order_id: (o.order_id || o.id || "") as string,
    customer_name: (o.customer_name || o.name || "Customer") as string,
    name: (o.name || o.customer_name || "Customer") as string,
    customer_email: (o.customer_email || o.email || "") as string,
    email: (o.email || o.customer_email || "") as string,
    customer_phone: (o.customer_phone || o.phone || "") as string,
    phone: (o.phone || o.customer_phone || "") as string,
    delivery_mode: (o.delivery_mode || "both") as "whatsapp" | "gmail" | "both",
    delivery_status: ((o.delivery_status || o.status || "pending") === "delivered" ? "delivered" : "pending") as "pending" | "delivered",
    status: (o.status || o.delivery_status || "pending") as string,
    payment_status: (o.payment_status === "paid" ? "paid" : o.payment_status === "failed" ? "failed" : "pending") as "pending" | "paid" | "failed",
    amount: Number(o.amount) || 0,
    course_id: (o.course_id || "") as string,
    course_title: (o.course_title || "") as string,
    exam_name: (o.exam_name || o.course_title || "") as string,
    utr: (o.utr || "") as string,
    drive_url: (o.drive_url || "") as string,
    created_at: (o.created_at || new Date().toISOString()) as string,
    updated_at: (o.updated_at || o.created_at || new Date().toISOString()) as string,
  }));

  return NextResponse.json(normalized);
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { orderId, action, value } = body;

  if (!orderId || !action) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  const orders = await readOrders();
  const idx = orders.findIndex((o: Record<string, unknown>) => o.id === orderId || o.order_id === orderId);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const supabaseUpdates: Record<string, any> = {};

  if (action === "update_delivery" && ["pending", "delivered"].includes(value)) {
    orders[idx].delivery_status = value;
    orders[idx].status = value;
    orders[idx].updated_at = new Date().toISOString();
    supabaseUpdates.delivery_status = value;
  } else if (action === "update_payment" && ["pending", "paid", "failed"].includes(value)) {
    orders[idx].payment_status = value;
    orders[idx].updated_at = new Date().toISOString();
    supabaseUpdates.payment_status = value;
  } else {
    return NextResponse.json({ error: "Invalid action or value" }, { status: 400 });
  }

  await writeOrders(orders);

  // Sync to Supabase
  try {
    if (Object.keys(supabaseUpdates).length > 0) {
      await supabaseAdmin
        .from("marketplace_orders")
        .update(supabaseUpdates)
        .or(`razorpay_order_id.eq.${orderId},id.eq.${orderId}`);
    }
  } catch (err) {
    console.warn("[admin-orders-put] Supabase sync warning:", err);
  }

  return NextResponse.json(orders[idx]);
}
