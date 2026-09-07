import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const adminPasscode = process.env.ADMIN_PASSCODE || "7877";

    if (!pin || pin !== adminPasscode) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({ success: true, token: adminPasscode });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
