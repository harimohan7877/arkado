import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import SocialFab from "@/components/SocialFab";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arkado.store"),
  title: {
    default: "Arkado — Deep-Level Exam Analysis & Pattern-Based Notes",
    template: "%s — Arkado",
  },
  description:
    "All-India exam preparation: pattern-decoded notes, topic-weightage analysis, 3000+ MCQs and full mock tests. Pay via UPI, submit the 12-digit UTR, get instant delivery on WhatsApp.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Arkado",
    title: "Arkado — Deep-Level Exam Analysis & Pattern-Based Notes",
    description:
      "Pattern-decoded notes, topic-weightage analysis, 3000+ MCQs and mock tests for All-India exams. UPI payment, instant WhatsApp delivery.",
    images: [{ url: "/icon.png", width: 512, height: 512, alt: "Arkado" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arkado — Deep-Level Exam Analysis & Pattern-Based Notes",
    description:
      "Pattern-decoded notes, topic-weightage analysis, 3000+ MCQs and mock tests for All-India exams.",
    images: ["/icon.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansDevanagari.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-stone-900 font-sans antialiased">
        {children}
        <SocialFab />
      </body>
    </html>
  );
}