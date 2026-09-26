"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { BundleCardStyle, Settings } from "@/lib/store-types";
import { DEFAULT_BUNDLE_CARD_STYLE } from "@/lib/default-settings";
import { ShoppingBagIcon } from "@/components/icons";

interface SectionsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

type SectionKey = "global" | "featured_bundles" | "new_arrivals" | "hot_deals" | "all_products";

interface SectionOption {
  id: SectionKey;
  label: string;
  description: string;
}

const SECTIONS: SectionOption[] = [
  { id: "global", label: "Global (All Sections)", description: "Default style applied across all product bundle sections." },
  { id: "featured_bundles", label: "Featured Bundles", description: "Homepage Featured Bundles grid." },
  { id: "new_arrivals", label: "New Arrivals", description: "Homepage New Arrivals section." },
  { id: "hot_deals", label: "Today's Hot Deals", description: "Homepage Hot Deals section." },
  { id: "all_products", label: "All Exam Bundles", description: "Homepage main products directory." },
];

const PREVIEW_CARDS = [
  {
    id: "sample-1",
    title: "SSC CGL 2026 : Quantitative Aptitude 1,000 MCQs",
    exam: "SSC CGL",
    rating: 4.9,
    pages: "320+ Pages",
    format: "Printable PDF",
    price: 49,
    original_price: 199,
    discount_percent: 75,
    cover_image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-2",
    title: "SSC CHSL (10+2) 2026 : Complete Practice Book",
    exam: "SSC CHSL",
    rating: 4.9,
    pages: "320+ Pages",
    format: "Printable PDF + CBT",
    price: 49,
    original_price: 199,
    discount_percent: 75,
    cover_image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "sample-3",
    title: "Rajasthan CET 2026 : Complete Selection Bundle",
    exam: "CET 12th Level",
    rating: 4.9,
    pages: "1450+ Pages",
    format: "Printable PDF",
    price: 99,
    original_price: 999,
    discount_percent: 90,
    cover_image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80",
  },
];

