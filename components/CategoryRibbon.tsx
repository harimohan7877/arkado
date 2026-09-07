"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Category } from "@/lib/store-types";

export default function CategoryRibbon() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories?scope=public")
      .then((r) => r.json())
      .then((data: Category[]) => {
        const sorted = [...data].sort((a, b) => a.priority - b.priority).slice(0, 8);
        setCategories(sorted);
      })
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="section-title">Browse Top Categories</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/category/${cat.id}`}
            className="group flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-slate-200 group-hover:border-amber-700 group-hover:shadow-md flex items-center justify-center overflow-hidden transition">
              {cat.logo_url ? (
                <Image
                  src={cat.logo_url}
                  alt={cat.name}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-2xl">{cat.icon || "📚"}</span>
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 group-hover:text-amber-700 text-center leading-tight max-w-[80px] line-clamp-2">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
