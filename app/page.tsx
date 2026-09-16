"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCategories, useSliderCourses, useCourses, useSettings } from "@/lib/store-hooks";
import { Course } from "@/lib/store-types";
import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import CourseCard from "@/components/CourseCard";
import SampleModal from "@/components/SampleModal";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import CategoriesSection from "@/components/CategoriesSection";
import SidebarCategories from "@/components/SidebarCategories";
import TrustStrip from "@/components/TrustStrip";
import FeaturedGrid from "@/components/FeaturedGrid";
import { SearchIcon, CloseIcon, SparklesIcon, CheckIcon } from "@/components/icons";

export default function HomePage() {
  const { categories, loading: categoriesLoading } = useCategories();
  const { courses: sliderCourses, loading: sliderLoading } = useSliderCourses();
  const { courses: allCourses, loading: coursesLoading } = useCourses();
  const { settings } = useSettings();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Course[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCourseForSample, setSelectedCourseForSample] = useState<Course | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [apiFeatured, setApiFeatured] = useState<Course[]>([]);
  const [apiNewArrivals, setApiNewArrivals] = useState<Course[]>([]);

  useEffect(() => {
    fetch("/api/courses?featured=true")
      .then((res) => res.json())
      .then((data) => setApiFeatured(Array.isArray(data) ? data : []))
      .catch(() => setApiFeatured([]));

    fetch("/api/courses?new_arrivals=true")
      .then((res) => res.json())
      .then((data) => setApiNewArrivals(Array.isArray(data) ? data : []))
      .catch(() => setApiNewArrivals([]));
  }, []);


  const filteredCourses = useMemo(() => {
    const cats = Array.isArray(categories) ? categories : [];
    const crs = Array.isArray(allCourses) ? allCourses : [];
    const selectedCatObj = cats.find((c) => c.id === selectedCategory);
    return crs.filter((course) => {
      const matchesCategory =
        selectedCategory === "all" ||
        course.exam_id === selectedCategory ||
        (selectedCatObj && selectedCatObj.exam_ids?.includes(course.exam_id)) ||
        (course as any).category_id === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.short_description.toLowerCase().includes(q) ||
        (Array.isArray(course.subjects) && course.subjects.some((s) => s.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [allCourses, selectedCategory, searchQuery, categories]);

  const featuredDeals = useMemo(() => (Array.isArray(apiFeatured) ? apiFeatured : []), [apiFeatured]);
  const newArrivals = useMemo(() => (Array.isArray(apiNewArrivals) ? apiNewArrivals : []), [apiNewArrivals]);
  const latestProducts = useMemo(() => (Array.isArray(allCourses) ? allCourses.slice(0, 10) : []), [allCourses]);

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

  const featuredTitle = settings?.homepage?.featured_section_title || "Featured Bundles";
  const hotDealsTitle = settings?.homepage?.hot_deals_title || "Today's Hot Deals";
  const newArrivalsTitle = settings?.homepage?.new_arrivals_title || "New Arrivals";
  const categoriesTitle = settings?.homepage?.categories_section_title || "Browse Top Categories";
  const newsletterTitle = settings?.homepage?.newsletter_title || "Get Free Exam Updates";
  const newsletterPlaceholder = settings?.homepage?.newsletter_placeholder || "Your Email Address";
  const newsletterBtn = settings?.homepage?.newsletter_button_text || "Subscribe";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="flex-1">
        {/* HERO + SIDEBAR */}
        <section className="bg-stone-50 border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Sidebar (desktop) */}
              <div className="hidden lg:block lg:col-span-3 min-w-0 overflow-hidden">
                <SidebarCategories activeCategory={selectedCategory} />
              </div>

              {/* Hero */}
              <div className="lg:col-span-9">
                <HeroSlider
                  courses={sliderCourses}
                  onBuyNow={handleBuyNow}
                  onOpenSample={handleOpenSample}
                />
              </div>
            </div>

            {/* Mobile quick category chips ribbon (horizontal scrollable) */}
            <div className="lg:hidden mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Quick Categories
                </p>
                <Link
                  href="/exams"
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  View All ({categories.length}) →
                </Link>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-stone-900 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <span>🔥</span>
                  <span>All</span>
                </button>
                {categories.slice(0, 10).map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(isSelected ? "all" : cat.id)
                      }
                      className={`h-8 px-3 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-stone-900 text-white shadow-xs"
                          : "bg-white text-stone-700 border border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {cat.logo_url ? (
                        <img
                          src={cat.logo_url}
                          alt={cat.name}
                          className="w-4 h-4 rounded-full object-contain"
                        />
                      ) : (
                        <span className="text-xs">{cat.icon || "📚"}</span>
                      )}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <TrustStrip />
        </section>

        {/* FEATURED BUNDLES */}
        <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <FeaturedGrid
            title={featuredTitle}
            courses={latestProducts}
            onBuyNow={handleBuyNow}
            onOpenSample={handleOpenSample}
            viewAllHref="/exams"
          />
        </section>

        {/* CATEGORIES BANNER - dynamic from settings */}
        {settings?.homepage?.promo_banner?.enabled !== false && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 border border-amber-200 p-6 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-stone-900 leading-tight">
                    {settings?.homepage?.promo_banner?.title || "Crack Any Exam with Deep-Level Analysis"}
                  </h3>
                  <p className="text-sm text-stone-700 mt-2 font-medium">
                    {settings?.homepage?.promo_banner?.subtitle || "Premium pattern-decoded notes for Rajasthan & All-India Exams"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    {(settings?.homepage?.promo_banner?.bullets && settings.homepage.promo_banner.bullets.length > 0
                      ? settings.homepage.promo_banner.bullets
                      : [
                          "Last 5 Years Pattern Decoded",
                          "Topic-Weightage Analysis",
                          "3000-5000+ Topic MCQs",
                          "Free Sample PDF",
                          "Printable A4 Format",
                          "Instant Delivery"
                        ]
                    ).map((t) => (
                      <div
                        key={t}
                        className="flex items-center gap-2 text-sm font-semibold text-stone-700"
                      >
                        <span className="w-5 h-5 rounded bg-amber-600 text-white flex items-center justify-center shrink-0">
                          <CheckIcon size={11} />
                        </span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden lg:flex justify-center">
                  <div className="w-44 h-44 rounded-full bg-amber-600/10 flex items-center justify-center">
                    <SparklesIcon size={56} className="text-amber-600" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CATEGORIES SECTION (with logo) */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CategoriesSection
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            title={categoriesTitle}
          />
        </section>

        {/* PRODUCT GRID */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 card-base">
              <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
                <SearchIcon size={22} />
              </div>
              <h3 className="font-bold text-stone-800 text-base">No bundles found</h3>
              <p className="text-xs text-stone-500 mt-1">Try different keywords or category.</p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="btn-primary mt-4"
              >
                Show All Bundles
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onBuyNow={handleBuyNow}
                  onOpenSample={handleOpenSample}
                />
              ))}
            </div>
          )}
        </section>

        {/* DEALS SECTION */}
        <section id="deals" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <FeaturedGrid
            title={`🌟 ${featuredTitle}`}
            courses={featuredDeals}
            onBuyNow={handleBuyNow}
            onOpenSample={handleOpenSample}
          />
        </section>

        {/* NEW ARRIVALS — list style */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-end justify-between mb-4">
            <h2 className="section-title">✨ {newArrivalsTitle}</h2>
            <Link href="/exams" className="text-sm font-bold text-amber-700 hover:text-amber-800">View All →</Link>
          </div>
          <div className="card-base divide-y divide-stone-100">
            {newArrivals.map((course) => (
              <div
                key={course.id}
                className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 hover:bg-stone-50 transition"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <Link
                    href={`/course/${course.slug || course.id}`}
                    className="relative w-16 h-20 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200"
                  >
                    <Image
                      src={course.cover_image}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    <span className="absolute top-0 left-0 bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-md">
                      {course.discount_percent}%
                    </span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/course/${course.slug || course.id}`}
                      className="font-bold text-sm text-stone-900 line-clamp-2 hover:text-amber-700 transition"
                    >
                      {course.title}
                    </Link>
                    <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                      {course.short_description}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-base font-black text-stone-900">₹{course.price}</span>
                      <span className="text-xs text-stone-400 line-through">₹{course.original_price}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {course.badge || "Complete Kit"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => handleOpenSample(course)}
                    className="px-3 py-2 rounded-xl border border-stone-300 hover:border-stone-400 text-stone-700 text-xs font-bold transition"
                  >
                    View Sample
                  </button>
                  <button
                    onClick={() => handleBuyNow(course)}
                    className="btn-primary py-2 px-4 text-xs font-bold shadow-xs"
                  >
                    Buy Now ₹{course.price}
                  </button>
                  <Link
                    href={`/course/${course.slug || course.id}`}
                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="card-base p-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mb-5">
              <span className="inline-block text-xs font-black uppercase text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                FAQ
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-stone-900">
                Common Questions
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
              {(settings?.homepage?.faqs && settings.homepage.faqs.length > 0
                ? settings.homepage.faqs
                : [
                    {
                      question: "How do I get my notes after payment?",
                      answer: "After UPI payment, enter the 12-digit UTR. We'll send instant access to your WhatsApp or Gmail within 5-15 minutes.",
                    },
                    {
                      question: "Can I print the PDFs?",
                      answer: "Yes. All notes are print-ready A4 format. Print at any cyber cafe or e-mitra.",
                    },
                    {
                      question: "What is the difference vs. handwritten notes?",
                      answer: "These are deep-level analysis notes: pattern-decoded, weightage-tagged, toppers' approach. Not a copy of textbooks.",
                    },
                    {
                      question: "Need help?",
                      answer: `WhatsApp ${settings?.contact?.whatsapp_number || "7852004401"} — our team responds quickly.`,
                    },
                  ]
              ).map((f) => (
                <div
                  key={f.question}
                  className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5"
                >
                  <h4 className="font-bold text-sm text-stone-900">{f.question}</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
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