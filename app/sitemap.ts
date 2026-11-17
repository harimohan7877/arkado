import type { MetadataRoute } from "next";
import { getSiteUrl, fetchCoursesServer, fetchCategoriesServer, fetchExamsServer, examSlug } from "@/lib/seo";
import { fetchActiveBlogPostsServer } from "@/lib/blog";

/**
 * Real lastmod when the record carries an update timestamp, otherwise
 * omitted — a made-up "now" on every generation teaches Google to ignore
 * lastmod entirely.
 */
function toLastMod(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  // Static routes have no reliable update timestamp in code — lastmod omitted.
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/exams",
    "/search",
    "/about",
    "/contact",
    "/blog",
    "/track-order",
    "/faq",
    "/terms",
    "/privacy",
    "/refund",
  ].map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const [courses, categories, blogPosts, exams] = await Promise.all([
    fetchCoursesServer(),
    fetchCategoriesServer(),
    fetchActiveBlogPostsServer(),
    fetchExamsServer(),
  ]);

  // Canonical slug URLs only — courses without a slug are left out rather
  // than listed under a numeric id URL.
  const courseRoutes: MetadataRoute.Sitemap = courses
    .filter((c) => c.is_active !== false && c.slug)
    .map((c) => ({
      url: `${siteUrl}/course/${c.slug}`,
      lastModified: toLastMod((c as { updated_at?: unknown }).updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/category/${c.id}`,
    lastModified: toLastMod((c as { updated_at?: unknown }).updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Exam pages live at /exams/<slug> (see app/exams/[slug]/page.tsx).
  // The old numeric /course/<exam-id> hub URLs are NOT listed — those URLs
  // 308-redirect to the exam page, so listing them would be listing
  // non-canonical duplicates.
  const examRoutes: MetadataRoute.Sitemap = exams
    .filter((e) => e.is_active !== false)
    .map((e) => ({
      url: `${siteUrl}/exams/${examSlug(e)}`,
      lastModified: toLastMod((e as { updated_at?: unknown }).updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }));

  // Dedupe: an exam URL could theoretically collide with a course URL.
  const seen = new Set<string>();
  const all = [...staticRoutes, ...courseRoutes, ...examRoutes, ...categoryRoutes, ...blogRoutes];
  const deduped = all.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return deduped;
}
