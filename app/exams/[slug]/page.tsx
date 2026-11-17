import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { permanentRedirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  getSiteUrl,
  fetchExamsServer,
  fetchCoursesServer,
  fetchSalePctServer,
  applySaleServer,
  examSlug,
  findExamBySlug,
  absoluteImageUrl,
  toMetaDescription,
} from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

async function resolveSlug(params: PageProps["params"]): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.slug;
}

// ISR: exam pages revalidate hourly; generateStaticParams pre-renders every
// active exam at build time. A new exam added in admin/DB gets its page,
// sitemap entry and /exams link automatically — no manual step, no per-item
// Search Console submit.
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const exams = await fetchExamsServer();
    return exams
      .filter((e) => e.is_active !== false)
      .map((e) => ({ slug: examSlug(e) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  try {
    const slug = await resolveSlug(params);
    const exams = await fetchExamsServer();
    const exam = findExamBySlug(exams, slug);
    if (!exam) return {};

    // meta_title already ends with "| Arkado" — strip it so the layout's
    // "%s — Arkado" template doesn't double the suffix.
    const rawTitle = exam.meta_title?.trim() || `${exam.name} — Study Material, Notes & MCQs`;
    const title = rawTitle.replace(/\s*\|\s*Arkado\s*$/i, "");
    const description = toMetaDescription(
      exam.meta_description?.trim() ||
        `${exam.name}${exam.board ? ` (${exam.board})` : ""} exam preparation: subject-wise MCQ books, selection kits and mock tests. Pay via PhonePe, instant delivery.`
    );
    const url = `${siteUrl}/exams/${examSlug(exam)}`;
    const image = absoluteImageUrl(exam.logo_url);

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
        ...(image ? { images: [{ url: image, alt: exam.name }] } : {}),
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

export default async function ExamPage({ params }: PageProps) {
  const siteUrl = getSiteUrl();
  const slug = await resolveSlug(params);
  const exams = await fetchExamsServer();
  const exam = findExamBySlug(exams, slug);
  if (!exam) notFound();

  // Numeric id (or an old derived slug) in the URL → canonical slug URL.
  const canonicalSlug = examSlug(exam);
  if (slug !== canonicalSlug) {
    permanentRedirect(`${siteUrl}/exams/${canonicalSlug}`);
  }

  const allCourses = await fetchCoursesServer();
  const courses = allCourses
    .filter((c) => c.is_active !== false && c.exam_id === exam.id)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const salePct = await fetchSalePctServer();
  const minPrice = courses.length
    ? Math.min(...courses.map((c) => applySaleServer(c.price, salePct)))
    : 0;
  const examUrl = `${siteUrl}/exams/${canonicalSlug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "All Exams", item: `${siteUrl}/exams` },
      { "@type": "ListItem", position: 3, name: exam.name, item: examUrl },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${exam.name} — Study Material`,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.title,
      url: `${siteUrl}/course/${c.slug || c.id}`,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {courses.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      )}
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-800 text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-stone-800">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Link href="/" className="hover:underline text-stone-400">Home</Link>
              <span className="text-stone-500">/</span>
              <Link href="/exams" className="hover:underline text-stone-400">All Exams</Link>
              <span className="text-stone-500">/</span>
              <span className="text-amber-400 font-bold">{exam.name}</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              {exam.logo_url && (
                <div className="w-16 h-16 rounded-2xl bg-white p-2 shrink-0 flex items-center justify-center overflow-hidden">
                  <Image
                    src={exam.logo_url}
                    alt={exam.name}
                    width={56}
                    height={56}
                    unoptimized
                    className="object-contain max-h-full max-w-full"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                  {exam.name}
                </h1>
                <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                  {exam.board}
                  {exam.eligibility ? ` • ${exam.eligibility}` : ""}
                  {exam.exam_pattern ? ` • ${exam.exam_pattern}` : ""}
                </p>
                <p className="text-stone-400 text-xs sm:text-sm mt-2">
                  {courses.length > 0 ? (
                    <>
                      <span className="text-amber-400 font-bold">{courses.length}</span>{" "}
                      {courses.length === 1 ? "course" : "courses"}
                      {minPrice > 0 && (
                        <>
                          {" "}• starting at{" "}
                          <span className="text-amber-400 font-bold">₹{minPrice.toLocaleString("en-IN")}</span>
                        </>
                      )}
                      {exam.applicant_scale ? ` • ${exam.applicant_scale} applicants` : ""}
                    </>
                  ) : (
                    "Study material for this exam is being prepared."
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COURSES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
              <h2 className="text-base font-bold text-stone-800">Courses coming soon</h2>
              <p className="text-sm text-stone-500">
                Notes, MCQ books and mock tests for {exam.name} are being prepared.
                Check back soon, or browse{" "}
                <Link href="/exams" className="text-amber-700 font-bold hover:underline">
                  all exams
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => {
                const price = applySaleServer(course.price, salePct);
                const cover = course.cover_image || exam.logo_url;
                return (
                  <Link
                    key={course.id}
                    href={`/course/${course.slug || course.id}`}
                    className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    {cover ? (
                      <div className="relative w-full h-44 bg-stone-100 overflow-hidden">
                        <Image
                          src={cover}
                          alt={course.title}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-44 bg-stone-100 flex items-center justify-center">
                        <span className="text-3xl font-black text-stone-300">Arkado</span>
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1 gap-2">
                      {course.badge && (
                        <span className="self-start text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                          {course.badge}
                        </span>
                      )}
                      <h2 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">
                        {course.title}
                      </h2>
                      {course.short_description && (
                        <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                          {course.short_description}
                        </p>
                      )}
                      <div className="mt-auto pt-2 flex items-baseline gap-2">
                        <span className="text-lg font-black text-stone-900">
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        {course.original_price > price && (
                          <span className="text-sm text-stone-400 line-through">
                            ₹{course.original_price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
