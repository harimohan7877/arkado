"use client";

import { useState, useEffect, useMemo, use } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import SampleModal from "@/components/SampleModal";
import CartDrawer from "@/components/CartDrawer";
import { Category, Exam, Course } from "@/lib/store-types";
import { SearchIcon, CloseIcon, ChevronRightIcon, ArrowRightIcon, SparklesIcon, CheckIcon } from "@/components/icons";

interface CategoryPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function CategoryDetailPage({ params }: CategoryPageProps) {
  // Unwrap Next.js 15 params promise safely
  const resolvedParams = "then" in params ? use(params) : params;
  const categoryId = resolvedParams.id;

  const [category, setCategory] = useState<Category | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Cart & Sample states
  const [cart, setCart] = useState<Course[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCourseForSample, setSelectedCourseForSample] = useState<Course | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [failedCatImage, setFailedCatImage] = useState(false);
  const [failedExamImages, setFailedExamImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadCategoryData = async () => {
      setLoading(true);
      try {
        // 1. Fetch category metadata
        const catRes = await fetch("/api/categories");
        if (catRes.ok) {
          const allCats: Category[] = await catRes.json();
          const matched = allCats.find((c) => c.id === categoryId);
          if (matched) setCategory(matched);
        }

        // 2. Fetch exams in this category (including inactive)
        const examsRes = await fetch(`/api/exams?category=${categoryId}&include_inactive=true&limit=200`);
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          const list = Array.isArray(examsData) ? examsData : examsData.exams || [];
          setExams(list);
        }

        // 3. Fetch courses
        const coursesRes = await fetch("/api/courses");
        if (coursesRes.ok) {
          const allCourses: Course[] = await coursesRes.json();
          setCourses(allCourses);
        }
      } catch (err) {
        console.error("Error loading category page:", err);
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) loadCategoryData();
  }, [categoryId]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        exam.name.toLowerCase().includes(q) ||
        (exam.short_name && exam.short_name.toLowerCase().includes(q)) ||
        (exam.board && exam.board.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === "active") return exam.is_active;
      if (statusFilter === "inactive") return !exam.is_active;

