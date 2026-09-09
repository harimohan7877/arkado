import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const scope = searchParams.get("scope") || "public";

  try {
    let categories = await getStoreData<any[]>("categories", "data/categories.json", []);

    // If public scope: only return categories where is_active === true!
    if (scope !== "all") {
      categories = categories.filter((c) => c.is_active === true);
    }

    if (q) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_hi && c.name_hi.toLowerCase().includes(q))
      );
    }

    // Sort by priority
    categories.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // Format fields so existing components (CategoriesSection, SidebarCategories, etc.) work perfectly
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
        exam_ids: activeExams.map((e: any) => e.id),
        exam_count: activeExams.length,
        viral_names: c.viral_names || [],
        sub_preview: c.sub_preview || "",
        description: c.description || "",
        boards: c.boards || []
      };
    });

    return NextResponse.json(formatted, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return NextResponse.json([]);
  }
}
