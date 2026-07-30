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

export interface SessionMeta {
  title?: string;
  segments: SegmentRecord[];
  campaigns: CampaignRecord[];
  createdAt: string;
  lastAccessedAt: string;
}

const MAX_SESSIONS = 100;
const store = new Map<string, SessionMeta>();

function touch(id: string): void {
  const s = store.get(id);
  if (!s) return;
  s.lastAccessedAt = new Date().toISOString();
  store.delete(id);
  store.set(id, s);
}

function evictIfFull(): void {
  while (store.size > MAX_SESSIONS) {
    const first = store.keys().next().value;
    if (first === undefined) break;
    store.delete(first);
  }
}

export function setSession(id: string, meta: Partial<SessionMeta>): void {
  const existing = store.get(id);
  const now = new Date().toISOString();
  const next: SessionMeta = {
    title: meta.title ?? existing?.title,
    segments: existing?.segments ?? [],
    campaigns: existing?.campaigns ?? [],
    createdAt: existing?.createdAt ?? now,
    lastAccessedAt: now,
  };
  store.delete(id);
  store.set(id, next);
  evictIfFull();
}

export function getSession(id: string): SessionMeta | undefined {
  const s = store.get(id);
  if (s) touch(id);
  return s;
}

export function appendSegment(id: string, seg: Omit<SegmentRecord, 'createdAt'>): void {
  const s = store.get(id);
  if (!s) throw new Error(`session ${id} not found`);
  s.segments.push({ ...seg, createdAt: new Date().toISOString() });
  touch(id);
}

export function appendCampaign(id: string, camp: Omit<CampaignRecord, 'createdAt'>): void {
  const s = store.get(id);
  if (!s) throw new Error(`session ${id} not found`);
  s.campaigns.push({ ...camp, createdAt: new Date().toISOString() });
  touch(id);
}

export function sessionCount(): number {
  return store.size;
}
