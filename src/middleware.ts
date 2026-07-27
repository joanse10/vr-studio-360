import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_PAGE_PREFIXES = ['/admin/dashboard', '/admin/collections', '/admin/clients'];

const JWT_SECRET = process.env.JWT_SECRET;
const SECRET = JWT_SECRET ? new TextEncoder().encode(JWT_SECRET) : null;

async function verifyJwt(token: string): Promise<boolean> {
  if (!SECRET) return false;
  try {
    await jwtVerify(token, SECRET, { issuer: 'vr-studio-360', audience: 'admin-panel' });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // HTTPS enforcement in production
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') === 'http'
  ) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // Protect admin pages
  const isAdminPage = ADMIN_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAdminPage) {
    const token = req.cookies.get('admin-token')?.value;
    if (!token || !(await verifyJwt(token))) {
      const loginUrl = new URL('/admin/login', req.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-token');
      return response;
    }
  }

  // Protect admin API routes
  if (pathname.startsWith('/api/admin')) {
    const token = req.cookies.get('admin-token')?.value;
    if (!token || !(await verifyJwt(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/admin/collections/:path*',
    '/admin/clients/:path*',
    '/api/admin/:path*',
  ],
};
