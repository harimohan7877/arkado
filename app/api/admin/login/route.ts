import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSCODE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const cleanPin = (pin || "").trim();

    // SECURITY: Only accept the single env-based ADMIN_PASSCODE — no hardcoded backdoors
    if (!ADMIN_PASSCODE || !cleanPin || cleanPin !== ADMIN_PASSCODE) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: ADMIN_PASSCODE });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

