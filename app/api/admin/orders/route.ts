import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";

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
  const normalized = rawOrders.map((o: Record<string, unknown>) => ({
    id: (o.id || o.order_id || "") as string,
    order_id: (o.order_id || o.id || "") as string,
    customer_name: (o.customer_name || o.name || "Customer") as string,
    name: (o.name || o.customer_name || "Customer") as string,
    customer_email: (o.customer_email || o.email || "") as string,
    email: (o.email || o.customer_email || "") as string,
    customer_phone: (o.customer_phone || o.phone || "") as string,
    phone: (o.phone || o.customer_phone || "") as string,
    delivery_mode: (o.delivery_mode || "whatsapp") as "whatsapp" | "gmail",
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

  if (action === "update_delivery" && ["pending", "delivered"].includes(value)) {
    orders[idx].delivery_status = value;
    orders[idx].status = value;
    orders[idx].updated_at = new Date().toISOString();
  } else if (action === "update_payment" && ["pending", "paid", "failed"].includes(value)) {
    orders[idx].payment_status = value;
    orders[idx].updated_at = new Date().toISOString();
  } else {
    return NextResponse.json({ error: "Invalid action or value" }, { status: 400 });
  }

  await writeOrders(orders);
  return NextResponse.json(orders[idx]);
}
