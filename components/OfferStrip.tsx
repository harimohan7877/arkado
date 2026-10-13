"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/store-hooks";
import { getFestivalOffer } from "@/lib/default-settings";
import { useSiteSale } from "@/lib/sale-pricing";

/**
 * Slim site-wide offer strip — renders at the very top of every page
 * (mounted in app/layout.tsx). Admin-managed via Settings → फेस्टिवल ऑफर.
 * Shows only while a real discount % is live; auto-hides when the sale
 * expires, is disabled, or is dismissed (per sale).
 */
export default function OfferStrip() {
  const { settings } = useSettings();
  const { isLive: saleLive } = useSiteSale();
  const [dismissed, setDismissed] = useState(false);

  const offer = getFestivalOffer(settings);

  useEffect(() => {
    try {
      const key = `offer-strip-dismissed:${offer.sale_ends_at || "none"}`;
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [offer.sale_ends_at]);

  if (!saleLive || !offer.strip_enabled || dismissed || !offer.strip_text) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(`offer-strip-dismissed:${offer.sale_ends_at || "none"}`, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="relative z-[60] bg-gradient-to-r from-[#7c2d12] via-[#b45309] to-[#7c2d12]">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-8 py-[7px] sm:px-4">
        <Link
          href={offer.cta_link || "/exams"}
          className="truncate text-center text-[12px] font-bold text-amber-50 hover:underline sm:text-[13px]"
        >
          {offer.strip_text}
        </Link>
        <button
          onClick={dismiss}
          aria-label="पट्टी बंद करें"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1 text-amber-100/80 transition-all hover:bg-white/15 hover:text-white active:scale-90"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
