# Course Intelligence Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Forecast tab with a Course Intelligence tab that makes agent reasoning visible on screen, fix the "Save to AEP" nav button to say "Push to CRM", and update the Segments cross-link.

**Architecture:** Three changes from the Aug 7 call spec:
1. Nav button "Save to AEP" → "Push to CRM" (Dynamics is the lead master, not AEP-first).
2. Forecast tab replaced with Course Intelligence — agent reads signals, cross-references purchase history, surfaces course priorities + catalogue gaps + forward-looking market trends. Agent reasoning is revealed on-screen step-by-step (the demo "wow" moment).
3. Everything in the new tab is fixture-driven (same as v2 pattern) — real MCP tool calls fire in the background for the audit log only.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict, Node16 module resolution with `.js` import extensions), Tailwind CSS (existing design tokens — `ink`, `paper`, `mist`, `unsw-yellow`, `muted`, `muted-soft`, `ok-border`, `ok-text`), vitest for tests.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/brand.ts` | Rename Forecast tab entry → Course Intelligence |
| Modify | `components/PrimaryNav.tsx` | "Save to AEP" → "Push to CRM" |
| Modify | `app/segments/page.tsx` | Update "Forecast this segment" cross-link |
| Create | `lib/tab-data/course-intelligence-fixture.ts` | Types + fixture data for the new tab |
| Create | `lib/tab-data/course-intelligence-fixture.spec.ts` | Tests for the fixture |
| Modify | `lib/handoff/payloads.ts` | Add `buildCrmCampaignPayload` |
| Create | `app/course-intelligence/page.tsx` | The new tab page |
| Delete | `app/forecast/page.tsx` | Remove Forecast route |

---

## Task 1: Rename tab + fix nav button + update cross-link

**Files:**
- Modify: `lib/brand.ts`
- Modify: `components/PrimaryNav.tsx`
- Modify: `app/segments/page.tsx`

- [ ] **Step 1: Update `lib/brand.ts`**

Replace the `forecast` tab entry with `course-intelligence`:

```typescript
// lib/brand.ts
export const brand = {
  name: 'Marketing Intelligence',
  wordmark: 'https://www.unsw.edu.au/content/dam/images/graphics/logos/unsw/unsw_0.png',
} as const;

export const tabs = [
  { href: '/signals', label: 'Signals' },
  { href: '/cohorts', label: 'Cohorts' },
  { href: '/segments', label: 'Segments' },
  { href: '/course-intelligence', label: 'Course Intelligence' },
] as const;
```

- [ ] **Step 2: Update `components/PrimaryNav.tsx` — change button label**

Find the `Save to AEP` text in `PrimaryNav.tsx` (line ~47) and change it:

```tsx
// Before:
>
  Save to AEP
</Link>

// After:
>
  Push to CRM
</Link>
```

- [ ] **Step 3: Update `app/segments/page.tsx` — update cross-link**

Find the `OutlineButton` with `href="/forecast"` (around line 264) and update it:

```tsx
// Before:
<OutlineButton href="/forecast">Forecast this segment</OutlineButton>

// After:
<OutlineButton href="/course-intelligence">Course Intelligence</OutlineButton>
```

- [ ] **Step 4: Run tests to confirm no breakage**

```bash
cd C:\Users\thobbs\unsw-online-demo
npx vitest run
```

Expected: all existing tests pass (nothing in the test suite references the Forecast tab name or nav button text).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/brand.ts components/PrimaryNav.tsx app/segments/page.tsx
git commit -m "feat: rename Forecast tab to Course Intelligence, fix nav CTA to Push to CRM"
```

---

## Task 2: Create course intelligence fixture + tests

**Files:**
- Create: `lib/tab-data/course-intelligence-fixture.ts`
- Create: `lib/tab-data/course-intelligence-fixture.spec.ts`

- [ ] **Step 1: Write the failing test first**

