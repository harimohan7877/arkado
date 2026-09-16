export default function HeroSliderSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-stone-900 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between p-6 sm:p-10 border border-stone-800 animate-pulse">
      {/* Top Tag & Rating Placeholder */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-36 bg-stone-800 rounded-full" />
        <div className="h-5 w-24 bg-stone-800 rounded-md" />
      </div>

      {/* Center Content Placeholder */}
      <div className="my-6 space-y-3 max-w-xl">
        <div className="h-8 sm:h-10 w-4/5 bg-stone-800 rounded-lg" />
        <div className="h-8 sm:h-10 w-3/5 bg-stone-800 rounded-lg" />
        <div className="h-4 w-full bg-stone-800/70 rounded mt-3" />
        <div className="h-4 w-2/3 bg-stone-800/70 rounded" />
      </div>

      {/* Bottom Features & Action Buttons Placeholder */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-stone-800/80">
        <div className="flex items-center gap-3">
          <div className="h-7 w-28 bg-stone-800 rounded-lg" />
          <div className="h-7 w-28 bg-stone-800 rounded-lg" />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-10 w-28 bg-stone-800 rounded-xl" />
          <div className="h-10 w-36 bg-stone-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
