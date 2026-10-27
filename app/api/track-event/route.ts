import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Same light rate limit as /api/track: 30 hits/min per IP (in-memory).
// IP is used ONLY for rate limiting and is never stored.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count++;
  return rec.count > 30;
}

const ALLOWED_EVENTS = new Set([
  "page_view",
  "product_view",
  "click",
  "cart_open",
  "checkout_step",
  "order_placed",
]);

function clean(value: unknown, max: number): string {
  return String(value ?? "").slice(0, max);
}

/**
 * Anonymous analytics event ingest.
 * Stores NO personal data: no name, phone, email, UTR, order ID, or IP.
 * Never fails the request; degrades gracefully until the migration is run.
 * Admin pages and API routes are never tracked.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => ({}));
    const eventType = clean(body.event_type, 30);
    if (!ALLOWED_EVENTS.has(eventType)) return NextResponse.json({ ok: true });

    let path = clean(body.page_path, 200) || "/";
    if (!path.startsWith("/")) path = "/";
    // Don't track admin pages or API routes
    if (path.startsWith("/ranjeet") || path.startsWith("/api/") || path.startsWith("/_next")) {
      return NextResponse.json({ ok: true });
    }

    const row = {
      visitor_id: clean(body.visitor_id, 64) || "anon",
      session_id: clean(body.session_id, 64) || "anon",
      event_type: eventType,
      page_path: path,
      product_id: clean(body.product_id, 200) || null,
      element: clean(body.element, 60) || null,
      referrer: clean(body.referrer, 120) || null,
      utm_source: clean(body.utm_source, 60) || null,
      device: clean(body.device, 20) || null,
    };

    const { error } = await supabaseAdmin.from("analytics_events").insert(row);
    if (error) {
      // Table missing (migration not run yet) — warn, don't break the page
      console.warn("[track-event] analytics_events insert skipped:", error.message);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
