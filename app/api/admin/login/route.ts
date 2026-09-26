import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSCODE } from "@/lib/admin-auth";

// Rate-limiting map for brute-force protection
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") || "unknown_ip");
    const now = Date.now();

    // Check rate limit status for this IP
    const record = loginAttempts.get(ip);
    if (record) {
      if (now - record.firstAttempt < LOCKOUT_MS) {
        if (record.count >= MAX_ATTEMPTS) {
          const remainingMinutes = Math.ceil((LOCKOUT_MS - (now - record.firstAttempt)) / 60000);
          return NextResponse.json(
            { error: `Too many failed attempts. Locked out for ${remainingMinutes} more minute(s).` },
            { status: 429 }
          );
        }
      } else {
        // Reset expired window
        loginAttempts.delete(ip);
      }
    }

    const { pin } = await req.json();
    const cleanPin = (pin || "").trim();

    // SECURITY: Only accept the single env-based ADMIN_PASSCODE — no hardcoded backdoors
    if (!ADMIN_PASSCODE || !cleanPin || cleanPin !== ADMIN_PASSCODE) {
      // Record failed attempt
      const current = loginAttempts.get(ip);
      if (!current || now - current.firstAttempt >= LOCKOUT_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
      } else {
        current.count += 1;
      }
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    // On successful login, clear attempts for this IP
    loginAttempts.delete(ip);

    return NextResponse.json({ success: true, token: ADMIN_PASSCODE });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

