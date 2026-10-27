import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RETENTION_DAYS = 90;

function cutoffIso(): string {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
}

/**
 * Admin-only retention cleanup for analytics_events.
 * GET  = dry run: returns how many rows are older than 90 days, deletes nothing.
 * POST = actually deletes rows older than 90 days, returns the count.
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const cutoff = cutoffIso();
    const { count, error } = await supabaseAdmin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .lt("created_at", cutoff);
    if (error) throw error;
    return NextResponse.json({ ok: true, dryRun: true, retentionDays: RETENTION_DAYS, cutoff, oldRows: count ?? 0 });
  } catch (err) {
    console.error("[admin/analytics-cleanup GET]", err);
    return NextResponse.json({ error: "Cleanup check failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const cutoff = cutoffIso();
    const { count: before } = await supabaseAdmin
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .lt("created_at", cutoff);
    const { error } = await supabaseAdmin.from("analytics_events").delete().lt("created_at", cutoff);
    if (error) throw error;
    return NextResponse.json({ ok: true, dryRun: false, retentionDays: RETENTION_DAYS, cutoff, deletedRows: before ?? 0 });
  } catch (err) {
    console.error("[admin/analytics-cleanup POST]", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
