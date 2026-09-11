"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCourseBySlug, CourseBundle } from "@/lib/courses";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function loadCourseOrExam() {
      setLoading(true);
      try {
        // 1. Try to find static course first
        const foundCourse = await getCourseBySlug(courseId);
        if (foundCourse) {
          setCourse(foundCourse);
          setLoading(false);
          return;
        }

        // 2. If not found in static courses, look up the exam by ID
        const res = await fetch(`/api/exams?include_inactive=true&limit=200`);
        if (res.ok) {
          const data = await res.json();
          const examList: any[] = Array.isArray(data) ? data : data.exams || [];
          const matchedExam = examList.find(
            (e) => e.id === courseId || e.slug === courseId || e.name.toLowerCase().includes(courseId.toLowerCase())
          );

          if (matchedExam) {
            const boardName = matchedExam.board_name || matchedExam.board || "Official Board";
            const synth: CourseBundle = {
              id: matchedExam.id,
              exam_id: matchedExam.id,
              title: `${matchedExam.name} - Complete Selection Kit`,
              slug: matchedExam.slug || `exam-${matchedExam.id}`,
              badge: "Complete Selection Kit",
              short_description:
                matchedExam.viral_subtext ||
                `${matchedExam.name} (${boardName}) हेतु 2026 नए सिलेबस पर आधारित सम्पूर्ण हस्तलिखित थ्योरी नोट्स, 3000+ MCQs और फुल मॉक टेस्ट पेपर्स।`,
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
                `${matchedExam.name} थ्योरी नोट्स एवं संपूर्ण सिलेबस`,
                "विषयवार वस्तुनिष्ठ प्रश्नोत्तर (MCQs)",
                "पिछले वर्षों के हल प्रश्न-पत्र (PYQs)",
                "मॉडल टेस्ट पेपर्स एवं अभ्यास प्रश्न",
              ],
              syllabus_preview: [],
              pages_count: "1,250+ Pages",
              format: "Printable PDF",
              language: "हिन्दी (Hindi)",
              cover_image: matchedExam.logo_url || "",
              show_in_slider: false,
              slider_tagline: "",
              sample_pdf_url: matchedExam.notes_link || "https://drive.google.com",
              drive_url: matchedExam.notes_link || "https://drive.google.com",
              rating: 4.9,
              rating_count: "3,850+ छात्र",
              is_active: true,
              priority: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setCourse(synth);
            setLoading(false);
            return;
          }
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
        <div className="max-w-xl mx-auto px-4 py-32 text-center flex-1">
          <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-amber-600 animate-spin mx-auto" />
          <p className="text-stone-500 mt-4 text-sm font-medium">Loading selection kit...</p>
        </div>
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

  const examBoard = (course as any).exam_board || (course as any).board || course.badge || "Verified Exam Kit";

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between font-sans">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
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
                  href={`https://wa.me/${(settings?.contact?.whatsapp_number || settings?.whatsapp_support_number || "917852004401").replace(/\D/g, "")}?text=${encodeURIComponent(
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
      </main>

      <Footer />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onRemoveItem={() => setCart([])}
      />
    </div>
  );
}