export default function CourseCardSkeleton() {
  return (
    <article className="card-base flex flex-col h-full overflow-hidden bg-white animate-pulse">
      {/* Cover Skeleton (aspect 4/5) */}
      <div className="relative w-full aspect-[4/5] bg-stone-200 flex items-center justify-center">
        {/* Shimmer badge placeholder */}
        <div className="absolute top-2 left-2 h-4 w-14 bg-stone-300 rounded" />
        <div className="w-10 h-10 rounded-full bg-stone-300/60" />
      </div>

      {/* Details Skeleton */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-2">
          {/* Rating / Board tag */}
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-stone-200 rounded" />
            <div className="h-3 w-10 bg-stone-200 rounded" />
          </div>

          {/* Title lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-full bg-stone-200 rounded" />
            <div className="h-3.5 w-4/5 bg-stone-200 rounded" />
          </div>

          {/* Meta specs */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-2.5 w-12 bg-stone-100 rounded" />
            <div className="h-2.5 w-14 bg-stone-100 rounded" />
          </div>
        </div>

        {/* Pricing & CTA Button */}
        <div className="mt-auto pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="h-4 w-12 bg-stone-200 rounded" />
            <div className="h-2.5 w-8 bg-stone-100 rounded" />
          </div>
          <div className="h-8 w-20 bg-stone-200 rounded-xl" />
        </div>
      </div>
    </article>
  );
}
