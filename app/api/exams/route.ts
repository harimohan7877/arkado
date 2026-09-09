import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

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

    exams.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    return NextResponse.json(exams);
  } catch {
    return NextResponse.json([]);
  }
}
