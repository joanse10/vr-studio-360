import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATHS = ['/admin/dashboard', '/admin/collections'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (isAdminPath) {
    const token = req.cookies.get('admin-token')?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/collections/:path*'],
};
