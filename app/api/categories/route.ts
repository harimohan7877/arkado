import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const scope = searchParams.get("scope") || "public";
  const includeBoards = searchParams.get("include_boards") === "true";

  try {
    let categories = await getStoreData<any[]>("categories", "data/categories.json", []);

    // If public scope: only return categories where is_active === true (turned ON in admin panel)
    if (scope !== "all") {
      categories = categories.filter((c) => c.is_active === true);
    }

    if (q) {
      categories = categories.filter((c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.name_hi && c.name_hi.toLowerCase().includes(q))
      );
    }

    // Sort by priority
    categories.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // Format fields so existing components work perfectly
    const formatted = categories.map((c) => {
      const activeExams = (c.boards || []).flatMap((b: any) =>
        (b.exams || []).filter((e: any) => (scope === "all" ? true : e.is_active))
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
        // Include full nested boards tree ONLY if explicitly requested or in admin scope (scope=all)
        // Public frontend gets lightweight response (~2KB vs ~182KB)
        boards: (includeBoards || scope === "all") ? (c.boards || []) : []
      };
    });

    const cacheHeader = "public, no-cache, must-revalidate";

    return NextResponse.json(formatted, {
      headers: {
        "Cache-Control": cacheHeader
      }
    });
  } catch {
    return NextResponse.json([]);
  }
}
