import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreData } from "@/lib/store-data";
import {
  resolveDeliverableKits,
  type NormalizedOrder,
} from "@/lib/deliver-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface MyOrder {
  order_id: string;
  course_title: string;
  amount: number;
  drive_url: string;
  /** Per-kit links for delivered bundle orders (one button per kit). */
  drive_urls?: { title: string; drive_url: string }[];
  delivery_status: string;
  created_at: string;
}

/**
 * Customer's own orders — user-scoped, minimal fields only.
 *
 * The caller's Supabase session token is verified server-side; orders are
 * matched by the verified account email (or user_id when linked at
 * checkout). Returns only what the dashboard needs: order id, course,
 * amount, delivery status and the Drive link — and the link ONLY once
 * the order is delivered. No phone, no transaction id, no other
 * customer's data. (The old /api/orders route required an admin session
 * and returned 401 for customers, so the dashboard was always empty.)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email.toLowerCase();
    const byId = new Map<string, MyOrder>();
    const courses = await getStoreData<any[]>("courses", "data/courses.json", []);

    const toMyOrder = (o: Record<string, any>): MyOrder | null => {
      const payStatus = String(o.payment_status || "pending").toLowerCase();
      if (payStatus !== "paid") return null;
      const orderId = String(o.razorpay_order_id || o.order_id || o.id || "");
      if (!orderId) return null;
      const delStatus = String(o.delivery_status || o.status || "pending").toLowerCase();
      // Delivered orders: resolve the per-kit links from the stored
      // items. Bundle rows store drive_url "" — without this the
      // dashboard would show "link within 1 hour" for a delivered
      // bundle forever. Links are returned ONLY when delivered.
      let driveUrls: { title: string; drive_url: string }[] = [];
      if (delStatus === "delivered") {
        driveUrls = resolveDeliverableKits(
          o as NormalizedOrder,
          courses,
          String(o.drive_url || "")
        ).map((k) => ({ title: k.title, drive_url: k.drive_url }));
      }
      return {
        order_id: orderId,
        course_title: String(o.course_title || "Course Bundle"),
        amount: Number(o.amount) || 0,
        drive_url: driveUrls[0]?.drive_url || "",
        drive_urls: driveUrls,
        delivery_status: delStatus === "delivered" ? "delivered" : delStatus === "pending_link" ? "pending_link" : "pending",
        created_at: String(o.created_at || ""),
      };
    };

    // 1) Supabase — match by verified email (exact) or user_id.
    // Exact match on purpose: ilike would treat "_" / "%" in an email as
    // wildcards and could match a different customer's orders.
    try {
      const { data: rows } = await supabaseAdmin
        .from("marketplace_orders")
        .select("razorpay_order_id, course_title, amount, drive_url, delivery_status, payment_status, created_at, items")
        .eq("customer_email", email);
      for (const r of rows || []) {
        const m = toMyOrder(r as Record<string, any>);
        if (m) byId.set(m.order_id, m);
      }
    } catch (err) {
      console.warn("[my-orders] Supabase email lookup failed:", err);
    }
    try {
      const { data: rows } = await supabaseAdmin
        .from("marketplace_orders")
        .select("razorpay_order_id, course_title, amount, drive_url, delivery_status, payment_status, created_at, items")
        .eq("user_id", user.id);
      for (const r of rows || []) {
        const m = toMyOrder(r as Record<string, any>);
        if (m) byId.set(m.order_id, m);
      }
    } catch {
      // user_id column may not exist yet — email match above is enough.
    }

    // 2) JSON fallback — same scoping, email or user_id.
    try {
      const jsonOrders = await getStoreData<any[]>("orders", "data/orders.json", []);
      for (const o of jsonOrders) {
        const oEmail = String(o.customer_email || o.email || "").toLowerCase();
        if (oEmail !== email && o.user_id !== user.id) continue;
        const m = toMyOrder(o);
        if (m && !byId.has(m.order_id)) byId.set(m.order_id, m);
      }
    } catch (err) {
      console.warn("[my-orders] JSON fallback failed:", err);
    }

    const orders = [...byId.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    console.error("[my-orders] Error:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
