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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const orders = await readOrders();
  const idx = orders.findIndex((o: Record<string, unknown>) => o.id === id || o.order_id === id);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updates = { ...orders[idx], ...body, updated_at: new Date().toISOString() };
  orders[idx] = updates;
  await writeOrders(orders);
  return NextResponse.json(updates);
}
