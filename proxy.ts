import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();

  // Secret Admin Portal Protection
  if (url.pathname.startsWith('/ranjeet/admin')) {
    // Allow access to login page
    if (url.pathname === '/ranjeet/admin/login') {
      return res;
    }
    
    // Check for admin verification cookie
    const adminCookie = req.cookies.get('arkado-admin-verified')?.value;
    const expectedPasscode = process.env.ADMIN_PASSCODE || '7877';
    
    if (adminCookie !== expectedPasscode && adminCookie !== 'true') {
      const loginUrl = new URL('/ranjeet/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: ['/ranjeet/admin/:path*']
};
