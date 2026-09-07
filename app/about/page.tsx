"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ShieldIcon, ZapIcon, DownloadIcon, MessageSquareIcon, WhatsappIcon, SparklesIcon, CheckCircleIcon, BarChartIcon } from "@/components/icons";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar cartCount={0} onCartClick={() => {}} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900">
          About Arkado
        </h1>
        <p className="text-sm text-stone-500 mt-2">
          All-India exam preparation — deep-level analysis & pattern-based notes.
        </p>

        <div className="prose prose-stone mt-6 text-stone-700 leading-relaxed">
          <p>
            <strong>Arkado</strong> is a premium study-material marketplace for
            All-India competitive exams (CET, Patwari, Police, REET, SSC, UPSC, Banking).
            We deliver <strong>deep-level analysis notes</strong> — not just topic lists —
            built from last 5+ years' question paper patterns.
          </p>

          <h3 className="text-xl font-bold text-stone-900 mt-6">What We Do Differently</h3>
          <p>
            Most platforms just list topics. We analyze which topics repeat every year,
            which questions are being rephrased, and which distractors (wrong options)
            are most commonly used — and pack this intelligence into every note.
          </p>

          <h3 className="text-xl font-bold text-stone-900 mt-6">Key Features</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <BarChartIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              Topic-weightage analysis from last 5+ years of exam shifts
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              PYQ-tagged MCQs with step-by-step reasoning
            </li>
            <li className="flex items-start gap-2">
              <ZapIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              Instant digital delivery — typically 5-15 minutes
            </li>
            <li className="flex items-start gap-2">
              <ShieldIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              Direct UPI payment (PhonePe / Paytm) — 0% extra fees
            </li>
            <li className="flex items-start gap-2">
              <MessageSquareIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              WhatsApp expert support — 7852004401
            </li>
            <li className="flex items-start gap-2">
              <DownloadIcon size={16} className="text-amber-700 mt-0.5 shrink-0" />
              Printable A4 PDFs — print at any cyber cafe
            </li>
          </ul>

          <h3 className="text-xl font-bold text-stone-900 mt-6">The Team</h3>
          <p>
            Built by Harimohan Sharma from Sardarshahar (Churu, Rajasthan) with 5+ years
            of experience in competitive-exam content curation. The mission: affordable
            pattern-decoded notes for every aspirant in India.
          </p>
        </div>

        <a
          href="https://wa.me/917852004401"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill-success mt-6"
        >
          <WhatsappIcon size={14} />
          <span>Talk to us on WhatsApp</span>
        </a>
      </main>

      <Footer />
    </div>
  );
}