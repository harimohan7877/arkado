import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";
import { supabaseAdmin } from "@/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sum of local JSON store files (data/*.json). */
async function getJsonStoreBytes(): Promise<number> {
  try {
    const { readdir, stat } = await import("fs/promises");
    const { join } = await import("path");
    const dir = join(process.cwd(), "data");
    const files = await readdir(dir);
    let total = 0;
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        total += (await stat(join(dir, f))).size;
      } catch { /* skip unreadable */ }
    }
    return total;
  } catch {
    return 0;
  }
}

/** Recursively count files + bytes in the uploads bucket (capped, best-effort). */
async function getBucketUsage(): Promise<{ files: number; bytes: number }> {
  const out = { files: 0, bytes: 0 };
  try {
    const walk = async (prefix: string, depth: number): Promise<void> => {
      if (depth > 6 || out.files > 5000) return;
      const { data, error } = await supabaseAdmin.storage
        .from("arkado-uploads")
        .list(prefix || undefined, { limit: 1000 });
      if (error || !data) return;
      for (const item of data) {
        if (item.id == null) {
          await walk(prefix ? `${prefix}/${item.name}` : item.name, depth + 1);
        } else {
          out.files++;
          out.bytes += Number((item.metadata as { size?: number } | null)?.size) || 0;
        }
      }
    };
    await walk("", 0);
  } catch {
    /* bucket unreadable — report zeros */
  }
  return out;
}

async function getDbRowCounts(): Promise<{ orders: number; products: number }> {
  const counts = { orders: 0, products: 0 };
  try {
    const { count } = await supabaseAdmin.from("marketplace_orders").select("id", { count: "exact", head: true });
    counts.orders = count || 0;
  } catch { /* ignore */ }
  try {
    const { count } = await supabaseAdmin.from("marketplace_products").select("id", { count: "exact", head: true });
    counts.products = count || 0;
  } catch { /* ignore */ }
  return counts;
}

interface VisitorDay { date: string; views: number; }

/** Last 14 days of page views. available=false until the migration is run. */
async function getVisitors(): Promise<{ available: boolean; days: VisitorDay[]; total: number; today: number }> {
  const days: VisitorDay[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    days.push({ date: d.toISOString().slice(0, 10), views: 0 });
  }
  try {
    const since = new Date(now.getTime() - 14 * DAY_MS).toISOString();
    const { data, error } = await supabaseAdmin
      .from("page_views")
      .select("created_at")
      .gte("created_at", since)
      .limit(20000);
    if (error) throw error;
    const byDate = new Map<string, number>();
    for (const row of data || []) {
      const d = String((row as { created_at?: string }).created_at || "").slice(0, 10);
      byDate.set(d, (byDate.get(d) || 0) + 1);
    }
    let total = 0;
    for (const day of days) {
      day.views = byDate.get(day.date) || 0;
      total += day.views;
    }
    return { available: true, days, total, today: days[days.length - 1].views };
  } catch {
    return { available: false, days, total: 0, today: 0 };
  }
}

interface CategoryRecord {
  id: string;
  is_active?: boolean;
  boards?: Array<{
    is_active?: boolean;
    exams?: Array<{ is_active?: boolean }>;
  }>;
}

interface OrderRecord {
  order_id?: unknown;
  id?: unknown;
  customer_name?: unknown;
  name?: unknown;
  amount?: unknown;
  payment_status?: unknown;
  delivery_status?: unknown;
  created_at?: unknown;
}

interface CourseRecord {
  id?: unknown;
  title?: unknown;
  cover_image?: unknown;
  sample_pdf_url?: unknown;
  drive_url?: unknown;
  is_active?: boolean;
}

function countActiveExams(categories: CategoryRecord[]): number {
  return categories.reduce((total, category) => {
    if (!category.is_active) return total;
    return total + (category.boards || []).reduce((boardTotal, board) => {
      if (!board.is_active) return boardTotal;
      return boardTotal + (board.exams || []).filter((exam) => exam.is_active).length;
    }, 0);
  }, 0);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [orders, courses, categories, jsonBytes, bucket, dbRows, visitors] = await Promise.all([
    getStoreData<OrderRecord[]>("orders", "data/orders.json", []),
    getStoreData<CourseRecord[]>("courses", "data/courses.json", []),
    getStoreData<CategoryRecord[]>("categories", "data/categories.json", []),
    getJsonStoreBytes(),
    getBucketUsage(),
    getDbRowCounts(),
    getVisitors(),
  ]);

  const now = Date.now();
  const orderIdOf = (o: OrderRecord) => String(o.order_id || o.id || "—");
  const orderNameOf = (o: OrderRecord) => String(o.customer_name || o.name || "Customer").replace(/\s*\(.*?\)\s*/g, "").trim() || "Customer";
  const hoursAgo = (o: OrderRecord) => {
    const t = new Date(String(o.created_at || "")).getTime();
    return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 3_600_000)) : 0;
  };

  const pendingOrders = orders.filter((o) => o.payment_status === "pending");
  const stalePending = pendingOrders
    .filter((o) => hoursAgo(o) >= 24)
    .slice(0, 10)
    .map((o) => ({ order_id: orderIdOf(o), name: orderNameOf(o), amount: Number(o.amount) || 0, hours_ago: hoursAgo(o) }));
  const undelivered = orders
    .filter((o) => o.payment_status === "paid" && o.delivery_status === "pending")
    .slice(0, 10)
    .map((o) => ({ order_id: orderIdOf(o), name: orderNameOf(o), amount: Number(o.amount) || 0, hours_ago: hoursAgo(o) }));

  const activeCourses = courses.filter((course) => course.is_active !== false);
  const missing = (field: "cover_image" | "sample_pdf_url" | "drive_url") =>
    activeCourses
      .filter((c) => !String(c[field] || "").trim())
      .slice(0, 10)
      .map((c) => ({ id: String(c.id || ""), title: String(c.title || "Untitled") }));

  const stats = {
    totalUsers: 0,
    totalPaidUsers: 0,
    totalGuests: 0,
    totalChats: 0,
    totalOrders: orders.length,
    totalRevenue: orders
      .filter((order) => order.payment_status === "paid")
      .reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
    pendingDelivery: undelivered.length,
    activeCourses: courses.filter((course) => course.is_active).length,
    activeExams: countActiveExams(categories),
    activeCategories: categories.filter((category) => category.is_active).length,
    alerts: {
      pendingOrders: pendingOrders.length,
      stalePendingOrders: { count: stalePending.length, items: stalePending },
      undeliveredPaid: { count: undelivered.length, items: undelivered },
      coursesNoCover: { count: missing("cover_image").length, items: missing("cover_image") },
      coursesNoSample: { count: missing("sample_pdf_url").length, items: missing("sample_pdf_url") },
      coursesNoDrive: { count: missing("drive_url").length, items: missing("drive_url") },
    },
    storage: {
      jsonStoreBytes: jsonBytes,
      uploads: bucket, // { files, bytes } in the arkado-uploads bucket
      dbRows,
    },
    visitors,
  };

  return NextResponse.json(stats);
}
