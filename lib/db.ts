import { Pool, type QueryResult, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __unswPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __unswSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__unswPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set; cannot connect to Postgres.');
    }
    globalThis.__unswPgPool = new Pool({ connectionString });
  }
  return globalThis.__unswPgPool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    segment_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS course_plans (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    classification TEXT NOT NULL,
    eligible_pool INTEGER NOT NULL,
    estimated_enrolments INTEGER NOT NULL,
    estimated_revenue_aud INTEGER,
    confidence TEXT NOT NULL,
    crm_campaign JSONB,
    aep_segment JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    session_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    messages JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, mode)
  );

  CREATE TABLE IF NOT EXISTS campaign_drafts (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

export function ensureSchema(): Promise<void> {
  if (!globalThis.__unswSchemaReady) {
    globalThis.__unswSchemaReady = query(SCHEMA_DDL).then(() => undefined);
  }
  return globalThis.__unswSchemaReady;
}

export async function getChatHistory<T>(sessionId: string, mode: string): Promise<T[] | undefined> {
  await ensureSchema();
  const result = await query<{ messages: T[] }>(
    'SELECT messages FROM chat_history WHERE session_id = $1 AND mode = $2',
    [sessionId, mode],
  );
  return result.rows[0]?.messages;
}

export async function saveChatHistory<T>(sessionId: string, mode: string, messages: T[]): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO chat_history (session_id, mode, messages, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (session_id, mode) DO UPDATE SET messages = $3, updated_at = now()`,
    [sessionId, mode, JSON.stringify(messages)],
  );
}

export async function getCampaignDraft<T>(sessionId: string): Promise<T | undefined> {
  await ensureSchema();
  const result = await query<{ payload: T }>(
    'SELECT payload FROM campaign_drafts WHERE session_id = $1',
    [sessionId],
  );
  return result.rows[0]?.payload;
}

export async function saveCampaignDraft<T>(sessionId: string, payload: T): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO campaign_drafts (session_id, payload, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (session_id) DO UPDATE SET payload = $2, updated_at = now()`,
    [sessionId, JSON.stringify(payload)],
  );
}
