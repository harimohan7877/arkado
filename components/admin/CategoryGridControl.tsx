"use client";

import { useState, useEffect } from "react";

interface CategoryGridControlProps {
  getAuthHeaders: () => Record<string, string>;
}

/**
 * Compact "categories per row" control for the admin header (Categories tab only).
 * Lets Harimohan choose mobile (2/3/4) and desktop (4/5/6/8) grid columns.
 * Saved into settings.homepage.category_card_style — CategoriesSection reads it
 * and the card logos scale automatically with the column width.
 * Standalone file so the 148KB CategoriesTab never needs to be touched.
 */
export default function CategoryGridControl({ getAuthHeaders }: CategoryGridControlProps) {
  const [mobileCols, setMobileCols] = useState<number>(2);
  const [desktopCols, setDesktopCols] = useState<number>(6);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/settings?t=${Date.now()}`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const s = data?.homepage?.category_card_style || {};
        if ([2, 3, 4].includes(s.mobile_grid_cols)) setMobileCols(s.mobile_grid_cols);
        if ([4, 5, 6, 8].includes(s.desktop_grid_cols)) setDesktopCols(s.desktop_grid_cols);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (nextMobile: number, nextDesktop: number) => {
    setSaving(true);
    setSavedTick(false);
    try {
      const headers = getAuthHeaders();
      const curRes = await fetch(`/api/admin/settings?t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      if (!curRes.ok) throw new Error("load failed");
      const current = await curRes.json();
      const updatedHomepage = {
        ...(current?.homepage || {}),
        category_card_style: {
          ...(current?.homepage?.category_card_style || {}),
          mobile_grid_cols: nextMobile,
          desktop_grid_cols: nextDesktop,
        },
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ homepage: updatedHomepage }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    } catch {
      alert("Grid setting save nahi ho payi, dobara try karein.");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "bg-white border border-stone-300 rounded-lg text-[11px] font-bold px-1.5 py-1.5 cursor-pointer focus:outline-none focus:border-amber-600";

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600">
      <span className="hidden sm:inline">🔲 Grid:</span>
      <label className="flex items-center gap-1">
        <span className="text-stone-400">📱</span>
        <select
          className={selectClass}
          value={mobileCols}
          disabled={saving}
          onChange={(e) => {
            const v = Number(e.target.value);
            setMobileCols(v);
            save(v, desktopCols);
          }}
          title="Mobile: ek line me kitni category"
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        <span className="text-stone-400">🖥️</span>
        <select
          className={selectClass}
          value={desktopCols}
          disabled={saving}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDesktopCols(v);
            save(mobileCols, v);
          }}
          title="Desktop: ek line me kitni category"
        >
          <option value={4}>4</option>
          <option value={5}>5</option>
          <option value={6}>6</option>
          <option value={8}>8</option>
        </select>
      </label>
      {saving && <span className="text-stone-400">…</span>}
      {!saving && savedTick && <span className="text-emerald-600">✓</span>}
    </div>
  );
}