Create `lib/tab-data/course-intelligence-fixture.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getCourseIntelligence } from './course-intelligence-fixture.js';

describe('getCourseIntelligence', () => {
  it('returns 5 recommendations ranked 1-5', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.recommendations).toHaveLength(5);
    expect(result.recommendations.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns 4 agent steps', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.agentSteps).toHaveLength(4);
    expect(result.agentSteps.every((s) => s.label.length > 0 && s.detail.length > 0)).toBe(true);
  });

  it('returns 2 catalogue gaps', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.catalogueGaps).toHaveLength(2);
    expect(result.catalogueGaps.every((g) => g.potentialCohortSize > 0)).toBe(true);
  });

  it('returns 4 market trends', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.marketTrends).toHaveLength(4);
  });

  it('CS cohort has AIL as top recommendation', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('AIL');
  });

  it('Engineering cohort has DSP as top recommendation', () => {
    const result = getCourseIntelligence('eng', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('DSP');
  });

  it('Commerce cohort has FIN as top recommendation', () => {
    const result = getCourseIntelligence('commerce', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('FIN');
  });

  it('all cohorts returns valid opportunity scores', () => {
    const result = getCourseIntelligence('all', 'any', '24m');
    expect(result.recommendations.every((r) => r.opportunityScore > 0 && r.opportunityScore <= 1)).toBe(true);
  });

  it('agent summary mentions the cohort label', () => {
    const cs = getCourseIntelligence('cs', 'role-change', '12m');
    expect(cs.agentSummary).toContain('CS graduates');

    const eng = getCourseIntelligence('eng', 'promoted', '6m');
    expect(eng.agentSummary).toContain('Engineering graduates');
  });

  it('badge values are valid', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    const validBadges = new Set(['trending', 'gap', null]);
    expect(result.recommendations.every((r) => validBadges.has(r.badge))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run lib/tab-data/course-intelligence-fixture.spec.ts
```

Expected: FAIL — `Cannot find module './course-intelligence-fixture.js'`

- [ ] **Step 3: Create `lib/tab-data/course-intelligence-fixture.ts`**

