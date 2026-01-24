import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAccess } from '@/lib/auth';

// Comment: Parse session from cookie
function getSessionFromCookie(cookieHeader: string | null): { username: string; role: string; expiresAt: string } | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);

  const sessionCookie = cookies['admin_session'];
  if (!sessionCookie) return null;

  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie));
    // Comment: Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Comment: Allow access to login page and public routes
  if (pathname === '/admin/login' || !pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Comment: Check authentication for admin routes
  const session = getSessionFromCookie(request.headers.get('cookie'));

  if (!session) {
    // Comment: Redirect to login page if not authenticated
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Comment: Check if user has access to this route
  if (!hasAccess(session.role as 'director' | 'manager' | 'stylist', pathname)) {
    // Comment: Redirect to appointments page if no access
    return NextResponse.redirect(new URL('/admin/appointments', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
