"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { DEFAULT_SETTINGS, getCleanWhatsAppNumber } from "@/lib/default-settings";
import { ShieldIcon, PhoneIcon, WhatsappIcon } from "@/components/icons";

export default function DeliveryPolicyPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const deliveryText =
    settings?.policies?.delivery_policy ||
    `Arkado sirf digital products bechta hai — PDF notes, MCQ books, mock test papers aur CBT (computer-based test) material. Koi physical shipment, courier ya post nahi hota, isliye shipping charges bhi nahi lagte.

Delivery kaise hoti hai: Payment verify hone ke baad, product ka download/access link tumhare diye gaye WhatsApp number aur email ID par bheja jaata hai (Google Drive link ke roop me).

Delivery kab tak: Aam taur par payment verification ke 5–15 minute ke andar link bhej diya jaata hai. Vartman prakriya me UPI payment ke baad 12-digit UTR submit karna hota hai; UTR verify hone ke baad link bheja jaata hai.

Agar link na mile: Payment ke 24 ghante ke andar link na mile to WhatsApp helpline 7852004401 ya hello@arkado.store par order ID aur payment detail ke saath sampark karo. Samasya ka samadhan 24–48 ghante ke andar kiya jayega.

Dhyan rahe: Delivery link sirf tumhare personal study ke liye hai. Link ko aage share karna, bechna ya sarvjanik roop se daalna mana hai (Terms of Service ke anusaar).`;

  const phone = settings?.contact?.phone || DEFAULT_SETTINGS.contact.phone;
  const whatsappUrl =
    settings?.social?.whatsapp_url ||
    `https://wa.me/${getCleanWhatsAppNumber(settings)}`;

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="space-y-3 border-b border-stone-200 pb-6 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <ShieldIcon size={14} />
            <span>Instant Digital Delivery</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Shipping &amp; Delivery Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            अंतिम अपडेट (Last Updated): {new Date().toLocaleDateString("hi-IN")}
          </p>
        </div>

        <div className="bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200 space-y-6 text-stone-800 text-sm leading-relaxed whitespace-pre-line">
          {deliveryText}
        </div>

        <div className="mt-8 p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-emerald-950 text-base">
              डिलीवरी संबंधी सहायता चाहिए?
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              लिंक न मिला हो या डिलीवरी में देरी हो तो हमारी सपोर्ट टीम आपकी तुरंत मदद के लिए उपलब्ध है।
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
