import type { Metadata } from "next";
import "./globals.css";
import SocialFab from "@/components/SocialFab";

export const metadata: Metadata = {
  title: "Arkado — Deep-Level Exam Analysis & Pattern-Based Notes",
  description:
    "All-India exam preparation: pattern-decoded notes, topic-weightage analysis, 3000+ MCQs and full mock tests. Instant digital delivery via PhonePe & Paytm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-stone-900 font-sans antialiased">
        {children}
        <SocialFab />
      </body>
    </html>
  );
}