import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData } from "@/lib/store-data";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

// Tiny in-memory cache: dashboard polls, DB should not be hit every second.
const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_TTL_MS = 15_000;

type Ev = {
  created_at: string;
  visitor_id: string;
  session_id: string;
  event_type: string;
  page_path: string;
  product_id: string | null;
  element: string | null;
  referrer: string | null;
  utm_source: string | null;
  device: string | null;
  search_query: string | null;
};

type Ord = {
  razorpay_order_id: string;
  product_id: string;
  course_title: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  visitor_id?: string | null;
  session_id?: string | null;
  utm_source?: string | null;
};

/** [start, end) ISO strings for a range, in IST (no DST in India). */
function rangeWindow(range: string): { start: string; end: string; days: number; label: string; bucketType: string } {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();
  const todayStart = Date.UTC(y, m, d) - IST_OFFSET_MS;
  if (range === "yesterday") {
    return { start: new Date(todayStart - DAY_MS).toISOString(), end: new Date(todayStart).toISOString(), days: 1, label: "Kal", bucketType: "hourly" };
  }
  if (range === "7d") {
    return { start: new Date(todayStart - 6 * DAY_MS).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 7, label: "7 din", bucketType: "daily" };
  }
  if (range === "30d") {
    return { start: new Date(todayStart - 29 * DAY_MS).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 30, label: "30 din", bucketType: "daily" };
  }
  // today
  return { start: new Date(todayStart).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 1, label: "Aaj", bucketType: "hourly" };
}

/** Parse YYYY-MM-DD as an IST-midnight timestamp, or null if invalid. */
function parseIstDate(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, mo - 1, d) - IST_OFFSET_MS;
  // Round-trip check rejects impossible dates like 2026-02-30.
  const back = new Date(t + IST_OFFSET_MS);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

function fmtDayLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Custom window from start/end date params. Returns an error string when invalid. */
function customWindow(
  startP: string,
  endP: string
): { start: string; end: string; days: number; label: string; bucketType: string } | { error: string } {
  const s = parseIstDate(startP);
  const e = parseIstDate(endP);
  if (s === null || e === null) return { error: "Galat date format. YYYY-MM-DD me dates do." };
  if (e < s) return { error: "Se wali date Tak wali date se aage nahi ho sakti." };
  const days = Math.round((e - s) / DAY_MS) + 1;
  if (days > 90) return { error: "Max 90 din ki range (retention limit)." };
  const start = new Date(s).toISOString();
  const end = new Date(e + DAY_MS).toISOString();
  return {
    start,
    end,
    days,
    label: `${fmtDayLabel(start)} – ${fmtDayLabel(new Date(e).toISOString())}`,
    bucketType: days === 1 ? "hourly" : "daily",
  };
}