      return true;
    });
  }, [exams, searchQuery, statusFilter]);

  // Find courses matching this category or its exams
  const matchedCourses = useMemo(() => {
    const examIdSet = new Set(exams.map((e) => e.id));
    return courses.filter(
      (c) => examIdSet.has(c.exam_id) || (c as any).category_id === categoryId
    );
  }, [courses, exams, categoryId]);

  const handleBuyNow = (course: Course) => {
    setCart([course]);
    setIsCartOpen(true);
  };

  const handleOpenSample = (course: Course) => {
    setSelectedCourseForSample(course);
    setIsSampleModalOpen(true);
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-20 text-center flex-1">
          <div className="w-10 h-10 border-4 border-stone-200 border-t-amber-600 rounded-full animate-spin mx-auto" />
          <p className="text-stone-500 mt-4 text-xs font-semibold">Loading category details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-24 text-center flex-1 space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <SearchIcon size={28} />
          </div>
          <h1 className="text-xl font-black text-stone-900">Category Not Found</h1>
          <p className="text-xs text-stone-500">
            The requested category could not be located or may have been updated.
          </p>
          <Link
            href="/exams"
            className="inline-block px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition"
          >
            Browse All Categories
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const activeCount = exams.filter((e) => e.is_active).length;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="flex-1">
        {/* CATEGORY HEADER BANNER */}
        <section className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8 shadow-2xs">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 flex-wrap">
              <Link href="/" className="hover:text-amber-700">Home</Link>
              <span>/</span>
              <Link href="/exams" className="hover:text-amber-700">Categories &amp; Exams</Link>
              <span>/</span>
              <span className="text-stone-900 font-bold">{category.name}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2">
              <div className="flex items-start gap-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-50 border-2 border-stone-100 shrink-0 p-1.5 flex items-center justify-center overflow-hidden shadow-xs">
                  {category.logo_url && !failedCatImage ? (
                    <Image
                      src={category.logo_url}
                      alt={category.name}
                      width={70}
                      height={70}
                      unoptimized
                      onError={() => setFailedCatImage(true)}
                      className="object-contain max-h-full max-w-full rounded-xl"
                    />
                  ) : (
                    <span className="text-3xl">{category.icon || "🏛️"}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                      {exams.length} Exams Listed
                    </span>
                    {activeCount > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {activeCount} Live Kits
                      </span>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-3xl font-black text-stone-900 mt-2 tracking-tight">
                    {category.name}
                  </h1>

                  <p className="text-xs sm:text-sm text-stone-600 mt-1">
                    Complete syllabus notes, topic-wise question banks &amp; pattern-decoded study material.
                  </p>
                </div>
              </div>

              {/* ACTION / BACK BUTTON */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                <Link
                  href="/exams"
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  ← All Categories
                </Link>
                <a
                  href="https://wa.me/917852004401"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  Request Notes on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE COURSES IN THIS CATEGORY (IF ANY) */}
        {matchedCourses.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-b border-stone-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  Available Study Bundles ({matchedCourses.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Instant digital access with decoded syllabus and topic weightage
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {matchedCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onBuyNow={handleBuyNow}
                  onOpenSample={handleOpenSample}
                />
              ))}
            </div>
          </section>
        )}

        {/* EXAMS DIRECTORY WITHIN THIS CATEGORY */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900">
                All Exams under {category.name}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Browse every verified exam syllabus and track study kit availability
              </p>
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search exam in this category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-stone-300 text-xs placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-2xs"
                />
                <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center bg-stone-200/70 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "all" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600"
                  }`}
                >
                  All ({exams.length})
                </button>
                {activeCount > 0 && (
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      statusFilter === "active" ? "bg-white text-emerald-800 shadow-xs font-bold" : "text-stone-600"
                    }`}
                  >
                    Live ({activeCount})
                  </button>
                )}
                <button
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "inactive" ? "bg-white text-stone-900 shadow-xs font-bold" : "text-stone-600"
                  }`}
                >
                  Upcoming ({exams.length - activeCount})
                </button>
              </div>
            </div>
          </div>

          {/* EXAMS GRID */}
          {filteredExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <SearchIcon size={20} />
              </div>
              <h3 className="text-sm font-bold text-stone-800">No exams match your filter</h3>
              <p className="text-xs text-stone-500">
                Try clearing your search query or switching filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredExams.map((exam) => {
                const examLogo = exam.logo_url;
                const matchedCourse = courses.find(
                  (c) =>
                    c.exam_id === exam.id ||
                    c.id === exam.id ||
                    c.slug === exam.id ||
                    (c.title && exam.name && c.title.toLowerCase().includes(exam.name.toLowerCase().split(" ")[0]))
                );
                const examHref = `/course/${matchedCourse?.slug || matchedCourse?.id || exam.id}`;

                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-4 transition-all hover:shadow-md flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Link
                          href={examHref}
                          className="relative w-12 h-12 rounded-xl bg-stone-50 border border-stone-200 shrink-0 p-1 flex items-center justify-center overflow-hidden group-hover:border-amber-300 transition"
                        >
                          {examLogo && !failedExamImages[exam.id] ? (
                            <Image
                              src={examLogo}
                              alt={exam.name}
                              width={44}
                              height={44}
                              unoptimized
                              onError={() => setFailedExamImages((prev) => ({ ...prev, [exam.id]: true }))}
                              className="object-contain max-h-full max-w-full rounded-lg"
                            />
                          ) : (
                            <span className="text-xl">📋</span>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={examHref}
                            className="text-xs font-bold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition block"
                          >
                            {exam.name}
                          </Link>
                          <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                            {exam.board || category.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          ● Selection Kit Available • ₹199
                        </span>
                        {exam.status && (
                          <span className="text-[10px] text-stone-400 capitalize">
                            • {exam.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                      <Link
                        href={examHref}
                        className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 shadow-xs"
                      >
                        Study Kit &amp; Buy →
                      </Link>
                      <a
                        href={`https://wa.me/917852004401?text=${encodeURIComponent(
                          `Hello, I want study material for ${exam.name} (${category.name}).`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        WhatsApp 💬
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <SampleModal
        course={selectedCourseForSample}
        isOpen={isSampleModalOpen}
        onClose={() => {
          setIsSampleModalOpen(false);
          setSelectedCourseForSample(null);
        }}
        onBuyNow={handleBuyNow}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={handleRemoveFromCart}
      />

      <Footer />
    </div>
  );
}
