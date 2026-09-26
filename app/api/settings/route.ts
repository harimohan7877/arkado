import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;
 
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

export async function GET() {
  try {
    const data = await getStoreData("settings", "data/settings.json", DEFAULT_SETTINGS);
    return NextResponse.json(data || DEFAULT_SETTINGS, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
      },
    });
  } catch (err) {
    console.error("[settings] Load error:", err);
    return NextResponse.json(DEFAULT_SETTINGS, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}