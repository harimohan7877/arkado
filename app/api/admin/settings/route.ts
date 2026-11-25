import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { getStoreData, patchStoreSettings } from "@/lib/store-data";
import { isSettingsObject } from "@/lib/settings-patch";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getStoreData("settings", "data/settings.json", {});
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patch: unknown = await req.json().catch(() => null);
  if (!isSettingsObject(patch)) {
    return NextResponse.json({ error: "Invalid settings update." }, { status: 400 });
  }

  try {
    const updated = await patchStoreSettings(patch);
    if (!updated) {
      return NextResponse.json({ error: "Settings changed during this save. Please try again." }, { status: 409 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[admin settings] Save failed:", error);
    return NextResponse.json({ error: "Settings could not be saved." }, { status: 500 });
  }
}
