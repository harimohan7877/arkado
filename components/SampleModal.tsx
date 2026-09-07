"use client";

import { useEffect } from "react";
import Image from "next/image";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
import {
  CloseIcon,
  StarIcon,
  ShoppingBagIcon,
  CheckIcon,
  FileTextIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from "@/components/icons";

interface SampleModalProps {
  course: CourseBundle | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (course: CourseBundle) => void;
}

export default function SampleModal({
  course,
  isOpen,
  onClose,
  onBuyNow,
}: SampleModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen || !course) return null;
  const examLabel = getExamLabel(course.exam_id);
  const rating = course.rating || 4.9;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm anim-fade-in-up">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col border border-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-700 anim-pulse-dot" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {examLabel} • Syllabus & Sample
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition"
            aria-label="Close"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {/* Hero row */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-md overflow-hidden shrink-0 shadow-lg border border-slate-700">
              <Image
                src={course.cover_image}
                alt={course.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 96px, 112px"
              />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                  {course.badge}
                </span>
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <StarIcon size={11} />
                  {rating.toFixed(1)} ({course.rating_count || "4,000+"})
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-white">
                {course.title}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-2">
                {course.short_description}
              </p>
              <div className="flex items-baseline justify-center sm:justify-start gap-2 pt-1">
                <span className="text-2xl font-black text-amber-400">
                  ₹{course.price}
                </span>
                <span className="text-xs text-slate-400 line-through">
                  ₹{course.original_price}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {course.discount_percent}% OFF
                </span>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              What&apos;s Included
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {course.highlights.map((hl, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50/60 border border-amber-100 text-xs text-slate-800"
                >
                  <span className="text-emerald-600 mt-0.5">
                    <CheckIcon size={12} />
                  </span>
                  <span className="font-semibold">{hl}</span>
                </div>
              ))}
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="text-amber-600 mt-0.5">
                  <FileTextIcon size={12} />
                </span>
                <span className="font-semibold">
                  Total: {course.pages_count} (Print-Ready PDF)
                </span>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span className="text-blue-600 mt-0.5">
                  <DownloadIcon size={12} />
                </span>
                <span className="font-semibold">
                  Lifetime Digital Access
                </span>
              </div>
            </div>
          </div>

          {/* Syllabus */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Syllabus & Chapter Index</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Latest 2026 Exam Pattern
              </span>
            </h4>

            {course.syllabus_preview && course.syllabus_preview.length > 0 ? (
              <div className="space-y-2">
                {course.syllabus_preview.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-mono flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {sec.subject}
                    </h5>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {sec.chapters.map((chap, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded"
                        >
                          {chap}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap gap-2">
                  {course.subjects.map((sub, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white border border-slate-200 px-2.5 py-1 rounded text-slate-800 font-medium"
                    >
                      • {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sample PDF CTA */}
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h5 className="text-xs font-extrabold text-blue-950">
                Free Sample PDF Preview
              </h5>
              <p className="text-[11px] text-blue-800">
                Check handwriting quality, content depth, and question level.
              </p>
            </div>
            <a
              href={course.sample_pdf_url || "https://drive.google.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md transition flex items-center gap-1.5"
            >
              <span>Open Demo</span>
              <ExternalLinkIcon size={12} />
            </a>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">
              Limited Deal Price
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{course.price}
              </span>
              <span className="text-xs text-slate-400 line-through">
                ₹{course.original_price}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-outline py-2 text-xs"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onBuyNow(course);
              }}
              className="btn-primary py-2 text-xs sm:text-sm"
            >
              <ShoppingBagIcon size={14} />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
