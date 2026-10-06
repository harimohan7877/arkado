"use client";

import { useState, useEffect } from "react";

interface BundleCardSettingsProps {
  getAuthHeaders: () => Record<string, string>;
}

interface BundleCardState {
  enabled: boolean;
  discount_percent: number;
  badge_text: string;
  title: string;
  subtitle: string;
  button_text: string;
  show_total: boolean;
  savings_display: "percent_only" | "percent_and_amount" | "hide";
}

const DEFAULTS: BundleCardState = {
  enabled: true,
  discount_percent: 5,
  badge_text: "🎁 Best Value",
  title: "Complete Selection Bundle",
  subtitle: "Get all {count} study kits for {exam} together — cheaper than buying separately.",
  button_text: "Buy Full Bundle →",
  show_total: true,
  savings_display: "percent_only",
};

/**
 * Full Bundle card customizer (exam pages with 2+ kits).
 * Nothing is hardcoded on the website — every text, the discount %,
 * and the savings display style come from here.
 * Standalone file so SettingsTab only needs a 2-line mount.
 */
export default function BundleCardSettings({ getAuthHeaders }: BundleCardSettingsProps) {
  const [form, setForm] = useState<BundleCardState>(DEFAULTS);
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
        const s = data?.bundle_card || {};
        setForm({
          enabled: s.enabled !== false,
          discount_percent: typeof s.discount_percent === "number" ? s.discount_percent : DEFAULTS.discount_percent,
          badge_text: s.badge_text ?? DEFAULTS.badge_text,
          title: s.title ?? DEFAULTS.title,
          subtitle: s.subtitle ?? DEFAULTS.subtitle,
          button_text: s.button_text ?? DEFAULTS.button_text,
          show_total: s.show_total !== false,
          savings_display: ["percent_only", "percent_and_amount", "hide"].includes(s.savings_display)
            ? s.savings_display
            : DEFAULTS.savings_display,
        });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof BundleCardState>(k: K, v: BundleCardState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSavedTick(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ bundle_card: form }),
      });
      if (!res.ok) throw new Error("save failed");
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2500);
    } catch {
      alert("Save nahi ho paya, dobara try karein.");
    } finally {
      setSaving(false);
    }
  };

  // Mini preview with sample values
  const sampleTotal = 354;
  const samplePrice = Math.round(sampleTotal * (1 - form.discount_percent / 100));
  const sampleSavings = sampleTotal - samplePrice;
  const previewSubtitle = form.subtitle.replace("{exam}", "SSC CGL").replace("{count}", "6");
  const savingsLabel =
    form.savings_display === "percent_and_amount"
      ? `${form.discount_percent}% OFF • ₹${sampleSavings} bachao`
      : form.savings_display === "percent_only"
      ? `${form.discount_percent}% OFF`
      : "";

  const labelCls = "text-xs font-bold text-stone-700 block mb-1";
  const inputCls =
    "w-full px-3 py-2 bg-white rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-amber-600";

  return (
    <div className="space-y-4 pt-4 border-t border-stone-200">
      <div className="border-b border-stone-200 pb-2">
        <h3 className="text-base font-bold text-stone-900">🎁 Full Bundle Card (Bundle Card Customizer)</h3>
        <p className="text-xs text-stone-500">
          Exam page par dikhne wale "Complete Bundle" card ka har text, chhoot % aur style yahin se badlega. Website par kuch hardcoded nahi hai.
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
          className="w-4 h-4 accent-amber-600"
        />
        Bundle card dikhao (exam pages par, jahan 2+ kits hon)
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Chhoot % (Discount percent)</label>
          <input
            type="number"
            min={0}
            max={90}
            value={form.discount_percent}
            onChange={(e) => set("discount_percent", Math.max(0, Math.min(90, Number(e.target.value) || 0)))}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Bachat ka display (Savings style)</label>
          <select
            value={form.savings_display}
            onChange={(e) => set("savings_display", e.target.value as BundleCardState["savings_display"])}
            className={inputCls}
          >
            <option value="percent_only">Sirf % (e.g. 5% OFF) — professional</option>
            <option value="percent_and_amount">% + rakam (e.g. 5% OFF • ₹18 bachao)</option>
            <option value="hide">Bachat mat dikhao</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Badge text (uper chhota label)</label>
          <input
            type="text"
            value={form.badge_text}
            onChange={(e) => set("badge_text", e.target.value)}
            className={inputCls}
            placeholder="🎁 Best Value"
          />
        </div>
        <div>
          <label className={labelCls}>Button text</label>
          <input
            type="text"
            value={form.button_text}
            onChange={(e) => set("button_text", e.target.value)}
            className={inputCls}
            placeholder="Buy Full Bundle →"
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Card title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={inputCls}
          placeholder="Complete Selection Bundle"
        />
      </div>

      <div>
        <label className={labelCls}>Subtitle — &#123;exam&#125; = exam ka naam, &#123;count&#125; = kits ki ginti</label>
        <textarea
          value={form.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          className={`${inputCls} min-h-[64px]`}
          placeholder="Get all {count} study kits for {exam} together — cheaper than buying separately."
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.show_total}
          onChange={(e) => set("show_total", e.target.checked)}
          className="w-4 h-4 accent-amber-600"
        />
        Kati hui kul rakam dikhao (₹354 jaise strike-through total)
      </label>

      {/* Live preview */}
      <div>
        <label className={labelCls}>Live preview (sample)</label>
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-5 relative overflow-hidden">
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-white space-y-1.5">
              <span className="inline-block text-[10px] font-black bg-white/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {form.badge_text}
              </span>
              <p className="text-lg font-black tracking-tight">{form.title}</p>
              <p className="text-[11px] text-amber-50 font-medium max-w-md">{previewSubtitle}</p>
              <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                {form.show_total && (
                  <span className="text-sm text-amber-100 line-through font-bold">₹{sampleTotal}</span>
                )}
                <span className="text-2xl font-black">₹{samplePrice}</span>
                {savingsLabel && (
                  <span className="text-[11px] font-black bg-emerald-500 px-2.5 py-1 rounded-full">
                    {savingsLabel}
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 px-5 py-2.5 bg-white text-orange-700 rounded-xl text-xs font-black">
              {form.button_text}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition cursor-pointer"
      >
        {saving ? "Save ho raha hai…" : savedTick ? "✓ Save ho gaya" : "Bundle Card Settings Save Karo"}
      </button>
    </div>
  );
}
