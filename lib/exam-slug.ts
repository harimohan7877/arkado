import type { Exam } from "@/lib/store-types";

/**
 * Canonical URL slug for an exam.
 *
 * Exams have no slug column populated in the DB (222 of 223 have slug=null),
 * so the slug is derived deterministically — the same input always yields the
 * same slug, which keeps sitemap, /exams listing and exam pages in agreement
 * with no manual step and no DB change:
 *   1. the exam's own `slug` when set (a DB slug always wins — Muse 2 can pin
 *      one later and it takes over automatically),
 *   2. otherwise a slugified `meta_title` (present on all 223 exams, English),
 *   3. otherwise a slugified `name`,
 *   4. otherwise `exam-<id>`.
 *
 * Pure module — no server imports — so client components (ExamsClient) can
 * use it too. Verified 2026-11-17: slugify(meta_title) gives 223 unique
 * slugs across all 223 live exams, zero collisions.
 */
export function slugifyExamText(text: string | undefined | null): string {
  const clean = (text || "")
    .toLowerCase()
    .replace(/\|.*$/, "") // drop " | Arkado" style suffixes from meta titles
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents
  return clean.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function examSlug(exam: Pick<Exam, "id" | "slug"> & { meta_title?: string; name?: string }): string {
  if (exam.slug && exam.slug.trim()) return exam.slug.trim();
  const fromTitle = slugifyExamText(exam.meta_title);
  if (fromTitle) return fromTitle;
  const fromName = slugifyExamText(exam.name);
  if (fromName) return fromName;
  return `exam-${exam.id}`;
}

/** Match an exam by its canonical slug, its DB slug, or its numeric id. */
export function findExamBySlug<
  T extends Pick<Exam, "id" | "slug"> & { meta_title?: string; name?: string },
>(exams: T[], param: string): T | undefined {
  const clean = param.toLowerCase().trim();
  return (
    exams.find((e) => examSlug(e) === param || e.slug === param || e.id === param) ||
    exams.find((e) => examSlug(e).toLowerCase() === clean || e.id.toLowerCase() === clean)
  );
}
