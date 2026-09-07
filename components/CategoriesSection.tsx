"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Category, Exam, Settings } from "@/lib/store-types";
import { SearchIcon, CloseIcon, GridIcon } from "@/components/icons";

interface CategoriesSectionProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  title?: string;
}

export default function CategoriesSection({ categories, selectedCategory, onSelectCategory, title }: CategoriesSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [examsByCategory, setExamsByCategory] = useState<Record<string, Exam[]>>({});
  const [loadingExams, setLoadingExams] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Fetch exams on demand when a category is expanded
  const fetchCategoryExams = async (catId: string) => {
    if (examsByCategory[catId] || loadingExams[catId]) return;
    setLoadingExams(prev => ({ ...prev, [catId]: true }));
    try {
      const res = await fetch(`/api/exams?category=${catId}&include_inactive=true&limit=30`);
      if (res.ok) {
        const data = await res.json();
        const exams = Array.isArray(data) ? data : data.exams || [];
        setExamsByCategory(prev => ({ ...prev, [catId]: exams }));
      }
    } catch (err) {
      console.error("Failed to fetch exams for category:", catId, err);
    } finally {
      setLoadingExams(prev => ({ ...prev, [catId]: false }));
    }
  };

  const handleCategoryClick = (catId: string) => {
    if (selectedCategory === catId) {
      onSelectCategory("all");
      setExpandedCategory(null);
    } else {
      onSelectCategory(catId);
      setExpandedCategory(catId);
      fetchCategoryExams(catId);
    }
  };

  // Filter categories by search
  const visibleCategories = useMemo(() => {
    let list = categories;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.state_or_group && c.state_or_group.toLowerCase().includes(q)));
    } else {
      // Limit to top 18 on homepage to prevent DOM bloat, keeping site lightning fast
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
              placeholder="Search 500+ categories..."
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
            className="px-3.5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <GridIcon size={12} />
            All Exams ({totalExamsCount})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {visibleCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = cat.exam_count || cat.exam_ids?.length || 0;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`group flex flex-col items-center p-3 rounded-2xl text-center transition-all cursor-pointer border ${
                isSelected
                  ? "bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-200"
                  : "bg-white border-stone-200 hover:border-amber-300 hover:shadow-md"
              }`}
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-stone-50 border-2 border-stone-100 group-hover:border-amber-300 transition-all mb-2 flex items-center justify-center p-1">
                {cat.logo_url ? (
                  <Image
                    src={cat.logo_url}
                    alt={cat.name}
                    width={72}
                    height={72}
                    className="object-contain max-h-full max-w-full rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl">
                    {cat.icon || "🏛️"}
                  </div>
                )}
              </div>
              <p className={`text-xs font-bold leading-tight line-clamp-2 ${
                isSelected ? "text-amber-800" : "text-stone-800 group-hover:text-amber-700"
              }`}>
                {cat.name}
              </p>
              <span className={`text-[10px] mt-1 font-semibold px-2 py-0.5 rounded-full ${
                isSelected ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
              }`}>
                {count} {count === 1 ? "exam" : "exams"}
              </span>
            </button>
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

      {/* EXPANDED CATEGORY EXAMS DRAWER / SECTION */}
      {expandedCategory && (
        <div className="mt-4 anim-slide-down">
          <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  {categories.find(c => c.id === expandedCategory)?.name}
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Browse exams listed under this department / organization
                </p>
              </div>
              <Link
                href={`/category/${expandedCategory}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1"
              >
                Category Page →
              </Link>
            </div>

            {loadingExams[expandedCategory] ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-xs text-stone-500">Loading exams...</p>
              </div>
            ) : examsByCategory[expandedCategory]?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {examsByCategory[expandedCategory].map((exam) => {
                  const cat = categories.find(c => c.id === expandedCategory);
                  const examLogo = exam.logo_url || cat?.logo_url;

                  return (
                    <div
                      key={exam.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/70 hover:bg-white transition-all border border-stone-200 hover:border-amber-300 hover:shadow-xs group"
                    >
                      <div className="relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white border border-stone-200 shrink-0 p-1">
                        {examLogo ? (
                          <Image src={examLogo} alt={exam.name} width={36} height={36} className="object-contain max-h-full max-w-full" />
                        ) : (
                          <span className="text-base">📋</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-900 truncate text-xs group-hover:text-amber-700">
                          {exam.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {exam.is_active ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              ● Live Bundle
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                              Kit Coming Soon
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 truncate">{exam.board || cat?.name}</span>
                        </div>
                      </div>
                      {exam.is_active ? (
                        <button
                          onClick={() => onSelectCategory(exam.id)}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 px-2 py-1 rounded bg-amber-50 shrink-0 cursor-pointer"
                        >
                          View
                        </button>
                      ) : (
                        <Link
                          href={`/category/${expandedCategory}`}
                          className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 shrink-0"
                        >
                          Details
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-500">
                No exams found in this category.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}