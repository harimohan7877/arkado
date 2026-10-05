import { NextRequest, NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Full catalog backup as JSON. Admin-only.
 * NOTE: orders are intentionally excluded (customer PII — names, phones, emails).
 * Orders already have their own CSV export in the Orders tab.
 */
export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [courses, categories, featured, blog, settings] = await Promise.all([
      getStoreData("courses", "data/courses.json", []),
      getStoreData("categories", "data/categories.json", []),
      getStoreData("featured_exams", "data/featured_exams.json", { featured_exams: [], new_arrivals: [] }),
      getStoreData("blog_posts", "data/blog.json", []),
      getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      source: "arkado.store admin backup",
      data: { courses, categories, featured, blog, settings },
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="arkado-backup-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Export failed" }, { status: 500 });
  }
}
