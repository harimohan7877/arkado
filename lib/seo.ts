import type { CourseBundle } from "@/lib/courses";
import type { Category } from "@/lib/store-types";

/** Canonical public origin of the storefront. Server-safe. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "https://arkado.store";
}

/** Server-side fetch of the public course catalog. Never throws. */
export async function fetchCoursesServer(): Promise<CourseBundle[]> {
  try {
    const res = await fetch(`${getSiteUrl()}/api/courses`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Server-side fetch of public categories. Never throws. */
export async function fetchCategoriesServer(): Promise<Category[]> {
  try {
    const res = await fetch(`${getSiteUrl()}/api/categories?scope=public`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Match a course by slug, id or exam_id (mirrors client-side lookup). */
export function findCourseById(
  courses: CourseBundle[],
  id: string
): CourseBundle | undefined {
  const clean = id.toLowerCase().trim();
  return (
    courses.find((c) => c.slug === id || c.id === id || c.exam_id === id) ||
    courses.find(
      (c) =>
        c.slug?.toLowerCase().includes(clean) ||
        (c.exam_id && clean.includes(c.exam_id.toLowerCase()))
    )
  );
}

/** Build an absolute URL for an image path that may be relative. */
export function absoluteImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Trim text to a meta-description friendly length. */
export function toMetaDescription(text: string, maxLen = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}
