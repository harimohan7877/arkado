/**
 * Arkado Canonical Default Settings
 * Single Source of Truth for fallback values when settings are loading or undefined.
 * Ensures zero-crash across slow networks and eliminates scattered hardcodes.
 */

import { BundleCardStyle } from "./store-types";

export const DEFAULT_SECTION_ORDER = [
  "hero",
  "trust_strip",
  "featured_bundles",
  "promo_banner",
  "categories",
  "all_products",
  "hot_deals",
  "new_arrivals",
  "faq",
] as const;

export type SectionKey = (typeof DEFAULT_SECTION_ORDER)[number];

export const DEFAULT_BUNDLE_CARD_STYLE: Required<BundleCardStyle> = {
  mobile_cover_height: 150,
  mobile_aspect_ratio: "3/4",
  mobile_grid_cols: 2,
  mobile_card_padding: 8,
  mobile_title_size: "xs",
  mobile_title_lines: 2,

  desktop_cover_height: 240,
  desktop_aspect_ratio: "4/5",
  desktop_grid_cols: 5,
  desktop_card_padding: 14,

  cover_fit: "cover",
  card_gap: 12,
  card_border_radius: "rounded-xl",
  card_shadow: "sm",

  show_discount_badge: true,
  show_exam_tag: false,
  show_rating: true,
  show_pages_format: true,
  show_instant_access: true,

  button_style: "full",
  button_text: "Grab This Deal",
  button_text_mobile: "Buy",
  button_layout: "full_width",
  button_height_mobile: 28,
  show_button_icon: true,
  button_font_size_mobile: "xs",
};

export const DEFAULT_SETTINGS = {
  site_name: "Arkado",
  site_tagline: "Deep-Level Exam Analysis & Pattern-Based Premium Notes",
  merchant_name: "Arkado",
  currency: "INR",
  upi_id: process.env.DEFAULT_UPI_ID || "arkado@upi",
  whatsapp_support_number: process.env.DEFAULT_WHATSAPP_NUMBER || "917852004401",
  gmail_support_email: process.env.DEFAULT_SUPPORT_EMAIL || "support@arkado.in",
  custom_qr_url: "",
  payment_methods: ["PhonePe", "Paytm"],
  razorpay_enabled: false,

  contact: {
    phone: process.env.DEFAULT_SUPPORT_PHONE || "+91 7852004401",
    whatsapp_number: process.env.DEFAULT_WHATSAPP_NUMBER || "917852004401",
    email: process.env.DEFAULT_SUPPORT_EMAIL || "support@arkado.in",
    address: "Ward No 14, Sardarshahar, Churu, Rajasthan - 331403",
    support_hours: "10:00 AM - 9:00 PM (All 7 Days)",
  },

  social: {
    whatsapp_url: `https://wa.me/${process.env.DEFAULT_WHATSAPP_NUMBER || "917852004401"}`,
    instagram_url: "https://instagram.com/",
    facebook_url: "https://facebook.com/",
    gmail_url: `mailto:${process.env.DEFAULT_SUPPORT_EMAIL || "support@arkado.in"}`,
    share_enabled: true,
  },

  brand: {
    logo_text: "Arkado",
    logo_badge_text: "STORE",
    logo_accent_color: "#b45309",
    tagline: "Pattern-decoded notes for All-India exams",
    footer_tagline: "All-India exam preparation — deep-level analysis & pattern-based notes.",
  },

  homepage: {
    hero_badge: "2026 PATTERN DECODED",
    hero_headline: "RSMSSB CET & Rajasthan Exam Bundles",
    featured_section_title: "Featured Bundles",
    hot_deals_title: "Today's Hot Deals",
    new_arrivals_title: "New Arrivals",
    categories_section_title: "Browse Top Categories",
    products_section_title: "All Exam Bundles",
    faq_section_title: "Common Questions",
    section_order: [
      "hero",
      "trust_strip",
      "featured_bundles",
      "promo_banner",
      "categories",
      "all_products",
      "hot_deals",
      "new_arrivals",
      "faq",
    ],
    sections: {
      hero: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "RSMSSB CET & Rajasthan Exam Bundles" },
      trust_strip: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Why Choose Arkado" },
      featured_bundles: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Featured Bundles" },
      promo_banner: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Crack Any Exam with Deep-Level Analysis" },
      categories: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Browse Top Categories" },
      all_products: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "All Exam Bundles" },
      hot_deals: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Today's Hot Deals" },
      new_arrivals: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "New Arrivals" },
      faq: { enabled: true, show_on_mobile: true, show_on_desktop: true, title: "Common Questions" },
    },
    bundle_card_style: { ...DEFAULT_BUNDLE_CARD_STYLE },
    festival_offer: {
      enabled: true,
      strip_enabled: true,
      strip_text: "🪔 नवरात्रि महोत्सव — सभी कोर्स पर 20% छूट",
      title: "नवरात्रि महोत्सव ऑफर",
      subtitle: "छूट सभी कीमतों पर अपने आप लागू — कोई कोड नहीं चाहिए",
      discount_percent: 20,
      discount_line1: "सभी कोर्स पर 20% छूट",
      discount_line2: "पूरा बंडल लेने पर अतिरिक्त 5% छूट",
      badge_template: "🪔 नवरात्रि • दिन {day}",
      sale_line_template: "🎉 सभी कोर्स पर {pct}% छूट — कीमतों पर अपने आप लागू",
      countdown_label: "⏳ ऑफर खत्म होने में:",
      cart_sale_label: "🎉 Sale discount ({pct}% OFF):",
      devi_images: [
        "/images/navratri/devi-shailputri.jpg",
        "/images/navratri/devi-brahmacharini.jpg",
        "/images/navratri/devi-chandraghanta.jpg",
        "/images/navratri/devi-kushmanda.jpg",
        "/images/navratri/devi-skandamata.jpg",
        "/images/navratri/devi-katyayani.jpg",
        "/images/navratri/devi-kalaratri.jpg",
        "/images/navratri/devi-mahagauri.jpg",
        "/images/navratri/devi-siddhidatri.jpg",
      ],
      coupon_code: "",
      sale_ends_at: "2026-10-19T23:59:59+05:30",
      cta_text: "कोर्स देखें",
      cta_link: "/exams",
      redeem_note: "छूट checkout पर अपने आप लागू होगी",
    },
  },
} as const;

