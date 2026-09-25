import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter, isUUID } from "@/lib/supabase";

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
  const { searchParams } = new URL(req.url);
  const dbId = searchParams.get("db_id");
  const body = await req.json();
  const orders = await readOrders();
  const idx = orders.findIndex(
    (o: Record<string, unknown>) =>
      o.id === id || o.order_id === id || (o as any).db_id === id || (dbId && (o as any).db_id === dbId)
  );

  const current = idx !== -1 ? orders[idx] : {};
  const updates: Record<string, unknown> = { ...current, ...body, updated_at: new Date().toISOString() };
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

  if (idx !== -1) {
    orders[idx] = updates;
  } else {
    orders.unshift(updates);
  }
  await writeOrders(orders);

  // Sync to Supabase marketplace_orders safely
  try {
    const supabaseUpdates: Record<string, any> = {};
    if (updates.payment_status) supabaseUpdates.payment_status = updates.payment_status;
    if (updates.delivery_status) supabaseUpdates.delivery_status = updates.delivery_status;

    if (Object.keys(supabaseUpdates).length > 0) {
      let filter = buildOrderQueryFilter(id);
      if (dbId && isUUID(dbId) && !filter.includes(dbId)) {
        filter += `,id.eq.${dbId}`;
      }
      const { error: dbErr } = await supabaseAdmin
        .from("marketplace_orders")
        .update(supabaseUpdates)
        .or(filter);

      if (dbErr) {
        console.error("[admin-orders-id-put] Supabase sync error:", dbErr.message);
      }
    }
  } catch (dbErr) {
    console.warn("[admin-orders-id-put] Supabase sync warning:", dbErr);
  }

  return NextResponse.json(updates);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const dbId = searchParams.get("db_id");

  // 1. Delete from Supabase marketplace_orders safely with UUID handling
  try {
    let filter = buildOrderQueryFilter(id);
    if (dbId && isUUID(dbId) && !filter.includes(dbId)) {
      filter += `,id.eq.${dbId}`;
    }
    const { error: dbErr } = await supabaseAdmin
      .from("marketplace_orders")
      .delete()
      .or(filter);

    if (dbErr) {
      console.error("[admin-orders-id-delete] Supabase delete error:", dbErr.message);
    }
  } catch (dbErr) {
    console.warn("[admin-orders-id-delete] Supabase delete warning:", dbErr);
  }

  // 2. Also remove from local JSON & in-memory cache
  try {
    let orders = await readOrders();
    orders = orders.filter(
      (o: Record<string, unknown>) =>
        o.id !== id &&
        o.order_id !== id &&
        (o as any).db_id !== id &&
        (!dbId || (o as any).db_id !== dbId)
    );
    await writeOrders(orders);
  } catch (cleanupErr) {
    console.warn("[admin-orders-id-delete] Local cleanup warning:", cleanupErr);
  }

  return NextResponse.json({ success: true, id });
}
