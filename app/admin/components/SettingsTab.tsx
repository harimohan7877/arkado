"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { Settings } from "@/lib/store-types";

interface SettingsTabProps {
  getAuthHeaders: () => Record<string, string>;
}

type TabKey =
  | "payment"
  | "contact"
  | "messages"
  | "homepage"
  | "faqs_trust"
  | "policies"
  | "about_course"
  | "brand"
  | "razorpay";

const DEFAULT_SETTINGS: Settings = {
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
    promo_banner: {
      enabled: true,
      title: "Crack Any Exam with Deep-Level Analysis",
      subtitle: "Premium pattern-decoded notes for Rajasthan & All-India Exams",
      bullets: [
        "Last 5 Years Pattern Decoded",
        "Topic-Weightage Analysis",
        "3000-5000+ Topic MCQs",
        "Free Sample PDF",
        "Printable A4 Format",
        "Instant Delivery",
      ],
    },
    trust_features: [
      { title: "Instant Download", desc: "Get your files right away", icon: "download" },
      { title: "Secure Payment", desc: "Direct UPI & UTR Verification", icon: "shield" },
      { title: "High Quality Material", desc: "Curated & pattern-decoded", icon: "file" },
      { title: "Easy Access", desc: "Anytime, anywhere on Google Drive", icon: "clock" },
      { title: "Customer Support", desc: "Quick WhatsApp response", icon: "support" },
    ],
    faqs: [
      {
        question: "How do I get my notes after payment?",
        answer: "After UPI payment, enter the 12-digit UTR. We will send instant access to your WhatsApp or Gmail within 5-15 minutes.",
      },
      {
        question: "Can I print the PDFs?",
        answer: "Yes. All notes are print-ready A4 format. You can print them at any cyber cafe or e-mitra.",
      },
      {
        question: "What is the difference vs. handwritten notes?",
        answer: "These are deep-level analysis notes: pattern-decoded, weightage-tagged, toppers approach. Not a copy of textbooks.",
      },
      {
        question: "Need help with payment or order?",
        answer: "Contact our WhatsApp helpline at 7852004401 — our team responds quickly.",
      },
    ],
  },
  contact: {
    phone: "+91 7852004401",
    whatsapp_number: "917852004401",
    email: "support@arkado.in",
    address: "Ward No 14, Sardarshahar, Churu, Rajasthan - 331403",
    support_hours: "10:00 AM - 9:00 PM (All 7 Days)",
  },
  order_messages: {
    whatsapp_order_template:
      "नमस्ते Arkado! मुझे \"{course_title}\" (₹{amount}) खरीदना है।\nUPI ID: {upi_id}\nकृपया अपना Payment QR कोड भेजें या नोट्स शेयर करें।",
    whatsapp_after_payment_template:
      "🛒 *नया ऑर्डर भुगतान विवरण — Arkado*\n\n🆔 *Order ID:* {order_id}\n👤 *नाम:* {name}\n📱 *डिलीवरी:* {recipient}\n📚 *कोर्स:* {course_title}\n💰 *राशि:* ₹{amount}\n\nमैंने पेमेंट कर दिया है, कृपया चेक करके Drive नोट्स का लिंक भेजें।",
    gmail_subject: "Arkado Order Inquiry - {course_title}",
    gmail_body: "नमस्ते Arkado Team,\n\nमुझे \"{course_title}\" (₹{amount}) खरीदना है।\n\nकृपया पेमेंट विवरण व QR कोड भेजें।",
  },
  trending_searches: ["CET 2026", "Patwari", "REET Level 1", "Police Constable", "SSC CGL", "Banking", "UPSC CSE"],
  policies: {
    refund_policy:
      "Arkado पर उपलब्ध सभी उत्पाद डिजिटल स्टडी नोट्स, ई-बुक्स और मॉक टेस्ट PDF हैं। चूंकि डिजिटल उत्पादों को डाउनलोड या एक्सेस लिंक जारी होने के बाद वापस नहीं लिया जा सकता, इसलिए आम तौर पर खरीदारी के बाद रिफंड स्वीकार्य नहीं है। हालांकि, यदि आपने गलती से एक ही कोर्स के लिए दो बार भुगतान कर दिया है या भुगतान कटने के 24 घंटे के भीतर आपको नोट्स नहीं मिले हैं, तो आप तुरंत हमारे WhatsApp हेल्पलाइन (7852004401) पर संपर्क करें। हम 24 से 48 घंटे के भीतर आपकी समस्या का समाधान करेंगे।",
    privacy_policy:
      "Arkado आपकी व्यक्तिगत जानकारी की गोपनीयता और सुरक्षा का पूर्ण सम्मान करता है। हम केवल आपका नाम, ईमेल आईडी और मोबाइल नंबर एकत्र करते हैं ताकि हम आपको आपके द्वारा खरीदे गए नोट्स, Google Drive लिंक और ऑर्डर संबंधी महत्वपूर्ण अपडेट्स भेज सकें। हम आपकी जानकारी को किसी भी तीसरे पक्ष के साथ साझा, किराए पर या बेचते नहीं हैं। भुगतान विवरण प्रत्यक्ष यूपीआई ऐप या सुरक्षित पेमेंट गेटवे द्वारा प्रोसेस किया जाता है और हम कोई भी बैंकिंग पिन या पासवर्ड स्टोर नहीं करते।",
    terms_of_service:
      "Arkado वेबसाइट का उपयोग करके आप निम्नलिखित शर्तों से सहमत होते हैं:\n1. इस प्लेटफ़ॉर्म पर उपलब्ध सभी अध्ययन सामग्री, प्रश्न बैंक और नोट्स केवल आपके व्यक्तिगत अध्ययन के लिए हैं।\n2. किसी भी सामग्री को पुनः बेचना, वाणिज्यिक उपयोग करना या सार्वजनिक रूप से इंटरनेट पर साझा करना कॉपीराइट कानून के तहत सख्त वर्जित है।\n3. भुगतान के पश्चात डिजिटल सामग्री का लिंक आपके पंजीकृत WhatsApp या ईमेल पर भेजा जाता है।\n4. किसी भी कानूनी विवाद के लिए क्षेत्राधिकार सरदारशहर (चूरू, राजस्थान) रहेगा।",
  },
  about: {
    title: "About Arkado",
    subtitle: "All-India exam preparation — deep-level analysis & pattern-based notes.",
    story:
      "Arkado is a premium study-material marketplace for All-India competitive exams (CET, Patwari, Police, REET, SSC, UPSC, Banking). We deliver deep-level analysis notes — not just topic lists — built from last 5+ years question paper patterns.",
    founder_name: "Harimohan Sharma",
    founder_location: "Sardarshahar (Churu, Rajasthan)",
    experience_years: "5+ years",
    highlights: [
      "Topic-weightage analysis from last 5+ years of exam shifts",
      "PYQ-tagged MCQs with step-by-step reasoning",
      "Instant digital delivery — typically 5-15 minutes",
      "Direct UPI payment (PhonePe / Paytm) — 0% extra fees",
      "WhatsApp expert support — 7852004401",
      "Printable A4 PDFs — print at any cyber cafe",
    ],
  },
  course_page: {
    instant_delivery_badge: "One-time payment • Instant WhatsApp & Gmail PDF access",
    guarantees: [
      "Direct Google Drive PDF Download",
      "Instant WhatsApp or Gmail Delivery",
      "100% Secure UPI with UTR Verification",
    ],
  },
  social: {
    whatsapp_url: "https://wa.me/917852004401",
    instagram_url: "https://instagram.com/",
    facebook_url: "https://facebook.com/",
    gmail_url: "mailto:support@arkado.in",
    share_enabled: true,
  },
  updated_at: new Date().toISOString(),
};

