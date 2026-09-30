"use client";

import Link from "next/link";
import { CourseBundle } from "@/lib/courses";
import { BundleCardStyle } from "@/lib/store-types";
import { ArrowRightIcon } from "@/components/icons";
import CourseCard from "./CourseCard";

interface FeaturedGridProps {
  title: string;
  courses: CourseBundle[];
  onBuyNow: (course: CourseBundle) => void;
  onOpenSample: (course: CourseBundle) => void;
  viewAllHref?: string;
  accent?: "red" | "amber";
  cardStyle?: BundleCardStyle;
  loading?: boolean;
}

export function ProductGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4"
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="card-base flex flex-col h-full overflow-hidden bg-white animate-pulse"
        >
          <div className="relative w-full aspect-[4/5] bg-stone-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-16 bg-stone-200 rounded" />
            <div className="h-4 w-full bg-stone-200 rounded" />
            <div className="h-4 w-3/4 bg-stone-200 rounded" />
            <div className="pt-2 flex justify-between items-center border-t border-stone-100">
              <div className="h-4 w-12 bg-stone-200 rounded" />
              <div className="h-7 w-16 bg-stone-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeaturedGrid({
  title,
  courses,
  onBuyNow,
  onOpenSample,
  viewAllHref,
  cardStyle,
  loading = false,
}: FeaturedGridProps) {
  if (courses.length === 0) {
    if (!loading) return null;
    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="section-title">{title}</h2>
        </div>
        <ProductGridSkeleton />
      </section>
    );
  }

  const mobileColsClass = cardStyle?.mobile_grid_cols === 3 ? "grid-cols-3" : "grid-cols-2";
  const desktopColsClass =
    cardStyle?.desktop_grid_cols === 6
      ? "lg:grid-cols-6"
      : cardStyle?.desktop_grid_cols === 4
      ? "lg:grid-cols-4"
      : cardStyle?.desktop_grid_cols === 3
      ? "lg:grid-cols-3"
      : "lg:grid-cols-5";

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="section-title">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800 transition"
          >
            <span>View All</span>
            <ArrowRightIcon size={14} />
          </Link>
        )}
      </div>

      <div
        style={{
          gap: cardStyle?.card_gap ? `${cardStyle.card_gap}px` : undefined,
        }}
        className={`grid ${mobileColsClass} sm:grid-cols-3 ${desktopColsClass} gap-3 sm:gap-4`}
      >
        {courses.slice(0, 10).map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onBuyNow={onBuyNow}
            onOpenSample={onOpenSample}
            cardStyle={cardStyle}
          />
        ))}
      </div>
    </section>
  );
}
