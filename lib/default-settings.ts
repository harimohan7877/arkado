/**
 * Arkado Canonical Default Settings
 * Single Source of Truth for fallback values when settings are loading or undefined.
 * Ensures zero-crash across slow networks and eliminates scattered hardcodes.
 */

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

export const DEFAULT_SETTINGS = {
  site_name: "Arkado",
  site_tagline: "Deep-Level Exam Analysis & Pattern-Based Premium Notes",
  merchant_name: "Arkado",
  currency: "INR",
  upi_id: "7852004401@ybl",
  whatsapp_support_number: "917852004401",
  gmail_support_email: "support@arkado.in",
  custom_qr_url: "",
  payment_methods: ["PhonePe", "Paytm"],
  razorpay_enabled: false,

  contact: {
    phone: "+91 7852004401",
    whatsapp_number: "917852004401",
    email: "support@arkado.in",
    address: "Ward No 14, Sardarshahar, Churu, Rajasthan - 331403",
    support_hours: "10:00 AM - 9:00 PM (All 7 Days)",
  },

  social: {
    whatsapp_url: "https://wa.me/917852004401",
    instagram_url: "https://instagram.com/",
    facebook_url: "https://facebook.com/",
    gmail_url: "mailto:support@arkado.in",
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
  },
} as const;

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
