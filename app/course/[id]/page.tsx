import type { Metadata } from "next";
import CourseDetailClient from "./CourseDetailClient";
import {
  getSiteUrl,
  fetchCoursesServer,
  fetchExamsServer,
  findCourseById,
  findExamById,
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
    if (!course) {
      // Exam hub page (e.g. /course/ssc-cgl): build keyword-rich metadata
      // from the exam record instead of falling back to the generic site title.
      const exams = await fetchExamsServer();
      const exam = findExamById(exams, id);
      if (!exam) return {};

      const examTitle = `${exam.name} — Study Material, Notes & MCQs | Arkado`;
      const examDescription = toMetaDescription(
        `${exam.name}${exam.board ? ` (${exam.board})` : ""} exam preparation: subject-wise 1000+ MCQ books, selection kits and mock tests. Pay via UPI, instant delivery on WhatsApp & Gmail.`
      );
      const examUrl = `${siteUrl}/course/${exam.slug || exam.id}`;
      const examImage = absoluteImageUrl(exam.logo_url);

      return {
        title: examTitle,
        description: examDescription,
        alternates: { canonical: examUrl },
        openGraph: {
          type: "website",
          siteName: "Arkado",
          title: examTitle,
          description: examDescription,
          url: examUrl,
          ...(examImage ? { images: [{ url: examImage, alt: exam.name }] } : {}),
        },
        twitter: {
          card: "summary_large_image",
          title: examTitle,
          description: examDescription,
          ...(examImage ? { images: [examImage] } : {}),
        },
      };
    }

    const title = course.meta_title?.trim() || course.title;
    const description = toMetaDescription(
      course.meta_description?.trim() ||
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
        description: toMetaDescription(
          course.meta_description?.trim() || course.short_description || course.title,
          300
        ),
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
    } else {
      // Exam hub page: breadcrumb schema helps Google understand site structure.
      const exams = await fetchExamsServer();
      const exam = findExamById(exams, id);
      if (exam) {
        const examUrl = `${siteUrl}/course/${exam.slug || exam.id}`;
        const examCrumbs = [
          { name: "Home", url: siteUrl },
          { name: "All Exams", url: `${siteUrl}/exams` },
          { name: exam.name, url: examUrl },
        ];
        if (exam.category_id) {
          const examWithCat = exam as typeof exam & { category_name?: string };
          examCrumbs.splice(1, 0, {
            name: examWithCat.category_name || "Category",
            url: `${siteUrl}/category/${exam.category_id}`,
          });
        }
        breadcrumbLd = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: examCrumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: c.url,
          })),
        };
      }
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
