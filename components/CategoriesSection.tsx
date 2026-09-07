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
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const map: Record<string, Exam[]> = {};
        for (const cat of categories) {
          const res = await fetch(`/api/exams?category=${cat.id}`);
          if (res.ok) {
            const exams = await res.json();
            map[cat.id] = exams.filter((e: Exam) => e.is_active);
          }
        }
        setExamsByCategory(map);
      } catch (err) {
        console.error("Failed to fetch exams:", err);
      } finally {
        setLoading(false);
      }
    };
    if (categories.length > 0) fetchExams();
  }, [categories]);

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return examsByCategory;
    const q = searchQuery.toLowerCase();
    const result: Record<string, Exam[]> = {};
    Object.entries(examsByCategory).forEach(([catId, exams]) => {
      const filtered = exams.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.short_name.toLowerCase().includes(q) ||
        e.board.toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[catId] = filtered;
    });
    return result;
  }, [examsByCategory, searchQuery]);

  const handleCategoryClick = (catId: string) => {
    if (selectedCategory === catId) {
      onSelectCategory("all");
      setExpandedCategory(null);
    } else {
      onSelectCategory(catId);
      setExpandedCategory(catId);
    }
  };

  const sectionTitle = title || settings?.homepage?.categories_section_title || "Browse Top Categories";
  const totalExams = Object.values(examsByCategory).reduce((sum, exams) => sum + exams.length, 0);

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">{sectionTitle}</span>
          </div>
        </div>
        <div className="h-8 bg-stone-100 rounded-xl animate-pulse" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">{sectionTitle}</h2>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {categories.length} categories • {totalExams}+ exams
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search exams..."
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
            className="px-3 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <GridIcon size={12} />
            View All
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const exams = filteredExams[cat.id] || [];

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`group flex flex-col items-center p-3 rounded-2xl text-center transition-all cursor-pointer border ${
                isSelected
                  ? "bg-amber-50 border-amber-300 shadow-md"
                  : "bg-white border-stone-200 hover:border-amber-300 hover:shadow-md"
              }`}
            >
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-stone-50 border-2 border-stone-100 group-hover:border-amber-300 transition-all mb-2">
                {cat.logo_url ? (
                  <Image
                    src={cat.logo_url}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl">
                    {cat.icon}
                  </div>
                )}
              </div>
              <p className={`text-xs sm:text-sm font-bold leading-tight line-clamp-2 ${
                isSelected ? "text-amber-800" : "text-stone-800 group-hover:text-amber-700"
              }`}>
                {cat.name}
              </p>
              {exams.length > 0 && (
                <span className={`text-[10px] mt-0.5 font-medium ${
                  isSelected ? "text-amber-700" : "text-stone-500"
                }`}>
                  {exams.length} exams
                </span>
              )}
            </button>
          );
        })}
      </div>

      {expandedCategory && filteredExams[expandedCategory] && filteredExams[expandedCategory].length > 0 && (
        <div className="mt-4 anim-slide-down">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900">
                {categories.find(c => c.id === expandedCategory)?.name} — Available Exams
              </h4>
              <Link
                href={`/category/${expandedCategory}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredExams[expandedCategory].map((exam) => (
                <button
                  key={exam.id}
                  onClick={(e) => { e.stopPropagation(); onSelectCategory(exam.id); }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 transition-all border border-transparent hover:border-stone-200 text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-stone-100 shrink-0">
                    {exam.logo_url ? (
                      <Image src={exam.logo_url} alt={exam.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <span className="text-lg">📋</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate text-sm">{exam.name}</p>
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <span>{exam.board}</span>
                      {exam.status === "open" && <span className="text-emerald-600">● Live</span>}
                      {exam.status === "upcoming" && <span className="text-blue-600">● Upcoming</span>}
                      {exam.status === "expected" && <span className="text-amber-600">● Expected</span>}
                      {exam.status === "closed" && <span className="text-stone-500">● Closed</span>}
                    </p>
                  </div>
                  <span className="text-stone-400">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}