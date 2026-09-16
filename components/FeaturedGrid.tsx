"use client";

import Link from "next/link";
import { CourseBundle } from "@/lib/courses";
import { ArrowRightIcon } from "@/components/icons";
import CourseCard from "./CourseCard";
import CourseCardSkeleton from "./skeletons/CourseCardSkeleton";

interface FeaturedGridProps {
  title: string;
  courses: CourseBundle[];
  onBuyNow: (course: CourseBundle) => void;
  onOpenSample: (course: CourseBundle) => void;
  viewAllHref?: string;
  accent?: "red" | "amber";
  loading?: boolean;
}

export default function FeaturedGrid({
  title,
  courses,
  onBuyNow,
  onOpenSample,
  viewAllHref,
  loading = false,
}: FeaturedGridProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (courses.length === 0) return null;

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {courses.slice(0, 10).map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onBuyNow={onBuyNow}
            onOpenSample={onOpenSample}
          />
        ))}
      </div>
    </section>
  );
}
