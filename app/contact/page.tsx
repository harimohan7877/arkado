"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { PhoneIcon, MailIcon, MapPinIcon, WhatsappIcon, ClockIcon } from "@/components/icons";

export default function ContactPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const phone = settings?.contact?.phone || "+91 7852004401";
  const email = settings?.contact?.email || settings?.gmail_support_email || "support@arkado.in";
  const whatsappNumber = settings?.contact?.whatsapp_number || settings?.whatsapp_support_number || "917852004401";
  const whatsappUrl = settings?.social?.whatsapp_url || `https://wa.me/${whatsappNumber}`;
  const address = settings?.contact?.address || "Ward No 14, Sardarshahar, Churu, Rajasthan - 331403";
  const supportHours = settings?.contact?.support_hours || "10:00 AM - 9:00 PM (All 7 Days)";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Contact Us</h1>
        <p className="text-sm text-slate-500 mt-2">
          Orders, support या किसी भी inquiry के लिए हमसे संपर्क करें।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="card-base p-5 hover:border-amber-700 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <PhoneIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">Phone Support</h3>
            <p className="text-sm text-slate-600 mt-1 font-medium">{phone}</p>
          </a>

          <a
            href={`mailto:${email}`}
            className="card-base p-5 hover:border-amber-700 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <MailIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">Email Support</h3>
            <p className="text-sm text-slate-600 mt-1 font-medium">{email}</p>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="card-base p-5 hover:border-emerald-600 transition flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <WhatsappIcon size={20} />
            </div>
            <h3 className="font-bold text-slate-900">WhatsApp Helpdesk</h3>
            <p className="text-sm text-slate-600 mt-1 font-medium">Quick response</p>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="card-base p-6 flex items-start gap-3">
            <MapPinIcon size={20} className="text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900">Office Address</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {address}
              </p>
            </div>
          </div>

          <div className="card-base p-6 flex items-start gap-3">
            <ClockIcon size={20} className="text-amber-700 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900">Support Timing</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {supportHours}
              </p>
            </div>
          </div>
        </div>

        <div className="card-base p-6 mt-6">
          <h3 className="font-bold text-slate-900 mb-2">Direct Message to Support Team</h3>
          <p className="text-xs text-slate-500 mb-4">
            नीचे दिए गए बटन पर क्लिक करके सीधे हमें WhatsApp पर अपनी समस्या या कोर्स इंक्वायरी भेजें:
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
          >
            <WhatsappIcon size={16} />
            <span>Open WhatsApp Support</span>
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
