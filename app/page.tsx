import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";
import { getHomeData } from "@/lib/home-data";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";
import { getSiteUrl, toMetaDescription } from "@/lib/seo";

/**
 * Homepage — async Server Component.
 *
 * All public datasets (courses, featured, new arrivals, slider, categories,
 * settings) are fetched ONCE on the server in a single parallel batch and
 * rendered into the HTML. A fresh phone visit no longer waits for the JS
 * bundle + 6 client-side API round trips before seeing content.
 *
 * ISR: the rendered page is cached at the edge for 60s. Admin-panel edits
 * (new course, featured picks, settings) go live within a minute without
 * any manual rebuild.
 */
export const revalidate = 60;

/** Keyword-rich homepage metadata — the fallback layout title was too generic. */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const title = "Arkado — SSC, UPSC, Railway & State Exam Notes, MCQs and Mock Tests";
  const description = toMetaDescription(
    "All-India competitive exam study material: pattern-decoded notes, 1000+ MCQ books and mock tests for SSC, UPSC, Railway, Police, Teaching & State exams. Pay via UPI, instant delivery."
  );
  return {
    title,
    description,
    alternates: { canonical: siteUrl },
    openGraph: {
      type: "website",
      siteName: "Arkado",
      title,
      description,
      url: siteUrl,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HomePage() {
  let data;
  try {
    data = await getHomeData();
  } catch (err) {
    console.error("[homepage] getHomeData failed:", err);
    data = {
      courses: [],
      featured: [],
      newArrivals: [],
      sliderCourses: [],
      categories: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  return (
    <HomeClient
      courses={data.courses}
      featured={data.featured}
      newArrivals={data.newArrivals}
      sliderCourses={data.sliderCourses}
      categories={data.categories}
      settings={data.settings}
    />
  );
}
