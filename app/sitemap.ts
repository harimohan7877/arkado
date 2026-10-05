import type { MetadataRoute } from "next";
import { getSiteUrl, fetchCoursesServer, fetchCategoriesServer } from "@/lib/seo";
import { fetchActiveBlogPostsServer } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/exams",
    "/search",
    "/about",
    "/contact",
    "/blog",
    "/terms",
    "/privacy",
    "/refund",
  ].map((path) => ({
    url: `${siteUrl}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  const [courses, categories, blogPosts] = await Promise.all([
    fetchCoursesServer(),
    fetchCategoriesServer(),
    fetchActiveBlogPostsServer(),
  ]);

  const courseRoutes: MetadataRoute.Sitemap = courses
    .filter((c) => c.is_active !== false)
    .map((c) => ({
      url: `${siteUrl}/course/${c.slug || c.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteUrl}/category/${c.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
    url: `${siteUrl}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...courseRoutes, ...categoryRoutes, ...blogRoutes];
}
