"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import { ClockIcon, FileTextIcon } from "@/components/icons";
import { categoryIconFor } from "@/lib/category-icons";
import { applySale, getSalePct } from "@/lib/sale-pricing";
import { fetchWithCache, useCategories, useSettings } from "@/lib/store-hooks";
import type { Course } from "@/lib/store-types";

const action = "inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 active:scale-[0.98]";

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
      <div className="mx-auto grid max-w-[1200px] items-start gap-6 px-4 py-6 sm:py-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
        <div className="min-w-0">
          <h1 className="max-w-xl text-[28px] font-black leading-[1.1] tracking-tight text-hero-ink min-[380px]:text-[32px] lg:text-[46px]">
            {config?.heading?.trim() || "Find your exam. Practice with real mock tests."}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 lg:text-base text-hero-secondary">
            {config?.description?.trim() || "Study notes, solved MCQs and timed mock tests for exams across India."}
          </p>
          <div className="mt-5 max-w-2xl">
            <SearchBar placeholder={config?.search_placeholder?.trim() || "Search by exam name"} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex">
            <Link href="/exams" className={`${action} bg-amber-800 text-white hover:bg-amber-900 sm:min-w-36`}>
              {config?.browse_label?.trim() || "Browse Exams"}
            </Link>
            <Link href="/free-mock-tests" prefetch={false} className={`${action} border border-amber-800 bg-white text-amber-900 hover:bg-amber-50 sm:min-w-44`}>
              {config?.mock_label?.trim() || "Try a Free Mock Test"}
            </Link>
          </div>

          <nav aria-label="Popular exam categories" className="mt-5">
            <h2 className="mb-2 text-sm font-bold text-hero-ink">Popular exam categories</h2>
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

          </nav>
          <p className="mt-4 flex items-start gap-2 text-sm leading-5 text-stone-700 lg:hidden">
            <FileTextIcon size={17} className="mt-0.5 shrink-0 text-amber-800" />
            {config?.html_note?.trim() || "Select kits include HTML tests that open in a browser on phone or PC."}
          </p>
        </div>

        <div className="hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:block">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-4">
            <h2 className="text-base font-bold text-stone-950">{config?.preview_title?.trim() || "CBT preview"}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-950">
              <ClockIcon size={16} /> 20 timed questions
            </span>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-stone-600">Sample question</p>
            <p className="mt-1 text-lg font-bold text-stone-950">What is 25% of 240?</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {["48", "60", "72", "80"].map((option, index) => (
                <li key={option} className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-800">
                  <span className="text-xs font-semibold text-stone-600">{String.fromCharCode(65 + index)}.</span> {option}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-medium text-stone-700">Jump between questions, mark for review and see explanations after submitting.</p>
          </div>
          <p className="flex items-start gap-2 border-t border-stone-200 px-5 py-4 text-sm leading-5 text-stone-700">
            <FileTextIcon size={18} className="mt-0.5 shrink-0 text-amber-800" />
            {config?.html_note?.trim() || "Select kits include HTML tests that open in a browser on phone or PC."}
          </p>
        </div>

        {sample && (
          <aside aria-label="Featured PDF sample" className="self-start rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
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
