import { NextResponse, type NextRequest } from 'next/server';
import { loadAuthEnv, safeCompare } from './lib/auth';

export const config = {
  runtime: 'nodejs',
  // Match everything except Next internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)',
  ],
};

export function middleware(req: NextRequest): NextResponse {
  const env = loadAuthEnv();
  if (env.passwordGateDisabled) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (pathname === '/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  const cookie = req.cookies.get('auth')?.value;
  const authed = !!cookie && !!env.appPassword && safeCompare(cookie, env.appPassword);

  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(loginUrl);
}
