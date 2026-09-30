import type { Metadata } from "next";
import CategoryDetailClient from "./CategoryDetailClient";
import {
  getSiteUrl,
  fetchCategoriesServer,
  absoluteImageUrl,
  toMetaDescription,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

async function resolveId(params: PageProps["params"]): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.id;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  try {
    const id = await resolveId(params);
    const categories = await fetchCategoriesServer();
    const category = categories.find((c) => c.id === id);
    if (!category) return {};

    const title = `${category.name} Notes & Study Material`;
    const description = toMetaDescription(
      `${category.name} exam preparation: pattern-decoded notes, topic-weightage analysis, MCQs and mock tests. Pay via UPI, instant delivery on WhatsApp.`
    );
    const url = `${siteUrl}/category/${category.id}`;
    const image = absoluteImageUrl(category.logo_url);

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
        ...(image ? { images: [{ url: image, alt: category.name }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return {};
  }
}

export default async function CategoryPage({ params }: PageProps) {
  return <CategoryDetailClient params={params} />;
}