/** Festival offer field keys (for admin editor + merges). */
export const FESTIVAL_OFFER_FIELDS = [
  "enabled",
  "strip_enabled",
  "strip_text",
  "title",
  "subtitle",
  "discount_percent",
  "discount_line1",
  "discount_line2",
  "badge_template",
  "sale_line_template",
  "countdown_label",
  "cart_sale_label",
  "devi_images",
  "coupon_code",
  "sale_ends_at",
  "cta_text",
  "cta_link",
  "redeem_note",
] as const;

export type FestivalOffer = {
  [K in (typeof FESTIVAL_OFFER_FIELDS)[number]]: K extends "enabled" | "strip_enabled"
    ? boolean
    : K extends "discount_percent"
      ? number
      : K extends "devi_images"
        ? string[]
        : string;
};

/**
 * Merged festival-offer config: saved settings over defaults.
 * Used by the Navratri campaign section and the site-wide OfferStrip.
 */
export function getFestivalOffer(settings?: any): FestivalOffer {
  const d: any = (DEFAULT_SETTINGS as any).homepage?.festival_offer || {};
  const s: any = settings?.homepage?.festival_offer || {};
  return {
    enabled: s.enabled ?? d.enabled ?? true,
    strip_enabled: s.strip_enabled ?? d.strip_enabled ?? true,
    strip_text: s.strip_text ?? d.strip_text ?? "",
    title: s.title ?? d.title ?? "",
    subtitle: s.subtitle ?? d.subtitle ?? "",
    discount_percent: Number(s.discount_percent ?? d.discount_percent ?? 0) || 0,
    discount_line1: s.discount_line1 ?? d.discount_line1 ?? "",
    discount_line2: s.discount_line2 ?? d.discount_line2 ?? "",
    badge_template: s.badge_template ?? d.badge_template ?? "",
    sale_line_template: s.sale_line_template ?? d.sale_line_template ?? "",
    countdown_label: s.countdown_label ?? d.countdown_label ?? "",
    cart_sale_label: s.cart_sale_label ?? d.cart_sale_label ?? "",
    devi_images: Array.isArray(s.devi_images) && s.devi_images.length > 0 ? s.devi_images : (d.devi_images ?? []),
    coupon_code: s.coupon_code ?? d.coupon_code ?? "",
    sale_ends_at: s.sale_ends_at ?? d.sale_ends_at ?? "",
    cta_text: s.cta_text ?? d.cta_text ?? "",
    cta_link: s.cta_link ?? d.cta_link ?? "/exams",
    redeem_note: s.redeem_note ?? d.redeem_note ?? "",
  };
}

