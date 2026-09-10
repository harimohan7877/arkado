"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Category, Settings } from "@/lib/store-types";
import { SearchIcon, CloseIcon, GridIcon } from "@/components/icons";

interface CategoriesSectionProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory?: (catId: string) => void;
  title?: string;
}

export default function CategoriesSection({ categories, title }: CategoriesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Filter categories by search
  const visibleCategories = useMemo(() => {
    let list = categories;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.state_or_group && c.state_or_group.toLowerCase().includes(q)));
    } else {
      list = list.slice(0, 18);
    }
    return list;
  }, [categories, searchQuery]);

  const totalExamsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.exam_count || c.exam_ids?.length || 0), 0);
  }, [categories]);

  const sectionTitle = title || settings?.homepage?.categories_section_title || "Browse Top Categories";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">{sectionTitle}</h2>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {categories.length} categories • {totalExamsCount}+ exams
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <input
              type="text"
              placeholder={`Search ${categories.length} categories...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-stone-300 text-xs placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-2xs"
            />
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded hover:bg-stone-100 flex items-center justify-center text-stone-400 cursor-pointer">
                <CloseIcon size={12} />
              </button>
            )}
          </div>
          <Link
            href="/exams"
            className="px-3.5 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <GridIcon size={12} />
            All Exams ({totalExamsCount})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {visibleCategories.map((cat) => {
          const count = cat.exam_count || cat.exam_ids?.length || 0;

          return (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className="group flex flex-col items-center p-3 rounded-2xl text-center transition-all cursor-pointer border bg-white border-stone-200 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-stone-50 border-2 border-stone-100 group-hover:border-amber-300 transition-all mb-2 flex items-center justify-center p-1">
                {cat.logo_url && !failedImages[cat.id] ? (
                  <Image
                    src={cat.logo_url}
                    alt={cat.name}
                    width={72}
                    height={72}
                    unoptimized
                    onError={() => setFailedImages((prev) => ({ ...prev, [cat.id]: true }))}
                    className="object-contain max-h-full max-w-full rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl">
                    {cat.icon || "🏛️"}
                  </div>
                )}
              </div>
              <p className="text-xs font-bold leading-tight line-clamp-2 text-stone-800 group-hover:text-amber-700 transition">
                {cat.name}
              </p>
              <span className="text-[10px] mt-1 font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 group-hover:bg-amber-50 group-hover:text-amber-800 transition">
                {count} {count === 1 ? "exam" : "exams"} →
              </span>
            </Link>
          );
        })}
      </div>

      {visibleCategories.length === 0 && (
        <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="text-sm text-stone-500 font-medium">No categories matching &quot;{searchQuery}&quot;</p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-amber-700 font-bold mt-2 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {categories.length > 18 && !searchQuery && (
        <div className="text-center pt-2">
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold shadow-xs hover:border-amber-400 transition"
          >
            <GridIcon size={14} className="text-amber-600" />
            Explore All {categories.length} Categories &amp; {totalExamsCount}+ Exams →
          </Link>
        </div>
      )}
    </section>
  );
}