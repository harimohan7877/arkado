"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
import { Settings } from "@/lib/store-types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  ZapIcon,
  ShoppingBagIcon,
  EyeIcon,
  ShieldIcon,
  FileTextIcon,
  CheckIcon,
} from "@/components/icons";

interface HeroSliderProps {
  courses: CourseBundle[];
  onBuyNow: (course: CourseBundle) => void;
  onOpenSample: (course: CourseBundle) => void;
}

export default function HeroSlider({
  courses,
  onBuyNow,
  onOpenSample,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [failedSlideImages, setFailedSlideImages] = useState<Record<string, boolean>>({});
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const slides = courses.length > 0 ? courses : [];

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];
  const examLabel = getExamLabel(currentSlide.exam_id);

  const handlePrev = () =>
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % slides.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const customBadge = settings?.homepage?.hero_badge;
  const customHeadline = settings?.homepage?.hero_headline;

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-stone-50/90 text-stone-900 border border-amber-200/70 shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Course Bundles"
    >
      {/* Background ambient accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-400/15 via-orange-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-amber-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
          {/* Copy column */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                <StarIcon size={12} />
                {customBadge || `${examLabel} Special`}
              </span>
              <span className="bg-white/90 border border-stone-200 text-stone-800 text-xs font-bold px-3 py-1 rounded-md shadow-2xs">
                {currentSlide.badge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-950 leading-tight">
              {customHeadline && currentIndex === 0 ? customHeadline : currentSlide.title}
            </h1>

            <p className="text-stone-600 text-sm max-w-xl leading-relaxed">
              {currentSlide.short_description}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {currentSlide.highlights.slice(0, 3).map((hl, i) => (
                <span
                  key={i}
                  className="bg-white border border-stone-200 text-stone-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckIcon size={11} className="text-emerald-600 shrink-0" />
                  {hl}
                </span>
              ))}
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl sm:text-4xl font-black text-amber-700 tracking-tight">
                  ₹{currentSlide.price}
                </span>
                <span className="text-base text-stone-400 line-through">
                  ₹{currentSlide.original_price}
                </span>
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  {currentSlide.discount_percent}% OFF
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onBuyNow(currentSlide)}
                  className="btn-primary shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingBagIcon size={15} />
                  <span>Buy Now</span>
                </button>
                <button
                  onClick={() => onOpenSample(currentSlide)}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <EyeIcon size={14} />
                  <span className="hidden sm:inline">Sample & Syllabus</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-500 font-medium">
              <span className="flex items-center gap-1.5">
                <ZapIcon size={12} className="text-amber-600" />
                Instant Digital Delivery (PDF)
              </span>
              <span className="opacity-40">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldIcon size={12} className="text-emerald-600" />
                100% Verified 2026 Syllabus & PYQ Pattern
              </span>
            </div>
          </div>

          {/* Cover column */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <button
              type="button"
              onClick={() => onOpenSample(currentSlide)}
              className="relative group cursor-pointer"
              aria-label="View sample"
            >
              <div className="absolute -inset-4 bg-amber-500/20 rounded-2xl blur-xl group-hover:bg-amber-500/35 transition" />
              <div className="relative w-48 h-60 sm:w-56 sm:h-72 lg:w-64 lg:h-80 rounded-xl overflow-hidden shadow-xl border border-stone-200/80 transition-transform duration-300 group-hover:scale-105 bg-white">
                {currentSlide.cover_image && !failedSlideImages[currentSlide.id] ? (
                  <Image
                    src={currentSlide.cover_image}
                    alt={currentSlide.title}
                    fill
                    priority
                    onError={() =>
                      setFailedSlideImages((prev) => ({ ...prev, [currentSlide.id]: true }))
                    }
                    className="object-cover"
                    sizes="(max-width: 640px) 192px, 256px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-700 via-stone-800 to-stone-900 flex flex-col items-center justify-center p-4 text-center text-white">
                    <span className="text-4xl mb-2">📚</span>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300 bg-black/40 px-2.5 py-0.5 rounded-full">
                      {examLabel}
                    </span>
                    <p className="text-xs font-bold line-clamp-3 mt-2 px-2 text-stone-100">
                      {currentSlide.title}
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent flex items-center justify-between text-[11px] font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <FileTextIcon size={11} />
                    {currentSlide.pages_count}
                  </span>
                  <span className="text-amber-300 bg-stone-900/80 px-2 py-0.5 rounded text-[10px] border border-amber-400/30">
                    Preview Sample
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Slider controls */}
        <div className="pt-4 mt-4 border-t border-stone-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                  currentIndex === idx
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-stone-600 border-stone-200 hover:border-amber-300 hover:text-stone-900"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentIndex === idx ? "bg-white" : "bg-amber-500"}`} />
                <span className="truncate max-w-[120px]">
                  {getExamLabel(slide.exam_id)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-stone-500 font-mono font-bold">
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              aria-label="Previous slide"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
              aria-label="Next slide"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
