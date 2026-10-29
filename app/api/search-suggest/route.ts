import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Slim catalog for the SearchBar suggestions.
 * Full /api/courses (~1019 products, ~1MB) was fetched on every page via the
 * Navbar search box. This returns only the fields SearchBar actually uses:
 * filter = title/short_description/slug/badge/subjects/highlights,
 * render = cover_image/price/original_price/discount_percent,
 * navigate = slug/id.
 * Edge-cached 1h like /api/courses; purged on courses save via
 * revalidatePath("/api/search-suggest") in lib/store-data.ts.
 */
export async function GET() {
  try {
    const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
    const slim = courses
      .filter((c) => c.is_active)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
      .map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        short_description: c.short_description,
        badge: c.badge,
        subjects: c.subjects,
        highlights: c.highlights,
        cover_image: c.cover_image,
        price: c.price,
        original_price: c.original_price,
        discount_percent: c.discount_percent,
        exam_id: c.exam_id,
      }));
    return NextResponse.json(slim, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