export default function SectionsTab({ getAuthHeaders }: SectionsTabProps) {
  const [selectedSection, setSelectedSection] = useState<SectionKey>("global");
  const [globalStyle, setGlobalStyle] = useState<Required<BundleCardStyle>>({ ...DEFAULT_BUNDLE_CARD_STYLE });
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, BundleCardStyle>>({});
  const [fullSettings, setFullSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings", {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data: Settings = await res.json();
          setFullSettings(data);
          if (data.homepage?.bundle_card_style) {
            setGlobalStyle({
              ...DEFAULT_BUNDLE_CARD_STYLE,
              ...data.homepage.bundle_card_style,
            });
          }
          if (data.homepage?.sections_card_styles) {
            setSectionOverrides(data.homepage.sections_card_styles);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Compute active style for currently selected section
  const currentActiveStyle: Required<BundleCardStyle> = {
    ...DEFAULT_BUNDLE_CARD_STYLE,
    ...globalStyle,
    ...(selectedSection !== "global" && sectionOverrides[selectedSection] ? sectionOverrides[selectedSection] : {}),
  };

  const isOverridden = selectedSection !== "global" && Boolean(sectionOverrides[selectedSection]);

  const updateActiveStyle = (updates: Partial<BundleCardStyle>) => {
    if (selectedSection === "global") {
      setGlobalStyle((prev) => ({ ...prev, ...updates }));
    } else {
      setSectionOverrides((prev) => ({
        ...prev,
        [selectedSection]: {
          ...(prev[selectedSection] || globalStyle),
          ...updates,
        },
      }));
    }
  };

  const clearSectionOverride = () => {
    if (selectedSection === "global") return;
    setSectionOverrides((prev) => {
      const copy = { ...prev };
      delete copy[selectedSection];
      return copy;
    });
  };

  // Presets
  const applyPreset = (preset: "compact" | "ecommerce" | "classic") => {
    if (preset === "compact") {
      updateActiveStyle({
        mobile_cover_height: 130,
        mobile_aspect_ratio: "3/4",
        mobile_grid_cols: 2,
        mobile_card_padding: 6,
        mobile_title_size: "xs",
        mobile_title_lines: 1,
        desktop_cover_height: 210,
        desktop_grid_cols: 5,
        desktop_card_padding: 10,
        show_instant_access: false,
        button_style: "compact",
        button_layout: "full_width",
        button_text_mobile: "Buy",
        button_height_mobile: 26,
        cover_fit: "cover",
      });
    } else if (preset === "ecommerce") {
      updateActiveStyle({
        mobile_cover_height: 110,
        mobile_aspect_ratio: "1/1",
        mobile_grid_cols: 3,
        mobile_card_padding: 4,
        mobile_title_size: "xs",
        mobile_title_lines: 1,
        desktop_cover_height: 190,
        desktop_grid_cols: 6,
        desktop_card_padding: 8,
        show_pages_format: false,
        show_instant_access: false,
        button_style: "compact",
        button_layout: "inline_price",
        button_text_mobile: "Buy",
        button_height_mobile: 24,
        cover_fit: "cover",
      });
    } else if (preset === "classic") {
      updateActiveStyle({
        mobile_cover_height: 180,
        mobile_aspect_ratio: "4/5",
        mobile_grid_cols: 2,
        mobile_card_padding: 10,
        mobile_title_size: "sm",
        mobile_title_lines: 2,
        desktop_cover_height: 250,
        desktop_grid_cols: 5,
        desktop_card_padding: 14,
        show_instant_access: true,
        show_pages_format: true,
        button_style: "full",
        button_layout: "full_width",
        button_text_mobile: "Buy",
        button_text: "Grab This Deal",
        button_height_mobile: 32,
        cover_fit: "cover",
      });
    }
  };

  // Save to backend
  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const currentHomepage = fullSettings?.homepage || {};
      const payload = {
        homepage: {
          ...currentHomepage,
          bundle_card_style: globalStyle,
          sections_card_styles: sectionOverrides,
        },
      };

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setFullSettings(updated);
        setToast({ message: "Settings saved successfully! Website layout updated.", type: "success" });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ message: "Failed to save settings. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Error saving settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-600">Loading Section Layout Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Sections Layout & Card Dimensions</h2>
          <p className="text-xs text-stone-500 mt-1">
            Adjust bundle card sizes, cover image height, grid columns, and mobile layout without modifying code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save All Layout Changes"}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Section Selection Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          Select Target Section to Customize:
        </label>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((sec) => {
            const isSelected = selectedSection === sec.id;
            const hasCustomOverride = sec.id !== "global" && Boolean(sectionOverrides[sec.id]);
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <span>{sec.label}</span>
                {hasCustomOverride && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? "bg-amber-800 text-amber-100" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    Custom
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <span>{SECTIONS.find((s) => s.id === selectedSection)?.description}</span>
          {isOverridden && (
            <button
              type="button"
              onClick={clearSectionOverride}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              Reset to Global Style
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Controls on Left, Live Interactive Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Presets */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800">Quick Layout Presets</label>
              <span className="text-[10px] text-stone-400">One-click standard configurations</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyPreset("compact")}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center transition cursor-pointer"
              >
                <div>Compact Mobile</div>
                <div className="text-[10px] text-stone-500 font-normal">Height 130px • 2 Cols</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("ecommerce")}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center transition cursor-pointer"
              >
                <div>E-Commerce Grid</div>
                <div className="text-[10px] text-stone-500 font-normal">Height 110px • 3 Cols</div>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("classic")}
                className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold text-center transition cursor-pointer"
              >
                <div>Classic Full</div>
                <div className="text-[10px] text-stone-500 font-normal">Height 180px • 2 Cols</div>
              </button>
            </div>
          </div>

          {/* Mobile Specific Controls */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Mobile Layout & Dimensions (Phone Screens)</h3>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                Screen &lt; 640px
              </span>
            </div>

            {/* Mobile Cover Image Height Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Mobile Cover Image Height</label>
                <span className="text-xs font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded text-amber-800 border border-stone-200">
                  {currentActiveStyle.mobile_cover_height}px
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="240"
                step="5"
                value={currentActiveStyle.mobile_cover_height}
                onChange={(e) => updateActiveStyle({ mobile_cover_height: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>Ultra Compact (100px)</span>
                <span>Slim (130px)</span>
                <span>Balanced (150px)</span>
                <span>Large (180px)</span>
                <span>Max (240px)</span>
              </div>
            </div>

            {/* Mobile Aspect Ratio & Grid Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Mobile Cover Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["custom", "3/4", "4/5", "1/1"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => updateActiveStyle({ mobile_aspect_ratio: ratio })}
                      className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                        currentActiveStyle.mobile_aspect_ratio === ratio
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {ratio === "custom" ? "Custom px" : ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Mobile Grid Columns</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ mobile_grid_cols: 2 })}
                    className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                      currentActiveStyle.mobile_grid_cols === 2
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    2 Columns (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ mobile_grid_cols: 3 })}
                    className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                      currentActiveStyle.mobile_grid_cols === 3
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    3 Columns (Compact)
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Card Padding & Title Sizing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Mobile Card Inner Padding</label>
                  <span className="text-xs font-mono font-bold text-stone-600">
                    {currentActiveStyle.mobile_card_padding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="14"
                  step="2"
                  value={currentActiveStyle.mobile_card_padding}
                  onChange={(e) => updateActiveStyle({ mobile_card_padding: Number(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Mobile Title Font Size</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["xs", "sm", "base"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateActiveStyle({ mobile_title_size: sz })}
                      className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                        currentActiveStyle.mobile_title_size === sz
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {sz === "xs" ? "11px (XS)" : sz === "sm" ? "12px (SM)" : "14px (MD)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="border-b border-stone-100 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Desktop Layout & Dimensions (PC & Tablet)</h3>
              <span className="text-[10px] bg-stone-100 text-stone-800 px-2 py-0.5 rounded-full font-bold">
                Screen &gt; 1024px
              </span>
            </div>

            {/* Desktop Cover Height Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700">Desktop Cover Image Height</label>
                <span className="text-xs font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded text-amber-800 border border-stone-200">
                  {currentActiveStyle.desktop_cover_height}px
                </span>
              </div>
              <input
                type="range"
                min="180"
                max="320"
                step="10"
                value={currentActiveStyle.desktop_cover_height}
                onChange={(e) => updateActiveStyle({ desktop_cover_height: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-stone-400">
                <span>Compact (180px)</span>
                <span>Normal (220px)</span>
                <span>Standard (240px)</span>
                <span>Tall (280px)</span>
                <span>Large (320px)</span>
              </div>
            </div>

            {/* Desktop Grid Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Desktop Grid Columns</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([3, 4, 5, 6] as const).map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => updateActiveStyle({ desktop_grid_cols: cols })}
                      className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                        currentActiveStyle.desktop_grid_cols === cols
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {cols} Cols
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Cover Image Fit</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ cover_fit: "cover" })}
                    className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                      currentActiveStyle.cover_fit === "cover"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    Crop & Fill (cover)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ cover_fit: "contain" })}
                    className={`text-xs py-1.5 rounded-lg border font-bold transition cursor-pointer text-center ${
                      currentActiveStyle.cover_fit === "contain"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    Full Book (contain)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card Element Visibility Toggles */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
              Card Elements Visibility & Action Button
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { key: "show_discount_badge", label: "Discount Ribbon (% OFF)" },
                { key: "show_exam_tag", label: "Exam / Category Tag (Hides '5004', '5002')" },
                { key: "show_rating", label: "Rating Chip (4.9)" },
                { key: "show_pages_format", label: "Pages & Format" },
                { key: "show_instant_access", label: "Instant Access Footer" },
              ].map((item) => {
                const isEnabled = Boolean(currentActiveStyle[item.key as keyof BundleCardStyle]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateActiveStyle({ [item.key]: !isEnabled })}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer flex items-center justify-between ${
                      isEnabled
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        isEnabled ? "bg-amber-600 text-white" : "bg-stone-300 text-stone-700"
                      }`}
                    >
                      {isEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Button Controls: Layout, Labels, and Mobile Height */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Button Layout & Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "full_width", label: "Full Width" },
                    { id: "inline_price", label: "Inline With Price" },
                    { id: "compact_pill", label: "Compact Pill" },
                    { id: "icon_only_mobile", label: "Icon Only (Phone)" },
                    { id: "hidden", label: "Hide Button" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => updateActiveStyle({ button_layout: btn.id as any })}
                      className={`text-xs py-1.5 px-2 rounded-lg border font-bold transition cursor-pointer text-center ${
                        (currentActiveStyle.button_layout || "full_width") === btn.id
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Labels: Desktop vs Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Desktop Button Label</label>
                  <input
                    type="text"
                    value={currentActiveStyle.button_text}
                    onChange={(e) => updateActiveStyle({ button_text: e.target.value })}
                    placeholder="Grab This Deal"
                    className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-stone-400">Shown on desktop and tablets</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Mobile Button Label</label>
                  <input
                    type="text"
                    value={currentActiveStyle.button_text_mobile || ""}
                    onChange={(e) => updateActiveStyle({ button_text_mobile: e.target.value })}
                    placeholder="Buy (Short text for phone)"
                    className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:border-amber-600"
                  />
                  <span className="text-[10px] text-stone-400">Recommended 3-5 letters (e.g. Buy, Get, ₹49)</span>
                </div>
              </div>

              {/* Mobile Button Height & Icon Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-700">Mobile Button Height</label>
                    <span className="text-xs font-mono font-bold text-stone-600">
                      {currentActiveStyle.button_height_mobile || 28}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="38"
                    step="2"
                    value={currentActiveStyle.button_height_mobile || 28}
                    onChange={(e) => updateActiveStyle({ button_height_mobile: Number(e.target.value) })}
                    className="w-full accent-amber-600 cursor-pointer h-2 bg-stone-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Shopping Cart Icon</label>
                  <button
                    type="button"
                    onClick={() => updateActiveStyle({ show_button_icon: !currentActiveStyle.show_button_icon })}
                    className={`w-full text-xs py-1.5 px-3 rounded-lg border font-bold transition cursor-pointer flex items-center justify-between ${
                      currentActiveStyle.show_button_icon !== false
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "bg-stone-50 border-stone-200 text-stone-600"
                    }`}
                  >
                    <span>Shopping Cart Icon</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        currentActiveStyle.show_button_icon !== false ? "bg-amber-600 text-white" : "bg-stone-300 text-stone-700"
                      }`}
                    >
                      {currentActiveStyle.show_button_icon !== false ? "SHOW" : "HIDE"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview Column (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="bg-stone-900 text-stone-100 rounded-3xl p-5 border border-stone-800 shadow-xl">
            {/* Preview Header & Device Selector */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Live Preview ({previewDevice === "mobile" ? "Mobile Phone" : "Desktop"})
                </span>
              </div>
              <div className="flex items-center gap-1 bg-stone-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    previewDevice === "mobile" ? "bg-amber-600 text-white shadow-xs" : "text-stone-400 hover:text-white"
                  }`}
                >
                  Phone (375px)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                    previewDevice === "desktop" ? "bg-amber-600 text-white shadow-xs" : "text-stone-400 hover:text-white"
                  }`}
                >
                  Desktop
                </button>
              </div>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center overflow-x-auto py-2">
              <div
                style={{
                  width: previewDevice === "mobile" ? "375px" : "100%",
                  maxWidth: "100%",
                }}
                className={`bg-stone-100 rounded-2xl p-3 border ${
                  previewDevice === "mobile" ? "border-stone-700 shadow-2xl" : "border-stone-800"
                }`}
              >
                {/* Simulated Grid */}
                <div
                  className={`grid gap-2.5 ${
                    previewDevice === "mobile"
                      ? currentActiveStyle.mobile_grid_cols === 3
                        ? "grid-cols-3"
                        : "grid-cols-2"
                      : "grid-cols-3"
                  }`}
                >
                  {PREVIEW_CARDS.slice(0, previewDevice === "mobile" ? (currentActiveStyle.mobile_grid_cols === 3 ? 3 : 2) : 3).map(
                    (card) => {
                      const coverHeight =
                        previewDevice === "mobile"
                          ? currentActiveStyle.mobile_aspect_ratio === "custom"
                            ? `${currentActiveStyle.mobile_cover_height}px`
                            : undefined
                          : `${currentActiveStyle.desktop_cover_height}px`;

                      const padding =
                        previewDevice === "mobile"
                          ? `${currentActiveStyle.mobile_card_padding}px`
                          : `${currentActiveStyle.desktop_card_padding}px`;

                      const titleClass =
                        currentActiveStyle.mobile_title_size === "xs"
                          ? "text-[11px]"
                          : currentActiveStyle.mobile_title_size === "sm"
                          ? "text-xs"
                          : "text-sm";

                      return (
                        <div
                          key={card.id}
                          className="bg-white rounded-xl overflow-hidden border border-stone-200 shadow-xs flex flex-col"
                        >
                          {/* Book Cover */}
                          <div
                            style={{
                              height: coverHeight,
                              aspectRatio:
                                previewDevice === "mobile" && currentActiveStyle.mobile_aspect_ratio !== "custom"
                                  ? currentActiveStyle.mobile_aspect_ratio
                                  : undefined,
                            }}
                            className="relative w-full bg-stone-200 overflow-hidden shrink-0"
                          >
                            {currentActiveStyle.show_discount_badge && (
                              <span className="absolute top-1 left-1 z-10 bg-amber-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow">
                                {card.discount_percent}% OFF
                              </span>
                            )}
                            <img
                              src={card.cover_image}
                              alt={card.title}
                              className={`w-full h-full ${
                                currentActiveStyle.cover_fit === "contain" ? "object-contain p-1" : "object-cover"
                              }`}
                            />
                          </div>

                          {/* Body */}
                          <div style={{ padding }} className="flex-1 flex flex-col justify-between gap-1.5 text-stone-900">
                            <div>
                              {(() => {
                                const isNum = /^\d+$/.test(String(card.exam).trim());
                                const showTag = Boolean(currentActiveStyle.show_exam_tag && !isNum);
                                const showRating = Boolean(currentActiveStyle.show_rating);
                                if (!showTag && !showRating) return null;
                                return (
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    {showTag && (
                                      <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded line-clamp-1">
                                        {card.exam}
                                      </span>
                                    )}
                                    {showRating && (
                                      <span
                                        className={`text-[9px] font-bold text-stone-700 bg-stone-100 px-1 py-0.2 rounded ${
                                          !showTag ? "ml-auto" : ""
                                        }`}
                                      >
                                        ★ {card.rating}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              <h4
                                className={`font-bold leading-tight line-clamp-${currentActiveStyle.mobile_title_lines} ${titleClass}`}
                              >
                                {card.title}
                              </h4>

                              {currentActiveStyle.show_pages_format && (
                                <p className="text-[10px] text-stone-500 mt-1 line-clamp-1">
                                  {card.pages} • {card.format}
                                </p>
                              )}
                            </div>

                            <div className="pt-1 space-y-1 mt-auto">
                              {currentActiveStyle.button_layout === "inline_price" ? (
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-baseline gap-1 shrink-0">
                                    <span className="text-xs font-black text-stone-900">₹{card.price}</span>
                                    <span className="text-[10px] text-stone-400 line-through">₹{card.original_price}</span>
                                  </div>
                                  <button
                                    type="button"
                                    style={{
                                      height:
                                        previewDevice === "mobile"
                                          ? `${currentActiveStyle.button_height_mobile || 26}px`
                                          : undefined,
                                    }}
                                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-2 py-0.5 rounded text-[10px] transition shrink-0 flex items-center gap-1"
                                  >
                                    {currentActiveStyle.show_button_icon !== false && (
                                      <ShoppingBagIcon size={10} className="shrink-0" />
                                    )}
                                    <span className="truncate">
                                      {previewDevice === "mobile"
                                        ? currentActiveStyle.button_text_mobile || "Buy"
                                        : currentActiveStyle.button_text || "Grab This Deal"}
                                    </span>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xs font-black text-stone-900">₹{card.price}</span>
                                    <span className="text-[10px] text-stone-400 line-through">₹{card.original_price}</span>
                                  </div>

                                  {currentActiveStyle.button_layout !== "hidden" && (
                                    <button
                                      type="button"
                                      style={{
                                        height:
                                          previewDevice === "mobile"
                                            ? `${currentActiveStyle.button_height_mobile || 28}px`
                                            : undefined,
                                      }}
                                      className={`w-full bg-amber-700 hover:bg-amber-800 text-white font-bold transition flex items-center justify-center gap-1 px-1.5 ${
                                        currentActiveStyle.button_layout === "compact_pill"
                                          ? "rounded-full py-1 text-[10px]"
                                          : "rounded-lg py-1 text-[10px]"
                                      }`}
                                    >
                                      {currentActiveStyle.show_button_icon !== false && (
                                        <ShoppingBagIcon
                                          size={10}
                                          className={
                                            currentActiveStyle.button_layout === "icon_only_mobile" &&
                                            previewDevice === "mobile"
                                              ? "block"
                                              : "shrink-0"
                                          }
                                        />
                                      )}
                                      {currentActiveStyle.button_layout === "icon_only_mobile" &&
                                      previewDevice === "mobile" ? null : (
                                        <span className="truncate">
                                          {previewDevice === "mobile"
                                            ? currentActiveStyle.button_text_mobile || "Buy"
                                            : currentActiveStyle.button_text || "Grab This Deal"}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </>
                              )}

                              {currentActiveStyle.show_instant_access && (
                                <div className="text-[9px] text-center text-emerald-700 font-semibold truncate">
                                  Instant Access
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 text-center mt-3">
              Sliding controls update this preview instantly. Click Save to publish changes live to the site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