/** True while the configured sale is still running. */
export function isFestivalSaleLive(offer: Pick<FestivalOffer, "sale_ends_at">, nowMs: number = Date.now()): boolean {
  if (!offer.sale_ends_at) return true;
  const t = new Date(offer.sale_ends_at).getTime();
  if (Number.isNaN(t)) return true;
  return nowMs <= t;
}

/**
 * Safe helper to return the validated ordered list of section keys.
 * Ensures all valid sections exist and duplicates or invalid keys are filtered.
 */
export function getOrderedSectionKeys(settings?: any): SectionKey[] {
  const configured: string[] = settings?.homepage?.section_order || [];
  const validKeys = DEFAULT_SECTION_ORDER as readonly string[];

  const ordered: SectionKey[] = [];
  for (const k of configured) {
    if (validKeys.includes(k) && !ordered.includes(k as SectionKey)) {
      ordered.push(k as SectionKey);
    }
  }
  for (const k of validKeys) {
    if (!ordered.includes(k as SectionKey)) {
      ordered.push(k as SectionKey);
    }
  }
  return ordered;
}

/**
 * Safe helper to check device visibility for a homepage section.
 * Returns { isVisible: boolean, className: string }
 * - isVisible: false if disabled overall or turned OFF on both mobile & desktop
 * - className: "block md:hidden" (mobile only), "hidden md:block" (desktop only), or "" (both)
 */
export function getSectionVisibility(
  settings: any,
  sectionKey: SectionKey
): {
  isVisible: boolean;
  className: string;
} {
  if (!settings?.homepage) return { isVisible: true, className: "" };

  const config = settings.homepage?.sections?.[sectionKey];

  let isOverallEnabled = config?.enabled ?? true;
  if (sectionKey === "promo_banner") {
    if (settings.homepage?.promo_banner?.enabled === false) isOverallEnabled = false;
    if (settings.homepage?.sections?.promo_banner?.enabled === false) isOverallEnabled = false;
  }
  if (!isOverallEnabled) {
    return { isVisible: false, className: "hidden" };
  }

  const showMobile = config?.show_on_mobile ?? true;
  const showDesktop = config?.show_on_desktop ?? true;

  if (!showMobile && !showDesktop) {
    return { isVisible: false, className: "hidden" };
  }
  if (showMobile && !showDesktop) {
    return { isVisible: true, className: "block md:hidden" };
  }
  if (!showMobile && showDesktop) {
    return { isVisible: true, className: "hidden md:block" };
  }
  return { isVisible: true, className: "" };
}

/**
 * Safe helper to check if a homepage section is enabled (defaults to true)
 */
export function isSectionEnabled(
  settings: any,
  sectionKey:
    | "hero"
    | "trust_strip"
    | "featured_bundles"
    | "promo_banner"
    | "categories"
    | "all_products"
    | "hot_deals"
    | "new_arrivals"
    | "faq"
): boolean {
  return getSectionVisibility(settings, sectionKey as SectionKey).isVisible;
}

/**
 * Safe helper to retrieve WhatsApp phone number (cleaned digits only for wa.me URLs)
 */
export function getCleanWhatsAppNumber(settings?: any): string {
  const raw =
    settings?.contact?.whatsapp_number ||
    settings?.whatsapp_support_number ||
    DEFAULT_SETTINGS.whatsapp_support_number;
  return String(raw).replace(/\D/g, "");
}

/**
 * Safe helper to retrieve display phone number
 */
export function getDisplayPhone(settings?: any): string {
  return (
    settings?.contact?.phone ||
    DEFAULT_SETTINGS.contact.phone
  );
}

/**
 * Safe helper to retrieve active UPI ID
 */
export function getActiveUpiId(settings?: any): string {
  return settings?.upi_id || DEFAULT_SETTINGS.upi_id;
}

/**
 * Safe helper to retrieve effective bundle card style for a section
 */
export function getBundleCardStyle(settings?: any, sectionKey?: string): Required<BundleCardStyle> {
  const globalStyle = settings?.homepage?.bundle_card_style || {};
  const sectionSpecific =
    sectionKey && settings?.homepage?.sections_card_styles?.[sectionKey]
      ? settings.homepage.sections_card_styles[sectionKey]
      : {};
  return {
    ...DEFAULT_BUNDLE_CARD_STYLE,
    ...globalStyle,
    ...sectionSpecific,
  };
}
