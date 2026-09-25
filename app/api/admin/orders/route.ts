import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { supabaseAdmin, buildOrderQueryFilter } from "@/lib/supabase";

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

  // 1. Primary: Direct fetch from Supabase marketplace_orders (authoritative source of truth)
  let rawList: any[] = [];
  let isSupabaseLoaded = false;
  try {
    const { data: dbOrders, error: dbErr } = await supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!dbErr && Array.isArray(dbOrders)) {
      rawList = dbOrders;
      isSupabaseLoaded = true;
    }
  } catch (err) {
    console.warn("[admin-orders-get] Supabase fetch error:", err);
  }

  // 2. Seamless Merge: Also merge any orders stored locally that are not yet in Supabase
  try {
    const localOrders = await readOrders();
    const seenIds = new Set<string>();
    for (const o of rawList) {
      if (o.razorpay_order_id) seenIds.add(o.razorpay_order_id);
      if (o.id) seenIds.add(o.id);
    }
    for (const lo of localOrders) {
      const loId = lo.razorpay_order_id || lo.order_id || lo.id;
      if (loId && !seenIds.has(loId)) {
        rawList.push(lo);
        seenIds.add(loId);
      }
    }
  } catch (mergeErr) {
    console.warn("[admin-orders-get] Local merge warning:", mergeErr);
  }

  // 3. Resolve course titles from catalog if missing
  const courses = await getStoreData<any[]>("courses", "data/courses-new.json", []);
  const courseTitleMap = new Map<string, string>();
  for (const c of courses) {
    if (c.id) courseTitleMap.set(c.id, c.title || c.name || "");
    if (c.slug) courseTitleMap.set(c.slug, c.title || c.name || "");
  }

  const normalized = rawList.map((o: Record<string, any>) => {
    const courseId = (o.product_id || o.course_id || "") as string;
    const resolvedTitle = (o.course_title || courseTitleMap.get(courseId) || "Course Bundle") as string;

    return {
      id: (o.razorpay_order_id || o.id || o.order_id || "") as string,
      order_id: (o.razorpay_order_id || o.order_id || o.id || "") as string,
      db_id: (o.db_id || o.id || "") as string,
      customer_name: (o.customer_name || o.name || "Customer") as string,
      name: (o.customer_name || o.name || "Customer") as string,
      customer_email: (o.customer_email || o.email || "") as string,
      email: (o.customer_email || o.email || "") as string,
      customer_phone: (o.customer_phone || o.phone || "") as string,
      phone: (o.customer_phone || o.phone || "") as string,
      delivery_mode: (o.delivery_mode || "both") as "whatsapp" | "gmail" | "both",
      delivery_status: ((o.delivery_status || o.status || "pending") === "delivered" ? "delivered" : "pending") as "pending" | "delivered",
      status: (o.status || o.delivery_status || "pending") as string,
      payment_status: (o.payment_status === "paid" ? "paid" : o.payment_status === "failed" ? "failed" : "pending") as "pending" | "paid" | "failed",
      amount: Number(o.amount) || 0,
      course_id: courseId,
      course_title: resolvedTitle,
      exam_name: (o.exam_name || resolvedTitle) as string,
      utr: (o.utr || o.razorpay_payment_id || "") as string,
      drive_url: (o.drive_url || "") as string,
      created_at: (o.created_at || new Date().toISOString()) as string,
      updated_at: (o.updated_at || o.created_at || new Date().toISOString()) as string,
    };
  });

  // Sort newest first
  normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json(normalized);
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { orderId, action, value } = body;

  if (!orderId || !action) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

  const orders = await readOrders();
  const idx = orders.findIndex((o: Record<string, unknown>) => o.id === orderId || o.order_id === orderId || (o as any).db_id === orderId);

  const supabaseUpdates: Record<string, any> = {};

  if (action === "update_delivery" && ["pending", "delivered"].includes(value)) {
    if (idx !== -1) {
      orders[idx].delivery_status = value;
      orders[idx].status = value;
      orders[idx].updated_at = new Date().toISOString();
    }
    supabaseUpdates.delivery_status = value;
  } else if (action === "update_payment" && ["pending", "paid", "failed"].includes(value)) {
    if (idx !== -1) {
      orders[idx].payment_status = value;
      orders[idx].updated_at = new Date().toISOString();
    }
    supabaseUpdates.payment_status = value;
  } else {
    return NextResponse.json({ error: "Invalid action or value" }, { status: 400 });
  }

  if (idx !== -1) {
    await writeOrders(orders);
  }

  // Sync to Supabase safely
  try {
    if (Object.keys(supabaseUpdates).length > 0) {
      const filter = buildOrderQueryFilter(orderId);
      const { error: dbErr } = await supabaseAdmin
        .from("marketplace_orders")
        .update(supabaseUpdates)
        .or(filter);

      if (dbErr) {
        console.error("[admin-orders-put] Supabase sync error:", dbErr.message);
      }
    }
  } catch (err) {
    console.warn("[admin-orders-put] Supabase sync warning:", err);
  }

  return NextResponse.json(idx !== -1 ? orders[idx] : { success: true });
}
