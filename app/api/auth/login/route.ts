import { NextResponse } from 'next/server';
import { loadAuthEnv, safeCompare } from '../../../../lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  const env = loadAuthEnv();
  if (env.passwordGateDisabled) {
    return NextResponse.json({ error: 'Gate disabled' }, { status: 404 });
  }
  if (!env.appPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  let body: { password?: unknown; next?: unknown };
  try {
    body = (await req.json()) as { password?: unknown; next?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.password !== 'string' || body.password.length === 0) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  if (!safeCompare(body.password, env.appPassword)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const next = typeof body.next === 'string' && body.next.startsWith('/') ? body.next : '/';

  const res = NextResponse.json({ next });
  res.headers.set(
    'Set-Cookie',
    `auth=${encodeURIComponent(body.password)}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
  return res;
}
