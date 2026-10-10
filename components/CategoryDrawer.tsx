"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@/lib/store-types";
import { fetchWithCache } from "@/lib/store-hooks";
import { GridIcon, CloseIcon, ChevronRightIcon } from "@/components/icons";

/**
 * Mobile-only floating Categories button + right-side slide-in drawer.
 * - Button sits above the chat FAB, same gradient.
 * - Drawer is compact (< full screen), categories one below another, scrollable.
 * - Opening the drawer is mutually exclusive with the chat popup (parent closes it).
 */
export default function CategoryDrawer({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWithCache<Category[]>("/api/categories?scope=public")
      .then((data) => {
        const sorted = [...(Array.isArray(data) ? data : [])].sort(
          (a, b) => (a.priority || 0) - (b.priority || 0)
        );
        setCategories(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Lock body scroll + Escape to close while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggle();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onToggle]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs z-[84] md:hidden anim-fade-in"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer — compact, right side, mobile only */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-[85] md:hidden w-[70%] max-w-[300px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
        aria-label="Exam categories"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100 shrink-0">
          <p className="text-xs font-black text-stone-900 uppercase tracking-wider">
            Categories
          </p>
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 cursor-pointer"
            aria-label="Close categories"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {loading ? (
            <div className="space-y-2 animate-pulse p-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-11 bg-stone-100 rounded-xl" />
              ))}
            </div>
          ) : (
            categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.id}`}
                onClick={onToggle}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 active:bg-amber-100 transition border border-transparent hover:border-amber-200"
              >
                <span className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                  {cat.logo_url && !failedImages[cat.id] ? (
                    <Image
                      src={cat.logo_url}
                      alt={cat.name}
                      width={32}
                      height={32}
                      unoptimized
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [cat.id]: true }))
                      }
                      className="object-contain w-full h-full rounded-full"
                    />
                  ) : (
                    <span className="text-base">{cat.icon || "📚"}</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-stone-900 line-clamp-2 leading-snug">
                    {cat.name}
                  </span>
                  <span className="block text-[10px] text-stone-400 mt-0.5">
                    {cat.exam_count ?? cat.exam_ids?.length ?? 0} Exams
                  </span>
                </span>
                <ChevronRightIcon size={14} className="shrink-0 text-stone-300" />
              </Link>
            ))
          )}
        </nav>

        <div className="p-3 border-t border-stone-100 shrink-0">
          <Link
            href="/exams"
            onClick={onToggle}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black transition"
          >
            All {categories.length} Categories →
          </Link>
        </div>
      </aside>

      {/* Floating Categories FAB — mobile only, above the chat FAB, same gradient */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Close categories" : "Open categories"}
        className={`fixed md:hidden z-[86] w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 ${
          open ? "bottom-5 right-4 rotate-90" : "bottom-[88px] right-4"
        }`}
      >
        {open ? <CloseIcon size={22} /> : <GridIcon size={24} />}
      </button>
    </>
  );
}
