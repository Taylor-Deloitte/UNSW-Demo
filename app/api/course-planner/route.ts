/**
 * GET /api/course-planner
 *
 * Returns saved campaign plans for a session, as persisted by the
 * `save_campaign_plan` tool in `/api/overlay-chat` (campaign mode).
 * See `lib/agent/session-store.ts` for the underlying store.
 */
import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/agent/session-store';

export async function GET(req: Request): Promise<Response> {
  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  try {
    const session = getSession(sessionId);
    return NextResponse.json({ plans: session?.coursePlans ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
