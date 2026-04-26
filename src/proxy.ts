import { NextResponse, type NextRequest } from 'next/server';
import { getCalendarOwnerId, getUserById } from '@/lib/db';
import { sessionCookieName, verifySessionToken } from '@/lib/session-token';

function redirectToLogin(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

function redirectToDashboard(request: NextRequest) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = await verifySessionToken(request.cookies.get(sessionCookieName)?.value);
  const currentUser = session ? getUserById(session.userId) : null;

  if (pathname === '/login' || pathname === '/register') {
    return currentUser ? redirectToDashboard(request) : NextResponse.next();
  }

  if (!currentUser) {
    return redirectToLogin(request);
  }

  if (pathname.startsWith('/admin/users') && !currentUser.isSupervisor) {
    return redirectToDashboard(request);
  }

  const calendarEditMatch = pathname.match(/^\/admin\/calendars\/([^/]+)\/edit\/?$/);
  if (calendarEditMatch) {
    const ownerId = getCalendarOwnerId(decodeURIComponent(calendarEditMatch[1]));

    if (!currentUser.isSupervisor && ownerId !== currentUser.id) {
      return redirectToDashboard(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/calendar/create',
    '/login',
    '/register',
  ],
};
