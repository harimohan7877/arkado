import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_PASSCODE,
  createAdminSessionToken,
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/admin-auth";
import {
  checkLoginThrottle,
  recordFailedLogin,
  clearLoginAttempts,
} from "@/lib/login-throttle";

// Cookies from the old passcode-in-cookie scheme — cleared on login/logout
// so stale copies never linger in the browser.
const LEGACY_COOKIES = ["arkado-admin-verified", "sarkari-saathi-admin-verified"];

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") || "unknown_ip");

    // Brute-force protection (persistent Supabase-backed, in-memory fallback).
    // Never throws — login keeps working even if throttling storage is down.
    const throttle = await checkLoginThrottle(ip);
    if (throttle.locked) {
      return NextResponse.json(
        { error: `Too many failed attempts. Locked out for ${throttle.remainingMinutes} more minute(s).` },
        { status: 429 }
      );
    }

    const { pin } = await req.json();
    const cleanPin = (pin || "").trim();

    // SECURITY: Only accept the single env-based ADMIN_PASSCODE — no hardcoded backdoors
    if (!ADMIN_PASSCODE || !cleanPin || cleanPin !== ADMIN_PASSCODE) {
      await recordFailedLogin(ip);
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    // On successful login, clear attempts for this IP
    await clearLoginAttempts(ip);

    // Issue a signed session. The raw passcode is NEVER sent to the browser —
    // only an HMAC-signed token in an HttpOnly cookie (JS cannot read it).
    let token: string;
    try {
      token = await createAdminSessionToken();
    } catch {
      console.error("[admin-login] SESSION_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    // Clear any legacy passcode cookies from the old scheme
    for (const name of LEGACY_COOKIES) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
