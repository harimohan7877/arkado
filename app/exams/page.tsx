import type { Metadata } from "next";
import ExamsClient from "./ExamsClient";
import { getSiteUrl, fetchCategoriesServer, toMetaDescription } from "@/lib/seo";

/**
 * Server wrapper around the (client) exams directory.
 * Gives /exams proper SEO metadata — previously this page had none
 * because the whole page was a client component.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/exams`;
  try {
    const categories = await fetchCategoriesServer();
    const examCount = categories.reduce(
      (sum, c) => sum + (c.exam_count || c.exam_ids?.length || 0),
      0
    );
    const title = `All Government Exams 2026 — SSC, UPSC, Railway, State Exams | Arkado`;
    const description = toMetaDescription(
      `Browse ${examCount || "200+"} government exams (SSC, UPSC, Railway, Police, Teaching & State exams) with pattern-decoded study material, 1000+ MCQ books and mock tests.`
    );
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        type: "website",
        siteName: "Arkado",
        title,
        description,
        url,
      },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return {};
  }
}

export default function ExamsPage() {
  return <ExamsClient />;
}
