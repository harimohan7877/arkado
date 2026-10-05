import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getStoreData } from "@/lib/store-data";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import { getSiteUrl, toMetaDescription } from "@/lib/seo";

export const dynamic = "force-dynamic";

const FALLBACK_FAQS = [
  {
    question: "How do I get my notes after payment?",
    answer: "After UPI payment, enter the 12-digit UTR. We'll send instant access to your WhatsApp or Gmail within 5-15 minutes.",
  },
  {
    question: "Can I print the PDFs?",
    answer: "Yes. All notes are print-ready A4 format. Print at any cyber cafe or e-mitra.",
  },
  {
    question: "What is the difference vs. handwritten notes?",
    answer: "These are deep-level analysis notes: pattern-decoded, weightage-tagged, toppers' approach. Not a copy of textbooks.",
  },
  {
    question: "Need help?",
    answer: `Contact us on WhatsApp — our team responds quickly.`,
  },
];

async function getFaqs(): Promise<{ question: string; answer: string }[]> {
  try {
    const settings = await getStoreData<any>("settings", "data/settings.json", DEFAULT_SETTINGS);
    const faqs = settings?.homepage?.faqs;
    if (Array.isArray(faqs) && faqs.length > 0) return faqs;
    const wa = settings?.contact?.whatsapp_number || DEFAULT_SETTINGS.whatsapp_support_number;
    return FALLBACK_FAQS.map((f) =>
      f.question === "Need help?" ? { ...f, answer: `WhatsApp ${wa} — our team responds quickly.` } : f
    );
  } catch {
    /* fall through to defaults */
  }
  return FALLBACK_FAQS;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const title = "FAQ — Frequently Asked Questions | Arkado";
  const description = toMetaDescription(
    "Answers about ordering, UPI payment, 12-digit UTR, delivery on WhatsApp/Gmail, printing PDFs and support."
  );
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/faq` },
    openGraph: { title, description, url: `${siteUrl}/faq`, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function FaqPage() {
  const siteUrl = getSiteUrl();
  const faqs = await getFaqs();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar cartCount={0} onCartClick={() => {}} />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Frequently Asked Questions</h1>
            <p className="text-sm text-slate-500 mt-2">
              Everything about ordering, payment and delivery.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group card-base overflow-hidden"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="p-4 sm:p-5 cursor-pointer list-none flex items-center justify-between gap-3 font-bold text-sm sm:text-base text-slate-900 hover:text-amber-800 transition">
                  <span>{f.question}</span>
                  <span className="text-amber-700 text-lg leading-none shrink-0 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
