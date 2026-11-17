// Refresh data/courses.json from the live catalog API.
//
// Why: getStoreData("courses") falls back to data/courses.json when Supabase
// is unreachable (primary read + admin_settings backup both fail). During the
// 7–16 Nov 2026 outage the file held only 17 stale courses, so Google saw a
// thin 17-item catalog. This snapshot keeps the full catalog (~1,070 courses)
// in the repo so the storefront + sitemap stay complete during an outage.
//
// Safety: refuses to overwrite when the live API returns a thin/empty list,
// so a refresh DURING an outage can never clobber the good snapshot.
//
// Usage: node scripts/refresh-catalog-snapshot.mjs
//   (SITE_URL env overrides the default https://www.arkado.store)
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = (process.env.SITE_URL || "https://www.arkado.store").replace(/\/+$/, "");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "courses.json");

const res = await fetch(`${SITE}/api/courses`);
if (!res.ok) throw new Error(`catalog fetch failed: HTTP ${res.status}`);
const courses = await res.json();
if (!Array.isArray(courses) || courses.length < 100) {
  throw new Error(
    `catalog looks thin (${Array.isArray(courses) ? courses.length : "not-an-array"} items) — refusing to overwrite snapshot`
  );
}
await writeFile(OUT, JSON.stringify(courses, null, 2), "utf-8");
console.log(`[snapshot] wrote ${courses.length} courses to data/courses.json`);
