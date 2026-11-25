"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { categoryIconFor } from "@/lib/category-icons";
import { applySale, getSalePct } from "@/lib/sale-pricing";
import { fetchWithCache, useCategories, useSettings } from "@/lib/store-hooks";
import type { Course } from "@/lib/store-types";

const DEFAULT_SHORTCUTS = [
  ["ssc", "SSC"], ["railways", "Railways"], ["banking", "Banking"],
  ["rajasthan", "Rajasthan Exams"], ["central_teaching", "Teaching"], ["upsc", "UPSC"],
] as const;

function isPublicSample(url?: string) {
  try {
    const link = new URL(url ?? "");
    return link.protocol === "https:" && (
      link.hostname !== "drive.google.com" ||
      /^\/(?:file\/d\/|drive\/(?:u\/\d+\/)?folders\/)/.test(link.pathname) ||
      link.pathname === "/open" && link.searchParams.has("id")
    );
  } catch {
    return false;
  }
}

export default function SearchHero() {
  const { settings } = useSettings();
  const { categories } = useCategories();
  const config = settings?.homepage?.discovery_hero;
  const sampleId = config?.sample_course?.trim() || "";
  const [sampleResult, setSampleResult] = useState<{ id: string; course?: Course }>();

  useEffect(() => {
    if (!sampleId) return;
    let active = true;
    fetchWithCache<Course[]>(`/api/courses?exam=${encodeURIComponent(sampleId)}`).then((courses) => {
      if (!active || !Array.isArray(courses)) return;
      const course = courses.find((item) =>
        (item.id === sampleId || item.slug === sampleId) && isPublicSample(item.sample_pdf_url)
      );
      setSampleResult({ id: sampleId, course });
    }).catch(() => {});
    return () => { active = false; };
  }, [sampleId]);

  const sample = sampleId === sampleResult?.id ? sampleResult.course : undefined;
  const defaultLabels = new Map<string, string>(DEFAULT_SHORTCUTS);
  const selectedIds = config?.shortcut_ids?.split(",").map((id) => id.trim()).filter(Boolean);
  const preferredIds = selectedIds?.length ? selectedIds : DEFAULT_SHORTCUTS.map(([id]) => id);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const activeShortcuts = [...new Set(preferredIds)]
    .filter((id) => categoryById.has(id))
    .slice(0, 6);

  return (
    <section className="border-b border-stone-200 bg-hero-paper">
      <div className={`mx-auto grid max-w-[1200px] gap-6 px-4 py-6 sm:py-10 ${sample ? "md:grid-cols-[3fr_2fr] md:gap-12" : ""}`}>
        <div className="min-w-0">
          <h1 className="text-[28px] font-black leading-tight text-hero-ink lg:text-[42px]">
            {config?.heading?.trim() || "All-India Exam Notes, MCQs & Mock Tests"}
          </h1>
          <p className="mt-2 text-base leading-6 text-hero-secondary">
            {config?.description?.trim() || "Study notes, solved MCQs, mock tests and CBT practice across exam categories."}
          </p>
          <div className="mt-5 max-w-2xl">
            <p className="mb-2 text-sm font-bold text-hero-ink">Search by exam</p>
            <SearchBar />
          </div>

          <nav aria-label="Browse by exam category" className="mt-5">
            <h2 className="mb-2 text-sm font-bold text-hero-ink">Browse by exam category</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:max-w-2xl">
              {activeShortcuts.map((id) => {
                const Icon = categoryIconFor(id);
                const name = categoryById.get(id)?.name || id;
                const label = defaultLabels.get(id) || name.match(/\(([^()]+)\)\s*$/)?.[1] || name;
                return (
                  <li key={id}>
                    <Link href={`/category/${encodeURIComponent(id)}`}
                      className="flex min-h-11 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:border-amber-700 focus-visible:outline-2 focus-visible:outline-amber-700">
                      <Icon size={16} className="shrink-0 text-amber-700" />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/exams" className="mt-2 inline-flex min-h-11 items-center font-semibold text-amber-800 hover:underline">
              View all exams
            </Link>
          </nav>
        </div>

        {sample && (
          <aside aria-label="Featured PDF sample" className="self-start rounded-xl border border-stone-200 bg-white p-5 md:mt-2">
            <p className="text-sm font-semibold text-amber-800">Free PDF sample</p>
            <h2 className="mt-2 text-lg font-bold text-stone-900">{sample.title}</h2>
            <p className="mt-2 text-sm text-stone-600">
              {[sample.language, sample.format].filter(Boolean).join(" · ")}
            </p>
            {sample.price > 0 && (
              <p className="mt-2 text-sm font-semibold text-stone-900">
                Full kit ₹{applySale(sample.price, getSalePct(settings))}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-amber-800">
              <a href={sample.sample_pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center hover:underline">
                View PDF Sample <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <Link href={`/course/${encodeURIComponent(sample.slug || sample.id)}`} className="inline-flex min-h-11 items-center hover:underline">
                View full kit
              </Link>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
