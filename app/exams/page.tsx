"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Category, Exam } from "@/lib/store-types";
import { SearchIcon, CloseIcon, GridIcon, ChevronDownIcon, ChevronRightIcon, ArrowRightIcon } from "@/components/icons";

const POPULAR_FILTERS = [
  { id: "all", label: "All" },
];

export default function AllExamsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [categoryExams, setCategoryExams] = useState<Record<string, Exam[]>>({});
  const [loadingExams, setLoadingExams] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    fetch("/api/categories?scope=public")
      .then((res) => res.json())
      .then((data: Category[]) => {
        setCategories(data);
      })
      .catch((err) => console.error("Failed to fetch categories:", err))
      .finally(() => setLoading(false));
  }, []);

  const fetchExamsForCategory = async (catId: string) => {
    if (categoryExams[catId] || loadingExams[catId]) return;
    setLoadingExams((prev) => ({ ...prev, [catId]: true }));
    try {
      const res = await fetch(`/api/exams?category=${catId}&include_inactive=true&limit=100`);
      if (res.ok) {
        const data = await res.json();
        const exams = Array.isArray(data) ? data : data.exams || [];
        setCategoryExams((prev) => ({ ...prev, [catId]: exams }));
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
    } finally {
      setLoadingExams((prev) => ({ ...prev, [catId]: false }));
    }
  };

  const handleToggleExpand = (catId: string) => {
    if (expandedCatId === catId) {
      setExpandedCatId(null);
    } else {
      setExpandedCatId(catId);
      fetchExamsForCategory(catId);
    }
  };

  // Filter categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.name_hi && cat.name_hi.toLowerCase().includes(q)) ||
        (cat.state_or_group && cat.state_or_group.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === "all") return true;

      const nameLower = cat.name.toLowerCase();
      const stateLower = (cat.state_or_group || "").toLowerCase();

      if (activeFilter === "rajasthan") {
        return (
          stateLower.includes("rajasthan") ||
          nameLower.includes("rajasthan") ||
          nameLower.includes("rssb") ||
          nameLower.includes("rpsc")
        );
      }
      if (activeFilter === "central") {
        return (
          nameLower.includes("nta") ||
          nameLower.includes("cuet") ||
          nameLower.includes("central") ||
          nameLower.includes("upsc") ||
          nameLower.includes("national")
        );
      }
      if (activeFilter === "banking") {
        return nameLower.includes("bank") || nameLower.includes("ibps") || nameLower.includes("sbi") || nameLower.includes("rbi") || nameLower.includes("insurance");
      }
      if (activeFilter === "ssc") {
        return nameLower.includes("ssc") || nameLower.includes("staff selection");
      }
      if (activeFilter === "railways") {
        return nameLower.includes("railway") || nameLower.includes("rrb");
      }
      if (activeFilter === "defence") {
        return nameLower.includes("police") || nameLower.includes("army") || nameLower.includes("defence") || nameLower.includes("nda") || nameLower.includes("cds");
      }
      if (activeFilter === "teaching") {
        return nameLower.includes("tet") || nameLower.includes("teaching") || nameLower.includes("ctet") || nameLower.includes("reet");
      }

      return true;
    });
  }, [categories, searchQuery, activeFilter]);

  const displayedCategories = useMemo(() => {
    return filteredCategories.slice(0, visibleCount);
  }, [filteredCategories, visibleCount]);

  const totalExamsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.exam_count || c.exam_ids?.length || 0), 0);
  }, [categories]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar />

      <main className="flex-1">
        {/* HEADER HERO */}
        <section className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-stone-800">
          <div className="max-w-7xl mx-auto space-y-4 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-amber-400">
              <Link href="/" className="hover:underline text-stone-400">Home</Link>
              <span>/</span>
              <span className="text-amber-400 font-bold">All Categories &amp; Exams</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                  Exam &amp; Category Directory
                </h1>
                <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                  Search through <span className="text-amber-400 font-bold">{categories.length}</span> verified examination boards and <span className="text-amber-400 font-bold">{totalExamsCount.toLocaleString()}+</span> exams across India.
                </p>
              </div>

              {/* STATS BADGE */}
              <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-3 px-5 border border-white/10">
                <div className="text-center">
                  <span className="block text-xl sm:text-2xl font-black text-amber-400">{categories.length}</span>
                  <span className="text-[11px] uppercase tracking-wider text-stone-300 font-bold">Categories</span>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <span className="block text-xl sm:text-2xl font-black text-amber-400">{totalExamsCount.toLocaleString()}</span>
                  <span className="text-[11px] uppercase tracking-wider text-stone-300 font-bold">Total Exams</span>
                </div>
              </div>
            </div>

            {/* SEARCH INPUT IN HERO */}
            <div className="pt-2 max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search exam name, board, state (e.g. RSSB, SSC, Police, CUET, Banking)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(24);
                  }}
                  className="w-full pl-11 pr-10 py-3.5 bg-white text-stone-900 rounded-xl text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-lg"
                />
                <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FILTER CHIPS */}
        <section className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 overflow-x-auto scrollbar-none flex items-center gap-2">
            {POPULAR_FILTERS.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFilter(f.id);
                    setVisibleCount(24);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* MAIN LISTINGS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>
              Showing {displayedCategories.length} of {filteredCategories.length} categories
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-amber-700 hover:underline font-bold"
              >
                Reset Search
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-44 bg-white rounded-2xl border border-stone-200 p-5 animate-pulse" />
              ))}
            </div>
          ) : displayedCategories.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <SearchIcon size={24} />
              </div>
              <h3 className="text-base font-bold text-stone-800">No matching categories found</h3>
              <p className="text-xs text-stone-500">
                We couldn&apos;t find any exams or categories matching &quot;{searchQuery}&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCategories.map((cat) => {
                const count = cat.exam_count || cat.exam_ids?.length || 0;
                const isExpanded = expandedCatId === cat.id;
                const exams = categoryExams[cat.id] || [];
                const isLoadingThisCat = loadingExams[cat.id];

                return (
                  <div
                    key={cat.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                      isExpanded
                        ? "border-amber-400 ring-2 ring-amber-100 shadow-md col-span-1 sm:col-span-2 lg:col-span-3"
                        : "border-stone-200 hover:border-amber-300 hover:shadow-md"
                    }`}
                  >
                    {/* CARD HEADER */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div className="relative w-14 h-14 rounded-xl bg-stone-50 border border-stone-200 shrink-0 p-1 flex items-center justify-center overflow-hidden">
                          {cat.logo_url ? (
                            <Image
                              src={cat.logo_url}
                              alt={cat.name}
                              width={52}
                              height={52}
                              className="object-contain max-h-full max-w-full rounded-lg"
                            />
                          ) : (
                            <span className="text-2xl">{cat.icon || "🏛️"}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {cat.state_or_group && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                {cat.state_or_group}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                              {count} {count === 1 ? "Exam" : "Exams"}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-stone-900 mt-1.5 leading-snug line-clamp-2">
                            {cat.name}
                          </h3>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <button
                          onClick={() => handleToggleExpand(cat.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-amber-700 transition cursor-pointer"
                        >
                          <span>{isExpanded ? "Hide Exams" : "View Exams"}</span>
                          <ChevronDownIcon
                            size={14}
                            className={`transform transition-transform ${isExpanded ? "rotate-180 text-amber-600" : ""}`}
                          />
                        </button>

                        <Link
                          href={`/category/${cat.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition"
                        >
                          Full Page
                          <ChevronRightIcon size={13} />
                        </Link>
                      </div>
                    </div>

                    {/* EXPANDED EXAMS ACCORDION */}
                    {isExpanded && (
                      <div className="bg-stone-50/70 border-t border-amber-100 p-5 space-y-4 anim-slide-down">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                            Exams in this Category ({count})
                          </h4>
                          <span className="text-[11px] text-stone-500">
                            {exams.filter(e => e.is_active).length} live kits available
                          </span>
                        </div>

                        {isLoadingThisCat ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
                            <p className="text-xs text-stone-500">Fetching exams...</p>
                          </div>
                        ) : exams.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
                            {exams.map((exam) => {
                              const examLogo = exam.logo_url || cat.logo_url;
                              return (
                                <Link
                                  key={exam.id}
                                  href={`/course/${exam.id}`}
                                  className="bg-white p-3 rounded-xl border border-stone-200 hover:border-amber-400 hover:shadow-xs transition flex items-center justify-between gap-3 group cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="relative w-9 h-9 rounded-lg bg-stone-50 border border-stone-200 shrink-0 p-1 flex items-center justify-center overflow-hidden group-hover:border-amber-300">
                                      {examLogo ? (
                                        <Image
                                          src={examLogo}
                                          alt={exam.name}
                                          width={32}
                                          height={32}
                                          className="object-contain max-h-full max-w-full"
                                        />
                                      ) : (
                                        <span className="text-sm">📋</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-stone-900 truncate group-hover:text-amber-700">
                                        {exam.name}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                          ● Selection Kit • ₹199
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-amber-700 group-hover:text-amber-900 shrink-0">
                                    Buy →
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-stone-500">
                            No exams listed yet for this category.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* LOAD MORE BUTTON */}
          {displayedCategories.length < filteredCategories.length && (
            <div className="text-center pt-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                Load More Categories ({filteredCategories.length - displayedCategories.length} remaining)
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
