/**
 * Shardiya Navratri 2026 — campaign data + date logic.
 *
 * Verified dates (panchang / news sources, Oct 2026):
 *   Day 1 ......... Sun 11 Oct 2026 — Maa Shailputri
 *   Day 2 ......... Mon 12 Oct 2026 — Maa Brahmacharini
 *   Day 3 ......... Tue 13 Oct 2026 — Maa Chandraghanta
 *   Day 4 ......... Wed 14 Oct 2026 — Maa Kushmanda
 *   Day 5 ......... Thu 15 Oct 2026 — Maa Skandamata
 *   Day 6 ......... Fri 16 Oct 2026 — Maa Katyayani
 *   Day 7 ......... Sat 17 Oct 2026 — Maa Kalaratri
 *   Day 8 ......... Sun 18 Oct 2026 — Maa Mahagauri
 *   Day 9 ......... Mon 19 Oct 2026 — Maa Siddhidatri
 *   Dussehra ...... Tue 20 Oct 2026
 */

export interface NavratriDay {
  day: number;
  /** ISO date (IST calendar day) */
  dateISO: string;
  /** "13 अक्टूबर" */
  dateLabel: string;
  /** "मंगलवार" */
  weekday: string;
  deviHindi: string;
  deviEnglish: string;
  /** Short name for the day navigator */
  deviShort: string;
  colorHindi: string;
  colorHex: string;
  mantra: string;
  blessing: string;
  vahana: string;
  prasad: string;
  image: string;
}

export const NAVRATRI_YEAR = 2026;
/** Navratri begins at the start of Day 1 (IST) */
export const NAVRATRI_START_ISO = "2026-10-11T00:00:00+05:30";
export const NAVRATRI_START_MS = new Date(NAVRATRI_START_ISO).getTime();
/** Navratri ends at the end of Day 9 (IST) */
export const NAVRATRI_END_ISO = "2026-10-19T23:59:59+05:30";
export const NAVRATRI_END_MS = new Date(NAVRATRI_END_ISO).getTime();
/** Display coupon for the Navratri Mahotsav offer (display-only until checkout validates codes) */
export const NAVRATRI_COUPON = "NAVRATRI2026";

