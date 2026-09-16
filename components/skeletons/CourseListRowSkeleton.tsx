export default function CourseListRowSkeleton() {
  return (
    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 animate-pulse">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Thumbnail */}
        <div className="w-16 h-20 rounded-lg bg-stone-200 shrink-0 border border-stone-200" />
        
        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-stone-200 rounded w-3/4" />
          <div className="h-3 bg-stone-100 rounded w-1/2" />
          <div className="flex items-center gap-2 pt-1">
            <div className="h-4 w-16 bg-stone-200 rounded" />
            <div className="h-3 w-12 bg-stone-100 rounded" />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
        <div className="h-8 w-24 bg-stone-200 rounded-xl" />
        <div className="h-8 w-28 bg-stone-200 rounded-xl" />
      </div>
    </div>
  );
}
