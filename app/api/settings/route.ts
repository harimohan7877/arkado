import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await getStoreData("settings", "data/settings.json", {});
  return NextResponse.json(data);
}