```typescript
export type Cohort = 'cs' | 'eng' | 'commerce' | 'all';
export type Signal = 'role-change' | 'promoted' | 'redundancy' | 'any';
export type Window = '6m' | '12m' | '24m';

export interface CourseRecommendation {
  rank: number;
  courseCode: string;
  courseName: string;
  matchedAlumni: number;
  historicalConversionPct: number;
  opportunityScore: number;
  badge: 'trending' | 'gap' | null;
  rationale: string;
}

export interface CatalogueGap {
  id: string;
  title: string;
  signal: string;
  potentialCohortSize: number;
}

export interface MarketTrend {
  id: string;
  text: string;
}

export interface AgentStep {
  id: number;
  label: string;
  detail: string;
}

export interface CourseIntelligenceResult {
  agentSummary: string;
  agentSteps: AgentStep[];
  recommendations: CourseRecommendation[];
  catalogueGaps: CatalogueGap[];
  marketTrends: MarketTrend[];
}

const COHORT_LABELS: Record<Cohort, string> = {
  cs: 'CS graduates',
  eng: 'Engineering graduates',
  commerce: 'Commerce graduates',
  all: 'all alumni',
};

const SIGNAL_LABELS: Record<Signal, string> = {
  'role-change': 'changed roles',
  promoted: 'were promoted',
  redundancy: 'are at redundancy risk',
  any: 'had any career signal',
};

const SIGNAL_COUNTS: Record<Cohort, number> = {
  cs: 418,
  eng: 312,
  commerce: 276,
  all: 1288,
};

const TOP_COURSE_BY_COHORT: Record<Cohort, string> = {
  cs: 'AI for Leaders is the standout — 3.2× above baseline conversion for this cohort.',
  eng: 'Data Strategy is the strongest match — engineering grads transitioning to leadership show 2.9× above baseline.',
  commerce: 'Financial Modelling is the top pick — commerce grads in new senior roles show the highest historical match.',
  all: 'AI for Leaders leads across all cohorts — 2.8× above baseline conversion for career-transition signals.',
};

const CS_RECS: CourseRecommendation[] = [
  {
    rank: 1,
    courseCode: 'AIL',
    courseName: 'AI for Leaders',
    matchedAlumni: 214,
    historicalConversionPct: 0.089,
    opportunityScore: 0.91,
    badge: 'trending',
    rationale: '89 CS grads who changed roles in the last 12 months purchased this course. Match rate 3.2× above baseline.',
  },
  {
    rank: 2,
    courseCode: 'PMG',
    courseName: 'Product Management Essentials',
    matchedAlumni: 156,
    historicalConversionPct: 0.062,
    opportunityScore: 0.78,
    badge: 'trending',
    rationale: '62 alumni transitioned to product roles. Role change is a strong predictor for PM uptake.',
  },
  {
    rank: 3,
    courseCode: 'DSP',
    courseName: 'Data Strategy for Professionals',
    matchedAlumni: 103,
    historicalConversionPct: 0.041,
    opportunityScore: 0.65,
    badge: null,
    rationale: 'Strong overlap with CS background and leadership trajectory.',
  },
  {
    rank: 4,
    courseCode: 'CLD',
    courseName: 'Cloud Architecture Certificate',
    matchedAlumni: 87,
    historicalConversionPct: 0.034,
    opportunityScore: 0.58,
    badge: null,
    rationale: 'High relevance for CS grads moving into senior technical roles.',
  },
  {
    rank: 5,
    courseCode: 'CYB',
    courseName: 'Cybersecurity Fundamentals',
    matchedAlumni: 45,
    historicalConversionPct: 0.018,
    opportunityScore: 0.41,
    badge: null,
    rationale: 'Growing industry demand; lower historical rate suggests untapped potential.',
  },
];

const ENG_RECS: CourseRecommendation[] = [
  {
    rank: 1,
    courseCode: 'DSP',
    courseName: 'Data Strategy for Professionals',
    matchedAlumni: 188,
    historicalConversionPct: 0.082,
    opportunityScore: 0.89,
    badge: 'trending',
    rationale: 'Data strategy is the top transition for engineering grads moving into leadership.',
  },
  {
    rank: 2,
    courseCode: 'CLD',
    courseName: 'Cloud Architecture Certificate',
    matchedAlumni: 142,
    historicalConversionPct: 0.065,
    opportunityScore: 0.74,
    badge: 'trending',
    rationale: 'Cloud skills remain in high demand; engineering cohort shows the strongest match.',
  },
  {
    rank: 3,
    courseCode: 'AIL',
    courseName: 'AI for Leaders',
    matchedAlumni: 97,
    historicalConversionPct: 0.044,
    opportunityScore: 0.62,
    badge: null,
    rationale: 'Strong for senior engineers moving into leadership positions.',
  },
  {
    rank: 4,
    courseCode: 'PMG',
    courseName: 'Product Management Essentials',
    matchedAlumni: 78,
    historicalConversionPct: 0.031,
    opportunityScore: 0.55,
    badge: null,
    rationale: 'Engineering-to-PM transitions are a growing pattern in the cohort.',
  },
  {
    rank: 5,
    courseCode: 'CYB',
    courseName: 'Cybersecurity Fundamentals',
    matchedAlumni: 52,
    historicalConversionPct: 0.021,
    opportunityScore: 0.38,
    badge: null,
    rationale: 'Regulatory pressure on infrastructure and cloud teams is growing.',
  },
];

const COMMERCE_RECS: CourseRecommendation[] = [
  {
    rank: 1,
    courseCode: 'FIN',
    courseName: 'Financial Modelling for Non-Finance Managers',
    matchedAlumni: 163,
    historicalConversionPct: 0.073,
    opportunityScore: 0.86,
    badge: 'trending',
    rationale: 'Commerce grads moving into senior management roles show the highest conversion for financial skills top-ups.',
  },
  {
    rank: 2,
    courseCode: 'DSP',
    courseName: 'Data Strategy for Professionals',
    matchedAlumni: 131,
    historicalConversionPct: 0.058,
    opportunityScore: 0.72,
    badge: null,
    rationale: 'Data fluency is increasingly required across commercial, finance, and consulting roles.',
  },
  {
    rank: 3,
    courseCode: 'ESG',
    courseName: 'ESG & Sustainable Finance',
    matchedAlumni: 89,
    historicalConversionPct: 0.039,
    opportunityScore: 0.61,
    badge: 'trending',
    rationale: 'ESG disclosure requirements are accelerating demand across FinServ and consulting.',
  },
  {
    rank: 4,
    courseCode: 'HRM',
    courseName: 'People Analytics for HR Leaders',
    matchedAlumni: 62,
    historicalConversionPct: 0.028,
    opportunityScore: 0.49,
    badge: null,
    rationale: 'Commerce grads in people leadership roles are a growing and underserved segment.',
  },
  {
    rank: 5,
    courseCode: 'AIL',
    courseName: 'AI for Leaders',
    matchedAlumni: 44,
    historicalConversionPct: 0.019,
    opportunityScore: 0.37,
    badge: null,
    rationale: 'AI adoption in commercial roles is accelerating — currently underpenetrated in this cohort.',
  },
];

const ALL_RECS: CourseRecommendation[] = [
  {
    rank: 1,
    courseCode: 'AIL',
    courseName: 'AI for Leaders',
    matchedAlumni: 512,
    historicalConversionPct: 0.071,
    opportunityScore: 0.88,
    badge: 'trending',
    rationale: 'Highest cross-cohort demand. Alumni who changed roles show 2.8× above-baseline conversion.',
  },
  {
    rank: 2,
    courseCode: 'DSP',
    courseName: 'Data Strategy for Professionals',
    matchedAlumni: 398,
    historicalConversionPct: 0.055,
    opportunityScore: 0.76,
    badge: 'trending',
    rationale: 'Strong signal across all fields — data fluency is a universal leadership skill.',
  },
  {
    rank: 3,
    courseCode: 'PMG',
    courseName: 'Product Management Essentials',
    matchedAlumni: 267,
    historicalConversionPct: 0.038,
    opportunityScore: 0.63,
    badge: null,
    rationale: 'Cross-discipline transitions into product are growing across all cohorts.',
  },
  {
    rank: 4,
    courseCode: 'CLD',
    courseName: 'Cloud Architecture Certificate',
    matchedAlumni: 198,
    historicalConversionPct: 0.027,
    opportunityScore: 0.52,
    badge: null,
    rationale: 'Technical alumni cohorts show consistent demand for cloud credentials.',
  },
  {
    rank: 5,
    courseCode: 'ESG',
    courseName: 'ESG & Sustainable Finance',
    matchedAlumni: 134,
    historicalConversionPct: 0.019,
    opportunityScore: 0.44,
    badge: null,
    rationale: 'Regulatory tailwind across FinServ, consulting, and government cohorts.',
  },
];

const CATALOGUE_GAPS: CatalogueGap[] = [
  {
    id: 'gap-platform-eng',
    title: 'Platform Engineering',
    signal:
      '340 CS and Engineering grads are now in Senior/Lead platform roles with no relevant UNSW Online course.',
    potentialCohortSize: 340,
  },
  {
    id: 'gap-ai-ethics',
    title: 'AI Ethics & Governance',
    signal:
      'LinkedIn shows 18% YoY growth in "responsible AI" role descriptions. No UNSW product covers this space.',
    potentialCohortSize: 520,
  },
];

const MARKET_TRENDS: MarketTrend[] = [
  {
    id: 'mt-1',
    text: 'AI adoption in enterprise is accelerating — AI for Leaders demand expected to grow 35% in H2.',
  },
  {
    id: 'mt-2',
    text: 'Platform engineering roles growing 28% YoY; a targeted course could capture significant alumni demand.',
  },
  {
    id: 'mt-3',
    text: 'SOCI Act amendments expected to drive cybersecurity re-skilling in FinServ and government cohorts.',
  },
  {
    id: 'mt-4',
    text: 'Micro-credential preference rising among career changers — shorter formats outperforming 16-week courses.',
  },
];

const RECS_BY_COHORT: Record<Cohort, CourseRecommendation[]> = {
  cs: CS_RECS,
  eng: ENG_RECS,
  commerce: COMMERCE_RECS,
  all: ALL_RECS,
};

export function getCourseIntelligence(
  cohort: Cohort,
  signal: Signal,
  window: Window,
): CourseIntelligenceResult {
  const cohortLabel = COHORT_LABELS[cohort];
  const signalLabel = SIGNAL_LABELS[signal];
  const signalCount = SIGNAL_COUNTS[cohort];

  return {
    agentSummary: `Based on ${signalCount.toLocaleString()} signals from ${cohortLabel} who ${signalLabel}, I cross-referenced 3 years of course purchase history and identified the top opportunities to prioritise. ${TOP_COURSE_BY_COHORT[cohort]} Two catalogue gaps have meaningful cohort sizes with no existing product.`,
    agentSteps: [
      {
        id: 1,
        label: 'Reading career signals',
        detail: `Analysing ${signalCount.toLocaleString()} career events from the ${cohortLabel} cohort`,
      },
      {
        id: 2,
        label: 'Cross-referencing purchase history',
        detail:
          'Matching career transition patterns against 3-year course purchase history for similar profiles',
      },
      {
        id: 3,
        label: 'Projecting forward demand',
        detail:
          'Applying market trend signals from LinkedIn activity and AJO engagement data',
      },
      {
        id: 4,
        label: 'Identifying catalogue gaps',
        detail:
          'Checking signal volume against existing course catalogue — found 2 gaps with meaningful cohort sizes',
      },
    ],
    recommendations: RECS_BY_COHORT[cohort],
    catalogueGaps: CATALOGUE_GAPS,
    marketTrends: MARKET_TRENDS,
  };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run lib/tab-data/course-intelligence-fixture.spec.ts
```

