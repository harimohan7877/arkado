"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCourseBySlug, getAllCourses, CourseBundle } from "@/lib/courses";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CourseDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const coursePromise = getCourseBySlug(resolvedParams.id);
  const allCoursesPromise = getAllCourses();
  
  const course = use(coursePromise) as CourseBundle | undefined;
  const allCourses = use(allCoursesPromise) as CourseBundle[];

  const [cart, setCart] = useState<CourseBundle[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
        <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-neutral-900">Course Not Found</h1>
          <p className="text-xs text-neutral-500 mt-2">
            Sorry, this course bundle is not available or the link has changed.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2.5 rounded-full bg-neutral-900 text-white font-bold text-xs"
          >
            ← View All Courses
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

  const examBoard = course.exam_id;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between font-sans">
      <Navbar cartCount={cart.length} onCartClick={() => setIsCartOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-neutral-900 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-neutral-800 font-semibold">{examBoard}</span>
          <span>/</span>
          <span className="text-neutral-400 truncate max-w-[200px] sm:max-w-none">
            {course.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black bg-neutral-900 text-white px-3 py-1 rounded-full uppercase">
                  {examBoard}
                </span>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
                  {course.badge}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 leading-tight">
                {course.title}
              </h1>

              <p className="text-sm text-neutral-600 leading-relaxed">
                {course.short_description}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-600 font-medium">
                <span className="bg-neutral-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span>📄</span> {course.pages_count}
                </span>
                <span className="bg-neutral-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <span>🌐</span> Language: {course.language}
                </span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                  <span>⚡</span> {course.format}
                </span>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                <span>🎯</span> Key Highlights
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {course.highlights.map((hl, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800">
                      {hl}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200 shadow-xs space-y-4">
              <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                <span>📚</span> Complete Syllabus
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {course.subjects.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-2.5 text-xs font-semibold text-neutral-700"
                  >
                    <span className="text-amber-500 font-bold">▶</span>
                    <span>{sub}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-neutral-950 p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[11px] font-black uppercase tracking-wider bg-neutral-950 text-white px-2.5 py-0.5 rounded-full">
                  100% Transparent
                </span>
                <h4 className="text-xl font-black text-white">
                  Free Sample PDF Preview
                </h4>
                <p className="text-xs text-neutral-900 font-medium">
                  Check notes quality and handwriting before buying.
                </p>
              </div>

              <a
                href={course.sample_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-neutral-950 hover:bg-neutral-900 text-white font-black text-xs sm:text-sm transition shadow-md whitespace-nowrap"
              >
                📄 Open Sample PDF ↗
              </a>
            </div>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-lg space-y-6">
              <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <Image
                  src={course.cover_image}
                  alt={course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {examBoard}
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
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {course.discount_percent}% OFF
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  One-time fee • Lifetime bundle access
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
                  href={`https://wa.me/917852004401?text=${encodeURIComponent(
                    `Hi! I have a question about ${course.title}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-bold text-xs text-center block transition"
                >
                  💬 Ask on WhatsApp
                </a>
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-2 text-xs text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Direct Google Drive PDF Download</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>WhatsApp or Gmail Delivery Option</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>100% Secure UPI Payment (0% Extra Charges)</span>
                </div>
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