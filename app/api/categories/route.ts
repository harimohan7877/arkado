import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const state = searchParams.get("state")?.toLowerCase().trim();

  try {
    const data = await readFile(join(process.cwd(), "data/categories.json"), "utf-8");
    let categories = JSON.parse(data);

    if (state && state !== "all") {
      categories = categories.filter((c: any) =>
        (c.state_or_group && c.state_or_group.toLowerCase().includes(state)) ||
        c.name.toLowerCase().includes(state)
      );
    }

    if (q) {
      categories = categories.filter((c: any) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_hi && c.name_hi.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([]);
  }
}