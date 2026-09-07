"use client";

import { useState, useEffect } from "react";

interface Settings {
  upi_id: string;
  merchant_name: string;
  whatsapp_support_number: string;
  gmail_support_email?: string;
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
    fetchSettings();
  }, []);

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedChange = (
    section: "brand" | "homepage" | "social",
    key: string,
    value: any
  ) => {
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

  if (loading) return <div className="py-12 text-center text-neutral-500">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Settings & Customization</h2>
          <p className="text-neutral-400 text-sm">
            Configure payment methods, logo typography, homepage titles, and social channels.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${
            message.type === "success"
              ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
              : "bg-red-950/30 border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex flex-wrap gap-1">
        {[
          { id: "payment", label: "💳 Payment & UPI", desc: "PhonePe, Paytm, QR" },
          { id: "brand", label: "🌐 Brand & Logo", desc: "Arkado text, taglines" },
          { id: "homepage", label: "🏠 Homepage Titles", desc: "Section headings" },
          { id: "social", label: "📱 Social & Support", desc: "WhatsApp, Insta, FB, Gmail" },
          { id: "razorpay", label: "🔐 Razorpay", desc: "Automated Gateway" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-lg text-xs font-semibold transition flex flex-col items-center gap-0.5 cursor-pointer ${
              activeTab === tab.id
                ? "bg-amber-600 text-white shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] opacity-75">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* 1. PAYMENT SETTINGS */}
      {activeTab === "payment" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Direct UPI Payment Configuration</h3>
            <p className="text-sm text-neutral-400">
              Direct payments via PhonePe, Paytm, Google Pay — zero commissions.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">UPI ID *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.upi_id}
                  onChange={(e) => handleChange("upi_id", e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-950 text-white text-lg font-mono tracking-wider focus:border-amber-500 focus:outline-none"
                  placeholder="7852004401@ybl"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.upi_id, "UPI ID")}
                  className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Your PhonePe / Paytm / GPay UPI ID (e.g., 7852004401@ybl)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Merchant Name</label>
              <input
                type="text"
                value={settings.merchant_name}
                onChange={(e) => handleChange("merchant_name", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                WhatsApp Support Number (Format: 91XXXXXXXXXX)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.whatsapp_support_number}
                  onChange={(e) => handleChange("whatsapp_support_number", e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono focus:border-amber-500 focus:outline-none"
                  placeholder="917852004401"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.whatsapp_support_number, "WhatsApp Number")}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">Gmail Support Email</label>
              <input
                type="email"
                value={settings.gmail_support_email || ""}
                onChange={(e) => handleChange("gmail_support_email", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                placeholder="support@arkado.in"
              />
            </div>

            {/* Dynamic QR Preview */}
            <div className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-white text-sm">Live QR Code Preview</h4>
              <p className="text-xs text-neutral-400">Scan with PhonePe / Paytm to test payment intent</p>
              <div className="flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.merchant_name)}&am=1&cu=INR&tn=Test`
                  )}`}
                  alt="UPI QR Code"
                  className="w-44 h-44 rounded-xl bg-white p-2"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Payment Settings"}
            </button>
          </div>
        </div>
      )}

      {/* 2. BRAND & TYPOGRAPHY SETTINGS */}
      {activeTab === "brand" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Brand & Logo Customization</h3>
            <p className="text-sm text-neutral-400">
              Customize the logo text, badge pill, and header/footer taglines shown across desktop and mobile.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Logo Brand Name *
                </label>
                <input
                  type="text"
                  value={settings.brand?.logo_text || "Arkado"}
                  onChange={(e) => handleNestedChange("brand", "logo_text", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="Arkado"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Rendered with artistic mixed typography (e.g. Arka bold + do italic)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Logo Badge Pill (e.g. STORE / NOTES / PRO)
                </label>
                <input
                  type="text"
                  value={settings.brand?.logo_badge_text || "STORE"}
                  onChange={(e) => handleNestedChange("brand", "logo_badge_text", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white uppercase focus:border-amber-500 focus:outline-none"
                  placeholder="STORE"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Header Tagline (below logo)
              </label>
              <input
                type="text"
                value={settings.brand?.tagline || ""}
                onChange={(e) => handleNestedChange("brand", "tagline", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Pattern-decoded notes for All-India exams"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Footer Tagline
              </label>
              <textarea
                value={settings.brand?.footer_tagline || ""}
                onChange={(e) => handleNestedChange("brand", "footer_tagline", e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                placeholder="All-India exam preparation — deep-level analysis & pattern-based notes."
              />
            </div>

            {/* Live Brand Preview */}
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400 mb-2 font-medium">Live Navbar Logo Preview:</p>
              <div className="bg-white p-3 rounded-lg flex items-center gap-2.5 inline-flex">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center shadow-md">
                  <span
                    className="text-white font-black italic text-xl leading-none tracking-tight"
                    style={{ fontFamily: 'Georgia, serif', transform: "skewX(-6deg)" }}
                  >
                    A
                  </span>
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-black text-xl text-stone-950 tracking-tight"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {(settings.brand?.logo_text || "Arkado").slice(0, 4)}
                    </span>
                    <span
                      className="font-light text-xl text-amber-600 tracking-tight italic"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {(settings.brand?.logo_text || "Arkado").slice(4) || "do"}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1 py-0.5 rounded border border-amber-200">
                      {settings.brand?.logo_badge_text || "STORE"}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                    {settings.brand?.tagline || "Pattern-decoded notes"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Brand Settings"}
            </button>
          </div>
        </div>
      )}

      {/* 3. HOMEPAGE TITLES */}
      {activeTab === "homepage" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Homepage Headings & Titles</h3>
            <p className="text-sm text-neutral-400">
              Change the titles for the Hero banner, Hot Deals, New Arrivals, Categories, and Email sections.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Top Hero Badge Pill
                </label>
                <input
                  type="text"
                  value={settings.homepage?.hero_badge || ""}
                  onChange={(e) => handleNestedChange("homepage", "hero_badge", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="2026 PATTERN DECODED"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Top Hero Headline Override
                </label>
                <input
                  type="text"
                  value={settings.homepage?.hero_headline || ""}
                  onChange={(e) => handleNestedChange("homepage", "hero_headline", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="RSMSSB CET & Rajasthan Exam Bundles"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Hot Deals Section Title
                </label>
                <input
                  type="text"
                  value={settings.homepage?.hot_deals_title || ""}
                  onChange={(e) => handleNestedChange("homepage", "hot_deals_title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Today's Hot Deals"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  New Arrivals Section Title
                </label>
                <input
                  type="text"
                  value={settings.homepage?.new_arrivals_title || ""}
                  onChange={(e) => handleNestedChange("homepage", "new_arrivals_title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="New Arrivals"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Categories Section Title
                </label>
                <input
                  type="text"
                  value={settings.homepage?.categories_section_title || ""}
                  onChange={(e) => handleNestedChange("homepage", "categories_section_title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Browse Top Categories"
                />
              </div>
            </div>

            <div className="border-t border-neutral-800 pt-4 space-y-4">
              <h4 className="text-sm font-bold text-amber-400">
                Friendly Newsletter & Email Section
              </h4>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Newsletter Title (Hindi / English friendly)
                </label>
                <input
                  type="text"
                  value={settings.homepage?.newsletter_title || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="🎯 सीधे WhatsApp व Email पर पाएं फ्री अपडेट्स व नए नोट्स!"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">
                  Newsletter Subtitle
                </label>
                <textarea
                  value={settings.homepage?.newsletter_subtitle || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_subtitle", e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="हजारों छात्रों का भरोसा — कोई स्पैम नहीं, सिर्फ परीक्षा उपयोगी अपडेट्स व स्पेशल छूट।"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={settings.homepage?.newsletter_placeholder || ""}
                    onChange={(e) => handleNestedChange("homepage", "newsletter_placeholder", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="अपना Email या WhatsApp No. दर्ज करें..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={settings.homepage?.newsletter_button_text || ""}
                    onChange={(e) => handleNestedChange("homepage", "newsletter_button_text", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white focus:border-amber-500 focus:outline-none"
                    placeholder="जुड़ें"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Homepage Titles"}
            </button>
          </div>
        </div>
      )}

      {/* 4. SOCIAL & MESSAGE CHANNELS */}
      {activeTab === "social" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Social & Floating Message Hub</h3>
            <p className="text-sm text-neutral-400">
              Configure real URLs for WhatsApp, Instagram, Facebook, and Gmail opened by the floating message icon.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                WhatsApp URL
              </label>
              <input
                type="text"
                value={settings.social?.whatsapp_url || ""}
                onChange={(e) => handleNestedChange("social", "whatsapp_url", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                placeholder="https://wa.me/917852004401"
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Link format: https://wa.me/917852004401 or https://chat.whatsapp.com/...
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Instagram Profile URL
              </label>
              <input
                type="text"
                value={settings.social?.instagram_url || ""}
                onChange={(e) => handleNestedChange("social", "instagram_url", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                placeholder="https://instagram.com/arkado_notes"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Facebook Page URL
              </label>
              <input
                type="text"
                value={settings.social?.facebook_url || ""}
                onChange={(e) => handleNestedChange("social", "facebook_url", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                placeholder="https://facebook.com/arkado"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Gmail / Email Support URL
              </label>
              <input
                type="text"
                value={settings.social?.gmail_url || ""}
                onChange={(e) => handleNestedChange("social", "gmail_url", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                placeholder="mailto:support@arkado.in"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Social Channels"}
            </button>
          </div>
        </div>
      )}

      {/* 5. RAZORPAY SETTINGS */}
      {activeTab === "razorpay" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Razorpay Payment Gateway (Standby)</h3>
            <p className="text-sm text-neutral-400">
              Automated payment gateway. Currently disabled to allow 100% direct zero-fee UPI payments via PhonePe & Paytm.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Enable Razorpay Gateway</p>
                <p className="text-xs text-neutral-400">
                  Switch from manual direct UPI to automatic card/netbanking/UPI gateway
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.razorpay_enabled}
                  onChange={(e) => handleChange("razorpay_enabled", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {settings.razorpay_enabled && (
              <div className="space-y-4 border-t border-neutral-800 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Key ID</label>
                  <div className="flex gap-2">
                    <input
                      type={showRazorpaySecret ? "text" : "password"}
                      value={settings.razorpay_key_id || ""}
                      onChange={(e) => handleChange("razorpay_key_id", e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="rzp_test_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition cursor-pointer"
                    >
                      {showRazorpaySecret ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Key Secret</label>
                  <div className="flex gap-2">
                    <input
                      type={showRazorpaySecret ? "text" : "password"}
                      value={settings.razorpay_key_secret || ""}
                      onChange={(e) => handleChange("razorpay_key_secret", e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="••••••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-xl transition cursor-pointer"
                    >
                      {showRazorpaySecret ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!settings.razorpay_enabled && (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-xs leading-relaxed">
                ℹ️ Direct UPI is active: Customers scan PhonePe/Paytm QR or pay via UPI ID and verify their UTR number. Razorpay remains in standby mode without impacting users.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Razorpay Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}