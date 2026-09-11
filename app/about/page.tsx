"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Settings } from "@/lib/store-types";
import { ShieldIcon, ZapIcon, DownloadIcon, MessageSquareIcon, WhatsappIcon, CheckCircleIcon, BarChartIcon } from "@/components/icons";

export default function AboutPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const about = settings?.about;
  const title = about?.title || "About Arkado";
  const subtitle = about?.subtitle || "All-India exam preparation — deep-level analysis & pattern-based notes.";
  const story = about?.story || "Arkado is a premium study-material marketplace for All-India competitive exams (CET, Patwari, Police, REET, SSC, UPSC, Banking). We deliver deep-level analysis notes — not just topic lists — built from last 5+ years' question paper patterns.";
  const founderName = about?.founder_name || "Harimohan Sharma";
  const founderLocation = about?.founder_location || "Sardarshahar (Churu, Rajasthan)";
  const expYears = about?.experience_years || "5+ years";

  const defaultHighlights = [
    "Topic-weightage analysis from last 5+ years of exam shifts",
    "PYQ-tagged MCQs with step-by-step reasoning",
    "Instant digital delivery — typically 5-15 minutes",
    "Direct UPI payment (PhonePe / Paytm) — 0% extra fees",
    `WhatsApp expert support — ${settings?.contact?.whatsapp_number || "7852004401"}`,
    "Printable A4 PDFs — print at any cyber cafe"
  ];

  const highlights = (about?.highlights && about.highlights.length > 0) ? about.highlights : defaultHighlights;

  const whatsappUrl =
    settings?.social?.whatsapp_url ||
    `https://wa.me/${settings?.contact?.whatsapp_number || "917852004401"}`;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900">
          {title}
        </h1>
        <p className="text-sm text-stone-500 mt-2">
          {subtitle}
        </p>

        <div className="prose prose-stone mt-6 text-stone-700 leading-relaxed space-y-6">
          <p className="text-base font-medium text-stone-800">
            {story}
          </p>

          <h3 className="text-xl font-bold text-stone-900 mt-6">What We Do Differently</h3>
          <p>
            Most platforms just list topics. We analyze which topics repeat every year,
            which questions are being rephrased, and which distractors (wrong options)
            are most commonly used — and pack this intelligence into every note.
          </p>

          <h3 className="text-xl font-bold text-stone-900 mt-6">Key Features</h3>
          <ul className="space-y-2.5 text-sm list-none p-0">
            {highlights.map((hl, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircleIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
                <span>{hl}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-xl font-bold text-stone-900 mt-6">The Team</h3>
          <p>
            Built by <strong>{founderName}</strong> from <strong>{founderLocation}</strong> with {expYears}
            {" "}of experience in competitive-exam content curation. The mission: affordable
            pattern-decoded notes for every aspirant in India.
          </p>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill-success mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
        >
          <WhatsappIcon size={16} />
          <span>Talk to us on WhatsApp</span>
        </a>
      </main>

      <Footer />
    </div>
  );
}