export const NAVRATRI_DAYS: NavratriDay[] = [
  {
    day: 1,
    dateISO: "2026-10-11",
    dateLabel: "11 अक्टूबर",
    weekday: "रविवार",
    deviHindi: "माँ शैलपुत्री",
    deviEnglish: "Maa Shailputri",
    deviShort: "शैलपुत्री",
    colorHindi: "नारंगी",
    colorHex: "#EA580C",
    mantra: "ॐ देवी शैलपुत्र्यै नमः",
    blessing: "जीवन में स्थिरता और अडिग शक्ति का आशीर्वाद",
    vahana: "नंदी बैल",
    prasad: "शुद्ध देसी घी",
    image: "/images/navratri/devi-shailputri.jpg",
  },
  {
    day: 2,
    dateISO: "2026-10-12",
    dateLabel: "12 अक्टूबर",
    weekday: "सोमवार",
    deviHindi: "माँ ब्रह्मचारिणी",
    deviEnglish: "Maa Brahmacharini",
    deviShort: "ब्रह्मचारिणी",
    colorHindi: "सफ़ेद",
    colorHex: "#F1F5F9",
    mantra: "ॐ देवी ब्रह्मचारिण्यै नमः",
    blessing: "तप, धैर्य और ज्ञान की प्राप्ति का आशीर्वाद",
    vahana: "पदयात्रा (नंगे पाँव)",
    prasad: "चीनी व पंचामृत",
    image: "/images/navratri/devi-brahmacharini.jpg",
  },
  {
    day: 3,
    dateISO: "2026-10-13",
    dateLabel: "13 अक्टूबर",
    weekday: "मंगलवार",
    deviHindi: "माँ चंद्रघंटा",
    deviEnglish: "Maa Chandraghanta",
    deviShort: "चंद्रघंटा",
    colorHindi: "लाल",
    colorHex: "#DC2626",
    mantra: "ॐ देवी चंद्रघंटायै नमः",
    blessing: "साहस का वरदान — नकारात्मकता से रक्षा",
    vahana: "बाघ",
    prasad: "दूध / खीर",
    image: "/images/navratri/devi-chandraghanta.jpg",
  },
  {
    day: 4,
    dateISO: "2026-10-14",
    dateLabel: "14 अक्टूबर",
    weekday: "बुधवार",
    deviHindi: "माँ कूष्मांडा",
    deviEnglish: "Maa Kushmanda",
    deviShort: "कूष्मांडा",
    colorHindi: "गहरा नीला",
    colorHex: "#1D4ED8",
    mantra: "ॐ देवी कूष्मांडायै नमः",
    blessing: "सृजन शक्ति और उत्तम स्वास्थ्य का आशीर्वाद",
    vahana: "शेर",
    prasad: "मालपुआ",
    image: "/images/navratri/devi-kushmanda.jpg",
  },
  {
    day: 5,
    dateISO: "2026-10-15",
    dateLabel: "15 अक्टूबर",
    weekday: "गुरुवार",
    deviHindi: "माँ स्कंदमाता",
    deviEnglish: "Maa Skandamata",
    deviShort: "स्कंदमाता",
    colorHindi: "पीला",
    colorHex: "#EAB308",
    mantra: "ॐ देवी स्कंदमातायै नमः",
    blessing: "मातृत्व का स्नेह और संतान सुख का आशीर्वाद",
    vahana: "शेर",
    prasad: "केला",
    image: "/images/navratri/devi-skandamata.jpg",
  },
  {
    day: 6,
    dateISO: "2026-10-16",
    dateLabel: "16 अक्टूबर",
    weekday: "शुक्रवार",
    deviHindi: "माँ कात्यायनी",
    deviEnglish: "Maa Katyayani",
    deviShort: "कात्यायनी",
    colorHindi: "हरा",
    colorHex: "#16A34A",
    mantra: "ॐ देवी कात्यायन्यै नमः",
    blessing: "वीरता का वरदान — हर बाधा का नाश",
    vahana: "शेर",
    prasad: "शहद",
    image: "/images/navratri/devi-katyayani.jpg",
  },
  {
    day: 7,
    dateISO: "2026-10-17",
    dateLabel: "17 अक्टूबर",
    weekday: "शनिवार",
    deviHindi: "माँ कालरात्रि",
    deviEnglish: "Maa Kalaratri",
    deviShort: "कालरात्रि",
    colorHindi: "स्लेटी",
    colorHex: "#6B7280",
    mantra: "ॐ देवी कालरात्र्यै नमः",
    blessing: "भय का नाश और अभय सुरक्षा का आशीर्वाद",
    vahana: "गधा",
    prasad: "गुड़",
    image: "/images/navratri/devi-kalaratri.jpg",
  },
  {
    day: 8,
    dateISO: "2026-10-18",
    dateLabel: "18 अक्टूबर",
    weekday: "रविवार",
    deviHindi: "माँ महागौरी",
    deviEnglish: "Maa Mahagauri",
    deviShort: "महागौरी",
    colorHindi: "बैंगनी",
    colorHex: "#9333EA",
    mantra: "ॐ देवी महागौर्यै नमः",
    blessing: "शांति, पवित्रता और सौभाग्य का आशीर्वाद",
    vahana: "बैल",
    prasad: "नारियल",
    image: "/images/navratri/devi-mahagauri.jpg",
  },
  {
    day: 9,
    dateISO: "2026-10-19",
    dateLabel: "19 अक्टूबर",
    weekday: "सोमवार",
    deviHindi: "माँ सिद्धिदात्री",
    deviEnglish: "Maa Siddhidatri",
    deviShort: "सिद्धिदात्री",
    colorHindi: "मोरपंखी हरा",
    colorHex: "#0D9488",
    mantra: "ॐ देवी सिद्धिदात्र्यै नमः",
    blessing: "सभी सिद्धियों की प्राप्ति का परम आशीर्वाद",
    vahana: "कमल",
    prasad: "हलवा, पूरी व चना",
    image: "/images/navratri/devi-siddhidatri.jpg",
  },
];

export type NavratriPhase = "before" | "live" | "ended";

export interface NavratriStatus {
  phase: NavratriPhase;
  /** 1–9 while live, 0 before, 10 after */
  day: number;
}

/** Current date in IST (Asia/Kolkata) as { y, m, d }. */
function istToday(): { y: number; m: number; d: number } {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  return { y: ist.getFullYear(), m: ist.getMonth() + 1, d: ist.getDate() };
}

export function getNavratriStatus(at: Date = new Date()): NavratriStatus {
  const ist = new Date(at.getTime() + (at.getTimezoneOffset() + 330) * 60000);
  const y = ist.getFullYear();
  const m = ist.getMonth() + 1;
  const d = ist.getDate();
  if (y < 2026 || (y === 2026 && (m < 10 || (m === 10 && d < 11)))) {
    return { phase: "before", day: 0 };
  }
  if (y === 2026 && m === 10 && d >= 11 && d <= 19) {
    return { phase: "live", day: d - 10 };
  }
  return { phase: "ended", day: 10 };
}

export function getNavratriDayInfo(day: number): NavratriDay {
  return NAVRATRI_DAYS[Math.min(9, Math.max(1, day)) - 1];
}

export { istToday };
