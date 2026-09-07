import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase().trim();
  const includeInactive = searchParams.get("include_inactive") === "true" || searchParams.get("all") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  try {
    const data = await readFile(join(process.cwd(), "data/exams-new.json"), "utf-8");
    let exams = JSON.parse(data);

    if (category) {
      exams = exams.filter((e: any) => e.category_id === category);
    }

    if (!includeInactive && !category) {
      exams = exams.filter((e: any) => e.is_active);
    }

    if (q) {
      exams = exams.filter((e: any) =>
        e.name.toLowerCase().includes(q) ||
        (e.short_name && e.short_name.toLowerCase().includes(q)) ||
        (e.board && e.board.toLowerCase().includes(q))
      );
    }

    const total = exams.length;
    const startIndex = (page - 1) * limit;
    const paginated = limit > 0 ? exams.slice(startIndex, startIndex + limit) : exams;

    return NextResponse.json(paginated, {
      headers: {
        "x-total-count": String(total),
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}