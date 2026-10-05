import { NextRequest, NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";
import { sanitizeInput } from "@/lib/payment-gateway";
import { normPhone, toSafeOrder, orderPhoneMatches } from "@/lib/track-order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Simple in-memory rate limit: 10 lookups/min per IP (prevents order enumeration)
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count++;
  return rec.count > 10;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json({ success: false, error: "Too many attempts — please wait a minute and try again." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = sanitizeInput(body.order_id).trim().toUpperCase();
    const phone = normPhone(sanitizeInput(body.phone));

    if (!orderId || phone.length < 10) {
      return NextResponse.json({ success: false, error: "Please enter your Order ID and a valid phone number." }, { status: 400 });
    }

    const orders = await getStoreData<any[]>("orders", "data/orders.json", []);
    let order = (Array.isArray(orders) ? orders : []).find(
      (o) => String(o.order_id || o.id || "").toUpperCase() === orderId
    );

    // Generic response — don't reveal whether the ID exists or the phone mismatched
    if (!order || !orderPhoneMatches(order, phone)) {
      return NextResponse.json({ success: false, error: "No order found for this Order ID and phone number." }, { status: 404 });
    }

    // Supabase-sourced orders often lack course_title ("Course Bundle" fallback) —
    // resolve the real title from the catalog via course_id/product_id.
    const courseId = String(order.course_id || "");
    if (courseId) {
      try {
        const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
        const matched = (Array.isArray(courses) ? courses : []).find((c) => String(c.id) === courseId);
        if (matched?.title && (!order.course_title || order.course_title === "Course Bundle")) {
          order = { ...order, course_title: matched.title, exam_name: matched.title };
        }
      } catch {
        /* catalog lookup is best-effort — never fail tracking */
      }
    }

    const safe = toSafeOrder(order);
    if (!safe) {
      return NextResponse.json({ success: false, error: "No order found for this Order ID and phone number." }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: safe });
  } catch {
    return NextResponse.json({ success: false, error: "Something went wrong — please try again." }, { status: 500 });
  }
}
