"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Settings } from "@/lib/store-types";
import {
  WhatsappIcon,
  CloseIcon,
  MessageCircleIcon,
} from "@/components/icons";

const InstagramIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const FacebookIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const GmailIcon = (p: { size?: number }) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export default function SocialFab() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const isAdminRoute = pathname?.includes("admin") ?? false;

  if (isAdminRoute) return null;

  const social = settings?.social;
  const whatsappUrl = social?.whatsapp_url || `https://wa.me/${settings?.contact?.whatsapp_number || settings?.whatsapp_support_number || "917852004401"}`;
  const instagramUrl = social?.instagram_url || "https://instagram.com/";
  const facebookUrl = social?.facebook_url || "https://facebook.com/";
  const gmailUrl = social?.gmail_url || `mailto:${settings?.contact?.email || settings?.gmail_support_email || "support@arkado.in"}`;

  const channels = [
    {
      key: "whatsapp",
      name: "WhatsApp",
      subtitle: "Instant Chat Support",
      url: whatsappUrl,
      bg: "bg-emerald-500 hover:bg-emerald-600",
      text: "text-white",
      icon: <WhatsappIcon size={20} />,
    },
    {
      key: "instagram",
      name: "Instagram",
      subtitle: "Updates & Reels",
      url: instagramUrl,
      bg: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 hover:opacity-95",
      text: "text-white",
      icon: <InstagramIcon size={20} />,
    },
    {
      key: "facebook",
      name: "Facebook",
      subtitle: "Community Page",
      url: facebookUrl,
      bg: "bg-blue-600 hover:bg-blue-700",
      text: "text-white",
      icon: <FacebookIcon size={20} />,
    },
    {
      key: "gmail",
      name: "Gmail / Email",
      subtitle: "Official Inquiries",
      url: gmailUrl,
      bg: "bg-red-500 hover:bg-red-600",
      text: "text-white",
      icon: <GmailIcon size={20} />,
    },
  ];

  return (
    <>
      {/* Dim backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs z-[88] transition-opacity anim-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating social drawer popup */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[89] w-72 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl shadow-2xl p-3 anim-slide-down">
          <div className="px-2 py-1.5 border-b border-stone-100 flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-black text-stone-900 uppercase tracking-wider">
                Direct Help & Connect
              </p>
              <p className="text-[10px] text-stone-500">
                Contact team Arkado anytime
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 cursor-pointer"
              aria-label="Close menu"
            >
              <CloseIcon size={14} />
            </button>
          </div>

          <div className="space-y-1.5">
            {channels.map((ch) => (
              <a
                key={ch.key}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-all border border-stone-100 group"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${ch.bg} ${ch.text} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                >
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0 leading-tight text-left">
                  <p className="text-xs font-bold text-stone-900 group-hover:text-amber-800 transition">
                    {ch.name}
                  </p>
                  <p className="text-[10px] text-stone-400 truncate">
                    {ch.subtitle}
                  </p>
                </div>
                <span className="text-stone-300 text-xs group-hover:translate-x-0.5 transition">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating Message FAB Trigger (Sky-Blue to Red/Indigo Gradient) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-4 sm:right-6 z-[90] flex items-center gap-2 group cursor-pointer"
        aria-label="Contact and Social Channels"
      >
        {!open && (
          <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-stone-900/90 text-white text-xs font-bold shadow-lg backdrop-blur-sm border border-white/10 group-hover:bg-stone-900 transition">
            Chat Support
          </span>
        )}
        <div
          className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 via-blue-600 to-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all ${
            open ? "rotate-90 bg-stone-800" : ""
          }`}
        >
          {/* Animated ping dot when closed */}
          {!open && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white"></span>
            </span>
          )}

          {open ? (
            <CloseIcon size={22} />
          ) : (
            <MessageCircleIcon size={24} className="text-white" />
          )}
        </div>
      </button>
    </>
  );
}