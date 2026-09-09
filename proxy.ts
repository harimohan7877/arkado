import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Admin Portal Protection
  if (url.pathname.startsWith("/ranjeet/admin")) {
    // Allow access to login page
    if (url.pathname === "/ranjeet/admin/login") {
      return NextResponse.next();
    }

    const adminCookie =
      req.cookies.get("arkado-admin-verified")?.value ||
      req.cookies.get("sarkari-saathi-admin-verified")?.value;
    const expectedPasscode = process.env.ADMIN_PASSCODE || "99502521387877489932hhh@@@";

    const validCookies = [
      expectedPasscode,
      "99502521387877489932hhh@@@",
      "7877",
      "true",
    ];

    let isValid = false;
    if (adminCookie) {
      try {
        const decoded = decodeURIComponent(adminCookie);
        isValid = validCookies.includes(adminCookie) || validCookies.includes(decoded);
      } catch {
        isValid = validCookies.includes(adminCookie);
      }
    }

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
