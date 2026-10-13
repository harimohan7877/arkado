"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  NAVRATRI_DAYS,
  NAVRATRI_END_MS,
  getNavratriStatus,
  getNavratriDayInfo,
} from "@/lib/navratri";
import { getFestivalOffer } from "@/lib/default-settings";
import { useSiteSale, fillTemplate } from "@/lib/sale-pricing";
import { useSettings } from "@/lib/store-hooks";

function splitRemaining(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Navratri campaign section — light, simple, human.
 * Auto day detection (IST), auto-hides after 20 Oct.
 * Sale info (discount %, end date) comes from admin: Settings → फेस्टिवल ऑफर.
 */
export default function NavratriSection() {
  const status = useMemo(() => getNavratriStatus(), []);
  const { pct: salePct, isLive: saleLive } = useSiteSale();
  const { settings } = useSettings();
  const [previewDay, setPreviewDay] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Reset image fallback when switching days
  useEffect(() => {
    setImgOk(true);
  }, [previewDay]);

  const offer = useMemo(() => getFestivalOffer(settings), [settings]);
  const saleEndMs = useMemo(() => {
    const t = new Date(offer.sale_ends_at).getTime();
    return Number.isNaN(t) ? NAVRATRI_END_MS : t;
  }, [offer.sale_ends_at]);

  if (status.phase !== "live") return null;

  const today = status.day;
  const activeDay = previewDay ?? today;
  const info = getNavratriDayInfo(activeDay);
  const isPreviewing = previewDay !== null && previewDay !== today;

  const { d, h, m, s } = splitRemaining(saleEndMs, nowMs ?? saleEndMs);
  const countdownText =
    nowMs === null ? "–" : `${d} दिन ${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <section id="navratri" className="border-y border-amber-200/80 bg-[#FFFBF3]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Devi image — small (graceful fallback until images are uploaded) */}
          <div className="shrink-0">
            <div className="flex h-32 w-24 items-center justify-center overflow-hidden rounded-b-xl rounded-t-full border-2 border-amber-300 bg-amber-100 shadow-md sm:h-44 sm:w-32">
              {imgOk ? (
                <img
                  key={info.image}
                  src={info.image}
                  alt={info.deviHindi}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={() => setImgOk(false)}
                />
              ) : (
                <span className="text-4xl sm:text-5xl">🪔</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-800">
              {fillTemplate(offer.badge_template, { day: today, pct: salePct })}
            </p>
            <h2 className="mt-1.5 text-2xl font-black text-stone-900 sm:text-3xl">
              {info.deviHindi}
              {isPreviewing && (
                <span className="ml-2 align-middle text-xs font-bold text-stone-500">
                  (दिन {activeDay})
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-amber-700">
              {info.weekday}, {info.dateLabel}
            </p>
            <p className="mt-1.5 text-sm font-bold italic text-stone-600">
              “{info.mantra}”
            </p>

            {saleLive && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-black text-emerald-700">
                  {fillTemplate(offer.sale_line_template, { day: today, pct: salePct })}
                </p>
                {offer.discount_line2 && (
                  <p className="text-[13px] font-bold text-stone-700">
                    + {offer.discount_line2}
                  </p>
                )}
                <p className="text-[13px] font-bold tabular-nums text-amber-700">
                  {offer.countdown_label} {countdownText}
                </p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href={offer.cta_link || "/exams"}
                className="rounded-full bg-amber-700 px-5 py-2 text-sm font-black text-white transition hover:bg-amber-800 active:scale-95"
              >
                {offer.cta_text || "कोर्स देखें"} →
              </Link>
              {isPreviewing && (
                <button
                  onClick={() => setPreviewDay(null)}
                  className="cursor-pointer text-xs font-black text-amber-700 underline underline-offset-2 active:scale-95"
                >
                  ← आज का दिन
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Day navigator — slim pills */}
        <div className="scrollbar-none mt-4 flex gap-1.5 overflow-x-auto pb-0.5">
          {NAVRATRI_DAYS.map((d) => {
            const isToday = d.day === today;
            const isPast = d.day < today;
            const isActive = d.day === activeDay;
            return (
              <button
                key={d.day}
                onClick={() => setPreviewDay(d.day)}
                title={`${d.deviHindi} — ${d.dateLabel}`}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? "border-amber-600 bg-amber-700 text-white shadow-sm"
                    : "border-amber-200 bg-white text-stone-600 hover:border-amber-400"
                } ${isPast && !isActive ? "opacity-60" : ""}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isPast && !isToday ? "✓" : d.day}
                </span>
                {d.deviShort}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
