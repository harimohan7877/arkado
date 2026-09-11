"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { ShieldIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export default function PrivacyPolicyPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const privacyText =
    settings?.policies?.privacy_policy ||
    "Arkado आपकी व्यक्तिगत जानकारी की गोपनीयता और सुरक्षा का पूर्ण सम्मान करता है। हम केवल आपका नाम, ईमेल आईडी और मोबाइल नंबर एकत्र करते हैं ताकि हम आपको आपके द्वारा खरीदे गए नोट्स, Google Drive लिंक और ऑर्डर संबंधी महत्वपूर्ण अपडेट्स भेज सकें। हम आपकी जानकारी को किसी भी तीसरे पक्ष के साथ साझा, किराए पर या बेचते नहीं हैं। भुगतान विवरण प्रत्यक्ष यूपीआई ऐप या सुरक्षित पेमेंट गेटवे द्वारा प्रोसेस किया जाता है और हम कोई भी बैंकिंग पिन या पासवर्ड स्टोर नहीं करते।";

  const phone = settings?.contact?.phone || "+91 7852004401";
  const whatsappUrl =
    settings?.social?.whatsapp_url ||
    `https://wa.me/${settings?.contact?.whatsapp_number || "917852004401"}`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="space-y-3 border-b border-stone-200 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
            <ShieldIcon size={14} />
            <span>Data Privacy &amp; Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            अंतिम अपडेट (Last Updated): {new Date().toLocaleDateString("hi-IN")}
          </p>
        </div>

        <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6 text-stone-800 text-sm leading-relaxed whitespace-pre-line">
          {privacyText}
        </div>

        <div className="mt-8 p-6 bg-stone-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-stone-900 text-base">
              प्राइवेसी संबंधी कोई प्रश्न है?
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              आप कभी भी हमारी हेल्पडेस्क से संपर्क कर सकते हैं।
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