Expected: 10 tests pass.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/tab-data/course-intelligence-fixture.ts lib/tab-data/course-intelligence-fixture.spec.ts
git commit -m "feat: add course intelligence fixture with typed recommendations, gaps, and market trends"
```

---

## Task 3: Add CRM campaign handoff payload

**Files:**
- Modify: `lib/handoff/payloads.ts`

- [ ] **Step 1: Add the interface and function to `lib/handoff/payloads.ts`**

Append the following to the end of `lib/handoff/payloads.ts` (after the closing of `buildPql`):

```typescript
export interface CourseIntelligenceHandoffInput {
  cohortLabel: string;
  topCourseName: string;
  topCourseCode: string;
  matchedAlumni: number;
  catalogueGaps: Array<{ title: string; potentialCohortSize: number }>;
}

export function buildCrmCampaignPayload(input: CourseIntelligenceHandoffInput) {
  return {
    endpoint: 'https://api.dynamics.com/v9.2/campaigns',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Azure AD — fetched at runtime by the CRM connector>',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: {
      name: `UNSW Online · ${input.topCourseCode} · ${input.cohortLabel}`,
      description: `Agent-drafted campaign — top opportunity from Course Intelligence. ${input.matchedAlumni.toLocaleString()} matched alumni with historical purchase signals.`,
      typecode: 1,
      statuscode: 0,
      prospectscountbase: input.matchedAlumni,
      subject: `${input.topCourseName} — right course, right moment for your career`,
      customFields: {
        unsw_source: 'marketing-intelligence-agent',
        unsw_governed_by: 'UNSW policy v1.2',
        unsw_cohort: input.cohortLabel,
        unsw_top_course: input.topCourseCode,
        unsw_catalogue_gap_titles: input.catalogueGaps.map((g) => g.title).join(', '),
        unsw_created_at: isoNow(),
        unsw_idempotency_key: fauxId('crm'),
      },
      meta: {
        note: 'Dynamics is the lead master — AEP will be populated from Dynamics via the CRM→AEP integration.',
        nextStep:
          'Review in Dynamics, assign journey, then sync to AJO via the CRM-AEP connector.',
      },
    },
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean. The new function uses `isoNow` and `fauxId` already defined in the file.

- [ ] **Step 3: Run tests to confirm no regression**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/handoff/payloads.ts
git commit -m "feat: add buildCrmCampaignPayload for Course Intelligence tab handoff"
```

---

## Task 4: Build the Course Intelligence page

**Files:**
- Create: `app/course-intelligence/page.tsx`

- [ ] **Step 1: Create `app/course-intelligence/page.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueryBand, QueryStatic, QueryToken } from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import { usePayload } from '../../components/PayloadContext';
import { useServerTool } from '../../hooks/useServerTool';
import {
  getCourseIntelligence,
  type AgentStep,
  type CatalogueGap,
  type Cohort,
  type CourseIntelligenceResult,
  type CourseRecommendation,
  type MarketTrend,
  type Signal,
  type Window,
} from '../../lib/tab-data/course-intelligence-fixture.js';
import { buildCrmCampaignPayload } from '../../lib/handoff/payloads.js';

