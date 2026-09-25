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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const orders = await readOrders();
  const idx = orders.findIndex((o: Record<string, unknown>) => o.id === id || o.order_id === id);
  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updates: Record<string, unknown> = { ...orders[idx], ...body, updated_at: new Date().toISOString() };
  if (body.delivery_status) {
    updates.status = body.delivery_status;
    updates.delivery_status = body.delivery_status;
  } else if (body.status) {
    updates.delivery_status = body.status;
    updates.status = body.status;
  }
  if (body.payment_status) {
    updates.payment_status = body.payment_status;
  }

  orders[idx] = updates;
  await writeOrders(orders);

  // Sync to Supabase marketplace_orders
  try {
    const supabaseUpdates: Record<string, any> = {};
    if (updates.payment_status) supabaseUpdates.payment_status = updates.payment_status;
    if (updates.delivery_status) supabaseUpdates.delivery_status = updates.delivery_status;

    if (Object.keys(supabaseUpdates).length > 0) {
      await supabaseAdmin
        .from("marketplace_orders")
        .update(supabaseUpdates)
        .or(`razorpay_order_id.eq.${id},id.eq.${id}`);
    }
  } catch (dbErr) {
    console.warn("[admin-orders-id-put] Supabase sync warning:", dbErr);
  }

  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let orders = await readOrders();
  orders = orders.filter((o: Record<string, unknown>) => o.id !== id && o.order_id !== id);
  await writeOrders(orders);

  // Delete from Supabase
  try {
    await supabaseAdmin
      .from("marketplace_orders")
      .delete()
      .or(`razorpay_order_id.eq.${id},id.eq.${id}`);
  } catch (dbErr) {
    console.warn("[admin-orders-id-delete] Supabase delete warning:", dbErr);
  }

  return NextResponse.json({ success: true, id });
}
