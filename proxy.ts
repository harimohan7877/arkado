import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();

  // Admin Portal Protection
  if (url.pathname.startsWith('/secret-admin-portal')) {
    // Allow access to the login page itself
    if (url.pathname === '/secret-admin-portal/login') {
      return res;
    }
    
    // Check for admin cookie
    const adminCookie = req.cookies.get('arkado-admin-verified')?.value || req.cookies.get('sarkari-saathi-admin-verified')?.value;
    if (adminCookie !== 'true') {
      const loginUrl = new URL('/secret-admin-portal/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/secret-admin-portal/:path*']
};
