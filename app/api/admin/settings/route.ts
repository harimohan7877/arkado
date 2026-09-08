import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, setStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getStoreData("settings", "data/settings.json", {});
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const current = await getStoreData<Record<string, unknown>>("settings", "data/settings.json", {});
  const updated = { ...current, ...body, updated_at: new Date().toISOString() };
  await setStoreData("settings", "data/settings.json", updated);
  return NextResponse.json(updated);
}
