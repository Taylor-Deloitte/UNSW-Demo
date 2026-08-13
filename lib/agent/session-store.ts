import { query, ensureSchema } from '../db';

export interface SegmentRecord {
  id: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface CampaignRecord {
  id: string;
  segmentId: string;
  channel: string;
  createdAt: string;
}

export interface CoursePlanRecord {
  id: string;
  courseName: string;
  variantName: string;
  classification: 'high-propensity' | 'broad-reach' | 're-engagement';
  eligiblePool: number;
  estimatedEnrolments: number;
  estimatedRevenueAud: number | null;
  confidence: 'High' | 'Medium' | 'Low';
  crmCampaign: unknown;
  aepSegment: unknown;
  createdAt: string;
}

export interface SessionMeta {
  title?: string;
  segments: SegmentRecord[];
  campaigns: CampaignRecord[];
  coursePlans: CoursePlanRecord[];
  createdAt: string;
  lastAccessedAt: string;
}

const MAX_SESSIONS = 100;

async function assertSessionExists(id: string): Promise<void> {
  const result = await query<{ id: string }>('SELECT id FROM sessions WHERE id = $1', [id]);
  if (result.rowCount === 0) throw new Error(`session ${id} not found`);
}

async function evictIfFull(): Promise<void> {
  await query(
    `DELETE FROM sessions WHERE id NOT IN (
       SELECT id FROM sessions ORDER BY last_accessed_at DESC LIMIT $1
     )`,
    [MAX_SESSIONS],
  );
}

export async function setSession(id: string, meta: Partial<SessionMeta>): Promise<void> {
  await ensureSchema();
  await query(
    `INSERT INTO sessions (id, title, created_at, last_accessed_at)
     VALUES ($1, $2, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       title = COALESCE($2, sessions.title),
       last_accessed_at = now()`,
    [id, meta.title ?? null],
  );
  await evictIfFull();
}

export async function getSession(id: string): Promise<SessionMeta | undefined> {
  await ensureSchema();
  const sessionResult = await query<{
    title: string | null;
    created_at: Date;
    last_accessed_at: Date;
  }>(
    `UPDATE sessions SET last_accessed_at = now()
     WHERE id = $1
     RETURNING title, created_at, last_accessed_at`,
    [id],
  );
  const row = sessionResult.rows[0];
  if (!row) return undefined;

  const [segmentsResult, campaignsResult, coursePlansResult] = await Promise.all([
    query<{ id: string; name: string; size: number; created_at: Date }>(
      'SELECT id, name, size, created_at FROM segments WHERE session_id = $1 ORDER BY created_at ASC',
      [id],
    ),
    query<{ id: string; segment_id: string; channel: string; created_at: Date }>(
      'SELECT id, segment_id, channel, created_at FROM campaigns WHERE session_id = $1 ORDER BY created_at ASC',
      [id],
    ),
    query<{
      id: string;
      course_name: string;
      variant_name: string;
      classification: CoursePlanRecord['classification'];
      eligible_pool: number;
      estimated_enrolments: number;
      estimated_revenue_aud: number | null;
      confidence: CoursePlanRecord['confidence'];
      crm_campaign: unknown;
      aep_segment: unknown;
      created_at: Date;
    }>(
      `SELECT id, course_name, variant_name, classification, eligible_pool, estimated_enrolments,
              estimated_revenue_aud, confidence, crm_campaign, aep_segment, created_at
       FROM course_plans WHERE session_id = $1 ORDER BY created_at ASC`,
      [id],
    ),
  ]);

  return {
    title: row.title ?? undefined,
    createdAt: row.created_at.toISOString(),
    lastAccessedAt: row.last_accessed_at.toISOString(),
    segments: segmentsResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      size: r.size,
      createdAt: r.created_at.toISOString(),
    })),
    campaigns: campaignsResult.rows.map((r) => ({
      id: r.id,
      segmentId: r.segment_id,
      channel: r.channel,
      createdAt: r.created_at.toISOString(),
    })),
    coursePlans: coursePlansResult.rows.map((r) => ({
      id: r.id,
      courseName: r.course_name,
      variantName: r.variant_name,
      classification: r.classification,
      eligiblePool: r.eligible_pool,
      estimatedEnrolments: r.estimated_enrolments,
      estimatedRevenueAud: r.estimated_revenue_aud,
      confidence: r.confidence,
      crmCampaign: r.crm_campaign,
      aepSegment: r.aep_segment,
      createdAt: r.created_at.toISOString(),
    })),
  };
}

export async function appendSegment(id: string, seg: Omit<SegmentRecord, 'createdAt'>): Promise<void> {
  await ensureSchema();
  await assertSessionExists(id);
  await query('INSERT INTO segments (id, session_id, name, size) VALUES ($1, $2, $3, $4)', [
    seg.id,
    id,
    seg.name,
    seg.size,
  ]);
  await query('UPDATE sessions SET last_accessed_at = now() WHERE id = $1', [id]);
}

export async function appendCampaign(id: string, camp: Omit<CampaignRecord, 'createdAt'>): Promise<void> {
  await ensureSchema();
  await assertSessionExists(id);
  await query('INSERT INTO campaigns (id, session_id, segment_id, channel) VALUES ($1, $2, $3, $4)', [
    camp.id,
    id,
    camp.segmentId,
    camp.channel,
  ]);
  await query('UPDATE sessions SET last_accessed_at = now() WHERE id = $1', [id]);
}

export async function appendCoursePlan(
  id: string,
  plan: Omit<CoursePlanRecord, 'createdAt'>,
): Promise<void> {
  await ensureSchema();
  await assertSessionExists(id);
  await query(
    `INSERT INTO course_plans
       (id, session_id, course_name, variant_name, classification, eligible_pool,
        estimated_enrolments, estimated_revenue_aud, confidence, crm_campaign, aep_segment)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      plan.id,
      id,
      plan.courseName,
      plan.variantName,
      plan.classification,
      plan.eligiblePool,
      plan.estimatedEnrolments,
      plan.estimatedRevenueAud,
      plan.confidence,
      plan.crmCampaign ?? null,
      plan.aepSegment ?? null,
    ],
  );
  await query('UPDATE sessions SET last_accessed_at = now() WHERE id = $1', [id]);
}

export async function sessionCount(): Promise<number> {
  await ensureSchema();
  const result = await query<{ count: string }>('SELECT COUNT(*)::int AS count FROM sessions', []);
  return Number(result.rows[0]?.count ?? 0);
}
