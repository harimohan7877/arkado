import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Admin Portal Protection
  if (url.pathname.startsWith("/ranjeet/admin")) {
    // Allow access to login page
    if (url.pathname === "/ranjeet/admin/login") {
      return NextResponse.next();
    }

    // Strict check: only a valid SESSION_SECRET-signed session cookie grants access.
    // (Deliberately NOT using verifyAdminSession's localhost bypass here —
    // the page guard must stay strict even in development.)
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
    const isValid = token ? await verifyAdminSessionToken(token) : false;

    if (!isValid) {
      const loginUrl = new URL("/ranjeet/admin/login", req.url);
      loginUrl.searchParams.set("redirect", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ranjeet/admin/:path*"],
};
