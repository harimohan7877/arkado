import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import CourseDetailClient from "./CourseDetailClient";
import type { CourseBundle } from "@/lib/courses";
import {
  getSiteUrl,
  fetchSingleCourseServer,
  fetchCoursesServer,
  fetchExamsServer,
  fetchSalePctServer,
  applySaleServer,
  findExamById,
  examSlug,
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

// ISR: course pages revalidate daily (86400s); generateStaticParams pre-renders every
// active course slug at build time. New courses added later render on demand
// (dynamicParams) and are then cached — no manual step, no Search Console
// submit per item.
export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const courses = await fetchCoursesServer();
    return courses
      .filter((c) => c.is_active !== false && c.slug)
      .map((c) => ({ id: c.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  try {
    const id = await resolveId(params);
    const course = await fetchSingleCourseServer(id);
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
  let priceCourse: CourseBundle | null = null;
  let displayPrice = 0;

  try {
    const id = await resolveId(params);
    const course = await fetchSingleCourseServer(id);
    if (course) {
      // Sale-adjusted price: the same price the buy box shows after hydration.
      // The strip below and the JSON-LD offer both use it, so the visible
      // price and the structured data never disagree.
      const salePct = await fetchSalePctServer();
      displayPrice = applySaleServer(course.price, salePct);
      priceCourse = course;
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
          price: displayPrice,
          availability: "https://schema.org/InStock",
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
            shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
            deliveryTime: {
              "@type": "ShippingDeliveryTime",
              handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
              transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
            },
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "IN",
            returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
            merchantReturnLink: `${siteUrl}/refund`,
          },
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
      // Exam id/slug under /course/: the real exam page now lives at
      // /exams/<slug> — permanently redirect there instead of rendering
      // the old hollow hub (no course list, no links for crawlers).
      const exams = await fetchExamsServer();
      const exam = findExamById(exams, id);
      if (exam) {
        permanentRedirect(`${siteUrl}/exams/${examSlug(exam)}`);
      }
    }
  } catch (err) {
    // permanentRedirect throws NEXT_REDIRECT — it must propagate, not be
    // swallowed here.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string" && ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT"))) {
      throw err;
    }
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
      {priceCourse && (
        <div className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
            <p className="truncate text-sm font-semibold text-stone-900">{priceCourse.title}</p>
            <p className="whitespace-nowrap text-sm">
              <span className="font-black text-stone-900">₹{displayPrice.toLocaleString("en-IN")}</span>
              {priceCourse.original_price > displayPrice && (
                <span className="ml-2 text-stone-400 line-through">
                  ₹{priceCourse.original_price.toLocaleString("en-IN")}
                </span>
              )}
            </p>
          </div>
        </div>
      )}
      <CourseDetailClient params={params} />
    </>
  );
}
