import type { Metadata } from "next";
import CourseDetailClient from "./CourseDetailClient";
import {
  getSiteUrl,
  fetchCoursesServer,
  findCourseById,
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
    const courses = await fetchCoursesServer();
    const course = findCourseById(courses, id);
    if (!course) return {};

    const title = course.title;
    const description = toMetaDescription(
      course.short_description ||
        `${course.title} — pattern-decoded notes, topic-weightage analysis and MCQs for All-India exam preparation.`
    );
    const url = `${siteUrl}/course/${course.slug || course.id}`;
    const image = absoluteImageUrl(course.cover_image);

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
        ...(image ? { images: [{ url: image, alt: title }] } : {}),
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

export default async function CoursePage({ params }: PageProps) {
  const siteUrl = getSiteUrl();
  let jsonLd: Record<string, unknown> | null = null;
  let breadcrumbLd: Record<string, unknown> | null = null;

  try {
    const id = await resolveId(params);
    const courses = await fetchCoursesServer();
    const course = findCourseById(courses, id);
    if (course) {
      const image = absoluteImageUrl(course.cover_image);
      jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: course.title,
        description: toMetaDescription(course.short_description || course.title, 300),
        ...(image ? { image } : {}),
        brand: { "@type": "Brand", name: "Arkado" },
        offers: {
          "@type": "Offer",
          url: `${siteUrl}/course/${course.slug || course.id}`,
          priceCurrency: "INR",
          price: course.price,
          availability: "https://schema.org/InStock",
        },
      };
      const crumbs: { name: string; url: string }[] = [{ name: "Home", url: siteUrl }];
      if (course.category) {
        crumbs.push({
          name: course.category_label || course.category,
          url: `${siteUrl}/category/${course.category}`,
        });
      }
      crumbs.push({ name: course.title, url: `${siteUrl}/course/${course.slug || course.id}` });
      breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.url,
        })),
      };
    }
  } catch {
    jsonLd = null;
    breadcrumbLd = null;
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      <CourseDetailClient params={params} />
    </>
  );
}
