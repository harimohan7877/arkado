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
  const data = await readOrders();
  return NextResponse.json(data);
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
