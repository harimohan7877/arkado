"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Settings } from "@/lib/store-types";
import {
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  WhatsappIcon,
  ShieldIcon,
  ZapIcon,
  CheckCircleIcon,
  FileTextIcon,
} from "@/components/icons";

const SendIcon = (p: { size?: number; className?: string }) => (
  <svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export default function Footer() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const brand = settings?.brand || {};
  const social = settings?.social || {};
  const homepage = settings?.homepage || {};

  const logoText = brand.logo_text || "Arkado";
  const footerTagline = brand.footer_tagline || "All-India exam preparation — deep-level analysis & pattern-based notes.";

  const whatsappUrl = social.whatsapp_url || "https://wa.me/917852004401";
  const instagramUrl = social.instagram_url || "https://instagram.com/";
  const facebookUrl = social.facebook_url || "https://facebook.com/";
  const gmailUrl = social.gmail_url || "mailto:support@arkado.in";

  const newsletterTitle = homepage.newsletter_title || "Stay Updated with Exam Alerts";
  const newsletterSubtitle = homepage.newsletter_subtitle || "Get pattern updates, new bundles & exclusive deals";
  const newsletterPlaceholder = homepage.newsletter_placeholder || "Your Email Address";
  const newsletterBtn = homepage.newsletter_button_text || "Subscribe";

  return (
    <footer className="bg-stone-950 text-stone-300 mt-16">
      {/* CTA strip */}
      <div className="border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="font-extrabold text-white text-lg sm:text-xl">
                Ready to crack your exam?
              </h3>
              <p className="text-sm text-amber-100 mt-1">
                Deep-level analysis & pattern-based notes trusted by thousands of aspirants.
              </p>
            </div>
            <Link
              href="/exams"
              className="px-5 py-3 bg-stone-950 hover:bg-stone-900 text-white font-bold text-sm rounded-lg transition shadow-md flex items-center gap-2 whitespace-nowrap"
            >
              <span>Explore Bundles</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { icon: <ShieldIcon size={16} />, label: "Secure Direct Payment" },
              { icon: <ZapIcon size={16} />, label: "Instant Access" },
              { icon: <FileTextIcon size={16} />, label: "Premium Analysis Notes" },
              { icon: <CheckCircleIcon size={16} />, label: "All-India Coverage" },
            ].map((it) => (
              <div key={it.label} className="flex items-center gap-2 text-xs text-stone-400 bg-stone-900/50 border border-stone-800 rounded-lg px-3 py-2.5">
                <span className="text-amber-500">{it.icon}</span>
                <span className="font-semibold">{it.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="inline-flex items-center bg-white px-3 py-1.5 rounded-xl shadow-xs">
              <Image
                src="/logo.svg"
                alt="Arkado"
                width={120}
                height={37}
                unoptimized
                className="object-contain h-7 w-auto"
              />
            </Link>
            <p className="text-xs text-stone-400 leading-relaxed">
              {footerTagline}
            </p>
            <div className="flex items-center gap-2 pt-1">
              {[
                { name: "X", path: "M18 6 6 18 M6 6l12 12" },
                { name: "in", path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z M2 9h4v12H2z M4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" },
                { name: "ig", path: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M17.5 6.5h.01" },
                { name: "fb", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
              ].map((s) => (
                <a
                  key={s.name}
                  href="#"
                  className="w-8 h-8 rounded-md bg-stone-800 hover:bg-amber-600 text-stone-400 hover:text-white flex items-center justify-center transition"
                  aria-label={s.name}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">
              Quick Links
            </h4>
            <Link href="/exams" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              All Exams
            </Link>
            <Link href="/admin" className="block text-xs text-amber-300 hover:text-amber-200 transition py-0.5">
              Admin Panel
            </Link>
            <Link href="/#deals" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              {homepage.hot_deals_title || "Today's Hot Deals"}
            </Link>
            <Link href="/#courses" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Featured Bundles
            </Link>
            <Link href="/exams" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Latest Bundles
            </Link>
            <Link href="/exams" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Top Rated
            </Link>
            <Link href="/download" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              My Purchases
            </Link>
          </div>

          {/* Other */}
          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">
              Company
            </h4>
            <Link href="/about" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              About Us
            </Link>
            <Link href="/contact" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Contact
            </Link>
            <Link href="#" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Refund Policy
            </Link>
            <Link href="#" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Privacy Policy
            </Link>
            <Link href="#" className="block text-xs text-stone-400 hover:text-amber-400 transition py-0.5">
              Terms of Service
            </Link>
          </div>

          {/* Contact + Newsletter */}
          <div className="space-y-3 col-span-2 md:col-span-1">
            <h4 className="text-white font-bold uppercase tracking-wider text-xs">
              Get in Touch
            </h4>
            <div className="space-y-1.5 text-xs text-stone-400">
              <a
                href="tel:+917852004401"
                className="flex items-center gap-2 hover:text-amber-400 transition"
              >
                <PhoneIcon size={12} className="text-amber-500" />
                +91 7852004401
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-emerald-400 transition"
              >
                <WhatsappIcon size={12} className="text-emerald-500" />
                WhatsApp Chat
              </a>
              <a
                href="mailto:support@arkado.in"
                className="flex items-center gap-2 hover:text-amber-400 transition"
              >
                <MailIcon size={12} className="text-amber-500" />
                support@arkado.in
              </a>
              <div className="flex items-start gap-2 pt-1">
                <MapPinIcon size={12} className="text-amber-500 mt-0.5 shrink-0" />
                <span>Sardarshahar, Churu, Rajasthan</span>
              </div>
            </div>

            <div className="pt-2">
              <h5 className="text-white font-bold text-xs mb-2">{newsletterTitle}</h5>
              <p className="text-[10px] text-stone-400 mb-2">{homepage.newsletter_subtitle || "Get pattern updates, new bundles & exclusive deals"}</p>
              <form className="flex">
                <input
                  type="email"
                  placeholder={newsletterPlaceholder}
                  className="flex-1 px-3 py-2 rounded-l-md bg-stone-800 border border-stone-700 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-r-md text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <SendIcon size={12} />
                  {newsletterBtn}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="pt-6 mt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Arkado. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ShieldIcon size={12} className="text-emerald-500" />
              <span>Direct UPI Payment</span>
            </span>
            <span className="opacity-50">|</span>
            <span className="flex items-center gap-1">
              <ZapIcon size={12} className="text-amber-500" />
              <span>Instant PDF Access</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}