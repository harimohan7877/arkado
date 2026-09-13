"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";

function DownloadContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || searchParams.get("order_id") || "ARK-2026-LIVE";
  const courseTitle = searchParams.get("course") || "Exam Selection Notes Bundle";
  const mode = searchParams.get("mode") || "whatsapp";

  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const supportNumber = settings?.contact?.whatsapp_number || settings?.whatsapp_support_number || "917852004401";
  const displayPhone = settings?.contact?.phone || "+91 7852004401";

  const waMessage = `नमस्ते! मैंने Arkado से नोट्स बंडल का ऑर्डर किया है।\n\nOrder ID: ${orderId}\nकृपया मुझे notes की लिंक भेजें।`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xs">
        ✓
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200">
          Order ID: {orderId}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Thank You! Your Order is Confirmed
        </h1>
        <p className="text-xs sm:text-sm text-stone-600">
          {courseTitle}
        </p>
      </div>

      {/* Mode info box */}
      <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-xs text-left space-y-4">
        {mode === "whatsapp" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <span>💬</span>
              <span>WhatsApp Delivery Mode:</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Click the button below to send your Order ID to our WhatsApp support team. Your Google Drive notes link will be shared with you shortly.
            </p>
            <a
              href={`https://wa.me/${supportNumber.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>💬 Request Notes Link on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <span>✉️</span>
              <span>Gmail Delivery Mode:</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your order is being processed securely. Your study notes access link will be sent to your registered Gmail address within <strong>5 to 15 minutes</strong>.
            </p>
            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-500 border border-stone-100">
              💡 If you don't see the email within 15 minutes, please check your Spam / Updates folder or message us on WhatsApp.
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/"
          className="w-full sm:w-auto px-6 py-3 rounded-full border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition"
        >
          ← Back to Home
        </Link>
        <a
          href={`https://wa.me/${supportNumber.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition"
        >
          Helpline Support ({displayPhone})
        </a>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between font-sans">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
          <DownloadContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