async function fetchEvents(start: string, end: string, columns: string): Promise<Ev[]> {
  const out: Ev[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select(columns)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as unknown as Ev[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function fetchOrdersWith(start: string, end: string, columns: string): Promise<{ rows: Ord[]; ok: boolean }> {
  const out: Ord[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_orders")
      .select(columns)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return { rows: out, ok: false };
    if (!data || data.length === 0) break;
    out.push(...(data as unknown as Ord[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return { rows: out, ok: true };
}

async function fetchOrders(start: string, end: string): Promise<Ord[]> {
  // Attribution columns first; if the Phase E migration hasn't run, the
  // query errors and we retry with the base columns so the dashboard keeps
  // working (attribution just shows as missing for those orders).
  const full = await fetchOrdersWith(
    start,
    end,
    "razorpay_order_id,product_id,course_title,amount,payment_status,delivery_status,created_at,visitor_id,session_id,utm_source"
  );
  if (full.ok) return full.rows;
  const base = await fetchOrdersWith(
    start,
    end,
    "razorpay_order_id,product_id,course_title,amount,payment_status,delivery_status,created_at"
  );
  return base.rows;
}

/** Distinct visitor IDs with any event before `start` (for new vs returning). IDs only. */
async function fetchVisitorIdsBefore(start: string): Promise<Set<string>> {
  const out = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("analytics_events")
      .select("visitor_id")
      .lt("created_at", start)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const r of data as { visitor_id: string }[]) out.add(r.visitor_id);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function categorizeSource(referrer: string | null, utm: string | null): string {
  const u = (utm || "").toLowerCase();
  if (u.includes("whatsapp")) return "WhatsApp";
  if (u.includes("instagram")) return "Instagram";
  if (u.includes("facebook")) return "Facebook";
  if (u.includes("youtube")) return "YouTube";
  if (u.includes("google")) return "Google";
  const r = (referrer || "").toLowerCase();
  if (!r) return "Direct / Bookmark";
  if (r.includes("whatsapp.com") || r.includes("wa.me")) return "WhatsApp";
  if (r.includes("google.")) return "Google";
  if (r.includes("youtube.com")) return "YouTube";
  if (r.includes("instagram.com")) return "Instagram";
  if (r.includes("facebook.com")) return "Facebook";
  if (r.includes("bing.com") || r.includes("duckduckgo.com") || r.includes("search.yahoo")) return "Doosra search engine";
  return "Social media / Other";
}

function shortId(id: string): string {
  return id.length > 10 ? `#${id.slice(0, 8)}` : `#${id}`;
}

function istHour(iso: string): number {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).getUTCHours();
}

function istDayLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Admin-only analytics aggregation. Returns counts and titles only —
 * NEVER customer PII (no names, emails, phones, UTRs). Recent orders show
 * only internal order id, amount, title, and status.
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const range = req.nextUrl.searchParams.get("range") || "today";
    const startP = req.nextUrl.searchParams.get("start");
    const endP = req.nextUrl.searchParams.get("end");
    let window: { start: string; end: string; days: number; label: string; bucketType: string };
    let cacheKey = range;
    if (startP || endP) {
      if (!startP || !endP) {
        return NextResponse.json({ error: "Dono dates chuno (se aur tak)." }, { status: 400 });
      }
      const custom = customWindow(startP, endP);
      if ("error" in custom) {
        return NextResponse.json({ error: custom.error }, { status: 400 });
      }
      window = custom;
      cacheKey = `custom:${startP}:${endP}`;
    } else {
      window = rangeWindow(range);
    }
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const { start, end, days } = window;
    const prevStart = new Date(new Date(start).getTime() - days * DAY_MS).toISOString();
    const prevEnd = start;

    const [events, orders, prevEvents, prevOrders, priorVisitors] = await Promise.all([
      fetchEvents(start, end, "*").catch(() => [] as Ev[]),
      fetchOrders(start, end).catch(() => [] as Ord[]),
      fetchEvents(prevStart, prevEnd, "visitor_id,event_type").catch(() => [] as Ev[]),
      fetchOrders(prevStart, prevEnd).catch(() => [] as Ord[]),
      fetchVisitorIdsBefore(start).catch(() => new Set<string>()),
    ]);

    // Course map for titles/categories (server-cached catalog)
    const titleBySlug = new Map<string, string>();
    const titleById = new Map<string, string>();
    const categoryById = new Map<string, string>();
    const idBySlug = new Map<string, string>();
    try {
      const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
      for (const c of courses) {
        const title = c.title || c.id || "";
        if (c.slug) {
          titleBySlug.set(c.slug, title);
          if (c.id) idBySlug.set(c.slug, c.id);
        }
        if (c.id) {
          titleById.set(c.id, title);
          categoryById.set(c.id, c.category_label || c.category || "");
        }
      }
    } catch { /* titles fall back to slugs */ }

    const courseTitle = (path: string, productId: string | null): string => {
      if (productId && titleById.has(productId)) return titleById.get(productId)!;
      const slug = path.replace(/^\/course\//, "").split(/[?#]/)[0];
      return titleBySlug.get(slug) || slug || path;
    };

    // ---- KPIs ----
    const visitorSet = new Set(events.map((e) => e.visitor_id));
    const pageViews = events.filter((e) => e.event_type === "page_view").length;
    const ordersPlaced = events.filter((e) => e.event_type === "order_placed").length;
    const revenue = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const prevVisitors = new Set(prevEvents.map((e) => e.visitor_id)).size;
    const prevPlaced = prevEvents.filter((e) => e.event_type === "order_placed").length;
    const prevRevenue = prevOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
    const pctChange = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    const mobileViews = events.filter((e) => e.event_type === "page_view" && e.device === "mobile").length;
    const clicks = events.filter((e) => e.event_type === "click").length;

    // ---- Session metrics (Phase B; "anon" sessions excluded — they merge unrelated events) ----
    const sessionEvents = new Map<string, Ev[]>();
    for (const e of events) {
      if (!e.session_id || e.session_id === "anon") continue;
      if (!sessionEvents.has(e.session_id)) sessionEvents.set(e.session_id, []);
      sessionEvents.get(e.session_id)!.push(e);
    }
    let bounceSessions = 0;
    let durationSumSec = 0;
    let durationSessions = 0;
    for (const [, se] of sessionEvents) {
      const pv = se.filter((e) => e.event_type === "page_view").length;
      if (pv === 1) bounceSessions++;
      if (se.length >= 2) {
        const times = se.map((e) => new Date(e.created_at).getTime());
        durationSumSec += (Math.max(...times) - Math.min(...times)) / 1000;
        durationSessions++;
      }
    }
    const totalSessions = sessionEvents.size;
    const returningVisitors = [...visitorSet].filter((v) => priorVisitors.has(v)).length;
    const sessions = {
      total: totalSessions,
      newVisitors: visitorSet.size - returningVisitors,
      returningVisitors,
      bouncePct: totalSessions ? Math.round((bounceSessions / totalSessions) * 100) : 0,
      avgDurationSec: durationSessions ? Math.round(durationSumSec / durationSessions) : 0,
      pagesPerSession: totalSessions ? Math.round((pageViews / totalSessions) * 10) / 10 : 0,
    };

    // ---- Live (last 5 min) ----
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const liveByVisitor = new Map<string, Ev>();
    for (const e of events) {
      if (new Date(e.created_at).getTime() >= fiveMinAgo) liveByVisitor.set(e.visitor_id, e);
    }
    const live = [...liveByVisitor.values()]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 20)
      .map((e) => ({
        visitor: shortId(e.visitor_id),
        lastEvent: e.event_type,
        page: e.page_path,
        at: e.created_at,
      }));

    // ---- Recent activity (events + orders merged, newest first) ----
    const activity = [
      ...events.slice(-100).map((e) => ({
        kind: "event" as const,
        at: e.created_at,
        text: `${e.event_type}${e.element ? `: ${e.element}` : ""}`,
        detail: e.page_path,
      })),
      ...orders.slice(0, 50).map((o) => ({
        kind: "order" as const,
        at: o.created_at,
        text: `Order ${o.razorpay_order_id} — ₹${Number(o.amount) || 0} (${o.payment_status})`,
        detail: o.course_title,
      })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 50);

    // ---- Buckets: hourly (1-day ranges) or daily (multi-day) ----
    const buckets: { label: string; visitors: number; views: number; orders: number }[] = [];
    if (days === 1) {
      for (let h = 0; h < 24; h++) buckets.push({ label: String(h).padStart(2, "0"), visitors: 0, views: 0, orders: 0 });
      const bVisitors = buckets.map(() => new Set<string>());
      for (const e of events) {
        const h = istHour(e.created_at);
        if (e.event_type === "page_view") buckets[h].views++;
        bVisitors[h].add(e.visitor_id);
      }
      for (const o of orders) buckets[istHour(o.created_at)].orders++;
      buckets.forEach((b, i) => (b.visitors = bVisitors[i].size));
    } else {
      const dayMap = new Map<string, { visitors: Set<string>; views: number; orders: number }>();
      for (const e of events) {
        const label = istDayLabel(e.created_at);
        if (!dayMap.has(label)) dayMap.set(label, { visitors: new Set(), views: 0, orders: 0 });
        const b = dayMap.get(label)!;
        b.visitors.add(e.visitor_id);
        if (e.event_type === "page_view") b.views++;
      }
      for (const o of orders) {
        const label = istDayLabel(o.created_at);
        if (!dayMap.has(label)) dayMap.set(label, { visitors: new Set(), views: 0, orders: 0 });
        dayMap.get(label)!.orders++;
      }
      for (const [label, b] of [...dayMap.entries()].sort()) {
        buckets.push({ label, visitors: b.visitors.size, views: b.views, orders: b.orders });
      }
    }

    // ---- Funnel (unique visitors per step, each step a subset) ----
    const hasStep = (pred: (e: Ev) => boolean) => {
      const s = new Set<string>();
      for (const e of events) if (pred(e)) s.add(e.visitor_id);
      return s;
    };
    const fSite = hasStep((e) => e.event_type === "page_view");
    const fProduct = hasStep((e) => e.event_type === "page_view" && e.page_path.startsWith("/course/"));
    const fCart = hasStep((e) => e.event_type === "cart_open");
    const fCheckout = hasStep((e) => e.event_type === "checkout_step");
    const fOrder = hasStep((e) => e.event_type === "order_placed");
    const funnel = [
      { step: "Site par aaye", visitors: fSite.size },
      { step: "Product dekha", visitors: fProduct.size },
      { step: "Cart khola", visitors: fCart.size },
      { step: "Billing form", visitors: fCheckout.size },
      { step: "Order placed", visitors: fOrder.size },
    ];

    // ---- Product views + trending ----
    const viewsBySlug = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "page_view" && e.page_path.startsWith("/course/")) {
        const slug = e.page_path.replace(/^\/course\//, "").split(/[?#]/)[0];
        viewsBySlug.set(slug, (viewsBySlug.get(slug) || 0) + 1);
      }
    }
    const ordersByCourse = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const key = o.course_title || o.product_id || "Unknown";
      const cur = ordersByCourse.get(key) || { count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += Number(o.amount) || 0;
      ordersByCourse.set(key, cur);
    }
    const mostViewed = [...viewsBySlug.entries()]
      .map(([slug, views]) => ({
        title: titleBySlug.get(slug) || slug,
        views,
        sold: [...ordersByCourse.entries()]
          .filter(([t]) => t === (titleBySlug.get(slug) || slug))
          .reduce((s, [, v]) => s + v.count, 0),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);
    const mostSold = [...ordersByCourse.entries()]
      .map(([title, v]) => ({ title, qty: v.count, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ---- Per-product conversion (Phase D) ----
    // Keys are product IDs where known, else slugs (views) or raw ids.
    // Views: page_view on /course/<slug> → id via catalog. Buy clicks: click
    // events with element "buy_now" (listing pages only; product-page Buy is
    // ring-fenced and untracked). Cart: cart_item events (drawer-open
    // snapshot, NOT true adds). Orders: orders table product_id (primary
    // product only for multi-kit carts — existing orders-table limit).
    const conv = new Map<string, { views: number; buyClicks: number; cart: number; orders: number }>();
    const convRow = (key: string) => {
      if (!conv.has(key)) conv.set(key, { views: 0, buyClicks: 0, cart: 0, orders: 0 });
      return conv.get(key)!;
    };
    for (const [slug, views] of viewsBySlug) {
      convRow(idBySlug.get(slug) || slug).views += views;
    }
    for (const e of events) {
      if (e.event_type === "click" && e.element === "buy_now" && e.product_id) {
        convRow(e.product_id).buyClicks++;
      } else if (e.event_type === "cart_item" && e.product_id) {
        convRow(e.product_id).cart++;
      }
    }
    for (const o of orders) {
      if (o.product_id) convRow(o.product_id).orders++;
    }
    const conversion = [...conv.entries()]
      .map(([key, v]) => ({
        title: titleById.get(key) || titleBySlug.get(key) || key,
        ...v,
        conversionPct: v.views ? Math.round((v.orders / v.views) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // Trending: today views vs previous 2-day daily average (only for 1-day ranges;
    // for multi-day ranges, compare second half vs first half is skipped — show views only)
    let trending: { title: string; views: number; delta: string }[] = [];
    if (days === 1) {
      const prev2Start = new Date(new Date(start).getTime() - 2 * DAY_MS).toISOString();
      const prev2 = await fetchEvents(prev2Start, start, "page_path,event_type").catch(() => [] as Ev[]);
      const prevViews = new Map<string, number>();
      for (const e of prev2) {
        if (e.event_type === "page_view" && e.page_path.startsWith("/course/")) {
          const slug = e.page_path.replace(/^\/course\//, "").split(/[?#]/)[0];
          prevViews.set(slug, (prevViews.get(slug) || 0) + 1);
        }
      }
      trending = [...viewsBySlug.entries()]
        .map(([slug, views]) => {
          const avg = (prevViews.get(slug) || 0) / 2;
          const delta = avg === 0 ? (views > 0 ? "NEW" : "0") : `+${Math.round(((views - avg) / avg) * 100)}%`;
          return { title: titleBySlug.get(slug) || slug, views, delta };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 12);
    } else {
      trending = [...viewsBySlug.entries()]
        .map(([slug, views]) => ({ title: titleBySlug.get(slug) || slug, views, delta: "" }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 12);
    }

    // ---- Sources (first referrer/utm per visitor) ----
    const firstSource = new Map<string, string>();
    for (const e of [...events].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
      if (!firstSource.has(e.visitor_id)) {
        firstSource.set(e.visitor_id, categorizeSource(e.referrer, e.utm_source));
      }
    }
    const sourcesMap = new Map<string, number>();
    for (const s of firstSource.values()) sourcesMap.set(s, (sourcesMap.get(s) || 0) + 1);
    const sources = [...sourcesMap.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Attribution (Phase E): orders + revenue by source ----
    // Session-first source: the order's own utm_source; else its session's
    // first in-range event (utm or referrer); else unattributed (old orders,
    // missing migration, or a session that started before this range).
    const sessionFirst = new Map<string, { referrer: string | null; utm: string | null }>();
    for (const e of [...events].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))) {
      const key = `${e.visitor_id}|${e.session_id}`;
      if (!sessionFirst.has(key)) sessionFirst.set(key, { referrer: e.referrer, utm: e.utm_source });
    }
    const attrMap = new Map<string, { orders: number; revenue: number }>();
    let unattributedOrders = 0;
    for (const o of orders) {
      let source: string | null = null;
      if (o.utm_source) {
        source = categorizeSource(null, o.utm_source);
      } else if (o.visitor_id && o.session_id) {
        const sf = sessionFirst.get(`${o.visitor_id}|${o.session_id}`);
        if (sf) source = categorizeSource(sf.referrer, sf.utm);
      }
      if (!source) {
        unattributedOrders++;
        continue;
      }
      const cur = attrMap.get(source) || { orders: 0, revenue: 0 };
      cur.orders++;
      cur.revenue += Number(o.amount) || 0;
      attrMap.set(source, cur);
    }
    const attribution = [...attrMap.entries()]
      .map(([source, v]) => ({ source, orders: v.orders, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // ---- Top categories (from orders via product category) ----
    const catMap = new Map<string, { qty: number; revenue: number }>();
    for (const o of orders) {
      const cat = (o.product_id && categoryById.get(o.product_id)) || "Other";
      const cur = catMap.get(cat) || { qty: 0, revenue: 0 };
      cur.qty++;
      cur.revenue += Number(o.amount) || 0;
      catMap.set(cat, cur);
    }
    const topCategories = [...catMap.entries()]
      .map(([category, v]) => ({ category, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ---- Most clicked ----
    const clickMap = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "click" && e.element) {
        clickMap.set(e.element, (clickMap.get(e.element) || 0) + 1);
      }
    }
    const mostClicked = [...clickMap.entries()]
      .map(([element, count]) => ({ element, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // ---- Top pages (non-product) ----
    const pageMap = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "page_view" && !e.page_path.startsWith("/course/")) {
        pageMap.set(e.page_path, (pageMap.get(e.page_path) || 0) + 1);
      }
    }
    const topPages = [...pageMap.entries()]
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 15);

    // ---- Top searches (Phase A: only queries searched 2+ times, privacy) ----
    const searchMap = new Map<string, number>();
    for (const e of events) {
      if (e.event_type === "search" && e.search_query) {
        const q = e.search_query.toLowerCase().trim();
        if (q) searchMap.set(q, (searchMap.get(q) || 0) + 1);
      }
    }
    const topSearches = [...searchMap.entries()]
      .filter(([, count]) => count >= 2)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const data = {
      range,
      rangeLabel: window.label,
      bucketType: window.bucketType,
      kpis: {
        liveVisitors: liveByVisitor.size,
        visitors: visitorSet.size,
        visitorsChange: pctChange(visitorSet.size, prevVisitors),
        pageViews: pageViews,
        clicks,
        mobilePct: pageViews ? Math.round((mobileViews / pageViews) * 100) : 0,
        ordersPlaced,
        ordersPlacedChange: pctChange(ordersPlaced, prevPlaced),
        dbOrders: orders.length,
        revenue,
        revenueChange: pctChange(revenue, prevRevenue),
        conversion: visitorSet.size ? Math.round((ordersPlaced / visitorSet.size) * 1000) / 10 : 0,
      },
      live,
      activity,
      buckets,
      funnel,
      sessions,
      trending,
      mostViewed,
      mostSold,
      conversion,
      sources,
      attribution,
      unattributedOrders,
      topCategories,
      mostClicked,
      topPages,
      topSearches,
    };
    cache.set(cacheKey, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/analytics]", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