const CHIPS = [
  { name: 'query_dynamics' },
  { name: 'query_aep' },
  { name: 'run_propensity_model' },
  { name: 'query_linkedin' },
];

const COHORT_OPTIONS = [
  { value: 'cs', label: 'CS graduates' },
  { value: 'eng', label: 'Engineering graduates' },
  { value: 'commerce', label: 'Commerce graduates' },
  { value: 'all', label: 'all alumni' },
] as const;

const SIGNAL_OPTIONS = [
  { value: 'role-change', label: 'changed role' },
  { value: 'promoted', label: 'were promoted' },
  { value: 'redundancy', label: 'are at redundancy risk' },
  { value: 'any', label: 'had any signal' },
] as const;

const WINDOW_OPTIONS = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '24m', label: '24 months' },
] as const;

interface CiQuery {
  cohort: Cohort;
  signal: Signal;
  window: Window;
}

const DEFAULT_Q: CiQuery = { cohort: 'cs', signal: 'role-change', window: '12m' };

const PCT = new Intl.NumberFormat('en-AU', {
  style: 'percent',
  minimumFractionDigits: 1,
});

export default function CourseIntelligencePage() {
  const [q, setQ] = useState<CiQuery>(DEFAULT_Q);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const { show } = usePayload();
  const { call } = useServerTool();

  const result: CourseIntelligenceResult = useMemo(
    () => getCourseIntelligence(q.cohort, q.signal, q.window),
    [q],
  );

  // Cascade-reveal agent reasoning steps on load and query change
  useEffect(() => {
    setVisibleSteps(0);
    const timers = result.agentSteps.map((_, i) =>
      setTimeout(() => setVisibleSteps(i + 1), i * 450),
    );
    return () => timers.forEach(clearTimeout);
  }, [q, result.agentSteps]);

  // Fire MCP tool calls in background so audit log populates
  useEffect(() => {
    const top = result.recommendations[0];
    void call('query_dynamics', {
      entity: 'alumni',
      filter: `cohort:${q.cohort}`,
      limit: 20,
    }).catch(() => {});
    void call('query_aep', {
      audienceCriteria: { signal: q.signal, window: q.window },
      limit: 20,
    }).catch(() => {});
    void call('run_propensity_model', {
      courseIdOrName: top?.courseName ?? 'AI for Leaders',
      topN: 10,
    }).catch(() => {});
    void call('query_linkedin', {
      signal: q.signal,
      cohort: q.cohort,
      limit: 10,
    }).catch(() => {});
  }, [q, call, result.recommendations]);

  const top = result.recommendations[0];
  const cohortLabel = COHORT_OPTIONS.find((o) => o.value === q.cohort)?.label ?? q.cohort;

  const onPushToCrm = () => {
    show(
      `CRM campaign draft · ${top.courseName} · ${cohortLabel}`,
      buildCrmCampaignPayload({
        cohortLabel,
        topCourseName: top.courseName,
        topCourseCode: top.courseCode,
        matchedAlumni: top.matchedAlumni,
        catalogueGaps: result.catalogueGaps,
      }),
    );
  };

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryStatic>Show opportunities for</QueryStatic>
        <QueryToken
          value={q.cohort}
          onChange={(v) => setQ({ ...q, cohort: v as Cohort })}
          options={[...COHORT_OPTIONS]}
          minWidth={240}
        />
        <QueryStatic>who</QueryStatic>
        <QueryToken
          value={q.signal}
          onChange={(v) => setQ({ ...q, signal: v as Signal })}
          options={[...SIGNAL_OPTIONS]}
          minWidth={220}
        />
        <QueryStatic>in the last</QueryStatic>
        <QueryToken
          value={q.window}
          onChange={(v) => setQ({ ...q, window: v as Window })}
          options={[...WINDOW_OPTIONS]}
          minWidth={160}
        />
      </QueryBand>

      <AgentReasoningBand
        steps={result.agentSteps}
        visibleSteps={visibleSteps}
        summary={result.agentSummary}
      />

      <div className="flex flex-1" style={{ minHeight: 0, overflowY: 'auto' }}>
        <RecommendationsColumn recommendations={result.recommendations} />
        <SideColumn
          trends={result.marketTrends}
          gaps={result.catalogueGaps}
          onPushToCrm={onPushToCrm}
        />
      </div>

      <ToolFooter chips={CHIPS} />
    </div>
  );
}

