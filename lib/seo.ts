import { cache } from "react";
import type { CourseBundle } from "@/lib/courses";
import type { Category, Exam } from "@/lib/store-types";
import { supabaseAdmin } from "@/lib/supabase";

/** Canonical public origin of the storefront. Server-safe. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "https://www.arkado.store";
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

/**
 * Fast single-course lookup for crawlers and page renders.
 * Queries ONE Supabase row by exact id (no 2.5MB catalog download).
 * Falls back to the full catalog scan for slug / exam_id aliases.
 * Cached per-request so generateMetadata + page share one lookup.
 */
export const fetchSingleCourseServer = cache(
  async (id: string): Promise<CourseBundle | undefined> => {
    try {
      const { data: p, error } = await supabaseAdmin
        .from("marketplace_products")
        .select(
          "id,title,description,sale_price,price,is_active,cover_image,drive_url,language,exam_name,group_name,type,pages"
        )
        .eq("id", id)
        .maybeSingle();
      if (!error && p) {
        let meta: Record<string, unknown> = {};
        try {
          if (typeof p.description === "string" && /^[{\[]/.test(p.description.trim())) {
            meta = JSON.parse(p.description) as Record<string, unknown>;
          }
        } catch {}
        const m = meta as Record<string, string | number | boolean | undefined>;
        return {
          ...meta,
          id: p.id || m.id,
          title: p.title || m.title || "",
          price: p.sale_price ?? m.price ?? 99,
          original_price: p.price ?? m.original_price ?? 999,
          is_active: p.is_active ?? m.is_active ?? true,
          cover_image: p.cover_image || m.cover_image || "",
          drive_url: p.drive_url || m.drive_url || "",
          language: p.language || m.language || "हिन्दी (Hindi)",
          exam_board: p.exam_name || m.exam_board || "",
          category: p.group_name || m.category || "",
          badge: p.type || m.badge || "",
          pages_count: p.pages ? `${p.pages}+ Pages` : m.pages_count || "",
        } as unknown as CourseBundle;
      }
    } catch {}
    // Fallback: slug / exam_id aliases need the full catalog scan.
    const courses = await fetchCoursesServer();
    return findCourseById(courses, id);
  }
);

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

/** Server-side fetch of all active exams (across categories). Never throws. */
export async function fetchExamsServer(): Promise<Exam[]> {
  try {
    const res = await fetch(`${getSiteUrl()}/api/exams`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.exams;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Match an exam by slug or id (mirrors client-side lookup). */
export function findExamById(exams: Exam[], id: string): Exam | undefined {
  const clean = id.toLowerCase().trim();
  return (
    exams.find((e) => e.slug === id || e.id === id) ||
    exams.find((e) => e.slug?.toLowerCase() === clean || e.id.toLowerCase() === clean)
  );
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
