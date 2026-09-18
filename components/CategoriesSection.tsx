"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Category, Settings } from "@/lib/store-types";
import { SearchIcon, CloseIcon, GridIcon } from "@/components/icons";

interface CategoriesSectionProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory?: (catId: string) => void;
  title?: string;
  initialSettings?: Settings | null;
}

export default function CategoriesSection({ categories, title, initialSettings }: CategoriesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  useEffect(() => {
    fetch(`/api/settings?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  // Filter categories by search
  const visibleCategories = useMemo(() => {
    let list = categories;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.state_or_group && c.state_or_group.toLowerCase().includes(q)));
    } else {
      list = list.slice(0, 18);
    }
    return list;
  }, [categories, searchQuery]);

  const totalExamsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.exam_count || c.exam_ids?.length || 0), 0);
  }, [categories]);

  const sectionTitle = title || settings?.homepage?.categories_section_title || "Browse Top Categories";

  const cardStyle = settings?.homepage?.category_card_style || {};
  const logoSize = cardStyle.logo_size || 110;
  const logoShape = cardStyle.logo_shape || "circle";
  const containerPadding = cardStyle.container_padding !== undefined ? cardStyle.container_padding : 0;
  const showInnerBorder = cardStyle.show_inner_border === true;
  const showCardBorder = cardStyle.show_card_border === true;
  const cardGap = cardStyle.card_gap !== undefined ? cardStyle.card_gap : 10;
  const cardPadding = cardStyle.card_padding !== undefined ? cardStyle.card_padding : 8;
  const textGap = cardStyle.text_gap !== undefined ? cardStyle.text_gap : 6;
  const cardShadow = cardStyle.card_shadow || "sm";
  const cardBgStyle = cardStyle.card_bg_style || "white";
  const textPosition = cardStyle.text_position || "below";
  const textSize = cardStyle.text_size || "xs";
  const showExamCount = cardStyle.show_exam_count !== false;
  const cardBorderRadius = cardStyle.card_border_radius || "rounded-2xl";

  const shapeClass =
    logoShape === "square"
      ? "rounded-none"
      : logoShape === "rounded-xl"
      ? "rounded-xl"
      : logoShape === "rounded-2xl"
      ? "rounded-2xl"
      : "rounded-full";

  const bgClass =
    cardBgStyle === "stone"
      ? "bg-stone-50 hover:bg-white"
      : cardBgStyle === "glass"
      ? "bg-white/80 backdrop-blur-xs hover:bg-white"
      : "bg-white";

  const shadowStyle =
    cardShadow === "none"
      ? "none"
      : cardShadow === "md"
      ? "0 4px 14px -2px rgba(28,25,23,0.08)"
      : cardShadow === "lg"
      ? "0 10px 25px -3px rgba(28,25,23,0.12)"
      : "0 1px 3px rgba(0,0,0,0.05)";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider">{sectionTitle}</h2>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {categories.length} categories • {totalExamsCount}+ exams
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <input
              type="text"
              placeholder={`Search ${categories.length} categories...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-stone-300 text-xs placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-2xs"
            />
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded hover:bg-stone-100 flex items-center justify-center text-stone-400 cursor-pointer">
                <CloseIcon size={12} />
              </button>
            )}
          </div>
          <Link
            href="/exams"
            className="px-3.5 py-2 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
          >
            <GridIcon size={12} />
            All Exams ({totalExamsCount})
          </Link>
        </div>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        style={{ gap: `${cardGap}px` }}
      >
        {visibleCategories.map((cat) => {
          const count = cat.exam_count || cat.exam_ids?.length || 0;

          const textBlock = (
            <div className="flex flex-col items-center">
              <p className={`font-bold leading-tight line-clamp-2 text-stone-800 group-hover:text-amber-700 transition ${
                textSize === "sm" ? "text-sm" : textSize === "base" ? "text-base" : "text-xs"
              }`}>
                {cat.name}
              </p>
              {showExamCount && (
                <span className="text-[10px] mt-1 font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 group-hover:bg-amber-50 group-hover:text-amber-800 transition">
                  {count} {count === 1 ? "exam" : "exams"} →
                </span>
              )}
            </div>
          );

          const logoBlock = (
            <div
              style={{
                width: `${logoSize}px`,
                height: `${logoSize}px`,
                maxWidth: "100%",
                maxHeight: `${logoSize}px`,
                aspectRatio: "1 / 1",
                padding: `${containerPadding}px`,
                marginBottom: textPosition === "below" ? `${textGap}px` : undefined,
                marginTop: textPosition === "above" ? `${textGap}px` : undefined,
                border: showInnerBorder ? "1px solid #fef3c7" : "none",
                borderWidth: showInnerBorder ? "1px" : "0px",
                borderStyle: showInnerBorder ? "solid" : "none",
                borderColor: showInnerBorder ? "#fef3c7" : "transparent",
                outline: "none",
                boxShadow: showInnerBorder ? undefined : "none",
                background: showInnerBorder ? "#fffbeb" : "transparent",
              }}
              className={`relative overflow-hidden transition-all flex items-center justify-center shrink-0 ${shapeClass} ${
                showInnerBorder
                  ? "border border-amber-200/80 group-hover:border-amber-400"
                  : ""
              }`}
            >
              {cat.logo_url && !failedImages[cat.id] ? (
                <Image
                  src={cat.logo_url}
                  alt={cat.name}
                  width={logoSize}
                  height={logoSize}
                  unoptimized
                  onError={() => setFailedImages((prev) => ({ ...prev, [cat.id]: true }))}
                  className={`w-full h-full object-contain ${shapeClass}`}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ fontSize: `${Math.max(20, Math.floor(logoSize * 0.45))}px` }}
                >
                  {cat.icon || "🏛️"}
                </div>
              )}
            </div>
          );

          return (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              style={{
                padding: `${cardPadding}px`,
                border: showCardBorder ? "1px solid #e7e5e4" : "none",
                borderWidth: showCardBorder ? "1px" : "0px",
                borderStyle: showCardBorder ? "solid" : "none",
                borderColor: showCardBorder ? "#e7e5e4" : "transparent",
                outline: "none",
                boxShadow: showCardBorder ? undefined : shadowStyle,
                WebkitTapHighlightColor: "transparent",
              }}
              className={`group flex flex-col items-center text-center transition-all cursor-pointer ${bgClass} ${
                showCardBorder
                  ? "border border-stone-200 hover:border-amber-400 hover:shadow-md"
                  : cardShadow === "none"
                  ? "hover:bg-stone-100/60"
                  : "hover:shadow-md"
              } hover:-translate-y-0.5 ${cardBorderRadius}`}
            >
              {textPosition === "above" ? (
                <>
                  {textBlock}
                  {logoBlock}
                </>
              ) : (
                <>
                  {logoBlock}
                  {textBlock}
                </>
              )}
            </Link>
          );
        })}
      </div>

      {visibleCategories.length === 0 && (
        <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-200">
          <p className="text-sm text-stone-500 font-medium">No categories matching &quot;{searchQuery}&quot;</p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-amber-700 font-bold mt-2 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {categories.length > 18 && !searchQuery && (
        <div className="text-center pt-2">
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold shadow-xs hover:border-amber-400 transition"
          >
            <GridIcon size={14} className="text-amber-600" />
            Explore All {categories.length} Categories &amp; {totalExamsCount}+ Exams →
          </Link>
        </div>
      )}
    </section>
  );
}