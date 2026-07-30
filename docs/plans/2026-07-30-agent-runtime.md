# Agent Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire a real Claude Agent SDK runtime to the existing `/api/chat` SSE route, with in-process MCP tools that read the synthetic data bundle. The `AgentPanel` in the browser streams actual model text + tool-use pills as the agent works.

**Architecture:** `@anthropic-ai/claude-agent-sdk` `query()` in the API route with `persistSession: true` for cross-turn session continuity. Six MCP tools registered in-process via `createSdkMcpServer()` — three read-only (query alumni/prospects/signals/propensity) and three "mock write" (create AEP segment, draft AJO campaign, run propensity model). Streaming events → SSE JSON lines matching the shape already documented in `docs/03-AGENT-LAYER.md`. Client-side `useAgentChat` hook consumes the SSE, renders text + tool pills.

**Model:** `claude-opus-4-7` with `thinking: {type: 'adaptive'}` + `effort: 'high'`. Cost trade-off flagged in tech + placement doc; can dial to `sonnet-4-6` if bill grows.

**Tech Stack:** `@anthropic-ai/claude-agent-sdk`, `zod` (already installed), Next.js 16 SSE route, browser `EventSource`.

**Assumption to verify in Task 1:** `@anthropic-ai/claude-agent-sdk` exports `query()`, `createSdkMcpServer()`, and event types matching the pattern in the Marvin project. If the exports differ, adapt Task 6 accordingly — do not silently fall back to bare `@anthropic-ai/sdk`.

---

## File Structure

**Create:**
- `lib/agent/events.ts` — `AgentEvent` union type + narrowing helpers
- `lib/agent/session-store.ts` — in-memory `Map<sessionId, SessionMeta>` with LRU eviction
- `lib/agent/system-prompt.ts` — the system prompt text (constant + assembly helper)
- `lib/agent/mcp-server.ts` — `createUnswMcpServer()` returning an SDK MCP server with 6 tools
- `lib/agent/mcp-tools/query-dynamics.ts` — reads alumni + prospects from the bundle
- `lib/agent/mcp-tools/query-aep.ts` — same underlying data, AEP-framed response
- `lib/agent/mcp-tools/query-linkedin.ts` — reads signals + trajectory
- `lib/agent/mcp-tools/create-aep-segment.ts` — writes segment record to session-scoped state
- `lib/agent/mcp-tools/draft-ajo-campaign.ts` — writes campaign brief to session state
- `lib/agent/mcp-tools/run-propensity-model.ts` — reads propensity scores + returns top-N
- `lib/agent/map-sdk-events.ts` — maps Claude Agent SDK stream messages → `AgentEvent`
- `hooks/useAgentChat.ts` — client hook that opens EventSource and yields messages
- All `*.spec.ts` files next to each module

**Modify:**
- `app/api/chat/route.ts` — swap the canned stream for real `query()` + event mapping
- `components/AgentPanel.tsx` — use `useAgentChat` instead of the current stub
- `docs/03-AGENT-LAYER.md` — mark the "canned" section as replaced; document actual event shape
- `.env.example` — remove `USE_REAL_AGENT` placeholder, add `ANTHROPIC_MODEL` override
- `package.json` — add `@anthropic-ai/claude-agent-sdk`

**Deferred (later plans):**
- Hooks (`pre-tool-use-*`) — needed once we add real writes; the current "mock writes" only mutate session state, so no data-safety hook required for the demo
- Compaction / long-conversation handling — demo turns are short
- Per-tab agent scripts / canned response fallbacks — plan #3 (Segmentation tab) will decide whether to add these

---

## Task 1: Install SDK + verify exports

**Files:**
- Modify: `package.json`
- Create: `scripts/verify-sdk-exports.ts` (throwaway, deleted at end of task)

- [ ] **Step 1: Install SDK**

Run:
```bash
npm install @anthropic-ai/claude-agent-sdk
```

Expected: added package, no peer-dep errors.

- [ ] **Step 2: Verify the exports we need actually exist**

Create `scripts/verify-sdk-exports.ts`:
```ts
import * as sdk from '@anthropic-ai/claude-agent-sdk';

const required = ['query', 'createSdkMcpServer', 'tool'];
const missing = required.filter((name) => !(name in sdk));
if (missing.length) {
  console.error(`Missing exports from @anthropic-ai/claude-agent-sdk: ${missing.join(', ')}`);
  console.error(`Available exports: ${Object.keys(sdk).join(', ')}`);
  process.exit(1);
}
console.log(`OK — all required exports present: ${required.join(', ')}`);
console.log(`All exports: ${Object.keys(sdk).join(', ')}`);
```

Run: `npx tsx scripts/verify-sdk-exports.ts`
Expected: `OK — all required exports present: query, createSdkMcpServer, tool`

- [ ] **Step 3: If exports differ, STOP and re-scope**

If any export is missing, read the actual API surface (log it out), then either:
- Adjust plan tasks 4-6 to match the real API (preferred)
- Or: swap to `@anthropic-ai/sdk` + manual tool runner (do NOT do this silently; surface the change to the user)

- [ ] **Step 4: Delete the verification script**