export default function SettingsTab({ getAuthHeaders }: SettingsTabProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("payment");
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...prev,
          ...data,
          brand: { ...DEFAULT_SETTINGS.brand, ...prev.brand, ...data.brand },
          homepage: {
            ...DEFAULT_SETTINGS.homepage,
            ...prev.homepage,
            ...data.homepage,
            promo_banner: {
              ...DEFAULT_SETTINGS.homepage?.promo_banner,
              ...prev.homepage?.promo_banner,
              ...data.homepage?.promo_banner,
            },
            trust_features: data.homepage?.trust_features || prev.homepage?.trust_features || DEFAULT_SETTINGS.homepage?.trust_features,
            faqs: data.homepage?.faqs || prev.homepage?.faqs || DEFAULT_SETTINGS.homepage?.faqs,
          },
          contact: { ...DEFAULT_SETTINGS.contact, ...prev.contact, ...data.contact },
          order_messages: { ...DEFAULT_SETTINGS.order_messages, ...prev.order_messages, ...data.order_messages },
          trending_searches: data.trending_searches || prev.trending_searches || DEFAULT_SETTINGS.trending_searches,
          policies: { ...DEFAULT_SETTINGS.policies, ...prev.policies, ...data.policies },
          about: {
            ...DEFAULT_SETTINGS.about,
            ...prev.about,
            ...data.about,
            highlights: data.about?.highlights || prev.about?.highlights || DEFAULT_SETTINGS.about?.highlights,
          },
          course_page: {
            ...DEFAULT_SETTINGS.course_page,
            ...prev.course_page,
            ...data.course_page,
            guarantees: data.course_page?.guarantees || prev.course_page?.guarantees || DEFAULT_SETTINGS.course_page?.guarantees,
          },
          social: { ...DEFAULT_SETTINGS.social, ...prev.social, ...data.social },
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

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedChange = <T extends "brand" | "homepage" | "social" | "contact" | "order_messages" | "policies" | "about" | "course_page">(
    section: T,
    key: string,
    value: unknown
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, unknown> || {}),
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
        setMessage({ type: "success", text: "✅ सभी सेटिंग्स सफलतापूर्वक सेव हो गईं!" });
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
    setMessage({ type: "success", text: `${label} कॉपी हो गया!` });
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        लोड हो रहा है...
      </div>
    );
  }

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:border-amber-500 focus:outline-none text-sm";
  const labelCls = "block text-xs font-bold text-stone-700 mb-1";
  const descCls = "text-[11px] text-stone-500 mt-1 font-devanagari";

  const TAB_ITEMS: { id: TabKey; label: string; icon: string }[] = [
    { id: "payment", label: "पेमेंट व UPI", icon: "💳" },
    { id: "contact", label: "संपर्क व पता", icon: "📞" },
    { id: "messages", label: "संदेश टेम्पलेट्स", icon: "💬" },
    { id: "homepage", label: "होमपेज व प्रोमो", icon: "🏠" },
    { id: "faqs_trust", label: "ट्रस्ट व FAQs", icon: "⭐" },
    { id: "policies", label: "नीतियां (Policies)", icon: "📜" },
    { id: "about_course", label: "About व कोर्स पेज", icon: "ℹ️" },
    { id: "brand", label: "ब्रांड व लोगो", icon: "🏷️" },
    { id: "razorpay", label: "Razorpay", icon: "⚡" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">वेबसाइट सेटिंग्स (Settings Panel)</h2>
          <p className="text-stone-500 text-sm">
            पूरी वेबसाइट का डेटा, संपर्क नंबर, WhatsApp संदेश, नीतियां व प्रोमो बैनर यहाँ से नियंत्रित करें।
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? "सेव हो रहा है..." : "💾 सेव करें (Save All)"}
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-1.5 flex flex-wrap gap-1 shadow-sm">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-amber-600 text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. PAYMENT TAB */}
      {activeTab === "payment" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="border-b border-stone-200 pb-3">
            <h3 className="text-base font-bold text-stone-900">Direct UPI & Payment Settings</h3>
            <p className="text-xs text-stone-500">
              वेबसाइट पर ग्राहकों को दिखने वाला UPI ID, मर्चेंट नाम और QR कोड सेट करें।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>UPI ID *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.upi_id}
                  onChange={(e) => handleChange("upi_id", e.target.value)}
                  className={`${inputCls} flex-1 font-mono`}
                  placeholder="7852004401@ybl"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.upi_id, "UPI ID")}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs"
                >
                  Copy
                </button>
              </div>
              <p className={descCls}>ग्राहकों को इसी UPI ID पर भुगतान करने का निर्देश दिया जाएगा।</p>
            </div>

            <div>
              <label className={labelCls}>मर्चेंट / संस्था का नाम (Merchant Name)</label>
              <input
                type="text"
                value={settings.merchant_name}
                onChange={(e) => handleChange("merchant_name", e.target.value)}
                className={inputCls}
                placeholder="Arkado"
              />
              <p className={descCls}>PhonePe / Google Pay ऐप में यह नाम दिखाई देगा।</p>
            </div>
          </div>

          <div>
            <label className={labelCls}>Custom QR Code Image URL (वैकल्पिक)</label>
            <input
              type="text"
              value={settings.custom_qr_url || ""}
              onChange={(e) => handleChange("custom_qr_url", e.target.value)}
              className={inputCls}
              placeholder="https://... या /images/my-qr.png (खाली छोड़ने पर ऊपर वाले UPI ID से ऑटोमैटिक QR बनेगा)"
            />
            <p className={descCls}>
              अगर आपके पास PhonePe या Paytm का स्टैंडी QR कोड का फोटो है तो उसका URL डाल सकते हैं। खाली छोड़ने पर UPI ID से डायनामिक QR बनेगा।
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:text-left">
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase">
                {settings.custom_qr_url && settings.custom_qr_url.trim().length > 5 ? "Custom QR Image" : "Dynamic UPI QR"}
              </span>
              <h4 className="font-bold text-stone-900 text-sm mt-2">Live QR Code Preview</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                चेकआउट ड्रॉअर में ग्राहक को यही QR कोड स्कैन करने के लिए दिखाई देगा।
              </p>
            </div>

            <div className="flex-shrink-0 bg-white p-2.5 rounded-xl border border-stone-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  settings.custom_qr_url && settings.custom_qr_url.trim().length > 5
                    ? settings.custom_qr_url.trim()
                    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.merchant_name)}&am=1&cu=INR&tn=Test`
                      )}`
                }
                alt="UPI QR Preview"
                className="w-36 h-36 rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACT TAB */}
      {activeTab === "contact" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">संपर्क व सपोर्ट विवरण (Contact & Support)</h3>
              <p className="text-xs text-stone-500">
                वेबसाइट फुटर, नेवबार, फ्लोटिंग बटन और /contact पेज पर दिखने वाला संपर्क विवरण।
              </p>
            </div>
            <Link
              href="/contact"
              target="_blank"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
            >
              👁️ Preview /contact
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>WhatsApp सपोर्ट / ऑर्डर नंबर *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.contact?.whatsapp_number || settings.whatsapp_support_number || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange("whatsapp_support_number", val);
                    handleNestedChange("contact", "whatsapp_number", val);
                  }}
                  className={`${inputCls} font-mono`}
                  placeholder="917852004401"
                />
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(settings.contact?.whatsapp_number || settings.whatsapp_support_number, "WhatsApp")
                  }
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs"
                >
                  Copy
                </button>
              </div>
              <p className={descCls}>
                देश कोड (91) के साथ लिखें, बिना स्पेस या + के (उदा. 917852004401)। वेबसाइट के सभी ऑर्डर संदेश इसी नंबर पर आएंगे।
              </p>
            </div>

            <div>
              <label className={labelCls}>हेल्पलाइन कॉलिंग फोन नंबर (Phone)</label>
              <input
                type="text"
                value={settings.contact?.phone || ""}
                onChange={(e) => handleNestedChange("contact", "phone", e.target.value)}
                className={inputCls}
                placeholder="+91 7852004401"
              />
              <p className={descCls}>फुटर व संपर्क पेज पर कॉलिंग के लिए प्रदर्शित होगा।</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>सपोर्ट ईमेल (Email ID)</label>
              <input
                type="email"
                value={settings.contact?.email || settings.gmail_support_email || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange("gmail_support_email", val);
                  handleNestedChange("contact", "email", val);
                }}
                className={inputCls}
                placeholder="support@arkado.in"
              />
            </div>

            <div>
              <label className={labelCls}>सपोर्ट कार्य समय (Support Hours)</label>
              <input
                type="text"
                value={settings.contact?.support_hours || ""}
                onChange={(e) => handleNestedChange("contact", "support_hours", e.target.value)}
                className={inputCls}
                placeholder="10:00 AM - 9:00 PM (All 7 Days)"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>ऑफिस / डाक पता (Official Address)</label>
            <textarea
              rows={2}
              value={settings.contact?.address || ""}
              onChange={(e) => handleNestedChange("contact", "address", e.target.value)}
              className={inputCls}
              placeholder="Ward No 14, Sardarshahar, Churu, Rajasthan - 331403"
            />
          </div>

          <div className="border-t border-stone-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">सोशल मीडिया प्रोफाइल्स (Social Links)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Instagram URL</label>
                <input
                  type="text"
                  value={settings.social?.instagram_url || ""}
                  onChange={(e) => handleNestedChange("social", "instagram_url", e.target.value)}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder="https://instagram.com/arkado"
                />
              </div>
              <div>
                <label className={labelCls}>Facebook URL</label>
                <input
                  type="text"
                  value={settings.social?.facebook_url || ""}
                  onChange={(e) => handleNestedChange("social", "facebook_url", e.target.value)}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder="https://facebook.com/arkado"
                />
              </div>
              <div>
                <label className={labelCls}>WhatsApp Link (wa.me)</label>
                <input
                  type="text"
                  value={settings.social?.whatsapp_url || ""}
                  onChange={(e) => handleNestedChange("social", "whatsapp_url", e.target.value)}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder="https://wa.me/917852004401"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ORDER MESSAGES TAB */}
      {activeTab === "messages" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
          <div className="border-b border-stone-200 pb-3">
            <h3 className="text-base font-bold text-stone-900">ऑर्डर व WhatsApp संदेश टेम्पलेट्स</h3>
            <p className="text-xs text-stone-500">
              जब कोई छात्र &ldquo;Order on WhatsApp&rdquo; या पेमेंट के बाद WhatsApp पर संपर्क करता है, तो जाने वाला मैसेज यहाँ से कस्टमाइज़ करें।
            </p>
          </div>

          {/* Dynamic Tags Helper */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1.5">
            <p className="text-xs font-bold text-amber-900">💡 उपलब्ध डायनामिक टैग्स (Dynamic Variables):</p>
            <p className="text-xs text-amber-800 leading-relaxed font-mono">
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{course_title}`}</span> = कोर्स का नाम |{" "}
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{amount}`}</span> = राशि |{" "}
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{upi_id}`}</span> = UPI ID |{" "}
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{order_id}`}</span> = ऑर्डर ID |{" "}
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{name}`}</span> = छात्र का नाम |{" "}
              <span className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">{`{recipient}`}</span> = WhatsApp / Email
            </p>
          </div>

          <div>
            <label className={labelCls}>
              1. सीधे WhatsApp पर ऑर्डर संदेश टेम्पलेट (Direct &ldquo;Order on WhatsApp&rdquo; Button)
            </label>
            <textarea
              rows={4}
              value={settings.order_messages?.whatsapp_order_template || ""}
              onChange={(e) => handleNestedChange("order_messages", "whatsapp_order_template", e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
            <p className={descCls}>
              जब छात्र चेकआउट ड्रॉअर में &ldquo;Order on WhatsApp&rdquo; पर क्लिक करेगा तो उसके WhatsApp में यह प्री-फिल्ड संदेश लोड होगा।
            </p>
          </div>

          <div>
            <label className={labelCls}>
              2. पेमेंट के बाद पुष्टि संदेश टेम्पलेट (After Payment / UTR Submit WhatsApp Confirmation)
            </label>
            <textarea
              rows={6}
              value={settings.order_messages?.whatsapp_after_payment_template || ""}
              onChange={(e) => handleNestedChange("order_messages", "whatsapp_after_payment_template", e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
            <p className={descCls}>
              जब छात्र UPI से भुगतान करके 12-अंक का UTR सबमिट करेगा, तो सफलता स्क्रीन पर WhatsApp बटन दबाने से यह विवरण आपके WhatsApp पर आएगा।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-200 pt-4">
            <div>
              <label className={labelCls}>3. Gmail ऑर्डर विषय (Subject Template)</label>
              <input
                type="text"
                value={settings.order_messages?.gmail_subject || ""}
                onChange={(e) => handleNestedChange("order_messages", "gmail_subject", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>4. Gmail ईमेल बॉडी (Body Template)</label>
              <textarea
                rows={3}
                value={settings.order_messages?.gmail_body || ""}
                onChange={(e) => handleNestedChange("order_messages", "gmail_body", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. HOMEPAGE TAB */}
      {activeTab === "homepage" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
          <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">होमपेज शीर्ष व प्रोमो बैनर</h3>
              <p className="text-xs text-stone-500">होमपेज के मुख्य टाइटल्स, प्रोमो बैनर और ट्रेंडिंग सर्च कीवर्ड्स।</p>
            </div>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
            >
              👁️ View Live Homepage
            </Link>
          </div>

          {/* Headlines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>हीरो बैज पिल (Hero Badge Pill)</label>
              <input
                type="text"
                value={settings.homepage?.hero_badge || ""}
                onChange={(e) => handleNestedChange("homepage", "hero_badge", e.target.value)}
                className={inputCls}
                placeholder="2026 PATTERN DECODED"
              />
            </div>
            <div>
              <label className={labelCls}>हीरो मुख्य हेडलाइन (Hero Headline)</label>
              <input
                type="text"
                value={settings.homepage?.hero_headline || ""}
                onChange={(e) => handleNestedChange("homepage", "hero_headline", e.target.value)}
                className={inputCls}
                placeholder="RSMSSB CET & Rajasthan Exam Bundles"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Featured Section Title</label>
              <input
                type="text"
                value={settings.homepage?.featured_section_title || ""}
                onChange={(e) => handleNestedChange("homepage", "featured_section_title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Hot Deals Title</label>
              <input
                type="text"
                value={settings.homepage?.hot_deals_title || ""}
                onChange={(e) => handleNestedChange("homepage", "hot_deals_title", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>New Arrivals Title</label>
              <input
                type="text"
                value={settings.homepage?.new_arrivals_title || ""}
                onChange={(e) => handleNestedChange("homepage", "new_arrivals_title", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Promo Banner Settings */}
          <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">होमपेज प्रोमो बैनर (Promo Banner)</h4>
                <p className="text-xs text-stone-500">होमपेज के बीच में दिखने वाला डार्क प्रोमो हाइलाइट सेक्शन।</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-stone-700">सक्रिय (Enabled):</span>
                <input
                  type="checkbox"
                  checked={settings.homepage?.promo_banner?.enabled ?? true}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      homepage: {
                        ...prev.homepage,
                        promo_banner: {
                          ...prev.homepage?.promo_banner,
                          enabled: e.target.checked,
                        },
                      },
                    }));
                  }}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>बैनर शीर्षक (Title)</label>
                <input
                  type="text"
                  value={settings.homepage?.promo_banner?.title || ""}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      homepage: {
                        ...prev.homepage,
                        promo_banner: {
                          ...prev.homepage?.promo_banner,
                          title: e.target.value,
                        },
                      },
                    }));
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>बैनर उपशीर्षक (Subtitle)</label>
                <input
                  type="text"
                  value={settings.homepage?.promo_banner?.subtitle || ""}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      homepage: {
                        ...prev.homepage,
                        promo_banner: {
                          ...prev.homepage?.promo_banner,
                          subtitle: e.target.value,
                        },
                      },
                    }));
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>प्रोमो बुलेट्स / विशेषताएं (Feature Bullets):</label>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(settings.homepage?.promo_banner?.bullets || []), "नई विशेषता"];
                    setSettings((prev) => ({
                      ...prev,
                      homepage: {
                        ...prev.homepage,
                        promo_banner: {
                          ...prev.homepage?.promo_banner,
                          bullets: list,
                        },
                      },
                    }));
                  }}
                  className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg"
                >
                  + Add Bullet
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(settings.homepage?.promo_banner?.bullets || []).map((bullet, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const list = [...(settings.homepage?.promo_banner?.bullets || [])];
                        list[idx] = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          homepage: {
                            ...prev.homepage,
                            promo_banner: {
                              ...prev.homepage?.promo_banner,
                              bullets: list,
                            },
                          },
                        }));
                      }}
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = (settings.homepage?.promo_banner?.bullets || []).filter((_, i) => i !== idx);
                        setSettings((prev) => ({
                          ...prev,
                          homepage: {
                            ...prev.homepage,
                            promo_banner: {
                              ...prev.homepage?.promo_banner,
                              bullets: list,
                            },
                          },
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trending Searches */}
          <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">ट्रेंडिंग सर्च टैग्स (Trending Searches)</h4>
            <p className="text-xs text-stone-500">
              नेवबार और सर्च पेज पर छात्रों को त्वरित क्लिक करने के लिए दिखने वाले कीवर्ड्स।
            </p>

            <div className="flex flex-wrap gap-2 items-center">
              {(settings.trending_searches || []).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1 rounded-full text-xs font-semibold"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => {
                      const list = (settings.trending_searches || []).filter((_, i) => i !== idx);
                      handleChange("trending_searches", list);
                    }}
                    className="text-amber-600 hover:text-amber-900 text-xs font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newTagInput.trim()) {
                      handleChange("trending_searches", [...(settings.trending_searches || []), newTagInput.trim()]);
                      setNewTagInput("");
                    }
                  }
                }}
                placeholder="नया कीवर्ड लिखें..."
                className={`${inputCls} py-1.5 text-xs`}
              />
              <button
                type="button"
                onClick={() => {
                  if (newTagInput.trim()) {
                    handleChange("trending_searches", [...(settings.trending_searches || []), newTagInput.trim()]);
                    setNewTagInput("");
                  }
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs"
              >
                जोड़ें (Add)
              </button>
            </div>
          </div>

          {/* Newsletter Box */}
          <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">न्यूज़लेटर बॉक्स (Newsletter Box)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>शीर्षक (Title)</label>
                <input
                  type="text"
                  value={settings.homepage?.newsletter_title || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_title", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>बटन टेक्स्ट (Button Text)</label>
                <input
                  type="text"
                  value={settings.homepage?.newsletter_button_text || ""}
                  onChange={(e) => handleNestedChange("homepage", "newsletter_button_text", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>उपशीर्षक (Subtitle)</label>
              <textarea
                rows={2}
                value={settings.homepage?.newsletter_subtitle || ""}
                onChange={(e) => handleNestedChange("homepage", "newsletter_subtitle", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. FAQS & TRUST TAB */}
      {activeTab === "faqs_trust" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
          {/* Trust Features */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">ट्रस्ट स्ट्रिप फीचर्स (Trust Features Strip)</h3>
                <p className="text-xs text-stone-500">
                  होमपेज और कोर्स पेज पर दिखने वाले 5 ट्रस्ट पॉइंट्स (सुरक्षित पेमेंट, इंस्टेंट डाउनलोड आदि)।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const list = [
                    ...(settings.homepage?.trust_features || []),
                    { title: "नया फ़ीचर", desc: "संक्षिप्त विवरण", icon: "shield" },
                  ];
                  setSettings((prev) => ({
                    ...prev,
                    homepage: { ...prev.homepage, trust_features: list },
                  }));
                }}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg"
              >
                + Add Trust Feature
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(settings.homepage?.trust_features || []).map((feat, idx) => (
                <div key={idx} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const list = (settings.homepage?.trust_features || []).filter((_, i) => i !== idx);
                      setSettings((prev) => ({
                        ...prev,
                        homepage: { ...prev.homepage, trust_features: list },
                      }));
                    }}
                    className="absolute top-2 right-2 text-stone-400 hover:text-red-500 text-xs font-bold"
                  >
                    ✕
                  </button>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">आइकॉन</label>
                      <select
                        value={feat.icon}
                        onChange={(e) => {
                          const list = [...(settings.homepage?.trust_features || [])];
                          list[idx] = { ...list[idx], icon: e.target.value };
                          setSettings((prev) => ({
                            ...prev,
                            homepage: { ...prev.homepage, trust_features: list },
                          }));
                        }}
                        className={`${inputCls} py-1 px-2 text-xs`}
                      >
                        <option value="shield">🛡️ Shield</option>
                        <option value="download">⚡ Download</option>
                        <option value="file">📄 File / Doc</option>
                        <option value="clock">⏰ Clock / 24x7</option>
                        <option value="support">💬 Support</option>
                        <option value="lock">🔒 Lock / Secure</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">टाइटल</label>
                      <input
                        type="text"
                        value={feat.title}
                        onChange={(e) => {
                          const list = [...(settings.homepage?.trust_features || [])];
                          list[idx] = { ...list[idx], title: e.target.value };
                          setSettings((prev) => ({
                            ...prev,
                            homepage: { ...prev.homepage, trust_features: list },
                          }));
                        }}
                        className={`${inputCls} py-1 text-xs`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">विवरण (Subtitle)</label>
                    <input
                      type="text"
                      value={feat.desc}
                      onChange={(e) => {
                        const list = [...(settings.homepage?.trust_features || [])];
                        list[idx] = { ...list[idx], desc: e.target.value };
                        setSettings((prev) => ({
                          ...prev,
                          homepage: { ...prev.homepage, trust_features: list },
                        }));
                      }}
                      className={`${inputCls} py-1 text-xs`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">होमपेज FAQs (अक्सर पूछे जाने वाले सवाल)</h3>
                <p className="text-xs text-stone-500">होमपेज के FAQ अकॉर्डियन सेक्शन में दिखने वाले प्रश्न और उत्तर।</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const list = [
                    ...(settings.homepage?.faqs || []),
                    { question: "नया प्रश्न?", answer: "यहाँ उत्तर लिखें..." },
                  ];
                  setSettings((prev) => ({
                    ...prev,
                    homepage: { ...prev.homepage, faqs: list },
                  }));
                }}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg"
              >
                + Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {(settings.homepage?.faqs || []).map((faq, idx) => (
                <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 relative">
                  <button
                    type="button"
                    onClick={() => {
                      const list = (settings.homepage?.faqs || []).filter((_, i) => i !== idx);
                      setSettings((prev) => ({
                        ...prev,
                        homepage: { ...prev.homepage, faqs: list },
                      }));
                    }}
                    className="absolute top-3 right-3 text-stone-400 hover:text-red-500 text-xs font-bold"
                  >
                    ✕ Delete
                  </button>
                  <div>
                    <label className={labelCls}>सवाल #{idx + 1} (Question)</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const list = [...(settings.homepage?.faqs || [])];
                        list[idx] = { ...list[idx], question: e.target.value };
                        setSettings((prev) => ({
                          ...prev,
                          homepage: { ...prev.homepage, faqs: list },
                        }));
                      }}
                      className={`${inputCls} font-bold text-xs`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>उत्तर (Answer)</label>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => {
                        const list = [...(settings.homepage?.faqs || [])];
                        list[idx] = { ...list[idx], answer: e.target.value };
                        setSettings((prev) => ({
                          ...prev,
                          homepage: { ...prev.homepage, faqs: list },
                        }));
                      }}
                      className={`${inputCls} text-xs`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. POLICIES TAB */}
      {activeTab === "policies" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
          <div className="border-b border-stone-200 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-stone-900">कानूनी नीतियां (Policies & Legal Pages)</h3>
              <p className="text-xs text-stone-500">
                रिफंड पॉलिसी, प्राइवेसी पॉलिसी व नियम व शर्तें। यहाँ बदलाव करने पर लाइव पेजों पर तुरंत अपडेट होगा।
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/refund"
                target="_blank"
                className="text-xs font-bold text-stone-700 hover:text-amber-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200"
              >
                /refund ↗
              </Link>
              <Link
                href="/privacy"
                target="_blank"
                className="text-xs font-bold text-stone-700 hover:text-amber-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200"
              >
                /privacy ↗
              </Link>
              <Link
                href="/terms"
                target="_blank"
                className="text-xs font-bold text-stone-700 hover:text-amber-700 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200"
              >
                /terms ↗
              </Link>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>1. रिफंड और रद्दीकरण नीति (Refund & Cancellation Policy)</label>
              <Link href="/refund" target="_blank" className="text-[11px] text-amber-600 hover:underline">
                लाइव देखें ↗
              </Link>
            </div>
            <textarea
              rows={6}
              value={settings.policies?.refund_policy || ""}
              onChange={(e) => handleNestedChange("policies", "refund_policy", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>2. गोपनीयता नीति (Privacy Policy)</label>
              <Link href="/privacy" target="_blank" className="text-[11px] text-amber-600 hover:underline">
                लाइव देखें ↗
              </Link>
            </div>
            <textarea
              rows={6}
              value={settings.policies?.privacy_policy || ""}
              onChange={(e) => handleNestedChange("policies", "privacy_policy", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>3. सेवा की शर्तें और नियम (Terms of Service)</label>
              <Link href="/terms" target="_blank" className="text-[11px] text-amber-600 hover:underline">
                लाइव देखें ↗
              </Link>
            </div>
            <textarea
              rows={6}
              value={settings.policies?.terms_of_service || ""}
              onChange={(e) => handleNestedChange("policies", "terms_of_service", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* 7. ABOUT & COURSE TAB */}
      {activeTab === "about_course" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-6 shadow-sm">
          {/* About Section */}
          <div className="space-y-4">
            <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">अबाउट अस पेज सेटिंग्स (About Page)</h3>
                <p className="text-xs text-stone-500">/about पेज पर संस्थापक और संस्था की जानकारी।</p>
              </div>
              <Link
                href="/about"
                target="_blank"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200"
              >
                👁️ View /about
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Page Title</label>
                <input
                  type="text"
                  value={settings.about?.title || ""}
                  onChange={(e) => handleNestedChange("about", "title", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Page Subtitle</label>
                <input
                  type="text"
                  value={settings.about?.subtitle || ""}
                  onChange={(e) => handleNestedChange("about", "subtitle", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>संस्थापक का नाम (Founder Name)</label>
                <input
                  type="text"
                  value={settings.about?.founder_name || ""}
                  onChange={(e) => handleNestedChange("about", "founder_name", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>स्थान (Location)</label>
                <input
                  type="text"
                  value={settings.about?.founder_location || ""}
                  onChange={(e) => handleNestedChange("about", "founder_location", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>अनुभव (Experience)</label>
                <input
                  type="text"
                  value={settings.about?.experience_years || ""}
                  onChange={(e) => handleNestedChange("about", "experience_years", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>हमारी कहानी / उद्देश्य (Story & Mission)</label>
              <textarea
                rows={3}
                value={settings.about?.story || ""}
                onChange={(e) => handleNestedChange("about", "story", e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>मुख्य विशेषताएं / हाइलाइट्स (About Highlights):</label>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(settings.about?.highlights || []), "नया बिंदु"];
                    setSettings((prev) => ({
                      ...prev,
                      about: { ...prev.about, highlights: list },
                    }));
                  }}
                  className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg"
                >
                  + Add Highlight
                </button>
              </div>

              <div className="space-y-2">
                {(settings.about?.highlights || []).map((hl, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={hl}
                      onChange={(e) => {
                        const list = [...(settings.about?.highlights || [])];
                        list[idx] = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          about: { ...prev.about, highlights: list },
                        }));
                      }}
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = (settings.about?.highlights || []).filter((_, i) => i !== idx);
                        setSettings((prev) => ({
                          ...prev,
                          about: { ...prev.about, highlights: list },
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Course Details Page Settings */}
          <div className="space-y-4 pt-4 border-t border-stone-200">
            <div className="border-b border-stone-200 pb-2">
              <h3 className="text-base font-bold text-stone-900">कोर्स पेज गारंटी व बैज (Course Details Page)</h3>
              <p className="text-xs text-stone-500">प्रत्येक कोर्स के विवरण पेज पर दिखने वाला बैज और 3 गारंटी बुलेट्स।</p>
            </div>

            <div>
              <label className={labelCls}>त्वरित डिलीवरी बैज (Instant Delivery Badge Text)</label>
              <input
                type="text"
                value={settings.course_page?.instant_delivery_badge || ""}
                onChange={(e) => handleNestedChange("course_page", "instant_delivery_badge", e.target.value)}
                className={inputCls}
                placeholder="One-time payment • Instant WhatsApp & Gmail PDF access"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>कोर्स पेज गारंटी बुलेट्स (Guarantees List):</label>
                <button
                  type="button"
                  onClick={() => {
                    const list = [...(settings.course_page?.guarantees || []), "नई गारंटी"];
                    setSettings((prev) => ({
                      ...prev,
                      course_page: { ...prev.course_page, guarantees: list },
                    }));
                  }}
                  className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg"
                >
                  + Add Guarantee
                </button>
              </div>

              <div className="space-y-2">
                {(settings.course_page?.guarantees || []).map((g, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={g}
                      onChange={(e) => {
                        const list = [...(settings.course_page?.guarantees || [])];
                        list[idx] = e.target.value;
                        setSettings((prev) => ({
                          ...prev,
                          course_page: { ...prev.course_page, guarantees: list },
                        }));
                      }}
                      className={`${inputCls} py-1.5 text-xs flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const list = (settings.course_page?.guarantees || []).filter((_, i) => i !== idx);
                        setSettings((prev) => ({
                          ...prev,
                          course_page: { ...prev.course_page, guarantees: list },
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 px-2 py-1 bg-white border border-stone-200 rounded-lg text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. BRAND TAB */}
      {activeTab === "brand" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="border-b border-stone-200 pb-3">
            <h3 className="text-base font-bold text-stone-900">ब्रांड व लोगो सेटिंग्स (Brand & Logo)</h3>
            <p className="text-xs text-stone-500">वेबसाइट का नाम, लोगो टेक्स्ट, टैगलाइन और फुटर टैगलाइन।</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Logo Brand Name *</label>
              <input
                type="text"
                value={settings.brand?.logo_text || "Arkado"}
                onChange={(e) => handleNestedChange("brand", "logo_text", e.target.value)}
                className={`${inputCls} font-bold`}
              />
            </div>
            <div>
              <label className={labelCls}>Logo Badge Pill Text</label>
              <input
                type="text"
                value={settings.brand?.logo_badge_text || "STORE"}
                onChange={(e) => handleNestedChange("brand", "logo_badge_text", e.target.value)}
                className={`${inputCls} uppercase`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>हेडर टैगलाइन (Header Tagline)</label>
            <input
              type="text"
              value={settings.brand?.tagline || ""}
              onChange={(e) => handleNestedChange("brand", "tagline", e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>फुटर टैगलाइन (Footer Tagline)</label>
            <textarea
              rows={2}
              value={settings.brand?.footer_tagline || ""}
              onChange={(e) => handleNestedChange("brand", "footer_tagline", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <p className="text-xs font-bold text-stone-600 mb-2">Live Brand Badge Preview</p>
            <div className="bg-white p-3.5 rounded-xl flex items-center gap-3 inline-flex border border-stone-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 flex items-center justify-center shadow-md">
                <span
                  className="text-white font-black italic text-xl"
                  style={{ fontFamily: "Georgia, serif", transform: "skewX(-6deg)" }}
                >
                  {settings.brand?.logo_text?.charAt(0) || "A"}
                </span>
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl text-stone-900" style={{ fontFamily: "Georgia, serif" }}>
                    {settings.brand?.logo_text || "Arkado"}
                  </span>
                  {settings.brand?.logo_badge_text && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {settings.brand.logo_badge_text}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-500 font-medium mt-1">{settings.brand?.tagline}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. RAZORPAY TAB */}
      {activeTab === "razorpay" && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="border-b border-stone-200 pb-3">
            <h3 className="text-base font-bold text-stone-900">Razorpay पेमेंट गेटवे</h3>
            <p className="text-xs text-stone-500">
              ऑटोमैटिक पेमेंट गेटवे। वर्तमान में 0% फीस के साथ डायरेक्ट UPI एक्टिव है।
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <div>
              <p className="font-bold text-stone-900 text-sm">Razorpay गेटवे सक्षम करें (Enable Razorpay)</p>
              <p className="text-xs text-stone-500">डायरेक्ट UPI से ऑटोमैटिक गेटवे पर स्विच करने के लिए ऑन करें</p>
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
            <div className="space-y-4 border-t border-stone-200 pt-3">
              <div>
                <label className={labelCls}>Razorpay Key ID</label>
                <input
                  type="text"
                  value={settings.razorpay_key_id || ""}
                  onChange={(e) => handleChange("razorpay_key_id", e.target.value)}
                  className={`${inputCls} font-mono`}
                  placeholder="rzp_test_..."
                />
              </div>
              <div>
                <label className={labelCls}>Razorpay Key Secret</label>
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
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs"
                  >
                    {showRazorpaySecret ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
        <p className="text-xs text-stone-600 font-medium">
          बदलाव करने के बाद सेव बटन दबाना न भूलें।
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? "सेव हो रहा है..." : "💾 सेव करें (Save Settings)"}
        </button>
      </div>
    </div>
  );
}
