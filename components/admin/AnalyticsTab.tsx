"use client";

import { useEffect, useState, useCallback } from "react";

interface AnalyticsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

type RangeKey = "today" | "yesterday" | "7d" | "30d";

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "today", label: "Aaj" },
  { id: "yesterday", label: "Kal" },
  { id: "7d", label: "7 din" },
  { id: "30d", label: "30 din" },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs">
      <h3 className="font-bold text-stone-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-32 shrink-0 text-xs text-stone-600 truncate" title={label}>{label}</span>
      <div className="flex-1 h-4 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 text-right text-xs font-bold text-stone-900">{value}{suffix || ""}</span>
    </div>
  );
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

export default function AnalyticsTab({ getAuthHeaders }: AnalyticsTabProps) {
  const [range, setRange] = useState<RangeKey>("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("load failed");
      setData(await res.json());
      setError("");
    } catch {
      setError("Analytics load nahi hua. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  }, [range, getAuthHeaders]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Live refresh every 30 seconds
  useEffect(() => {
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return <div className="bg-white border border-stone-200 rounded-2xl p-6 text-sm text-stone-500">Analytics load ho raha hai…</div>;
  }
  if (error && !data) {
    return <div className="bg-white border border-red-200 rounded-2xl p-6 text-sm text-red-600">{error}</div>;
  }
  if (!data) return null;

  const k = data.kpis;
  const maxBucketViews = Math.max(1, ...data.buckets.map((b: any) => b.views));
  const maxFunnel = Math.max(1, data.funnel[0]?.visitors || 1);

  return (
    <div className="space-y-4">
      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              range === r.id ? "bg-amber-600 text-white shadow-xs" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer"
        >
          Refresh
        </button>
        <span className="text-xs text-stone-400 ml-auto">Live har 30 sec me refresh hota hai</span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Live visitors", value: k.liveVisitors, sub: "pichhle 5 min" },
          { label: "Visitors", value: k.visitors, sub: `${k.visitorsChange >= 0 ? "+" : ""}${k.visitorsChange}%` },
          { label: "Page views", value: k.pageViews, sub: `${k.clicks} clicks · ${k.mobilePct}% mobile` },
          { label: "Orders placed", value: k.ordersPlaced, sub: `${k.ordersPlacedChange >= 0 ? "+" : ""}${k.ordersPlacedChange}%` },
          { label: "Revenue", value: `₹${k.revenue}`, sub: `${k.revenueChange >= 0 ? "+" : ""}${k.revenueChange}% · ${k.dbOrders} orders` },
          { label: "Conversion", value: `${k.conversion}%`, sub: "visitors → order" },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
            <p className="text-xs text-stone-500">{c.label}</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{c.value}</p>
            <p className="text-xs text-stone-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Session metrics (Phase B) */}
      <Card title="Visitors ki pehchaan">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <p className="text-xs text-stone-500">Naye visitors</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{data.sessions.newVisitors}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Wapas aaye</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{data.sessions.returningVisitors}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Bounce rate</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{data.sessions.bouncePct}%</p>
            <p className="text-xs text-stone-400 mt-1">ek page dekh kar gaye</p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Avg visit time</p>
            <p className="text-2xl font-black text-stone-900 mt-1">{fmtDuration(data.sessions.avgDurationSec)}</p>
            <p className="text-xs text-stone-400 mt-1">{data.sessions.pagesPerSession} pages/visit · {data.sessions.total} sessions</p>
          </div>
        </div>
        <Bar label="Naye" value={data.sessions.newVisitors} max={Math.max(1, data.sessions.newVisitors + data.sessions.returningVisitors)} />
        <Bar label="Wapas aaye" value={data.sessions.returningVisitors} max={Math.max(1, data.sessions.newVisitors + data.sessions.returningVisitors)} />
        <p className="text-xs text-stone-400 mt-2">Note: 90 din se pehle aaya visitor "naya" dikhega (retention ki limit). Session time per-tab, approximate hai.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Live */}
        <Card title={`Abhi site par kaun hai (${k.liveVisitors})`}>
          {data.live.length === 0 ? (
            <p className="text-sm text-stone-500">Pichhle 5 min me koi active nahi.</p>
          ) : (
            <ul className="space-y-2">
              {data.live.map((v: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-bold text-stone-900">{v.visitor}</span>
                  <span className="text-stone-500 truncate">{v.lastEvent} · {v.page}</span>
                  <span className="text-stone-400 ml-auto shrink-0">{fmtTime(v.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Funnel */}
        <Card title="Kharidne ka raasta (funnel)">
          {data.funnel.map((f: any) => (
            <Bar key={f.step} label={f.step} value={f.visitors} max={maxFunnel} />
          ))}
          <p className="text-xs text-stone-400 mt-2">Unique visitors per step — har step pichhle ka subset hai.</p>
        </Card>
      </div>

      {/* Buckets chart */}
      <Card title={data.buckets.length > 24 || data.range !== "today" && data.range !== "yesterday" ? "Din-wise visitors aur orders" : "Ghante-wise visitors aur orders"}>
        <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: 120 }}>
          {data.buckets.map((b: any) => (
            <div key={b.label} className="flex flex-col items-center gap-1 shrink-0" style={{ width: 28 }}>
              <span className="text-[10px] font-bold text-stone-900">{b.views}</span>
              <div
                className="w-5 bg-amber-600/80 rounded-t"
                style={{ height: Math.max(4, Math.round((b.views / maxBucketViews) * 90)) }}
                title={`${b.label}: ${b.visitors} visitors, ${b.views} views, ${b.orders} orders`}
              />
              <span className="text-[10px] text-stone-400">{b.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-1">Bar = page views. Hover par visitors/orders dikhenge.</p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <Card title="Recent activity">
          {data.activity.length === 0 ? (
            <p className="text-sm text-stone-500">Is range me koi activity nahi.</p>
          ) : (
            <ul className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {data.activity.map((a: any, i: number) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-stone-400 shrink-0">{fmtTime(a.at)}</span>
                  <span className={`font-bold shrink-0 ${a.kind === "order" ? "text-emerald-700" : "text-stone-900"}`}>{a.text}</span>
                  <span className="text-stone-500 truncate">{a.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Trending */}
        <Card title="Abhi trending">
          {data.trending.length === 0 ? (
            <p className="text-sm text-stone-500">Koi trending product nahi.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.trending.map((t: any, i: number) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-stone-900 truncate flex-1">{t.title}</span>
                  <span className="font-bold shrink-0">{t.views} views</span>
                  {t.delta && <span className="text-emerald-700 font-bold shrink-0">{t.delta}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Sabse zyada dekhe gaye">
          {data.mostViewed.map((p: any, i: number) => (
            <Bar key={i} label={p.title} value={p.views} max={Math.max(1, data.mostViewed[0]?.views || 1)} suffix={` · ${p.sold} bike`} />
          ))}
          {data.mostViewed.length === 0 && <p className="text-sm text-stone-500">Koi data nahi.</p>}
        </Card>
        <Card title="Sabse zyada bike">
          {data.mostSold.map((p: any, i: number) => (
            <div key={i} className="flex gap-2 text-sm py-1">
              <span className="truncate flex-1">{p.title}</span>
              <span className="font-bold shrink-0">{p.qty} × ₹{p.revenue}</span>
            </div>
          ))}
          {data.mostSold.length === 0 && <p className="text-sm text-stone-500">Koi sale nahi.</p>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Log kahan se aaye">
          {data.sources.map((s: any) => (
            <Bar key={s.source} label={s.source} value={s.count} max={Math.max(1, data.sources[0]?.count || 1)} />
          ))}
          {data.sources.length === 0 && <p className="text-sm text-stone-500">Koi data nahi.</p>}
        </Card>
        <Card title="Top exam / category (bikri)">
          {data.topCategories.map((c: any, i: number) => (
            <div key={i} className="flex gap-2 text-sm py-1">
              <span className="truncate flex-1">{c.category}</span>
              <span className="font-bold shrink-0">{c.qty} × ₹{c.revenue}</span>
            </div>
          ))}
          {data.topCategories.length === 0 && <p className="text-sm text-stone-500">Koi data nahi.</p>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Sabse zyada click">
          {data.mostClicked.map((c: any) => (
            <Bar key={c.element} label={c.element} value={c.count} max={Math.max(1, data.mostClicked[0]?.count || 1)} />
          ))}
          {data.mostClicked.length === 0 && <p className="text-sm text-stone-500">Koi click data nahi.</p>}
        </Card>
        <Card title="Top pages (product ke alawa)">
          {data.topPages.map((p: any) => (
            <Bar key={p.page} label={p.page} value={p.views} max={Math.max(1, data.topPages[0]?.views || 1)} />
          ))}
          {data.topPages.length === 0 && <p className="text-sm text-stone-500">Koi data nahi.</p>}
        </Card>
      </div>

      <Card title="Log kya dhoondh rahe hain">
        {data.topSearches.map((s: any) => (
          <Bar key={s.query} label={s.query} value={s.count} max={Math.max(1, data.topSearches[0]?.count || 1)} />
        ))}
        {data.topSearches.length === 0 && (
          <p className="text-sm text-stone-500">Abhi koi search data nahi. Sirf 2 ya zyada baar wali searches yahan dikhengi (privacy ke liye).</p>
        )}
        <p className="text-xs text-stone-400 mt-2">Sirf 2+ baar wali searches dikhti hain — ek baar wali (jo personal ho sakti hai) kabhi nahi.</p>
      </Card>

      <p className="text-xs text-stone-400">
        Note: WhatsApp se aane wale aksar “Direct” dikhenge (app se khulne par referrer nahi milta) — ye har analytics ki limit hai, bug nahi.
        Dashboard me kabhi customer ka naam, phone, email ya UTR nahi dikhta.
      </p>
    </div>
  );
}
