"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Course, Category } from "@/lib/store-types";
import { fetchWithCache } from "@/lib/store-hooks";
import { SearchIcon, CloseIcon, ChevronRightIcon, ArrowRightIcon, SparklesIcon } from "@/components/icons";

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSelectResult?: () => void;
  initialQuery?: string;
  trendingSearches?: string[];
}

// Module-level cache to prevent duplicate fetches across multiple SearchBar instances
let CACHED_COURSES: Course[] | null = null;
let CACHED_CATEGORIES: Category[] | null = null;

const DEFAULT_TRENDING = [
  "CET 2026",
  "Patwari",
  "SSC CGL",
  "Police Constable",
  "REET Level 1",
  "Banking",
  "UPSC CSE",
];

export default function SearchBar({
  placeholder = "Search exam (CET, Patwari, Police, SSC, UPSC, Banking)...",
  className = "",
  autoFocus = false,
  onSelectResult,
  initialQuery = "",
  trendingSearches = DEFAULT_TRENDING,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>(CACHED_COURSES || []);
  const [categories, setCategories] = useState<Category[]>(CACHED_CATEGORIES || []);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch courses and categories once for instant client-side search
  useEffect(() => {
    if (CACHED_COURSES && CACHED_CATEGORIES) {
      setCourses(CACHED_COURSES);
      setCategories(CACHED_CATEGORIES);
      return;
    }

    let isMounted = true;
    Promise.all([
      fetchWithCache<Course[]>("/api/courses").catch(() => []),
      fetchWithCache<Category[]>("/api/categories?scope=public").catch(() => []),
    ]).then(([coursesData, categoriesData]) => {
      if (!isMounted) return;
      const validCourses = Array.isArray(coursesData) ? coursesData : [];
      const validCategories = Array.isArray(categoriesData) ? categoriesData : [];
      CACHED_COURSES = validCourses;
      CACHED_CATEGORIES = validCategories;
      setCourses(validCourses);
      setCategories(validCategories);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation: Escape closes
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const trimmedQuery = query.trim().toLowerCase();

  // Matched Categories
  const matchedCategories = useMemo(() => {
    if (!trimmedQuery) return [];
    return categories
      .filter((cat) => {
        if (!cat.is_active) return false;
        const nameMatch = cat.name?.toLowerCase().includes(trimmedQuery);
        const nameHiMatch = cat.name_hi?.toLowerCase().includes(trimmedQuery);
        const stateMatch = cat.state_or_group?.toLowerCase().includes(trimmedQuery);
        const idMatch = cat.id?.toLowerCase().includes(trimmedQuery);
        return Boolean(nameMatch || nameHiMatch || stateMatch || idMatch);
      })
      .slice(0, 3);
  }, [categories, trimmedQuery]);

  // Matched Courses
  const matchedCourses = useMemo(() => {
    if (!trimmedQuery) return [];
    return courses
      .filter((c) => {
        const titleMatch = c.title?.toLowerCase().includes(trimmedQuery);
        const descMatch = c.short_description?.toLowerCase().includes(trimmedQuery);
        const slugMatch = c.slug?.toLowerCase().includes(trimmedQuery);
        const badgeMatch = c.badge?.toLowerCase().includes(trimmedQuery);
        const subjectsMatch = c.subjects?.some((sub) => sub.toLowerCase().includes(trimmedQuery));
        const highlightsMatch = c.highlights?.some((h) => h.toLowerCase().includes(trimmedQuery));
        return Boolean(titleMatch || descMatch || slugMatch || badgeMatch || subjectsMatch || highlightsMatch);
      })
      .slice(0, 5);
  }, [courses, trimmedQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    if (onSelectResult) onSelectResult();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelectCourse = (course: Course) => {
    setIsOpen(false);
    if (onSelectResult) onSelectResult();
    router.push(`/course/${course.slug || course.id}`);
  };

  const handleSelectCategory = (cat: Category) => {
    setIsOpen(false);
    if (onSelectResult) onSelectResult();
    router.push(`/category/${cat.id}`);
  };

  const handleSelectTrending = (term: string) => {
    setQuery(term);
    setIsOpen(false);
    if (onSelectResult) onSelectResult();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const hasMatches = matchedCategories.length > 0 || matchedCourses.length > 0;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Modern Unified Search Input Capsule */}
      <form
        onSubmit={handleSubmit}
        action="/search"
        method="GET"
        className="relative flex items-center w-full h-[46px] bg-white border border-stone-300 hover:border-stone-400 focus-within:border-amber-600 focus-within:ring-4 focus-within:ring-amber-500/15 rounded-full transition-all duration-200 shadow-2xs group pl-4 pr-1.5"
      >
        {/* Left Search Icon */}
        <span className="text-stone-400 group-focus-within:text-amber-600 shrink-0 transition-colors pointer-events-none mr-2.5">
          <SearchIcon size={18} />
        </span>

        {/* Search Input Field (Zero inner outline/border) */}
        <input
          ref={inputRef}
          name="q"
          type="text"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="no-focus-ring flex-1 bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-sm text-stone-900 placeholder:text-stone-400 w-full font-medium py-2"
          style={{ outline: "none", boxShadow: "none", border: "none" }}
        />

        {/* Clear Button (appears when text exists) */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-1 mr-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition cursor-pointer shrink-0"
            title="Clear search"
          >
            <CloseIcon size={14} />
          </button>
        )}

        {/* Right Search Button (Smooth matching pill embedded inside capsule) */}
        <button
          type="submit"
          className="h-8 px-4 bg-stone-900 hover:bg-amber-700 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
          aria-label="Search"
        >
          <SearchIcon size={13} />
          <span className="hidden sm:inline">खोजें</span>
        </button>
      </form>

      {/* Instant Predictive Auto-Suggest Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden divide-y divide-stone-100 max-h-[85vh] sm:max-h-[520px] overflow-y-auto anim-fade-in">
          {/* STATE 1: Empty Query - Show Trending / Popular Searches */}
          {!trimmedQuery ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
                <SparklesIcon size={14} className="text-amber-600" />
                <span>लोकप्रिय सर्च (Popular Searches)</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(trendingSearches && trendingSearches.length > 0 ? trendingSearches : DEFAULT_TRENDING).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleSelectTrending(term)}
                    className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-stone-200 text-xs font-semibold text-stone-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🔥</span>
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* STATE 2: Has Results */}
              {hasMatches ? (
                <div className="divide-y divide-stone-100">
                  {/* Matching Categories */}
                  {matchedCategories.length > 0 && (
                    <div className="p-3 bg-stone-50/60">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 px-1">
                        📁 श्रेणियाँ (Categories)
                      </p>
                      <div className="space-y-1">
                        {matchedCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white hover:shadow-xs transition text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {cat.logo_url ? (
                                <img
                                  src={cat.logo_url}
                                  alt={cat.name}
                                  className="w-6 h-6 rounded-full object-contain shrink-0 border border-stone-200"
                                />
                              ) : (
                                <span className="text-base p-1 rounded-md bg-stone-200 shrink-0">
                                  {cat.icon || "📁"}
                                </span>
                              )}
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-stone-900 group-hover:text-amber-700 transition truncate block">
                                  {cat.name}
                                </span>
                                {(cat.name_hi || cat.state_or_group) && (
                                  <span className="text-[10px] text-stone-500 line-clamp-1 block">
                                    {cat.name_hi || cat.state_or_group}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-stone-400 group-hover:text-amber-700 flex items-center gap-0.5 shrink-0 ml-2">
                              <span>देखें</span>
                              <ChevronRightIcon size={12} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Courses / Notes */}
                  {matchedCourses.length > 0 && (
                    <div className="p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2 px-1">
                        📚 संबंधित नोट्स व स्टडी किट ({matchedCourses.length})
                      </p>
                      <div className="space-y-1.5">
                        {matchedCourses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCourse(c)}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition text-left cursor-pointer group border border-transparent hover:border-stone-200"
                          >
                            {/* Course Cover Mini Thumbnail */}
                            <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                              {c.cover_image ? (
                                <Image
                                  src={c.cover_image}
                                  alt={c.title}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">
                                  PDF
                                </div>
                              )}
                              {c.discount_percent ? (
                                <span className="absolute top-0 left-0 bg-amber-600 text-white text-[8px] font-black px-1 py-0.2 rounded-br">
                                  {c.discount_percent}%
                                </span>
                              ) : null}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                                  {c.badge || "Complete Kit"}
                                </span>
                              </div>
                              <h5 className="font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-amber-700 transition">
                                {c.title}
                              </h5>
                              <p className="text-[10px] text-stone-500 line-clamp-1">
                                {c.short_description || "Deep-level analysis notes with topic MCQs"}
                              </p>
                              <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className="text-xs font-black text-stone-900">₹{c.price}</span>
                                {c.original_price && c.original_price > c.price && (
                                  <span className="text-[10px] text-stone-400 line-through">
                                    ₹{c.original_price}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Arrow Indicator */}
                            <span className="text-stone-300 group-hover:text-amber-700 transition shrink-0 pr-1">
                              <ChevronRightIcon size={16} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All Search Results Footer */}
                  <div className="p-2.5 bg-stone-50 text-center">
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      className="w-full py-2 px-4 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-bold text-amber-800 transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <SearchIcon size={14} />
                      <span>&ldquo;{query}&rdquo; के सभी परिणाम खोजें</span>
                      <ArrowRightIcon size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                /* STATE 3: No Results */
                <div className="p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <SearchIcon size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-stone-800">
                    &ldquo;{query}&rdquo; से संबंधित कोई कोर्स नहीं मिला
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    कृपया सही वर्तनी (Spelling) चेक करें या <strong>CET, SSC, Patwari, Police</strong> आदि लिखकर खोजें।
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
