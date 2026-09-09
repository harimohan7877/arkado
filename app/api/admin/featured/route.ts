import { NextRequest, NextResponse } from "next/server";
import { getStoreData, setStoreData } from "@/lib/store-data";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FeaturedStore {
  featured_exams: any[];
  new_arrivals: any[];
}

export async function GET(req: NextRequest) {
  try {
    const data = await getStoreData<FeaturedStore>("featured_exams", "data/featured_exams.json", {
      featured_exams: [],
      new_arrivals: [],
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch {
    return NextResponse.json({ featured_exams: [], new_arrivals: [] });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    await setStoreData("featured_exams", "data/featured_exams.json", body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
