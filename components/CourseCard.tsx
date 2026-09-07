"use client";

import Image from "next/image";
import { CourseBundle } from "@/lib/courses";
import { getExamLabel } from "@/lib/exam-labels";
import {
  StarIcon,
  FileTextIcon,
  ZapIcon,
  ShoppingBagIcon,
  EyeIcon,
} from "@/components/icons";

interface CourseCardProps {
  course: CourseBundle;
  onBuyNow: (course: CourseBundle) => void;
  onOpenSample: (course: CourseBundle) => void;
}

export default function CourseCard({
  course,
  onBuyNow,
  onOpenSample,
}: CourseCardProps) {
  const examLabel = getExamLabel(course.exam_id);
  const rating = course.rating || 4.9;

  return (
    <article className="card-base flex flex-col h-full overflow-hidden bg-white group">
      {/* Cover */}
      <button
        type="button"
        onClick={() => onOpenSample(course)}
        className="relative w-full aspect-[4/5] bg-stone-100 overflow-hidden cursor-pointer block"
        aria-label={`View sample for ${course.title}`}
      >
        {/* Discount ribbon */}
        <span className="discount-ribbon z-10">
          {course.discount_percent}% OFF
        </span>

        {/* Book cover - fills full frame cleanly */}
        <div className="relative w-full h-full overflow-hidden transition-transform duration-300 group-hover:scale-105">
          <Image
            src={course.cover_image}
            alt={course.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 50vw, 280px"
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white text-stone-900 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-1.5 shadow-lg">
            <EyeIcon size={14} />
            View Sample
          </span>
        </div>
      </button>

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            {examLabel}
          </span>
          <span className="rating-chip">
            <StarIcon size={10} className="star" />
            {rating.toFixed(1)}
          </span>
        </div>

        <h3
          onClick={() => onOpenSample(course)}
          className="font-bold text-sm text-stone-900 leading-snug cursor-pointer hover:text-amber-700 transition line-clamp-2 min-h-[40px]"
        >
          {course.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <FileTextIcon size={11} />
          <span>{course.pages_count}</span>
          <span className="text-stone-300">•</span>
          <span className="font-semibold text-emerald-700">{course.format}</span>
        </div>

        <div className="mt-auto pt-2 space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-stone-900">
              ₹{course.price}
            </span>
            <span className="text-xs text-stone-400 line-through">
              ₹{course.original_price}
            </span>
          </div>

          <button
            onClick={() => onBuyNow(course)}
            className="btn-primary w-full py-2 text-xs"
          >
            <ShoppingBagIcon size={14} />
            <span>Grab This Deal</span>
          </button>

          <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-700">
            <ZapIcon size={11} />
            <span>Instant Digital Access</span>
          </div>
        </div>
      </div>
    </article>
  );
}