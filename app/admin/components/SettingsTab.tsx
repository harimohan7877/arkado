"use client";

import { useState, useEffect, startTransition } from "react";

interface Settings {
  upi_id: string;
  merchant_name: string;
  whatsapp_support_number: string;
  gmail_support_email?: string;
  custom_qr_url?: string;
  site_name: string;
  site_tagline: string;
  currency: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_enabled: boolean;
  brand?: {
    logo_text?: string;
    logo_badge_text?: string;
    logo_accent_color?: string;
    tagline?: string;
    footer_tagline?: string;
  };
  homepage?: {
    hero_badge?: string;
    hero_headline?: string;
    featured_section_title?: string;
    hot_deals_title?: string;
    new_arrivals_title?: string;
    categories_section_title?: string;
    newsletter_title?: string;
    newsletter_subtitle?: string;
    newsletter_placeholder?: string;
    newsletter_button_text?: string;
  };
  social?: {
    whatsapp_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    gmail_url?: string;
    share_enabled?: boolean;
  };
  updated_at: string;
}

interface SettingsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

export default function SettingsTab({ getAuthHeaders }: SettingsTabProps) {
  const [settings, setSettings] = useState<Settings>({
    upi_id: "7852004401@ybl",
    merchant_name: "Arkado",
    whatsapp_support_number: "917852004401",
    gmail_support_email: "support@arkado.in",
    custom_qr_url: "",
    site_name: "Arkado",
    site_tagline: "Deep-Level Exam Analysis & Pattern-Based Premium Notes",
    currency: "INR",
    razorpay_key_id: "",
    razorpay_key_secret: "",
    razorpay_enabled: false,
    brand: {
      logo_text: "Arkado",
      logo_badge_text: "STORE",
      logo_accent_color: "#b45309",
      tagline: "Pattern-decoded notes for All-India exams",
      footer_tagline: "All-India exam preparation — deep-level analysis & pattern-based notes.",
    },
    homepage: {
      hero_badge: "2026 PATTERN DECODED",
      hero_headline: "RSMSSB CET & Rajasthan Exam Bundles",
      featured_section_title: "Featured Bundles",
      hot_deals_title: "Today's Hot Deals",
      new_arrivals_title: "New Arrivals",
      categories_section_title: "Browse Top Categories",
      newsletter_title: "🎯 सीधे WhatsApp व Email पर पाएं फ्री अपडेट्स व नए नोट्स!",
      newsletter_subtitle: "हजारों छात्रों का भरोसा — कोई स्पैम नहीं, सिर्फ परीक्षा उपयोगी अपडेट्स व स्पेशल छूट।",
      newsletter_placeholder: "अपना Email या WhatsApp Number दर्ज करें...",
      newsletter_button_text: "जुड़ें",
    },
    social: {
      whatsapp_url: "https://wa.me/917852004401",
      instagram_url: "https://instagram.com/",
      facebook_url: "https://facebook.com/",
      gmail_url: "mailto:support@arkado.in",
      share_enabled: true,
    },
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"payment" | "brand" | "homepage" | "social" | "razorpay">("payment");
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          ...data,
          brand: { ...prev.brand, ...data.brand },
          homepage: { ...prev.homepage, ...data.homepage },
          social: { ...prev.social, ...data.social },
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchSettings();
    });
  }, []);

  const handleChange = (key: keyof Settings, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedChange = (section: "brand" | "homepage" | "social", key: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully!" });
        fetchSettings();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: `${label} copied!` });
  };

  if (loading)
    return (
      <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        Loading settings...
      </div>
    );

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Settings</h2>
        <p className="text-stone-500 text-sm">Configure payment, branding, homepage titles, and social channels.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-sm ${message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-2 flex flex-wrap gap-1">
        {[
          { id: "payment", label: "Payment & UPI" },
          { id: "brand", label: "Brand & Logo" },
          { id: "homepage", label: "Homepage Titles" },
          { id: "social", label: "Social Channels" },
          { id: "razorpay", label: "Razorpay" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 min-w-[110px] px-3 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === tab.id ? "bg-amber-600 text-white" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "payment" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Direct UPI Payment</h3>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">UPI ID *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.upi_id}
                onChange={(e) => handleChange("upi_id", e.target.value)}
                className={`${inputCls} flex-1 font-mono`}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(settings.upi_id, "UPI ID")}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Merchant Name</label>
            <input
              type="text"
              value={settings.merchant_name}
              onChange={(e) => handleChange("merchant_name", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">WhatsApp Support / Order Number *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.whatsapp_support_number}
                onChange={(e) => handleChange("whatsapp_support_number", e.target.value)}
                className={`${inputCls} flex-1 font-mono`}
                placeholder="91XXXXXXXXXX"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(settings.whatsapp_support_number, "WhatsApp")}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm"
              >
                Copy
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1 font-devanagari">
              वेबसाइट से सभी नए ऑर्डर्स के WhatsApp संदेश तुरंत इसी नंबर पर प्राप्त होंगे। (देश कोड के साथ लिखें: जैसे 917852004401)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Gmail Support Email</label>
            <input
              type="email"
              value={settings.gmail_support_email || ""}
              onChange={(e) => handleChange("gmail_support_email", e.target.value)}
              className={inputCls}
              placeholder="support@arkado.in"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">
              Custom QR Code Image URL (वैकल्पिक / Optional)
            </label>
            <input
              type="text"
              value={settings.custom_qr_url || ""}
              onChange={(e) => handleChange("custom_qr_url", e.target.value)}
              className={inputCls}
              placeholder="https://... या /images/my-qr.png (खाली रखने पर UPI ID से ऑटोमैटिक QR बनेगा)"
            />
            <p className="text-[11px] text-stone-500 mt-1 font-devanagari">
              अगर आप PhonePe / Paytm / GPay का अपना खुद का QR कोड फोटो लगाना चाहते हैं तो उसका लिंक डालें, अन्यथा खाली छोड़ दें।
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm font-devanagari">Live QR Code Preview</h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                {settings.custom_qr_url && settings.custom_qr_url.trim().length > 5 ? "Custom QR Image" : "Dynamic UPI QR"}
              </span>
            </div>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  settings.custom_qr_url && settings.custom_qr_url.trim().length > 5
                    ? settings.custom_qr_url.trim()
                    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.merchant_name)}&am=1&cu=INR&tn=Test`
                      )}`
                }
                alt="UPI QR"
                className="w-44 h-44 rounded-xl bg-white p-2 border border-stone-200 object-contain"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Payment Settings"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "brand" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Brand & Logo</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Logo Brand Name *</label>
              <input
                type="text"
                value={settings.brand?.logo_text || "Arkado"}
                onChange={(e) => handleNestedChange("brand", "logo_text", e.target.value)}
                className={`${inputCls} font-bold`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Logo Badge Pill</label>
              <input
                type="text"
                value={settings.brand?.logo_badge_text || "STORE"}
                onChange={(e) => handleNestedChange("brand", "logo_badge_text", e.target.value)}
                className={`${inputCls} uppercase`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Header Tagline</label>
            <input
              type="text"
              value={settings.brand?.tagline || ""}
              onChange={(e) => handleNestedChange("brand", "tagline", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Footer Tagline</label>
            <textarea
              value={settings.brand?.footer_tagline || ""}
              onChange={(e) => handleNestedChange("brand", "footer_tagline", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <p className="text-xs font-bold text-stone-600 mb-2">Live Preview</p>
            <div className="bg-white p-3 rounded-lg flex items-center gap-2.5 inline-flex border border-stone-200">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center shadow-md">
                <span className="text-white font-black italic text-xl" style={{ fontFamily: "Georgia, serif", transform: "skewX(-6deg)" }}>A</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-black text-xl text-stone-900" style={{ fontFamily: "Georgia, serif" }}>
                  {settings.brand?.logo_text || "Arkado"}
                </span>
                <p className="text-[10px] text-stone-500 font-medium mt-0.5">{settings.brand?.tagline}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Brand Settings"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "homepage" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Homepage Headings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Hero Badge Pill</label>
              <input
                type="text"
                value={settings.homepage?.hero_badge || ""}
                onChange={(e) => handleNestedChange("homepage", "hero_badge", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Hero Headline</label>
              <input
                type="text"
                value={settings.homepage?.hero_headline || ""}
                onChange={(e) => handleNestedChange("homepage", "hero_headline", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Hot Deals Title</label>
              <input
                type="text"
                value={settings.homepage?.hot_deals_title || ""}
                onChange={(e) => handleNestedChange("homepage", "hot_deals_title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">New Arrivals Title</label>
              <input
                type="text"
                value={settings.homepage?.new_arrivals_title || ""}
                onChange={(e) => handleNestedChange("homepage", "new_arrivals_title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Categories Title</label>
              <input
                type="text"
                value={settings.homepage?.categories_section_title || ""}
                onChange={(e) => handleNestedChange("homepage", "categories_section_title", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <h4 className="text-sm font-bold text-amber-700">Newsletter Section</h4>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Title</label>
              <input
                type="text"
                value={settings.homepage?.newsletter_title || ""}
                onChange={(e) => handleNestedChange("homepage", "newsletter_title", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">Subtitle</label>
              <textarea
                value={settings.homepage?.newsletter_subtitle || ""}
                onChange={(e) => handleNestedChange("homepage", "newsletter_subtitle", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Input Placeholder</label>
                <input
                  type="text"
                  value={settings.homepage?.newsletter_placeholder || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_placeholder", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Button Text</label>
                <input
                  type="text"
                  value={settings.homepage?.newsletter_button_text || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_button_text", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Homepage Titles"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "social" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Social & Support Channels</h3>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">WhatsApp URL</label>
            <input
              type="text"
              value={settings.social?.whatsapp_url || ""}
              onChange={(e) => handleNestedChange("social", "whatsapp_url", e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="https://wa.me/917852004401"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Instagram URL</label>
            <input
              type="text"
              value={settings.social?.instagram_url || ""}
              onChange={(e) => handleNestedChange("social", "instagram_url", e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Facebook URL</label>
            <input
              type="text"
              value={settings.social?.facebook_url || ""}
              onChange={(e) => handleNestedChange("social", "facebook_url", e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">Gmail URL</label>
            <input
              type="text"
              value={settings.social?.gmail_url || ""}
              onChange={(e) => handleNestedChange("social", "gmail_url", e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="mailto:support@arkado.in"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Social Channels"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "razorpay" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-stone-900">Razorpay Gateway</h3>
          <p className="text-sm text-stone-500">Automated payment gateway. Currently disabled to allow 100% direct zero-fee UPI payments.</p>

          <div className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <p className="font-bold text-stone-900 text-sm">Enable Razorpay</p>
              <p className="text-xs text-stone-500">Switch from manual direct UPI to automated gateway</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.razorpay_enabled}
                onChange={(e) => handleChange("razorpay_enabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {settings.razorpay_enabled && (
            <div className="space-y-3 border-t border-stone-200 pt-3">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Key ID</label>
                <input
                  type="text"
                  value={settings.razorpay_key_id || ""}
                  onChange={(e) => handleChange("razorpay_key_id", e.target.value)}
                  className={`${inputCls} font-mono`}
                  placeholder="rzp_test_..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">Key Secret</label>
                <div className="flex gap-2">
                  <input
                    type={showRazorpaySecret ? "text" : "password"}
                    value={settings.razorpay_key_secret || ""}
                    onChange={(e) => handleChange("razorpay_key_secret", e.target.value)}
                    className={`${inputCls} flex-1 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-sm"
                  >
                    {showRazorpaySecret ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
              {saving ? "Saving..." : "Save Razorpay Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
