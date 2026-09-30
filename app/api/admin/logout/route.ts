import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

// Cookies from the old passcode-in-cookie scheme — cleared on logout
// so stale copies never linger in the browser.
const LEGACY_COOKIES = ["arkado-admin-verified", "sarkari-saathi-admin-verified"];

/** Destroys the admin session by clearing the HttpOnly session cookie. */
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  for (const name of LEGACY_COOKIES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
