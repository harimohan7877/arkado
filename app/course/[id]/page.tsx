"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getCourseBySlug, CourseBundle } from "@/lib/courses";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";
import { Category } from "@/lib/store-types";
import { fetchWithCache } from "@/lib/store-hooks";
import { DEFAULT_SETTINGS, getCleanWhatsAppNumber } from "@/lib/default-settings";

const SampleModal = dynamic(() => import("@/components/SampleModal"), { ssr: false });
const CartDrawer = dynamic(() => import("@/components/CartDrawer"), { ssr: false });

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function CourseDetailPage({ params }: PageProps) {
  const resolvedParams = "then" in params ? use(params) : params;
  const courseId = resolvedParams.id;

  const [course, setCourse] = useState<CourseBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CourseBundle[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [relatedCourses, setRelatedCourses] = useState<CourseBundle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Multi-Kit Exam Hub States & Sample Modal
  const [matchedExam, setMatchedExam] = useState<any | null>(null);
  const [examKits, setExamKits] = useState<CourseBundle[]>([]);
  const [isMultiKitExam, setIsMultiKitExam] = useState(false);
  const [selectedCourseForSample, setSelectedCourseForSample] = useState<CourseBundle | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  useEffect(() => {
    fetchWithCache<any>("/api/settings")
      .then((data) => {
        if (data && typeof data === "object") setSettings(data);
      })
      .catch(() => {});

    // Fetch related active courses for recommendations
    fetchWithCache<CourseBundle[]>("/api/courses")
      .then((data) => {
        if (Array.isArray(data)) {
          setRelatedCourses(
            data.filter(
              (c: any) =>
                c.is_active &&
                c.id !== courseId &&
                c.slug !== courseId &&
                c.exam_id !== courseId
            )
          );
        }
      })
      .catch(() => {});

    // Fetch categories for bottom discovery strip
    fetchWithCache<Category[]>("/api/categories?scope=public")
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, [courseId]);

  useEffect(() => {
    async function loadCourseOrExam() {
      setLoading(true);
      try {
        // 1. Fetch all active courses
        const allCourses = await fetchWithCache<CourseBundle[]>("/api/courses").catch(() => []);

        // 2. Fetch exams list
        const examsData = await fetchWithCache<any>("/api/exams?include_inactive=true&limit=200").catch(() => []);
        const examList: any[] = Array.isArray(examsData) ? examsData : examsData.exams || [];

        // 3. Find if courseId matches an exam
        const cleanCourseId = courseId.toLowerCase().trim();
        const matchedEx = examList.find(
          (e) =>
            e.id === courseId ||
            e.slug === courseId ||
            `exam-${e.id}` === courseId ||
            (e.short_name && e.short_name.toLowerCase() === cleanCourseId) ||
            (e.name && e.name.toLowerCase() === cleanCourseId)
        );

        // 4. Find if courseId matches a specific course
        const matchedCs = allCourses.find(
          (c) =>
            c.slug === courseId ||
            c.id === courseId ||
            c.id === `exam-${courseId}` ||
            (c.slug && c.slug.toLowerCase() === cleanCourseId)
        );

        // Target exam ID
        const targetExamId = matchedEx?.id || matchedCs?.exam_id || courseId;
        const examObj = matchedEx || examList.find((e) => e.id === targetExamId);

        // Active kits for this exam
        const kits = allCourses.filter(
          (c) =>
            (c.exam_id === targetExamId ||
              c.id === targetExamId ||
              c.slug === targetExamId ||
              c.id === `bundle-exam-${targetExamId}`) &&
            c.is_active !== false
        );

        if (examObj) setMatchedExam(examObj);
        setExamKits(kits);

        // CASE A: User navigated to an Exam directly AND that exam has > 1 kits
        if (matchedEx && kits.length > 1) {
          setIsMultiKitExam(true);
          setCourse(kits[0]);
          setLoading(false);
          return;
        }

        // CASE B: User navigated to an Exam with exactly 1 kit
        if (matchedEx && kits.length === 1) {
          setIsMultiKitExam(false);
          setCourse(kits[0]);
          setLoading(false);
          return;
        }

        // CASE C: User navigated to a specific kit directly
        if (matchedCs) {
          setIsMultiKitExam(false);
          setCourse(matchedCs);
          setLoading(false);
          return;
        }

        // CASE D: Try static course fallback
        const staticCourse = await getCourseBySlug(courseId);
        if (staticCourse) {
          setIsMultiKitExam(false);
          setCourse(staticCourse);
          setLoading(false);
          return;
        }

        // CASE E: Synthesize course if exam exists but has 0 courses in db
        if (matchedEx) {
          const boardName = matchedEx.board_name || matchedEx.board || "Official Board";
          const synth: CourseBundle = {
            id: matchedEx.id,
            exam_id: matchedEx.id,
            title: `${matchedEx.name} - Complete Selection Kit`,
            slug: matchedEx.slug || `exam-${matchedEx.id}`,
            badge: "Complete Selection Kit",
            short_description:
              matchedEx.viral_subtext ||
              `${matchedEx.name} (${boardName}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`,
            original_price: 999,
            price: 199,
            discount_percent: 80,
            highlights: [
              "सम्पूर्ण विषयवार हस्तलिखित थ्योरी नोट्स",
              "3000+ विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs) व्याख्या सहित",
              "5 फुल लेंथ मॉडल टेस्ट पेपर्स (ओरिजिनल परीक्षा पैटर्न पर)",
              "प्रिंट हेतु तैयार A4 साइज PDF फॉर्मेट",
            ],
            subjects: [
              `${matchedEx.name} थ्योरी नोट्स एवं संपूर्ण सिलेबस`,
              "विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs)",
              "पिछले वर्षों के हल प्रश्न-पत्र (PYQs)",
              "मॉडल टेस्ट पेपर्स एवं अभ्यास प्रश्न",
            ],
            syllabus_preview: [],
            pages_count: "1,250+ Pages",
            format: "Printable PDF",
            language: "हिन्दी (Hindi)",
            cover_image: matchedEx.logo_url || "",
            show_in_slider: false,
            slider_tagline: "",
            sample_pdf_url: matchedEx.notes_link || "https://drive.google.com",
            drive_url: matchedEx.notes_link || "https://drive.google.com",
            rating: 4.9,
            rating_count: "3,850+ छात्र",
            is_active: true,
            priority: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCourse(synth);
          setIsMultiKitExam(false);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error loading course/exam:", err);
      } finally {
        setLoading(false);
      }
    }

    if (courseId) {
      loadCourseOrExam();
    }
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
        <Navbar cartCount={0} onCartClick={() => {}} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full animate-pulse space-y-6">
          {/* Breadcrumb */}
          <div className="h-4 w-48 bg-stone-200 rounded" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Book Cover Skeleton */}
            <div className="lg:col-span-5 aspect-[4/5] bg-stone-200 rounded-2xl w-full" />

            {/* Right: Info Skeleton */}
            <div className="lg:col-span-7 space-y-4">
              <div className="h-6 w-32 bg-stone-200 rounded-full" />
              <div className="space-y-2">
                <div className="h-8 w-4/5 bg-stone-200 rounded-lg" />
                <div className="h-8 w-3/5 bg-stone-200 rounded-lg" />
              </div>
              <div className="h-4 w-full bg-stone-200/70 rounded" />
              <div className="h-4 w-2/3 bg-stone-200/70 rounded" />

              {/* Price card */}
              <div className="p-6 rounded-2xl bg-white border border-stone-200 space-y-4">
                <div className="h-8 w-36 bg-stone-200 rounded-lg" />
                <div className="flex gap-3">
                  <div className="h-11 flex-1 bg-stone-200 rounded-xl" />
                  <div className="h-11 w-32 bg-stone-200 rounded-xl" />
                </div>
              </div>

              {/* Features skeleton */}
              <div className="space-y-2 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 w-5/6 bg-stone-200/60 rounded" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
        <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />
        <div className="max-w-xl mx-auto px-4 py-20 text-center flex-1">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-neutral-900">Course / Exam Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2">
            Sorry, this study kit is not available or the link has changed.
          </p>
          <Link
            href="/exams"
            className="inline-block mt-6 px-6 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
          >
            ← Browse All Exams &amp; Categories
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const handleBuyNow = (selectedCourse: CourseBundle) => {
    setCart([selectedCourse]);
    setIsCartOpen(true);
  };

  const handleOpenSample = (selectedCourse: CourseBundle) => {
    setSelectedCourseForSample(selectedCourse);
    setIsSampleModalOpen(true);
  };

  // =========================================================
  // MULTI-KIT EXAM STUDY MATERIAL HUB (Level 4 Website View)
  // When an exam has multiple books/kits (e.g. SSC CGL with 4-5 kits)
  // =========================================================
  if (isMultiKitExam && matchedExam) {
    const minPrice = examKits.length > 0 ? Math.min(...examKits.map((k) => k.price || 99)) : 99;
    const maxPrice = examKits.length > 0 ? Math.max(...examKits.map((k) => k.price || 199)) : 199;

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-between font-sans">
        <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex-1 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
            <Link href="/" className="hover:text-stone-900 transition font-medium">
              Home
            </Link>
            <span>/</span>
            <Link href="/exams" className="hover:text-stone-900 transition font-medium">
              Exams
            </Link>
            <span>/</span>
            <span className="text-amber-700 font-bold truncate">
              {matchedExam.name}
            </span>
          </nav>

          {/* Exam Hub Hero Banner */}
          <section className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Square Exam Logo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-900 border-2 border-stone-700 flex items-center justify-center text-white shrink-0 aspect-square p-1.5 shadow-md overflow-hidden">
                  {matchedExam.logo_url ? (
                    <img
                      src={matchedExam.logo_url}
                      alt={matchedExam.name}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                      {(matchedExam.short_name || matchedExam.name).substring(0, 4)}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                      📚 {examKits.length} Study Kits &amp; Books Available
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ₹{minPrice} {minPrice !== maxPrice ? `– ₹${maxPrice}` : ""}
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full">
                      ⭐ 4.9 Rating
                    </span>
                  </div>

                  <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight leading-tight">
                    {matchedExam.name}
                  </h1>

                  <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                    {matchedExam.viral_subtext ||
                      `${matchedExam.name} (${matchedExam.board_name || "Official Board"}) हेतु 2026 नए सिलेबस पर आधारित विषयवार वस्तुनिष्ठ प्रश्नोत्तर (1000+ MCQs) बुक्स एवं सम्पूर्ण सलेक्शन किट्स।`}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-stone-500 font-medium">
                    {matchedExam.eligibility && (
                      <span className="bg-stone-100 px-2 py-0.5 rounded">
                        योग्यता: {matchedExam.eligibility}
                      </span>
                    )}
                    {matchedExam.exam_pattern && (
                      <span className="bg-stone-100 px-2 py-0.5 rounded">
                        पैटर्न: {matchedExam.exam_pattern}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* WhatsApp Support CTA */}
              <div className="shrink-0 w-full sm:w-auto flex sm:flex-col gap-2">
                <a
                  href={`https://wa.me/${getCleanWhatsAppNumber(settings)}?text=${encodeURIComponent(
                    `Hello, I want study books/kits for ${matchedExam.name}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  WhatsApp पर पूछें 💬
                </a>
              </div>
            </div>

            {/* Special Multi-Kit Announcement Banner */}
            <div className="mt-6 pt-5 border-t border-stone-100 flex items-center gap-2.5 text-xs text-amber-950 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
              <span className="text-base">💡</span>
              <span className="font-medium leading-relaxed">
                <strong>उम्मीदवारों की सुविधा हेतु:</strong> आप अपनी आवश्यकतानुसार अलग-अलग विषयवार 1000+ MCQs बुक्स (जैसे गणित, रीजनिंग, इंग्लिश, सामान्य अध्ययन) अलग से ले सकते हैं अथवा सम्पूर्ण सलेक्शन किट बंडल विशेष छूट पर प्राप्त कर सकते हैं।
              </span>
            </div>
          </section>

          {/* Kits Grid Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                  उपलब्ध पुस्तकें एवं सलेक्शन किट्स ({examKits.length})
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  अपनी पसंद की बुक चुनें, फ्री डेमो PDF देखें अथवा तुरंत ऑनलाइन पेमेंट करके प्राप्त करें
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {examKits.map((kit) => (
                <div
                  key={kit.id}
                  className="bg-white rounded-3xl border border-stone-200 hover:border-amber-400 p-5 transition-all hover:shadow-lg flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Cover Image & Badge */}
                    <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center overflow-hidden p-2">
                      {kit.cover_image ? (
                        <img
                          src={kit.cover_image}
                          alt={kit.title}
                          className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <span className="text-4xl">📚</span>
                      )}

                      <div className="absolute top-2.5 left-2.5">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full shadow-sm">
                          {kit.badge || "Study Book"}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-[9px] font-bold bg-stone-950/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-md">
                          {kit.format || "Printable PDF"}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="font-black text-stone-900 text-base group-hover:text-amber-700 transition leading-snug line-clamp-2">
                        {kit.title}
                      </h3>
                      <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {kit.short_description ||
                          "विगत वर्षों के प्रश्नों एवं 2026 नए सिलेबस पर आधारित संपूर्ण हस्तलिखित नोट्स व व्याख्या सहित प्रश्नोत्तर।"}
                      </p>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-1.5 pt-1 text-[11px] text-stone-600 font-medium">
                      {(kit.highlights || []).slice(0, 3).map((hl, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="line-clamp-1">{hl}</span>
                        </div>
                      ))}
                      {(!kit.highlights || kit.highlights.length === 0) && (
                        <>
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{kit.pages_count || "320+ Pages"} • A4 प्रिंट हेतु तैयार</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>व्याख्या सहित सम्पूर्ण वस्तुनिष्ठ प्रश्नोत्तर</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-stone-100 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-stone-900 font-mono">
                          ₹{kit.price}
                        </span>
                        {kit.original_price && kit.original_price > kit.price && (
                          <del className="text-xs text-stone-400 font-mono">
                            ₹{kit.original_price}
                          </del>
                        )}
                      </div>
                      {kit.discount_percent && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {kit.discount_percent}% छूट
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {kit.sample_pdf_url && (
                        <button
                          type="button"
                          onClick={() => handleOpenSample(kit)}
                          className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          👁️ नमूना
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBuyNow(kit)}
                        className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        ⚡ अभी खरीदें
                      </button>
                    </div>

                    <Link
                      href={`/course/${kit.slug || kit.id}`}
                      className="text-[11px] font-bold text-stone-500 hover:text-amber-700 block text-center transition hover:underline"
                    >
                      सम्पूर्ण विवरण व इंडेक्स देखें →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Related Categories / Exams */}
          {categories.length > 0 && (
            <section className="pt-8 border-t border-stone-200 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900">
                    अन्य सरकारी प्रतियोगी परीक्षाएं (Explore Categories)
                  </h3>
                  <p className="text-xs text-stone-500">
                    SSC, Railway, State PSC, Police व Teaching परीक्षाओं के लिए नोट्स
                  </p>
                </div>
                <Link
                  href="/exams"
                  className="text-xs font-bold text-amber-700 hover:text-amber-800"
                >
                  सभी श्रेणियां देखें →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.id}`}
                    className="p-3 bg-white rounded-2xl border border-stone-200 hover:border-amber-400 transition text-center flex flex-col items-center group shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-xl mb-1.5">
                      {cat.icon || "📚"}
                    </div>
                    <span className="text-xs font-bold text-stone-900 group-hover:text-amber-700 transition line-clamp-1">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cart}
          onRemoveItem={() => setCart([])}
        />

        <SampleModal
          course={selectedCourseForSample}
          isOpen={isSampleModalOpen}
          onClose={() => {
            setIsSampleModalOpen(false);
            setSelectedCourseForSample(null);
          }}
          onBuyNow={handleBuyNow}
        />
      </div>
    );
  }

  const examBoard = (course as any).exam_board || (course as any).board || course.badge || "Verified Exam Kit";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between font-sans">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
        {/* SIBLING KITS PROMINENT BANNER (If this exam has multiple kits) */}
        {examKits.length > 1 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                  {matchedExam?.name || "इस परीक्षा"} की अन्य विषयवार पुस्तकें व सलेक्शन किट्स भी उपलब्ध हैं!
                </h4>
                <p className="text-[11px] text-stone-600">
                  सभी {examKits.length} पुस्तकें (जैसे: 1000 MCQs, थ्योरी व सम्पूर्ण बंडल) एक साथ देखें
                </p>
              </div>
            </div>
            <Link
              href={`/course/${matchedExam?.slug || matchedExam?.id || (course as any).exam_id}`}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0"
            >
              सभी {examKits.length} बुक्स देखें →
            </Link>
          </div>
        )}

        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-neutral-900 transition font-medium">
            Home
          </Link>
          <span>/</span>
          <Link href="/exams" className="hover:text-neutral-900 transition font-medium">
            Exams
          </Link>
          <span>/</span>
          <span className="text-neutral-400 truncate max-w-[200px] sm:max-w-none">
            {course.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full uppercase border border-amber-200">
                  Verified Exam Kit
                </span>
                <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
                  {course.badge}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 leading-tight">
                {course.title}
              </h1>

              <p className="text-sm text-neutral-600 leading-relaxed">
                {course.short_description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-600 font-medium">
                <span className="bg-stone-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  📄 {course.pages_count}
                </span>
                <span className="bg-stone-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  🌐 {course.language}
                </span>
                <span className="bg-stone-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold text-emerald-700">
                  ⚡ {course.format}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                <span>🎯</span> Key Highlights
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {course.highlights.map((hl, i) => (
                  <div
                    key={i}
                    className="py-2.5 flex items-start gap-3 border-b border-neutral-100 last:border-0"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs sm:text-sm text-neutral-700 font-medium">
                      {hl}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                <span>📚</span> Covered Subjects &amp; Syllabus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {course.subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5 text-xs font-semibold text-neutral-800"
                  >
                    <span className="text-amber-500 font-bold">▶</span>
                    <span>{sub}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Free Preview
                </span>
                <h4 className="text-lg font-bold text-neutral-900">
                  Sample PDF Notes
                </h4>
                <p className="text-xs text-neutral-600">
                  Check note quality, handwriting and exam pattern analysis before purchasing.
                </p>
              </div>

              <a
                href={course.sample_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-md whitespace-nowrap"
              >
                📄 Open Sample PDF ↗
              </a>
            </div>

            {/* INTERACTIVE HTML MOCK TEST DEMO CARD */}
            {course.demo_html_mock_enabled && course.demo_html_mock_url && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      ⚡ Free Interactive Mock Test Demo
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      120 Min • Auto Result
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-stone-900 mt-1">
                    🎯 Interactive Online Mock Test Demo
                  </h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Experience the real exam engine with 120-min timer, 1/3 negative marking &amp; instant score.
                  </p>
                </div>

                {(() => {
                  let mockHref = course.demo_html_mock_url || "#";
                  if (mockHref.includes("/storage/v1/object/public/arkado-uploads/mock-tests/")) {
                    const fname = mockHref.split("/mock-tests/")[1];
                    if (fname) mockHref = `/mock-tests/${fname}`;
                  }
                  return (
                    <a
                      href={mockHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md whitespace-nowrap flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
                    >
                      <span>▶ Start Free Mock Test</span>
                      <span>↗</span>
                    </a>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-lg space-y-6">
              <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-700 via-stone-800 to-stone-900 border border-neutral-200 flex items-center justify-center p-4">
                {course.cover_image && !coverImageFailed ? (
                  <Image
                    src={course.cover_image}
                    alt={course.title}
                    fill
                    onError={() => setCoverImageFailed(true)}
                    className="object-cover"
                  />
                ) : (
                  <div className="text-center text-white space-y-2">
                    <span className="text-4xl">📚</span>
                    <h3 className="font-extrabold text-sm line-clamp-2 px-2 text-amber-200">
                      {course.title}
                    </h3>
                    <span className="inline-block text-[10px] font-bold uppercase bg-amber-600 text-white px-2.5 py-0.5 rounded-full">
                      Arkado Selection Kit
                    </span>
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {examBoard || "RSMSSB"}
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-neutral-900">
                    ₹{course.price}
                  </span>
                  <span className="text-lg text-neutral-400 line-through">
                    ₹{course.original_price}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {course.discount_percent}% OFF
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {settings?.course_page?.instant_delivery_badge || "One-time payment • Instant WhatsApp & Gmail PDF access"}
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => handleBuyNow(course)}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Buy Now via PhonePe / Paytm</span>
                  <span>→</span>
                </button>

                <a
                  href={`https://wa.me/${getCleanWhatsAppNumber(settings)}?text=${encodeURIComponent(
                    `Hi! I want to purchase the study kit for ${course.title}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-bold text-xs text-center block transition"
                >
                  💬 Ask on WhatsApp
                </a>
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs text-neutral-500">
                {(settings?.course_page?.guarantees && settings.course_page.guarantees.length > 0
                  ? settings.course_page.guarantees
                  : [
                      "Direct Google Drive PDF Download",
                      "Instant WhatsApp or Gmail Delivery",
                      "100% Secure UPI with UTR Verification"
                    ]
                ).map((g: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{g}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SIBLING KITS FOR THIS SAME EXAM */}
        {examKits.filter((k) => k.id !== course.id && k.slug !== course.slug).length > 0 && (
          <section className="mt-14 pt-10 border-t border-stone-200 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    More Kits &amp; Books for {matchedExam?.name || "This Exam"}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Topic-wise 1000+ MCQ books and complete syllabus packages
                </p>
              </div>
              <Link
                href={`/course/${matchedExam?.slug || matchedExam?.id || (course as any).exam_id}`}
                className="text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                View All {examKits.length} Books →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {examKits
                .filter((k) => k.id !== course.id && k.slug !== course.slug)
                .map((siblingKit) => (
                  <CourseCard
                    key={siblingKit.id}
                    course={siblingKit}
                    onBuyNow={handleBuyNow}
                    onOpenSample={handleOpenSample}
                  />
                ))}
            </div>
          </section>
        )}

        {/* RELATED SELECTION KITS (FLIPKART / AMAZON STYLE) */}
        {relatedCourses.length > 0 && (
          <section className="mt-14 pt-10 border-t border-stone-200 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    Other Popular Selection Kits
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Top-rated study notes &amp; test bundles for candidates
                </p>
              </div>
              <Link
                href="/exams"
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                View All Exams ({relatedCourses.length + 1}) →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {relatedCourses.slice(0, 5).map((relCourse) => (
                <CourseCard
                  key={relCourse.id}
                  course={relCourse}
                  onBuyNow={handleBuyNow}
                />
              ))}
            </div>
          </section>
        )}

        {/* EXPLORE ALL CATEGORIES (FLIPKART / AMAZON STYLE) */}
        {categories.length > 0 && (
          <section className="mt-14 pt-10 border-t border-stone-200 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                    Explore Exam Categories
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Browse notes for State, Central, SSC, Police &amp; Teaching exams
                </p>
              </div>
              <Link
                href="/exams"
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                View All Categories ({categories.length}) →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.slice(0, 12).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  className="p-3.5 bg-white rounded-2xl border border-stone-200 hover:border-amber-400 hover:shadow-md transition text-center flex flex-col items-center group"
                >
                  <div className="w-14 h-14 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mb-2 group-hover:scale-105 transition overflow-hidden p-1">
                    {cat.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cat.logo_url} alt={cat.name} className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <span className="text-2xl">{cat.icon || "📚"}</span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-stone-900 group-hover:text-amber-700 transition line-clamp-2">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-stone-500 mt-0.5">
                    {cat.exam_count || cat.exam_ids?.length || 0} Exams
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={() => setCart([])}
      />

      <SampleModal
        course={selectedCourseForSample}
        isOpen={isSampleModalOpen}
        onClose={() => {
          setIsSampleModalOpen(false);
          setSelectedCourseForSample(null);
        }}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
}