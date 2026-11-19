import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";
import { applySaleServer, fetchSalePctServer } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase().trim();
  const includeInactive = searchParams.get("include_inactive") === "true" || searchParams.get("all") === "true";

  try {
    const categories = await getStoreData<any[]>("categories", "data/categories.json", []);
    let exams: any[] = [];

    if (category) {
      const cat = categories.find((c: any) => c.id === category);
      if (cat) {
        if (!includeInactive && !cat.is_active) {
          return NextResponse.json([]);
        }

        for (const b of cat.boards || []) {
          if (!includeInactive && !b.is_active) continue;

          for (const e of b.exams || []) {
            if (!includeInactive && !e.is_active) continue;
            exams.push({
              ...e,
              category_id: cat.id,
              category_name: cat.name,
              board: b.short_name || b.name,
              board_id: b.board_id,
            });
          }
        }
      }
    } else {
      for (const cat of categories) {
        if (!includeInactive && !cat.is_active) continue;
        for (const b of cat.boards || []) {
          if (!includeInactive && !b.is_active) continue;
          for (const e of b.exams || []) {
            if (!includeInactive && !e.is_active) continue;
            exams.push({
              ...e,
              category_id: cat.id,
              category_name: cat.name,
              board: b.short_name || b.name,
              board_id: b.board_id,
            });
          }
        }
      }
    }

    if (q) {
      exams = exams.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (e.short_name && e.short_name.toLowerCase().includes(q)) ||
        (e.board && e.board.toLowerCase().includes(q))
      );
    }

    // Real starting price per exam (sale-adjusted min over its courses).
    // The listing badge used to hardcode ₹199, which was wrong for every exam
    // (actual mins are ₹49–₹149). Computed server-side so the badge stays
    // true as prices change; null when an exam has no priced course.
    try {
      const courses = await getStoreData<any[]>("courses", "data/courses.json", []);
      const pct = await fetchSalePctServer();
      const minByExam = new Map<string, number>();
      for (const c of courses) {
        if (!c?.exam_id || typeof c.price !== "number" || c.is_active === false) continue;
        const p = applySaleServer(c.price, pct);
        const cur = minByExam.get(c.exam_id);
        if (cur === undefined || p < cur) minByExam.set(c.exam_id, p);
      }
      exams = exams.map((e) => ({ ...e, min_price: minByExam.get(e.id) ?? null }));
    } catch {
      // min_price stays unset; the client falls back to a price-less badge.
    }

    const cacheHeader = includeInactive
      ? "no-store, no-cache, must-revalidate"
      : "public, s-maxage=3600, stale-while-revalidate=86400";
    return NextResponse.json(exams, { headers: { "Cache-Control": cacheHeader } });
  } catch {
    return NextResponse.json([]);
  }
}
