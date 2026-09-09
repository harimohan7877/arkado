import { Course } from "@/lib/store-types";

const COURSES_API = "/api/courses";

let coursesCache: Course[] | null = null;

async function fetchCourses(params?: string): Promise<Course[]> {
  try {
    const url = `${COURSES_API}${params ? `?${params}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getAllCourses(): Promise<Course[]> {
  if (coursesCache) return coursesCache;
  coursesCache = await fetchCourses();
  return coursesCache;
}

export async function getSliderCourses(): Promise<Course[]> {
  return fetchCourses("slider=true");
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  const courses = await getAllCourses();
  return courses.find(c => c.id === id || c.exam_id === id || c.slug === id);
}

export async function getCourseBySlug(slug: string): Promise<Course | undefined> {
  const courses = await getAllCourses();
  const clean = slug.toLowerCase().trim();
  let found = courses.find(c => c.slug === slug || c.id === slug || c.exam_id === slug);
  if (!found) {
    found = courses.find(
      c =>
        c.slug.toLowerCase().includes(clean) ||
        clean.includes(c.slug.toLowerCase()) ||
        (c.exam_id && clean.includes(c.exam_id.toLowerCase()))
    );
  }
  return found;
}

export async function getCoursesByExam(examId: string): Promise<Course[]> {
  return fetchCourses(`exam=${examId}`);
}

export type CourseBundle = Course;