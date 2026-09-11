"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { ShieldIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export default function RefundPolicyPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const refundText =
    settings?.policies?.refund_policy ||
    "Arkado पर उपलब्ध सभी उत्पाद डिजिटल स्टडी नोट्स, ई-बुक्स और मॉक टेस्ट PDF हैं। चूंकि डिजिटल उत्पादों को डाउनलोड या एक्सेस लिंक जारी होने के बाद वापस नहीं लिया जा सकता, इसलिए आम तौर पर खरीदारी के बाद रिफंड स्वीकार्य नहीं है। हालांकि, यदि आपने गलती से एक ही कोर्स के लिए दो बार भुगतान कर दिया है या भुगतान कटने के 24 घंटे के भीतर आपको नोट्स नहीं मिले हैं, तो आप तुरंत हमारे WhatsApp हेल्पलाइन पर संपर्क करें। हम 24 से 48 घंटे के भीतर आपकी समस्या का समाधान करेंगे।";

  const phone = settings?.contact?.phone || "+91 7852004401";
  const whatsappUrl =
    settings?.social?.whatsapp_url ||
    `https://wa.me/${settings?.contact?.whatsapp_number || "917852004401"}`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="space-y-3 border-b border-stone-200 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <ShieldIcon size={14} />
            <span>Customer Protection &amp; Terms</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            अंतिम अपडेट (Last Updated): {new Date().toLocaleDateString("hi-IN")}
          </p>
        </div>

        <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6 text-stone-800 text-sm leading-relaxed whitespace-pre-line">
          {refundText}
        </div>

        <div className="mt-8 p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-emerald-950 text-base">
              रिफंड या पेमेंट संबंधी सहायता चाहिए?
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              हमारी सपोर्ट टीम आपकी तुरंत मदद के लिए उपलब्ध है।
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <WhatsappIcon size={14} />
              <span>WhatsApp चैट</span>
            </a>
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <PhoneIcon size={14} />
              <span>कॉल करें</span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
