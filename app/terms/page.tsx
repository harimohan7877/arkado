"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { FileTextIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export default function TermsOfServicePage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const termsText =
    settings?.policies?.terms_of_service ||
    "Arkado वेबसाइट का उपयोग करके आप निम्नलिखित शर्तों से सहमत होते हैं:\n1. इस प्लेटफ़ॉर्म पर उपलब्ध सभी अध्ययन सामग्री, प्रश्न बैंक और नोट्स केवल आपके व्यक्तिगत अध्ययन के लिए हैं।\n2. किसी भी सामग्री को पुनः बेचना, वाणिज्यिक उपयोग करना या सार्वजनिक रूप से इंटरनेट पर साझा करना कॉपीराइट कानून के तहत सख्त वर्जित है।\n3. भुगतान के पश्चात डिजिटल सामग्री का लिंक आपके पंजीकृत WhatsApp या ईमेल पर भेजा जाता है।\n4. किसी भी कानूनी विवाद के लिए क्षेत्राधिकार सरदारशहर (चूरू, राजस्थान) रहेगा।";

  const phone = settings?.contact?.phone || "+91 7852004401";
  const whatsappUrl =
    settings?.social?.whatsapp_url ||
    `https://wa.me/${settings?.contact?.whatsapp_number || "917852004401"}`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="space-y-3 border-b border-stone-200 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold">
            <FileTextIcon size={14} />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            अंतिम अपडेट (Last Updated): {new Date().toLocaleDateString("hi-IN")}
          </p>
        </div>

        <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6 text-stone-800 text-sm leading-relaxed whitespace-pre-line">
          {termsText}
        </div>

        <div className="mt-8 p-6 bg-stone-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              शर्तों के संबंध में कोई प्रश्न?
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              हमें ईमेल या WhatsApp पर निसंकोच संपर्क करें।
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
              className="px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
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
