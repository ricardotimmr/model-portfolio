import { getSessionCookie } from 'better-auth/cookies';
import { type NextRequest, NextResponse } from 'next/server';

const LOGIN_PATH = '/studio/login';

export function proxy(request: NextRequest) {
  const response =
    request.nextUrl.pathname === LOGIN_PATH ||
    getSessionCookie(request, { cookiePrefix: 'zoe-studio' })
      ? NextResponse.next()
      : NextResponse.redirect(new URL(LOGIN_PATH, request.url));

  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

export const config = {
  matcher: ['/studio/:path*'],
};
