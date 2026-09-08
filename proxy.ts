import { NextRequest, NextResponse } from 'next/server';

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl.clone();

  // 1. Admin Portal Protection
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

  // 2. User Protected routes — redirect to auth if no session cookie
  const protectedPaths = ['/dashboard', '/payment'];
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));

  if (isProtected) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const ref = supabaseUrl.split('//')[1]?.split('.')[0] || '';
    
    const authCookie = req.cookies.get('sb-access-token')?.value || 
                       req.cookies.get(`sb-${ref}-auth-token`)?.value ||
                       req.cookies.get(`sb-${ref}-auth-token.0`)?.value ||
                       req.cookies.get(`sb-${ref}-auth-token.1`)?.value;
    
    const hasAnyAuth = authCookie || Array.from(req.cookies.getAll()).some(c => c.name.includes('sb-') && c.name.includes('auth'));
    
    if (!hasAnyAuth) {
      const redirectUrl = new URL('/auth', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/payment/:path*', '/secret-admin-portal/:path*']
};
