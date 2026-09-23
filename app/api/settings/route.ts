import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/store-data";

export const revalidate = 120;
 
export async function GET() {
  const data = await getStoreData("settings", "data/settings.json", {});
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
    },
  });
}