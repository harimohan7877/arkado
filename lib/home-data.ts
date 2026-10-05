/**
 * home-data.ts — Server-side data loader for the public homepage.
 *
 * Single source of truth for the homepage's public datasets. Used by:
 *  - app/page.tsx (async Server Component) — renders HTML with data already in it,
 *    so first paint on a phone doesn't wait for 6 client-side API round trips.
 *  - app/api/courses/route.ts — the public API branches (featured / new_arrivals /
 *    slider) delegate to the same functions, so API and SSR can never drift apart.
 *
 * Everything here runs on the server only. Never import from client components.
 */

import { getStoreData } from "@/lib/store-data";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

interface FeaturedStore {
  featured_exams?: any[];
  new_arrivals?: any[];
}

/** Strip admin-only fields before anything reaches the browser. */
export function sanitizePublicCourse(course: any): any {
  if (!course || typeof course !== "object") return course;
  const { drive_url, ...safeCourse } = course;
  return safeCourse;
}

export function sanitizePublicCourses(courses: any[], isAdmin: boolean): any[] {
  if (isAdmin) return courses;
  return courses.map(sanitizePublicCourse);
}

async function loadAllCourses(): Promise<any[]> {
  return getStoreData<any[]>("courses", "data/courses.json", []);
}

async function loadFeaturedConfig(): Promise<FeaturedStore> {
  return getStoreData<FeaturedStore>("featured_exams", "data/featured_exams.json", {
    featured_exams: [],
    new_arrivals: [],
  });
}

function matchFeaturedItem(allCourses: any[], featItem: any): any | undefined {
  return (
    allCourses.find((c) => c.id === featItem.id || c.slug === featItem.id) ||
    allCourses.find((c) => c.exam_id === featItem.id) ||
    allCourses.find(
      (c) => featItem.name && c.title?.toLowerCase().includes(featItem.name.toLowerCase().split(" ")[0])
    )
  );
}

/** Homepage "Featured Bundles" list — curated admin picks + is_featured fallback. */
export function buildFeaturedCourses(
  allCourses: any[],
  featuredConfig: FeaturedStore,
  includeInactive = false,
  isAdmin = false
): any[] {
  const configList = Array.isArray(featuredConfig.featured_exams) ? featuredConfig.featured_exams : [];
  const result: any[] = [];
  const usedIds = new Set<string>();

  for (const featItem of configList) {
    const matched = matchFeaturedItem(allCourses, featItem);
    if (matched && !usedIds.has(matched.id)) {
      result.push({
        ...matched,
        is_active: true,
        is_featured: true,
        featured_priority: featItem.priority || result.length + 1,
      });
      usedIds.add(matched.id);
    }
  }

  for (const c of allCourses) {
    if ((includeInactive || c.is_active) && c.is_featured && !usedIds.has(c.id)) {
      result.push(c);
      usedIds.add(c.id);
    }
  }

  if (result.length === 0) {
    return sanitizePublicCourses(
      allCourses.filter((c) => c.is_active).slice(0, 4),
      isAdmin
    );
  }

  result.sort((a, b) => (a.featured_priority || 99) - (b.featured_priority || 99));
  return sanitizePublicCourses(result, isAdmin);
}

/** Homepage "New Arrivals" list — curated admin picks + is_new_arrival fallback. */
export function buildNewArrivalCourses(
  allCourses: any[],
  featuredConfig: FeaturedStore,
  includeInactive = false,
  isAdmin = false
): any[] {
  const configList = Array.isArray(featuredConfig.new_arrivals) ? featuredConfig.new_arrivals : [];
  const result: any[] = [];
  const usedIds = new Set<string>();

  for (const arrItem of configList) {
    const matched = matchFeaturedItem(allCourses, arrItem);
    if (matched && !usedIds.has(matched.id)) {
      result.push({
        ...matched,
        is_active: true,
        is_new_arrival: true,
        new_arrival_priority: arrItem.priority || result.length + 1,
      });
      usedIds.add(matched.id);
    }
  }

  for (const c of allCourses) {
    if ((includeInactive || c.is_active) && c.is_new_arrival && !usedIds.has(c.id)) {
      result.push(c);
      usedIds.add(c.id);
    }
  }

  if (result.length === 0) {
    return sanitizePublicCourses(
      allCourses.filter((c) => c.is_active).slice(0, 4),
      isAdmin
    );
  }

  result.sort((a, b) => (a.new_arrival_priority || 99) - (b.new_arrival_priority || 99));
  return sanitizePublicCourses(result, isAdmin);
}

/** Homepage hero slider courses. */
export function buildSliderCourses(
  allCourses: any[],
  includeInactive = false,
  isAdmin = false
): any[] {
  let sliderList = allCourses.filter((c) => (includeInactive || c.is_active) && c.show_in_slider);
  if (sliderList.length === 0) {
    sliderList = allCourses.filter((c) => c.is_active).slice(0, 4);
  }
  return sanitizePublicCourses(sliderList, isAdmin);
}

/** All public courses, priority-sorted (the "All Bundles" grid). */
export function buildPublicCourses(
  allCourses: any[],
  includeInactive = false,
  isAdmin = false
): any[] {
  let finalCourses = allCourses;
  if (!includeInactive) {
    finalCourses = finalCourses.filter((c) => c.is_active);
  }
  const sorted = [...finalCourses].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  return sanitizePublicCourses(sorted, isAdmin);
}

/** Public category list — same lightweight formatting as /api/categories?scope=public. */
export async function getPublicCategories(): Promise<any[]> {
  const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
  const active = categories.filter((c) => c.is_active === true);
  active.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  return active.map((c) => {
    const activeExams = (c.boards || []).flatMap((b: any) =>
      (b.exams || []).filter((e: any) => e.is_active)
    );
    return {
      id: c.id,
      name: c.name,
      name_hi: c.name_hi || c.name,
      icon: c.icon || "📁",
      logo_url: c.logo_url || "",
      color: c.color || "bg-amber-600",
      priority: c.priority,
      is_active: c.is_active,
      exam_ids: c.exam_ids || activeExams.map((e: any) => e.id),
      exam_count: activeExams.length || (c.exam_ids || []).length,
      viral_names: c.viral_names || [],
      sub_preview: c.sub_preview || "",
      description: c.description || "",
      boards: [],
    };
  });
}

/** Public settings with defaults fallback. */
export async function getPublicSettings(): Promise<any> {
  try {
    const data = await getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS);
    return data || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface HomeData {
  courses: any[];
  featured: any[];
  newArrivals: any[];
  sliderCourses: any[];
  categories: any[];
  settings: any;
}

/**
 * Fetch every homepage dataset in parallel, in ONE server-side batch.
 * Replaces 6 client-side API round trips (4 of which re-read the same
 * courses table) on every fresh page load.
 */
export async function getHomeData(): Promise<HomeData> {
  const [allCourses, featuredConfig, categories, settings] = await Promise.all([
    loadAllCourses(),
    loadFeaturedConfig(),
    getPublicCategories(),
    getPublicSettings(),
  ]);

  const [courses, featured, newArrivals, sliderCourses] = await Promise.all([
    Promise.resolve(buildPublicCourses(allCourses)),
    Promise.resolve(buildFeaturedCourses(allCourses, featuredConfig)),
    Promise.resolve(buildNewArrivalCourses(allCourses, featuredConfig)),
    Promise.resolve(buildSliderCourses(allCourses)),
  ]);

  return { courses, featured, newArrivals, sliderCourses, categories, settings };
}
