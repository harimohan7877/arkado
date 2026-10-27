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
};

/** [start, end) ISO strings for a range, in IST (no DST in India). */
function rangeWindow(range: string): { start: string; end: string; days: number } {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth();
  const d = istNow.getUTCDate();
  const todayStart = Date.UTC(y, m, d) - IST_OFFSET_MS;
  if (range === "yesterday") {
    return { start: new Date(todayStart - DAY_MS).toISOString(), end: new Date(todayStart).toISOString(), days: 1 };
  }
  if (range === "7d") {
    return { start: new Date(todayStart - 6 * DAY_MS).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 7 };
  }
  if (range === "30d") {
    return { start: new Date(todayStart - 29 * DAY_MS).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 30 };
  }
  // today
  return { start: new Date(todayStart).toISOString(), end: new Date(todayStart + DAY_MS).toISOString(), days: 1 };
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

async function fetchOrders(start: string, end: string): Promise<Ord[]> {
  const out: Ord[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_orders")
      .select("razorpay_order_id,product_id,course_title,amount,payment_status,delivery_status,created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as unknown as Ord[]));
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
    const cached = cache.get(range);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const { start, end, days } = rangeWindow(range);
    const prevStart = new Date(new Date(start).getTime() - days * DAY_MS).toISOString();
    const prevEnd = start;

    const [events, orders, prevEvents, prevOrders] = await Promise.all([
      fetchEvents(start, end, "*").catch(() => [] as Ev[]),
      fetchOrders(start, end).catch(() => [] as Ord[]),
      fetchEvents(prevStart, prevEnd, "visitor_id,event_type").catch(() => [] as Ev[]),
      fetchOrders(prevStart, prevEnd).catch(() => [] as Ord[]),
    ]);

    // Course map for titles/categories (server-cached catalog)
    let titleBySlug = new Map<string, string>();
    let titleById = new Map<string, string>();
    let categoryById = new Map<string, string>();
    try {
      const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
      for (const c of courses) {
        const title = c.title || c.id || "";
        if (c.slug) titleBySlug.set(c.slug, title);
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
      trending,
      mostViewed,
      mostSold,
      sources,
      topCategories,
      mostClicked,
      topPages,
      topSearches,
    };
    cache.set(range, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[admin/analytics]", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
