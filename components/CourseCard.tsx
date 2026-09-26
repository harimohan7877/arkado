"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CourseBundle } from "@/lib/courses";
import { BundleCardStyle } from "@/lib/store-types";
import { DEFAULT_BUNDLE_CARD_STYLE } from "@/lib/default-settings";
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
  onOpenSample?: (course: CourseBundle) => void;
  cardStyle?: BundleCardStyle;
}

export default function CourseCard({
  course,
  onBuyNow,
  onOpenSample,
  cardStyle,
}: CourseCardProps) {
  const [imgError, setImgError] = useState(false);
  const examLabel = getExamLabel(course.exam_id);
  const rating = course.rating || 4.9;
  const courseHref = `/course/${course.slug || course.id}`;

  const style = {
    ...DEFAULT_BUNDLE_CARD_STYLE,
    ...cardStyle,
  };

  const mobileHeight = style.mobile_cover_height || 150;
  const desktopHeight = style.desktop_cover_height || 240;
  const mobilePad = style.mobile_card_padding ?? 8;
  const desktopPad = style.desktop_card_padding ?? 14;

  const coverHeightClass =
    style.mobile_aspect_ratio === "custom"
      ? "h-[var(--card-mobile-h)] sm:h-[var(--card-desktop-h)]"
      : style.mobile_aspect_ratio === "1/1"
      ? "aspect-square sm:aspect-auto sm:h-[var(--card-desktop-h)]"
      : style.mobile_aspect_ratio === "3/4"
      ? "aspect-[3/4] sm:aspect-auto sm:h-[var(--card-desktop-h)]"
      : "aspect-[4/5] sm:aspect-auto sm:h-[var(--card-desktop-h)]";

  const titleSizeClass =
    style.mobile_title_size === "xs"
      ? "text-xs sm:text-sm"
      : style.mobile_title_size === "sm"
      ? "text-xs sm:text-sm font-bold"
      : "text-sm sm:text-base font-bold";

  const titleLinesClass =
    style.mobile_title_lines === 1 ? "line-clamp-1 sm:line-clamp-2" : "line-clamp-2";

  return (
    <article
      style={{
        "--card-mobile-h": `${mobileHeight}px`,
        "--card-desktop-h": `${desktopHeight}px`,
        "--card-mobile-pad": `${mobilePad}px`,
        "--card-desktop-pad": `${desktopPad}px`,
      } as React.CSSProperties}
      className={`card-base flex flex-col h-full overflow-hidden bg-white group ${style.card_border_radius || "rounded-xl"}`}
    >
      {/* Cover Link to Main Page */}
      <Link
        href={courseHref}
        className={`relative w-full ${coverHeightClass} bg-stone-100 overflow-hidden cursor-pointer block`}
        aria-label={`View details for ${course.title}`}
      >
        {/* Discount ribbon */}
        {style.show_discount_badge && (
          <span className="discount-ribbon z-10">
            {course.discount_percent}% OFF
          </span>
        )}

        {/* Book cover - fills full frame cleanly or shows styled fallback */}
        {course.cover_image && !imgError ? (
          <div className="relative w-full h-full overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <Image
              src={course.cover_image}
              alt={course.title}
              fill
              loading="lazy"
              quality={75}
              onError={() => setImgError(true)}
              className={style.cover_fit === "contain" ? "object-contain p-1 object-center" : "object-cover object-center"}
              sizes="(max-width: 640px) 50vw, 280px"
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-700 via-stone-800 to-stone-900 flex flex-col items-center justify-center p-3 text-center text-white">
            <span className="text-3xl mb-1">📚</span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-300 bg-black/40 px-2 py-0.5 rounded">
              {examLabel}
            </span>
            <p className="text-[11px] font-bold line-clamp-2 mt-2 px-1 text-stone-100">
              {course.title}
            </p>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white text-stone-900 text-xs font-bold px-3 py-2 rounded-md flex items-center gap-1.5 shadow-lg">
            <EyeIcon size={14} />
            View Course Details
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="p-[var(--card-mobile-pad)] sm:p-[var(--card-desktop-pad)] flex-1 flex flex-col gap-1.5 sm:gap-2">
        {(style.show_exam_tag || style.show_rating) && (
          <div className="flex items-center justify-between gap-1.5 min-h-[18px]">
            {style.show_exam_tag && (
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded line-clamp-1">
                {examLabel}
              </span>
            )}
            {style.show_rating && (
              <span className="rating-chip text-[9px] sm:text-xs">
                <StarIcon size={10} className="star" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        )}

        <Link
          href={`/course/${course.slug || course.id}`}
          className={`font-bold ${titleSizeClass} text-stone-900 leading-snug cursor-pointer hover:text-amber-700 transition ${titleLinesClass}`}
        >
          {course.title}
        </Link>

        {style.show_pages_format && (
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-stone-500 font-medium">
            <FileTextIcon size={11} />
            <span>{course.pages_count}</span>
            <span className="text-stone-300">•</span>
            <span className="font-semibold text-emerald-700">{course.format}</span>
          </div>
        )}

        <div className="mt-auto pt-1 sm:pt-2 space-y-1.5 sm:space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-stone-900">
              ₹{course.price}
            </span>
            <span className="text-[10px] sm:text-xs text-stone-400 line-through">
              ₹{course.original_price}
            </span>
          </div>

          <button
            onClick={() => onBuyNow(course)}
            className={`btn-primary w-full ${
              style.button_style === "compact"
                ? "py-1.5 text-[11px] sm:py-2 sm:text-xs"
                : "py-2 text-xs"
            }`}
          >
            <ShoppingBagIcon size={13} />
            <span>{style.button_text || "Grab This Deal"}</span>
          </button>

          {style.show_instant_access && (
            <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-700">
              <ZapIcon size={11} />
              <span>Instant Digital Access</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}