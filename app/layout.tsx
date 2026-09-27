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
  title: "Arkado — Deep-Level Exam Analysis & Pattern-Based Notes",
  description:
    "All-India exam preparation: pattern-decoded notes, topic-weightage analysis, 3000+ MCQs and full mock tests. Instant digital delivery via PhonePe & Paytm.",
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