import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Light rate limit: 30 hits/min per IP
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

/**
 * Privacy-friendly page-view tracker.
 * Stores ONLY page_path + timestamp — no IP, no user agent, no cookies.
 * Never fails the request; degrades gracefully until the migration is run.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) return NextResponse.json({ ok: true });

    const body = await req.json().catch(() => ({}));
    let path = String(body.path || "/").slice(0, 200);
    if (!path.startsWith("/")) path = "/";
    // Don't track admin pages or API routes
    if (path.startsWith("/ranjeet") || path.startsWith("/api/") || path.startsWith("/_next")) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseAdmin.from("page_views").insert({ page_path: path });
    if (error) {
      // Table missing (migration not run yet) — warn once, don't break the page
      console.warn("[track] page_views insert skipped:", error.message);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