function AgentReasoningBand({
  steps,
  visibleSteps,
  summary,
}: {
  steps: AgentStep[];
  visibleSteps: number;
  summary: string;
}) {
  return (
    <div
      className="flex-none bg-ink"
      style={{ padding: '20px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div
        className="uppercase text-unsw-yellow"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}
      >
        Agent reasoning
      </div>
      <div className="flex flex-wrap" style={{ gap: '10px 32px' }}>
        {steps.map((step, i) => {
          const visible = i < visibleSteps;
          return (
            <div
              key={step.id}
              className="flex items-center text-white"
              style={{
                gap: 8,
                fontSize: 13,
                opacity: visible ? 1 : 0.25,
                transition: 'opacity 0.3s ease',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: visible ? '#1ac987' : 'transparent',
                  border: `1.5px solid ${visible ? '#1ac987' : 'rgba(255,255,255,0.3)'}`,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {visible ? '✓' : ''}
              </span>
              <span style={{ fontWeight: 500 }}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {visibleSteps >= steps.length && (
        <div
          className="text-white"
          style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, maxWidth: 860 }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

function RecommendationsColumn({
  recommendations,
}: {
  recommendations: CourseRecommendation[];
}) {
  return (
    <div className="flex flex-1 flex-col" style={{ padding: '22px 30px 22px 36px' }}>
      <div
        className="text-ink"
        style={{
          fontSize: 16,
          fontWeight: 700,
          borderBottom: '2px solid #000',
          paddingBottom: 8,
        }}
      >
        Course recommendations
      </div>
      <div
        className="flex uppercase text-muted"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '10px 0 8px',
        }}
      >
        <span style={{ flex: '0 0 32px' }}>#</span>
        <span style={{ flex: 1 }}>Course</span>
        <span style={{ width: 130 }}>Matched alumni</span>
        <span style={{ width: 120, textAlign: 'right' }}>Historical conv.</span>
        <span style={{ width: 80, textAlign: 'right' }}>Score</span>
      </div>
      <div>
        {recommendations.map((rec) => (
          <RecommendationRow key={rec.rank} rec={rec} />
        ))}
      </div>
    </div>
  );
}

function RecommendationRow({ rec }: { rec: CourseRecommendation }) {
  return (
    <div
      className="hover:bg-mist"
      style={{ borderBottom: '1px solid #ededed', cursor: 'default' }}
    >
      <div className="flex items-start" style={{ padding: '14px 0' }}>
        <span
          className="text-muted"
          style={{ flex: '0 0 32px', fontSize: 13, fontWeight: 700, paddingTop: 2 }}
        >
          {rec.rank}
        </span>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{rec.courseName}</span>
            {rec.badge === 'trending' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#0d7a54',
                  border: '1px solid #1ac987',
                  padding: '1px 6px',
                  background: '#fff',
                  flexShrink: 0,
                }}
              >
                Trending
              </span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
            {rec.rationale}
          </div>
        </div>
        <div
          style={{
            width: 130,
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {rec.matchedAlumni.toLocaleString()}
        </div>
        <div
          style={{
            width: 120,
            textAlign: 'right',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {PCT.format(rec.historicalConversionPct)}
        </div>
        <div
          style={{
            width: 80,
            textAlign: 'right',
            fontSize: 16,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {rec.opportunityScore.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function SideColumn({
  trends,
  gaps,
  onPushToCrm,
}: {
  trends: MarketTrend[];
  gaps: CatalogueGap[];
  onPushToCrm: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 420,
        flexShrink: 0,
        borderLeft: '1px solid #e0e0e0',
        padding: '22px 36px 22px 30px',
        gap: 24,
        overflowY: 'auto',
      }}
    >
      <div>
        <div
          className="text-ink"
          style={{
            fontSize: 16,
            fontWeight: 700,
            borderBottom: '2px solid #000',
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          Market outlook · next 6–12 months
        </div>
        <ul
          className="text-muted"
          style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18, listStyle: 'disc' }}
        >
          {trends.map((t) => (
            <li key={t.id}>{t.text}</li>
          ))}
        </ul>
      </div>

      <div>
        <div
          className="uppercase text-muted"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginBottom: 10,
          }}
        >
          Catalogue gaps
        </div>
        {gaps.map((gap) => (
          <div key={gap.id} style={{ borderBottom: '1px solid #ededed', padding: '10px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{gap.title}</div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
              {gap.signal}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <span className="text-muted">Potential cohort: </span>
              <span style={{ fontWeight: 700 }}>{gap.potentialCohortSize.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col" style={{ marginTop: 'auto', gap: 12 }}>
        <button
          type="button"
          onClick={onPushToCrm}
          className="w-full bg-unsw-yellow text-ink transition-colors hover:bg-ink hover:text-unsw-yellow"
          style={{ fontSize: 15, fontWeight: 700, padding: '13px 22px', textAlign: 'center' }}
        >
          Push to CRM
        </button>
        <button
          type="button"
          className="w-full bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
          style={{
            border: '2px solid #000',
            fontSize: 14,
            fontWeight: 500,
            padding: '11px 20px',
          }}
          onClick={onPushToCrm}
        >
          Draft AJO campaign
        </button>
      </div>
    </div>
  );
}
```

> **Note on "Draft AJO campaign":** Per the spec, the CRM is the lead master — AJO is populated from Dynamics, not directly. Both buttons open the same CRM payload drawer here. In a real integration, "Draft AJO campaign" would first create the Dynamics campaign then chain into AJO. For the demo this is the right behaviour.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (the new page has no spec file — it's UI-only, consistent with the other tab pages which also lack spec files).

- [ ] **Step 4: Start dev server and verify manually**

```bash
# In a separate terminal — ensure Node 22 is on PATH
# PATH-prepend: C:\Users\thobbs\node-v22.11.0-win-x64
npm run dev
```

Open `http://localhost:3000/course-intelligence` in Chrome and verify:
- QueryBand shows: `Show opportunities for [CS graduates ▾] who [changed role ▾] in the last [12 months ▾]`
- Agent Reasoning band (dark/black) appears below QueryBand
- Steps cascade in one-by-one with green checkmarks (0ms, 450ms, 900ms, 1350ms)
- Agent summary text appears after all 4 steps complete
- Left column shows 5 course recommendations with rank, name, badge (trending), rationale, matched alumni, historical conv %, and opportunity score
- Right column shows market outlook bullets, 2 catalogue gap cards, "Push to CRM" yellow button, "Draft AJO campaign" outline button
- ToolFooter shows 4 chips: `query_dynamics ✓`, `query_aep ✓`, `run_propensity_model ✓`, `query_linkedin ✓` (may take a moment to populate)
- Changing any token (e.g. cohort to "Engineering graduates") re-runs the step animation and shows DSP as #1
- Clicking "Push to CRM" opens the PayloadContext drawer with the CRM campaign JSON

Also check the nav:
- "Course Intelligence" tab is active (yellow underline) on this page
- "Push to CRM" button appears in top-right nav (was "Save to AEP")

Check the Segments tab:
- The third action button now reads "Course Intelligence" and links to `/course-intelligence` (was "Forecast this segment" → `/forecast`)

- [ ] **Step 5: Commit**

```bash
git add app/course-intelligence/page.tsx
git commit -m "feat: add Course Intelligence tab with visible agent reasoning, course recommendations, and catalogue gap detection"
```

---

## Task 5: Remove the Forecast route + final verification

**Files:**
- Delete: `app/forecast/page.tsx`

- [ ] **Step 1: Delete the Forecast page**

```bash
rm app/forecast/page.tsx
```

The lib files `lib/tab-data/forecast.ts`, `lib/tab-data/forecast-payback.ts`, and the forecast payloads in `lib/handoff/payloads.ts` are left in place — their tests still pass and removing them is out of scope.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass. The forecast-related lib tests (`forecast.spec.ts`) still pass because the lib files are intact.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Lint + format check**

```bash
npx next lint
npx prettier --check .
```

Expected: both clean.

- [ ] **Step 5: Confirm `/forecast` returns 404**

With dev server running, navigate to `http://localhost:3000/forecast`. Next.js App Router should return a 404 page (no `page.tsx` in `app/forecast/`). This is correct — the route is intentionally gone.

- [ ] **Step 6: Final commit**

```bash
git add -u app/forecast/page.tsx   # stages the deletion
git commit -m "chore: remove Forecast route (replaced by Course Intelligence tab)"
```

---

## Spec coverage check

| Spec requirement | Implemented in |
|-----------------|---------------|
| Replace Forecast tab with Course Intelligence | Tasks 1 + 4 + 5 |
| "Save to AEP" → "Push to CRM" nav button | Task 1 (`PrimaryNav.tsx`) |
| Agent reasoning visible on screen (cascade reveal) | Task 4 (`AgentReasoningBand`) |
| Agent reads career signals | Task 4 (fixture + `useEffect` MCP calls) |
| Cross-references historical course purchases | Task 2 (fixture `historicalConversionPct` + rationale) |
| Surfaces course priorities | Task 4 (recommendations column, ranked 1-5) |
| Identifies catalogue gaps | Task 2 (fixture `CatalogueGap`) + Task 4 (`SideColumn`) |
| Forward-looking market outlook | Task 2 (fixture `MarketTrend`) + Task 4 (`SideColumn`) |
| Campaign draft → hand off to Dynamics | Tasks 3 + 4 (`buildCrmCampaignPayload` + "Push to CRM" button) |
| Fixture-driven (v2 pattern) | Task 2 + Task 4 |
| Segments cross-link updated | Task 1 (`app/segments/page.tsx`) |
