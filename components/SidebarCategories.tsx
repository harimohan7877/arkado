"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@/lib/store-types";
import { ChevronRightIcon } from "@/components/icons";

interface SidebarCategoriesProps {
  activeCategory?: string;
}

export default function SidebarCategories({ activeCategory }: SidebarCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/categories?scope=public")
      .then((r) => r.json())
      .then((data: Category[]) => {
        const sorted = [...data].sort((a, b) => a.priority - b.priority);
        setCategories(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <aside className="card-base p-3">
        <div className="space-y-2 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="card-base p-2.5 sticky top-32 overflow-hidden w-full max-w-full">
      <div className="px-3 py-2 mb-1 border-b border-slate-100">
        <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
          Browse Categories
        </p>
      </div>
      <nav className="space-y-1 overflow-hidden w-full">
        {categories.slice(0, 10).map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className={`cat-link w-full overflow-hidden ${isActive ? "active" : ""}`}
              title={cat.name}
            >
              <span className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-stone-200 p-0.5">
                  {cat.logo_url && !failedImages[cat.id] ? (
                    <Image
                      src={cat.logo_url}
                      alt={cat.name}
                      width={28}
                      height={28}
                      unoptimized
                      onError={() => setFailedImages((prev) => ({ ...prev, [cat.id]: true }))}
                      className="object-contain w-full h-full rounded-full"
                    />
                  ) : (
                    <span className="text-sm">{cat.icon || "📚"}</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-stone-800 line-clamp-2 leading-snug min-w-0">
                  {cat.name}
                </span>
              </span>
              <ChevronRightIcon
                size={14}
                className={`shrink-0 ml-1.5 ${isActive ? "opacity-90 text-amber-600" : "opacity-40 text-stone-400"}`}
              />
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 pt-2 border-t border-slate-100">
        <Link
          href="/exams"
          className="flex items-center justify-between px-3 py-2 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 rounded-lg transition"
        >
          <span>All {categories.length} Categories</span>
          <ChevronRightIcon size={14} />
        </Link>
      </div>

      <div className="mt-3 mx-2 p-3 rounded-md bg-amber-50 border border-amber-100">
        <p className="text-xs font-bold text-amber-800">🎯 Need help?</p>
        <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
          WhatsApp पर expert से बात करें — तुरंत PDF लिंक पाएं।
        </p>
        <a
          href="https://wa.me/917852004401"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded transition"
        >
          WhatsApp Now
        </a>
      </div>
    </aside>
  );
}