Run: `rm scripts/verify-sdk-exports.ts`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(agent): add @anthropic-ai/claude-agent-sdk"
```

---

## Task 2: AgentEvent types

**Files:**
- Create: `lib/agent/events.ts`
- Create: `lib/agent/events.spec.ts`

Event shape matches what `docs/03-AGENT-LAYER.md` documents so downstream (`AgentPanel`, tool pills) doesn't need to change if we swap agent runtimes later.

- [ ] **Step 1: Write failing test**

`lib/agent/events.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isTextDelta, isToolUse, isToolResult, isDone, isError } from './events';
import type { AgentEvent } from './events';

describe('event narrowing helpers', () => {
  it('narrows text_delta', () => {
    const e: AgentEvent = { type: 'text_delta', delta: 'hi' };
    expect(isTextDelta(e)).toBe(true);
    if (isTextDelta(e)) expect(e.delta).toBe('hi');
  });

  it('narrows tool_use', () => {
    const e: AgentEvent = { type: 'tool_use', tool: 'query_dynamics', input: { entity: 'Lead' } };
    expect(isToolUse(e)).toBe(true);
    if (isToolUse(e)) expect(e.tool).toBe('query_dynamics');
  });

  it('narrows tool_result', () => {
    const e: AgentEvent = { type: 'tool_result', tool: 'query_dynamics', output: { rows: 42 } };
    expect(isToolResult(e)).toBe(true);
  });

  it('narrows done', () => {
    const e: AgentEvent = { type: 'done' };
    expect(isDone(e)).toBe(true);
  });

  it('narrows error', () => {
    const e: AgentEvent = { type: 'error', message: 'oops' };
    expect(isError(e)).toBe(true);
    if (isError(e)) expect(e.message).toBe('oops');
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- events`

- [ ] **Step 3: Write implementation**

`lib/agent/events.ts`:
```ts
export type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'tool_use'; tool: string; input: unknown; toolUseId?: string }
  | { type: 'tool_result'; tool: string; output: unknown; toolUseId?: string; isError?: boolean }
  | { type: 'session_started'; sessionId: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function isTextDelta(e: AgentEvent): e is Extract<AgentEvent, { type: 'text_delta' }> {
  return e.type === 'text_delta';
}
export function isToolUse(e: AgentEvent): e is Extract<AgentEvent, { type: 'tool_use' }> {
  return e.type === 'tool_use';
}
export function isToolResult(e: AgentEvent): e is Extract<AgentEvent, { type: 'tool_result' }> {
  return e.type === 'tool_result';
}
export function isDone(e: AgentEvent): e is Extract<AgentEvent, { type: 'done' }> {
  return e.type === 'done';
}
export function isError(e: AgentEvent): e is Extract<AgentEvent, { type: 'error' }> {
  return e.type === 'error';
}
```

- [ ] **Step 4: Run test — PASS**

Run: `npm test -- events`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/agent/events.ts lib/agent/events.spec.ts
git commit -m "feat(agent): AgentEvent union + narrowing helpers"
```

---

## Task 3: Session store

**Files:**
- Create: `lib/agent/session-store.ts`
- Create: `lib/agent/session-store.spec.ts`

In-memory store of session metadata (created segments, drafted campaigns) keyed by SDK session ID. LRU-capped at 100 sessions so a demo day of walk-ups doesn't leak memory.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getSession, setSession, appendSegment, appendCampaign, sessionCount } from './session-store';

describe('session-store', () => {
  beforeEach(() => {
    // reset by exhausting the LRU
    for (let i = 0; i < 200; i++) setSession(`s-${i}`, {});
    for (let i = 0; i < 200; i++) getSession(`s-${i}`);
  });

  it('stores and retrieves', () => {
    setSession('abc', { title: 'demo' });
    expect(getSession('abc')).toEqual({ title: 'demo', segments: [], campaigns: [] });
  });

  it('appends segments', () => {
    setSession('s1', {});
    appendSegment('s1', { id: 'seg-1', name: 'CS grads', size: 340 });
    const s = getSession('s1')!;
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].name).toBe('CS grads');
  });

  it('appends campaigns', () => {
    setSession('s2', {});
    appendCampaign('s2', { id: 'camp-1', segmentId: 'seg-1', channel: 'email' });
    expect(getSession('s2')!.campaigns).toHaveLength(1);
  });

  it('evicts oldest when over 100', () => {
    for (let i = 0; i < 105; i++) setSession(`k-${i}`, {});
    expect(sessionCount()).toBeLessThanOrEqual(100);
    expect(getSession('k-0')).toBeUndefined();
    expect(getSession('k-104')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `npm test -- session-store`

- [ ] **Step 3: Implementation**

```ts
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
```

- [ ] **Step 4: Run test — PASS**

Run: `npm test -- session-store`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/agent/session-store.ts lib/agent/session-store.spec.ts
git commit -m "feat(agent): in-memory LRU session store for segments + campaigns"
```

---

## Task 4: MCP tool — query_dynamics (representative, sets pattern for the other 5)

**Files:**
- Create: `lib/agent/mcp-tools/query-dynamics.ts`
- Create: `lib/agent/mcp-tools/query-dynamics.spec.ts`

Tools are pure functions over the loaded `DataBundle`. They accept a bundle argument (injected in Task 5's server factory) so tests don't need to touch the filesystem.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle } from '../../types';
import { queryDynamics } from './query-dynamics';

describe('queryDynamics', () => {
  let bundle: DataBundle;

  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-qd-'));
    await runGeneration({ outDir: tmp, seed: 3, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('filters alumni by industry', () => {
    const result = queryDynamics(bundle, {
      entity: 'alumni',
      filters: { industry: 'Technology' },
      limit: 20,
    });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((r) => r.currentIndustry === 'Technology')).toBe(true);
    expect(result.totalMatched).toBeGreaterThanOrEqual(result.rows.length);
  });

  it('filters prospects by leadRating', () => {
    const result = queryDynamics(bundle, {
      entity: 'prospects',
      filters: { leadRating: 'Hot' },
      limit: 10,
    });
    expect(result.rows.every((r) => r.leadRating === 'Hot')).toBe(true);
  });

  it('caps returned rows at limit', () => {
    const result = queryDynamics(bundle, { entity: 'alumni', filters: {}, limit: 5 });
    expect(result.rows).toHaveLength(5);
  });

  it('returns empty on unknown entity', () => {
    const result = queryDynamics(bundle, {
      // @ts-expect-error — testing runtime guard
      entity: 'unknown',
      filters: {},
      limit: 10,
    });
    expect(result.rows).toHaveLength(0);
    expect(result.totalMatched).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `npm test -- query-dynamics`

- [ ] **Step 3: Implementation**

```ts
import type { Alumni, DataBundle, ProspectiveLearner } from '../../types';

export interface QueryDynamicsInput {
  entity: 'alumni' | 'prospects';
  filters: {
    industry?: string;
    state?: string;
    seniority?: string;
    leadRating?: 'Hot' | 'Warm' | 'Cold';
    graduationYearMin?: number;
    graduationYearMax?: number;
  };
  limit?: number;
}

export interface QueryDynamicsOutput {
  rows: Array<Alumni | ProspectiveLearner>;
  totalMatched: number;
  entity: string;
}

export function queryDynamics(bundle: DataBundle, input: QueryDynamicsInput): QueryDynamicsOutput {
  const limit = input.limit ?? 20;
  const f = input.filters;

  let candidates: Array<Alumni | ProspectiveLearner>;
  if (input.entity === 'alumni') {
    candidates = bundle.alumni.filter((a) => {
      if (f.industry && a.currentIndustry !== f.industry) return false;
      if (f.state && a.state !== f.state) return false;
      if (f.seniority && a.currentSeniority !== f.seniority) return false;
      if (f.graduationYearMin && a.graduationYear < f.graduationYearMin) return false;
      if (f.graduationYearMax && a.graduationYear > f.graduationYearMax) return false;
      return true;
    });
  } else if (input.entity === 'prospects') {
    const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));
    candidates = bundle.prospects.filter((p) => {
      if (f.leadRating && p.leadRating !== f.leadRating) return false;
      const a = alumniById.get(p.alumniId);
      if (!a) return false;
      if (f.industry && a.currentIndustry !== f.industry) return false;
      if (f.state && a.state !== f.state) return false;
      if (f.seniority && a.currentSeniority !== f.seniority) return false;
      return true;
    });
  } else {
    return { rows: [], totalMatched: 0, entity: String(input.entity) };
  }

  return {
    rows: candidates.slice(0, limit),
    totalMatched: candidates.length,
    entity: input.entity,
  };
}
```

- [ ] **Step 4: Run test — PASS**

Run: `npm test -- query-dynamics`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/agent/mcp-tools/query-dynamics.ts lib/agent/mcp-tools/query-dynamics.spec.ts
git commit -m "feat(agent): query-dynamics tool — pure function over DataBundle"
```

---

## Task 5: MCP tools — remaining 5

Follow the same pattern as Task 4 for each. Full code for each is below; the TDD ritual is: write spec, run to see FAIL, paste code, run to see PASS, commit.

### 5a. `query-aep.ts` + spec

**Purpose:** Same underlying data as query-dynamics but AEP-framed (returns "profiles" and "audience count" language). The demo needs this to appear as a separate tool pill.

```ts
import type { Alumni, DataBundle } from '../../types';

export interface QueryAepInput {
  audienceCriteria: {
    industries?: string[];
    seniorities?: string[];
    states?: string[];
    hasRecentSignal?: boolean; // signal in last 90 days
  };
  limit?: number;
}

export interface QueryAepOutput {
  profiles: Array<{
    profileId: string; // alumni.crmId
    displayName: string;
    industry: string;
    seniority: string;
    location: string;
  }>;
  audienceSize: number;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function queryAep(bundle: DataBundle, input: QueryAepInput): QueryAepOutput {
  const limit = input.limit ?? 20;
  const now = Date.now();
  const c = input.audienceCriteria;

  const recentSignalAlumni = c.hasRecentSignal
    ? new Set(
        bundle.signals
          .filter((s) => now - new Date(s.detectedAt).getTime() <= NINETY_DAYS_MS)
          .map((s) => s.alumniId),
      )
    : null;

  const matched: Alumni[] = bundle.alumni.filter((a) => {
    if (c.industries && c.industries.length && !c.industries.includes(a.currentIndustry)) return false;
    if (c.seniorities && c.seniorities.length && !c.seniorities.includes(a.currentSeniority)) return false;
    if (c.states && c.states.length && !c.states.includes(a.state)) return false;
    if (recentSignalAlumni && !recentSignalAlumni.has(a.id)) return false;
    return true;
  });

  return {
    profiles: matched.slice(0, limit).map((a) => ({
      profileId: a.crmId,
      displayName: `${a.firstName} ${a.lastName}`,
      industry: a.currentIndustry,
      seniority: a.currentSeniority,
      location: `${a.city}, ${a.state}`,
    })),
    audienceSize: matched.length,
  };
}
```

Test (adapt Task 4's shape):
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle } from '../../types';
import { queryAep } from './query-aep';

describe('queryAep', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-qa-'));
    await runGeneration({ outDir: tmp, seed: 4, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('filters by industry list', () => {
    const r = queryAep(bundle, { audienceCriteria: { industries: ['Technology'] }, limit: 50 });
    expect(r.audienceSize).toBeGreaterThan(0);
    expect(r.profiles.every((p) => p.industry === 'Technology')).toBe(true);
  });

  it('restricts to recent-signal alumni when requested', () => {
    const all = queryAep(bundle, { audienceCriteria: {}, limit: 1 }).audienceSize;
    const recent = queryAep(bundle, { audienceCriteria: { hasRecentSignal: true }, limit: 1 }).audienceSize;
    expect(recent).toBeLessThanOrEqual(all);
  });

  it('shapes profiles with crmId + display name', () => {
    const r = queryAep(bundle, { audienceCriteria: {}, limit: 3 });
    for (const p of r.profiles) {
      expect(p.profileId).toMatch(/^crm-/);
      expect(p.displayName.split(' ').length).toBeGreaterThanOrEqual(2);
    }
  });
});
```

Commit: `feat(agent): query-aep tool — audience-framed AEP profile query`

### 5b. `query-linkedin.ts` + spec

**Purpose:** Returns signals + trajectory for a specific alumni, or lists alumni with a given signal type in a time window.

```ts
import type { Alumni, CareerSignal, DataBundle, SignalType } from '../../types';

export interface QueryLinkedInInput {
  mode: 'by_alumni' | 'by_signal_type';
  alumniId?: string; // required when mode = by_alumni
  signalType?: SignalType; // required when mode = by_signal_type
  withinDays?: number; // default 365
  limit?: number;
}

export interface QueryLinkedInOutput {
  mode: string;
  matches: Array<{
    alumniId: string;
    displayName: string;
    trajectorySummary: string;
    signals: CareerSignal[];
  }>;
  totalMatched: number;
}

export function queryLinkedin(bundle: DataBundle, input: QueryLinkedInInput): QueryLinkedInOutput {
  const withinDays = input.withinDays ?? 365;
  const limit = input.limit ?? 20;
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

  const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));

  if (input.mode === 'by_alumni' && input.alumniId) {
    const a = alumniById.get(input.alumniId);
    if (!a) return { mode: input.mode, matches: [], totalMatched: 0 };
    const signals = bundle.signals.filter((s) => s.alumniId === input.alumniId);
    return {
      mode: input.mode,
      matches: [
        {
          alumniId: a.id,
          displayName: `${a.firstName} ${a.lastName}`,
          trajectorySummary: summarizeTrajectory(a),
          signals,
        },
      ],
      totalMatched: 1,
    };
  }

  if (input.mode === 'by_signal_type' && input.signalType) {
    const signalsByAlumni = new Map<string, CareerSignal[]>();
    for (const s of bundle.signals) {
      if (s.type !== input.signalType) continue;
      if (new Date(s.detectedAt).getTime() < cutoff) continue;
      const arr = signalsByAlumni.get(s.alumniId) ?? [];
      arr.push(s);
      signalsByAlumni.set(s.alumniId, arr);
    }
    const entries = [...signalsByAlumni.entries()];
    return {
      mode: input.mode,
      totalMatched: entries.length,
      matches: entries.slice(0, limit).flatMap(([aid, signals]) => {
        const a = alumniById.get(aid);
        if (!a) return [];
        return [
          {
            alumniId: a.id,
            displayName: `${a.firstName} ${a.lastName}`,
            trajectorySummary: summarizeTrajectory(a),
            signals,
          },
        ];
      }),
    };
  }

  return { mode: input.mode, matches: [], totalMatched: 0 };
}

function summarizeTrajectory(a: Alumni): string {
  const first = a.careerTrajectory[0];
  const last = a.careerTrajectory[a.careerTrajectory.length - 1];
  return `${first.title} → ${last.title} (${a.careerTrajectory.length} roles, grad ${a.graduationYear})`;
}
```

Test — cover both modes + the empty case. Commit: `feat(agent): query-linkedin tool — signals + trajectory lookup`.

### 5c. `create-aep-segment.ts` + spec

**Purpose:** Records a segment in the session store (mock write). Returns the record + fake AEP segment ID.

```ts
import { appendSegment } from '../session-store';

export interface CreateAepSegmentInput {
  sessionId: string;
  name: string;
  audienceSize: number;
  criteriaSummary: string;
}

export interface CreateAepSegmentOutput {
  segmentId: string;
  aepSegmentId: string;
  name: string;
  audienceSize: number;
  createdAt: string;
}

let counter = 0;

export function createAepSegment(input: CreateAepSegmentInput): CreateAepSegmentOutput {
  counter++;
  const id = `seg-${Date.now()}-${counter}`;
  const aepId = `aep-seg-${String(counter).padStart(6, '0')}`;
  appendSegment(input.sessionId, {
    id,
    name: input.name,
    size: input.audienceSize,
  });
  return {
    segmentId: id,
    aepSegmentId: aepId,
    name: input.name,
    audienceSize: input.audienceSize,
    createdAt: new Date().toISOString(),
  };
}
```

Test: verify it appends to the store, returns both IDs, timestamps ISO. Commit: `feat(agent): create-aep-segment tool (mock write to session)`.

### 5d. `draft-ajo-campaign.ts` + spec

**Purpose:** Same shape as segment but for campaigns. Ties to a segment ID.

```ts
import { appendCampaign } from '../session-store';

export interface DraftAjoCampaignInput {
  sessionId: string;
  segmentId: string;
  channel: 'email' | 'sms' | 'push';
  subjectLine?: string;
  bodyPreview?: string;
}

export interface DraftAjoCampaignOutput {
  campaignId: string;
  ajoCampaignId: string;
  segmentId: string;
  channel: string;
  subjectLine?: string;
  bodyPreview?: string;
  createdAt: string;
}

let counter = 0;

export function draftAjoCampaign(input: DraftAjoCampaignInput): DraftAjoCampaignOutput {
  counter++;
  const id = `camp-${Date.now()}-${counter}`;
  const ajoId = `ajo-camp-${String(counter).padStart(6, '0')}`;
  appendCampaign(input.sessionId, {
    id,
    segmentId: input.segmentId,
    channel: input.channel,
  });
  return {
    campaignId: id,
    ajoCampaignId: ajoId,
    segmentId: input.segmentId,
    channel: input.channel,
    subjectLine: input.subjectLine,
    bodyPreview: input.bodyPreview,
    createdAt: new Date().toISOString(),
  };
}
```

Test parallels 5c. Commit: `feat(agent): draft-ajo-campaign tool (mock write to session)`.

### 5e. `run-propensity-model.ts` + spec

**Purpose:** Given a course ID (or course name) and optional segment filter, return top-N alumni by propensity score with reasoning.

```ts
import type { DataBundle } from '../../types';

export interface RunPropensityModelInput {
  courseIdOrName: string;
  filterAlumniIds?: string[]; // restrict to a segment
  topN?: number;
}

export interface RunPropensityModelOutput {
  courseId: string;
  courseName: string;
  ranked: Array<{
    alumniId: string;
    displayName: string;
    score: number;
    topFeatures: string[];
  }>;
}

export function runPropensityModel(
  bundle: DataBundle,
  input: RunPropensityModelInput,
): RunPropensityModelOutput {
  const topN = input.topN ?? 10;

  const course = bundle.courses.find(
    (c) =>
      c.id === input.courseIdOrName ||
      c.code === input.courseIdOrName ||
      c.name.toLowerCase().includes(input.courseIdOrName.toLowerCase()),
  );
  if (!course) {
    return { courseId: input.courseIdOrName, courseName: '(not found)', ranked: [] };
  }

  const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));
  const filter = input.filterAlumniIds ? new Set(input.filterAlumniIds) : null;

  const scores = bundle.propensity
    .filter((p) => p.courseId === course.id)
    .filter((p) => (filter ? filter.has(p.alumniId) : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return {
    courseId: course.id,
    courseName: course.name,
    ranked: scores.flatMap((p) => {
      const a = alumniById.get(p.alumniId);
      if (!a) return [];
      return [
        {
          alumniId: a.id,
          displayName: `${a.firstName} ${a.lastName}`,
          score: p.score,
          topFeatures: p.topFeatures,
        },
      ];
    }),
  };
}
```

Test — fuzzy course match + top-N sort + filter set behavior. Commit: `feat(agent): run-propensity-model tool with fuzzy course lookup`.

---

## Task 6: MCP server factory + agent runtime wiring

**Files:**
- Create: `lib/agent/system-prompt.ts`
- Create: `lib/agent/mcp-server.ts`
- Create: `lib/agent/map-sdk-events.ts`

- [ ] **Step 1: System prompt**

`lib/agent/system-prompt.ts`:
```ts
export const SYSTEM_PROMPT = `You are the UNSW Online Marketing Intelligence agent. You sit on top of UNSW's existing Dynamics 365, AEP, AJO, and SIMS stack. Every read/write you perform *looks like* it hits those systems — but source of truth stays there. You hold context and memory; you do not hold data.

Your job is to help UNSW's marketing team turn dormant alumni data into rich prospect profiles, contextual moments-of-relevance, and actionable segments.

Available tools:
- query_dynamics — search alumni + prospective learners (leads) with filters
- query_aep — query AEP audience profiles with audience criteria
- query_linkedin — look up LinkedIn-style career signals by alumni or by signal type
- create_aep_segment — save an audience as a segment in AEP
- draft_ajo_campaign — draft a campaign brief in AJO tied to a segment
- run_propensity_model — score alumni for a specific course

House style:
- Cite counts and specific examples ("340 alumni matched" not "many alumni")
- When you recommend an action, say WHY (which signal fired, which propensity feature drove the score)
- Never invent alumni names or IDs — always come from tool results
- Prefer 2-3 short paragraphs over long walls of text
- If the user's question is out of scope for these tools (e.g. asks about course pricing decisions, business restructures), politely reframe toward what the tools CAN answer

You are running against synthetic data. If asked, be honest: "This is synthetic data shaped from Dimitri's CRM data model. Same schema, made-up names."`;
```

- [ ] **Step 2: MCP server factory**

`lib/agent/mcp-server.ts`:
```ts
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { DataBundle } from '../types';
import { queryDynamics } from './mcp-tools/query-dynamics';
import { queryAep } from './mcp-tools/query-aep';
import { queryLinkedin } from './mcp-tools/query-linkedin';
import { createAepSegment } from './mcp-tools/create-aep-segment';
import { draftAjoCampaign } from './mcp-tools/draft-ajo-campaign';
import { runPropensityModel } from './mcp-tools/run-propensity-model';

/** Factory — the bundle is captured in the tool closures so tools don't hit the filesystem. */
export function createUnswMcpServer(bundle: DataBundle, sessionId: string) {
  return createSdkMcpServer({
    name: 'unsw-marketing',
    version: '0.1.0',
    tools: [
      tool(
        'query_dynamics',
        'Search alumni or prospective learners in Dynamics 365. Returns rows with reasoning.',
        {
          entity: z.enum(['alumni', 'prospects']),
          filters: z.object({
            industry: z.string().optional(),
            state: z.string().optional(),
            seniority: z.string().optional(),
            leadRating: z.enum(['Hot', 'Warm', 'Cold']).optional(),
            graduationYearMin: z.number().optional(),
            graduationYearMax: z.number().optional(),
          }),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryDynamics(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'query_aep',
        'Query AEP audience profiles by criteria. Returns profile records + audience size.',
        {
          audienceCriteria: z.object({
            industries: z.array(z.string()).optional(),
            seniorities: z.array(z.string()).optional(),
            states: z.array(z.string()).optional(),
            hasRecentSignal: z.boolean().optional(),
          }),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryAep(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'query_linkedin',
        'Look up LinkedIn-style career signals — by alumni ID, or across all alumni for a given signal type.',
        {
          mode: z.enum(['by_alumni', 'by_signal_type']),
          alumniId: z.string().optional(),
          signalType: z
            .enum([
              'promoted',
              'role_change',
              'industry_change',
              'location_change',
              'redundancy_risk',
              'course_recency_threshold',
              'alumni_anniversary',
            ])
            .optional(),
          withinDays: z.number().optional(),
          limit: z.number().optional(),
        },
        async (input) => {
          const result = queryLinkedin(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'create_aep_segment',
        'Create an audience segment in AEP. Returns the segment IDs.',
        {
          name: z.string(),
          audienceSize: z.number(),
          criteriaSummary: z.string(),
        },
        async (input) => {
          const result = createAepSegment({ ...input, sessionId });
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'draft_ajo_campaign',
        'Draft a campaign brief in AJO tied to an existing AEP segment.',
        {
          segmentId: z.string(),
          channel: z.enum(['email', 'sms', 'push']),
          subjectLine: z.string().optional(),
          bodyPreview: z.string().optional(),
        },
        async (input) => {
          const result = draftAjoCampaign({ ...input, sessionId });
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
      tool(
        'run_propensity_model',
        'Score alumni for a specific course. Optionally restrict to a subset of alumni IDs (a segment).',
        {
          courseIdOrName: z.string(),
          filterAlumniIds: z.array(z.string()).optional(),
          topN: z.number().optional(),
        },
        async (input) => {
          const result = runPropensityModel(bundle, input);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        },
      ),
    ],
  });
}
```

Note: the exact `tool()` signature above matches the Claude Agent SDK pattern; if Task 1's export check surfaced a different signature, adapt.

- [ ] **Step 3: SDK → AgentEvent mapper**

`lib/agent/map-sdk-events.ts` — pragmatic mapper. The SDK's `query()` yields SDK messages of various types; we map:
- Text streams → `text_delta`
- Thinking streams → `thinking_delta`
- Tool use blocks → `tool_use` + subsequent `tool_result`
- Session init → `session_started`
- Errors → `error`
- End of stream → `done`

```ts
import type { AgentEvent } from './events';

/** Best-effort mapper — SDK message shape varies; narrow on `.type` at runtime. */
export function mapSdkMessageToEvents(msg: unknown): AgentEvent[] {
  if (!msg || typeof msg !== 'object') return [];
  const m = msg as Record<string, unknown>;
  const t = m.type;

  if (t === 'system' && m.subtype === 'init') {
    const sessionId = typeof m.session_id === 'string' ? m.session_id : undefined;
    return sessionId ? [{ type: 'session_started', sessionId }] : [];
  }

  if (t === 'stream_event') {
    const ev = m.event as Record<string, unknown> | undefined;
    if (!ev) return [];
    const evType = ev.type;
    if (evType === 'content_block_delta') {
      const delta = ev.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        return [{ type: 'text_delta', delta: delta.text }];
      }
      if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        return [{ type: 'thinking_delta', delta: delta.thinking }];
      }
    }
    return [];
  }

  if (t === 'assistant') {
    // Batched assistant message — extract tool_use blocks (text/thinking already streamed)
    const message = m.message as Record<string, unknown> | undefined;
    const content = (message?.content as unknown[] | undefined) ?? [];
    const out: AgentEvent[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' && typeof b.name === 'string') {
        out.push({
          type: 'tool_use',
          tool: normalizeToolName(b.name),
          input: b.input ?? {},
          toolUseId: typeof b.id === 'string' ? b.id : undefined,
        });
      }
    }
    return out;
  }

  if (t === 'user') {
    // Tool results echo back as user messages
    const message = m.message as Record<string, unknown> | undefined;
    const content = (message?.content as unknown[] | undefined) ?? [];
    const out: AgentEvent[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_result') {
        out.push({
          type: 'tool_result',
          tool: 'unknown', // SDK doesn't include the tool name on the result — client can correlate by toolUseId
          output: b.content ?? null,
          toolUseId: typeof b.tool_use_id === 'string' ? b.tool_use_id : undefined,
          isError: b.is_error === true,
        });
      }
    }
    return out;
  }

  if (t === 'result') {
    if (m.subtype === 'error') {
      const errMsg = typeof m.error === 'string' ? m.error : 'agent error';
      return [{ type: 'error', message: errMsg }, { type: 'done' }];
    }
    return [{ type: 'done' }];
  }

  return [];
}

function normalizeToolName(name: string): string {
  // Strip mcp__<server>__ prefix — the demo cares about the tool name only
  const match = /^mcp__[^_]+__(.+)$/.exec(name);
  return match ? match[1] : name;
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/agent/system-prompt.ts lib/agent/mcp-server.ts lib/agent/map-sdk-events.ts
git commit -m "feat(agent): system prompt, MCP server factory, SDK event mapper"
```

---

## Task 7: Rewrite `/api/chat` route

**Files:**
- Modify: `app/api/chat/route.ts`
- Create: `app/api/chat/route.spec.ts` (integration test with mocked query())

- [ ] **Step 1: Rewrite the route**

`app/api/chat/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { getDataBundle } from '../../../lib/data';
import { createUnswMcpServer } from '../../../lib/agent/mcp-server';
import { SYSTEM_PROMPT } from '../../../lib/agent/system-prompt';
import { mapSdkMessageToEvents } from '../../../lib/agent/map-sdk-events';
import { setSession } from '../../../lib/agent/session-store';
import type { AgentEvent } from '../../../lib/agent/events';

interface ChatRequestBody {
  prompt: string;
  sessionId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
  const prompt = body.prompt?.trim();
  const resumeSessionId = body.sessionId;

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const bundle = await getDataBundle();
  // Session ID for our tool closures — either the resumed one or a placeholder
  // that gets replaced by session_started when the SDK emits it.
  const sessionIdForTools = resumeSessionId ?? `pending-${Date.now()}`;
  setSession(sessionIdForTools, {});
  const mcpServer = createUnswMcpServer(bundle, sessionIdForTools);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      try {
        const iter = query({
          prompt,
          options: {
            model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7',
            systemPrompt: SYSTEM_PROMPT,
            mcpServers: { 'unsw-marketing': mcpServer },
            allowedTools: [
              'mcp__unsw-marketing__query_dynamics',
              'mcp__unsw-marketing__query_aep',
              'mcp__unsw-marketing__query_linkedin',
              'mcp__unsw-marketing__create_aep_segment',
              'mcp__unsw-marketing__draft_ajo_campaign',
              'mcp__unsw-marketing__run_propensity_model',
            ],
            includePartialMessages: true,
            ...(resumeSessionId ? { resume: resumeSessionId } : {}),
          },
        });

        for await (const msg of iter) {
          for (const ev of mapSdkMessageToEvents(msg)) {
            send(ev);
          }
        }
        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message });
        send({ type: 'done' });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(agent): wire /api/chat to real Claude Agent SDK query()"
```

Skip a spec file for the route — it depends on the SDK network layer. Manual verification happens in Task 9 (integration test).

---

## Task 8: Client SSE hook + AgentPanel wiring

**Files:**
- Create: `hooks/useAgentChat.ts`
- Modify: `components/AgentPanel.tsx`

- [ ] **Step 1: Write the hook**

`hooks/useAgentChat.ts`:
```ts
'use client';

import { useCallback, useRef, useState } from 'react';
import type { AgentEvent } from '../lib/agent/events';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  toolCalls: Array<{ tool: string; input: unknown; toolUseId?: string; status: 'running' | 'done' }>;
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);

  const send = useCallback(async (prompt: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
      toolCalls: [],
    };
    const agentMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'agent',
      text: '',
      toolCalls: [],
    };
    setMessages((m) => [...m, userMsg, agentMsg]);
    setBusy(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId: sessionIdRef.current }),
    });

    if (!res.ok || !res.body) {
      setMessages((m) =>
        m.map((msg) => (msg.id === agentMsg.id ? { ...msg, text: `[error: ${res.status}]` } : msg)),
      );
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const raw = part.slice(6);
        let ev: AgentEvent;
        try {
          ev = JSON.parse(raw) as AgentEvent;
        } catch {
          continue;
        }
        applyEvent(agentMsg.id, ev, setMessages, sessionIdRef);
        if (ev.type === 'done') {
          setBusy(false);
          return;
        }
      }
    }
    setBusy(false);
  }, []);

  return { messages, busy, send };
}

function applyEvent(
  agentMsgId: string,
  ev: AgentEvent,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  sessionIdRef: React.MutableRefObject<string | undefined>,
) {
  if (ev.type === 'session_started') {
    sessionIdRef.current = ev.sessionId;
    return;
  }
  if (ev.type === 'text_delta') {
    setMessages((m) =>
      m.map((msg) => (msg.id === agentMsgId ? { ...msg, text: msg.text + ev.delta } : msg)),
    );
    return;
  }
  if (ev.type === 'tool_use') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId
          ? {
              ...msg,
              toolCalls: [
                ...msg.toolCalls,
                { tool: ev.tool, input: ev.input, toolUseId: ev.toolUseId, status: 'running' },
              ],
            }
          : msg,
      ),
    );
    return;
  }
  if (ev.type === 'tool_result') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId
          ? {
              ...msg,
              toolCalls: msg.toolCalls.map((tc) =>
                tc.toolUseId === ev.toolUseId ? { ...tc, status: 'done' } : tc,
              ),
            }
          : msg,
      ),
    );
    return;
  }
  if (ev.type === 'error') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId ? { ...msg, text: msg.text + `\n[error: ${ev.message}]` } : msg,
      ),
    );
  }
}
```

- [ ] **Step 2: Rewrite `AgentPanel`**

```tsx
'use client';

