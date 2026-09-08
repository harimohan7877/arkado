import { NextResponse } from "next/server";
import { Category } from "@/lib/store-types";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const state = searchParams.get("state")?.toLowerCase().trim();
  const scope = searchParams.get("scope") || "public";

  try {
    let categories = await getStoreData<Category[]>("categories", "data/categories.json", []);

    if (scope === "public") {
      categories = categories.filter((c) =>
        c.state_or_group && c.state_or_group.toLowerCase() === "rajasthan"
      );
    }

    if (state && state !== "all") {
      categories = categories.filter((c) =>
        (c.state_or_group && c.state_or_group.toLowerCase().includes(state)) ||
        c.name.toLowerCase().includes(state)
      );
    }

    if (q) {
      categories = categories.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_hi && c.name_hi.toLowerCase().includes(q))
      );
    }

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json([]);
  }
}