import { useState } from 'react';
import { useAgentChat } from '../hooks/useAgentChat';

export function AgentPanel() {
  const { messages, busy, send } = useAgentChat();
  const [input, setInput] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const p = input;
    setInput('');
    await send(p);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-unsw-navy/10 px-4 py-3">
        <div className="text-sm font-semibold text-unsw-navy">Agent</div>
        <div className="text-xs text-unsw-slate">Ask about alumni, cohorts, segments</div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
        {messages.length === 0 && (
          <div className="text-unsw-slate/70">Try: "Who's a good target for AI for Leaders?"</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-1">
            <div
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-lg bg-unsw-navy px-3 py-2 text-white'
                  : 'max-w-[85%] rounded-lg bg-unsw-mist px-3 py-2 text-unsw-navy whitespace-pre-wrap'
              }
            >
              {m.text || (m.role === 'agent' && busy ? '…' : '')}
            </div>
            {m.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.toolCalls.map((tc, i) => (
                  <span
                    key={i}
                    className={
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ' +
                      (tc.status === 'done'
                        ? 'border-green-500 text-green-700'
                        : 'border-unsw-slate text-unsw-slate animate-pulse')
                    }
                  >
                    <span className="font-mono">{tc.tool}</span>
                    <span>{tc.status === 'done' ? '✓' : '...'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-unsw-navy/10 p-3">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent..."
            disabled={busy}
            className="flex-1 rounded-md border border-unsw-navy/20 px-3 py-2 text-sm focus:border-unsw-navy focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-unsw-navy px-3 py-2 text-sm font-medium text-white hover:bg-unsw-navy/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add hooks/useAgentChat.ts components/AgentPanel.tsx
git commit -m "feat(agent): client-side SSE hook + AgentPanel with live tool pills"
```

---

## Task 9: Manual integration test

**Files:**
- Modify: `.env.example` (documentation only)
- Modify: `docs/03-AGENT-LAYER.md` (mark canned section as replaced)

- [ ] **Step 1: Update `.env.example`**

Replace the old `USE_REAL_AGENT` line with:
```
# Anthropic API key — required for the agent runtime
ANTHROPIC_API_KEY=

# Optional model override — defaults to claude-opus-4-7
ANTHROPIC_MODEL=
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all previous tests still pass, plus new specs from tasks 2-5.

- [ ] **Step 3: Set an API key and run the app**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open `http://localhost:3000`, click into the agent panel, ask: *"Who are the top 5 targets for the AI for Leaders certificate right now?"*

**Expected:**
- Agent text streams live
- Tool pills appear (`query_dynamics`, `run_propensity_model` at minimum)
- Pills flip from pulsing → green check
- Final answer cites specific alumni names (from synthetic data) and reasoning

**If the tool pill for tool_result shows tool: 'unknown'** — that's a known limitation of the current mapper (the SDK doesn't echo the tool name on the result). The pill still flips to "done" via toolUseId correlation. Log a follow-up in `docs/followups.md` if it looks bad in the UI.

- [ ] **Step 4: Update the agent-layer doc**

In `docs/03-AGENT-LAYER.md`, replace the "What the demo actually does" section header with "What plan #1's stub did (superseded)" and add a new "Actual runtime (plan #2)" section pointing at `lib/agent/*` and `app/api/chat/route.ts`.

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/03-AGENT-LAYER.md
git commit -m "docs(agent): document real runtime + Anthropic API key requirement"
```

---

## Done criteria

- `npm test` passes across all specs (previous 42 + new ~25 = ~67 tests)
- `npm run typecheck` clean
- With a real `ANTHROPIC_API_KEY`, the AgentPanel returns a text stream + tool pills for the demo prompt
- The system prompt and 6 MCP tools cover every canned prompt from `docs/01-DEMO-NARRATIVE.md` well enough to run the workshop path unscripted

**Next plan:** `2026-07-30-tab-segmentation.md` — build the actual Segmentation + Campaign tab UI on top of this runtime.

**Deferred to later plans (not blockers for #2):**
- Hook-based write gating (only needed if we ever wire real AEP/AJO writes)
- Compaction / long-conversation handling
- Real permission policies on tool use (`always_ask` for the mock write tools) — useful for a "governance is visible" story on demo day, decide during tab plans

**Known limitations of this plan (accept for demo, fix if productionising):**
- **Placeholder sessionId in tool closures.** The route creates `sessionIdForTools = pending-<timestamp>` before `session_started` fires, so any `create_aep_segment` / `draft_ajo_campaign` calls in the first turn get stored under the placeholder key rather than the real SDK session ID. Subsequent turns (with `resume: sessionId`) use the real key. For workshop-day one-shot sessions this doesn't matter; if we ever want the AgentPanel to render "segments created this session" across turns, refactor the tool factory to accept a ref that gets patched on `session_started`.
- **`tool_result` events carry `tool: 'unknown'`.** The SDK doesn't echo the tool name on tool results — the mapper correlates by `toolUseId` instead. UI status ("done" checkmark) works, but if you want the tool_result payload to be inspectable by tool name in the browser, either look up in a client-side `Map<toolUseId, toolName>` or extend the mapper to track the correlation server-side.
