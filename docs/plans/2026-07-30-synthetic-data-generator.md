# Synthetic Data Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic TypeScript generator that emits synthetic alumni, prospective learners, courses, employers, career trajectories, signals, propensity scores, and cohort rollups as JSON files in `data/`, plus a typed loader that every downstream tab and agent tool will read from.

**Architecture:** Small composable generators per entity (`lib/generators/*.ts`), a top-level orchestrator (`scripts/generate-data.ts`) that seeds an RNG and writes JSON files, and a typed loader (`lib/data.ts`) that reads them at build/runtime with zod-validated schemas. Deterministic via a fixed seed so re-runs are byte-identical.

**Tech Stack:** TypeScript strict, vitest, `@faker-js/faker` (seeded), `zod`, `tsx` for direct TS execution. No DB — everything is flat JSON.

**Plan file location note:** This project puts plans under `docs/plans/` rather than the skill default `docs/superpowers/plans/`, so they live with the rest of the project's docs.

---

## File Structure

**Create:**
- `lib/types.ts` — TypeScript interfaces for every entity
- `lib/schemas.ts` — zod schemas mirroring the types (for runtime validation on load)
- `lib/generators/rng.ts` — seeded RNG + faker instance factory
- `lib/generators/employers.ts` — employer/account generator
- `lib/generators/courses.ts` — course/micro-credential catalogue
- `lib/generators/careers.ts` — career trajectory generator
- `lib/generators/signals.ts` — career signal generator
- `lib/generators/alumni.ts` — alumni composer (uses careers, employers)
- `lib/generators/prospects.ts` — prospective learner composer (subset of alumni)
- `lib/generators/propensity.ts` — per-(alumni, course) propensity scores
- `lib/generators/cohorts.ts` — pre-computed cohort rollups for Lifecycle Health tab
- `scripts/generate-data.ts` — orchestrator: seeds RNG, calls each generator, writes JSON to `data/`
- `lib/data.ts` — typed loader; reads JSON, zod-validates, exposes accessors
- `vitest.config.ts` — vitest config
- All corresponding `*.spec.ts` files next to each module

**Modify:**
- `package.json` — add deps (`@faker-js/faker`, `zod`, `tsx`, `vitest`) + npm scripts (`generate-data`, `test`, `test:watch`)
- `.gitignore` — already excludes `data/*.json` (verify)
- `README.md` — add "Regenerate data" section

**Volume targets** (must be achievable at these numbers without >2 GB heap):
- 150 courses
- 500 employers
- 2,000 alumni
- 500 prospective learners (subset of alumni matching prospect criteria)
- ~8,000 career signals (avg 4 per alumni)
- ~300,000 propensity rows (2000 × 150 courses) — write as a single JSON array

## Deferred to later plans (intentional)

The data-model doc (`docs/02-DATA-MODEL.md`) lists these entities. This plan does NOT generate them; they'll be added as their consuming tab demands them:
- **Marketing Touchpoints** — needed once the Lifecycle Health tab wants real (not faker'd) engagement rates. Defer to plan #5.
- **Learning Events + Event Attendance** — needed for the "event source" leg of signals + for Tab 1 cards. Defer to plan #4 (Alumni Insights).
- **Enrolments / Applications** — needed for the "won-lost" telemetry behind Forecast. Defer to plan #6.
- **Enquiries (Case)** — not in any demo tab. Skip unless requested.
- **Alumni Education** — currently collapsed into `Alumni.graduationYear` + `Alumni.completedUnswProgram`. Full table is only needed if we want alumni with multiple UNSW degrees. Defer indefinitely.

Cohort engagement metrics in this plan (Task 11) are `faker`-generated because Marketing Touchpoints don't exist yet. That's honest for a demo; when plan #5 adds touchpoints, `generateCohorts` gets refactored to compute from them.

---

## Task 1: Install dependencies + vitest config

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
npm install @faker-js/faker zod
npm install -D vitest @vitest/coverage-v8 tsx
```

Expected: added packages, no peer-dep errors.

- [ ] **Step 2: Add npm scripts to package.json**

Edit `package.json` `scripts` block to add:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "generate-data": "tsx scripts/generate-data.ts"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    reporters: 'default',
  },
});
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: `No test files found` — that's fine, means vitest is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add faker, zod, vitest, tsx for synthetic data generator"
```

---

## Task 2: Entity types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write `lib/types.ts` with all entity interfaces**

```ts
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO 8601

export type Industry =
  | 'Technology'
  | 'Financial Services'
  | 'Government'
  | 'Healthcare'
  | 'Education'
  | 'Consulting'
  | 'Manufacturing'
  | 'Retail'
  | 'Media'
  | 'Energy';

export type SeniorityLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager' | 'Director' | 'VP' | 'C-Suite';

export type DeliveryMode = 'Online' | 'Hybrid' | 'On Campus';

export type LearnerPersona = 'Career Switcher' | 'Skills Upgrader' | 'Returner' | 'Advancement Seeker';
export type NeedscopePersona = 'Ambitious' | 'Curious' | 'Pragmatic' | 'Reflective';

export interface Employer {
  id: string; // acc-XXXXXX
  name: string;
  industry: Industry;
  city: string;
  state: string;
  country: string;
  employeeCountBand: '1-50' | '51-200' | '201-1000' | '1001-5000' | '5000+';
}

export interface Course {
  id: string; // prog-XXXXXX
  code: string;
  name: string;
  faculty: string;
  fieldOfStudy: string;
  deliveryMode: DeliveryMode;
  durationWeeks: number;
  priceAud: number;
  targetSeniority: SeniorityLevel[];
  targetIndustries: Industry[];
}

export interface CareerRole {
  employerId: string;
  title: string;
  seniority: SeniorityLevel;
  industry: Industry;
  startDate: ISODate;
  endDate: ISODate | null; // null = current
}

export type SignalType =
  | 'promoted'
  | 'role_change'
  | 'industry_change'
  | 'location_change'
  | 'redundancy_risk'
  | 'course_recency_threshold'
  | 'alumni_anniversary';

export interface CareerSignal {
  id: string;
  alumniId: string;
  type: SignalType;
  detectedAt: ISODateTime;
  source: 'linkedin' | 'unsw_events' | 'derived';
  confidence: number; // 0..1
  payload: Record<string, string | number | boolean>;
}

export interface Alumni {
  id: string; // contact-XXXXXX
  crmId: string; // shared with lead/opportunity
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
  city: string;
  state: string;
  country: string;
  learnerPersona: LearnerPersona;
  needscopePersona: NeedscopePersona;
  graduationYear: number;
  completedUnswProgram: string;
  fieldOfStudy: string;
  careerTrajectory: CareerRole[]; // ordered oldest → newest
  currentEmployerId: string;
  currentTitle: string;
  currentSeniority: SeniorityLevel;
  currentIndustry: Industry;
  emailConsent: boolean;
  smsConsent: boolean;
}

export interface ProspectiveLearner {
  id: string; // lead-XXXXXX
  crmId: string; // matches Alumni.crmId when the lead was derived from an alumni
  alumniId: string; // FK to Alumni
  leadRating: 'Hot' | 'Warm' | 'Cold';
  leadStatus: 'New' | 'Qualified' | 'Contacted' | 'Nurturing' | 'Disqualified';
  leadSource: 'LinkedIn Signal' | 'Alumni Anniversary' | 'Course Interest Form' | 'Referral';
  interestedInDeliveryMode: DeliveryMode | null;
  interestedInFieldOfStudy: string | null;
  createdAt: ISODateTime;
}

export interface PropensityScore {
  alumniId: string;
  courseId: string;
  score: number; // 0..1
  computedAt: ISODateTime;
  topFeatures: string[]; // e.g. ['recent_promotion', 'industry_match']
}

export type CohortId =
  | 'recent_grads'
  | 'mid_career'
  | 'high_signal'
  | 'dormant'
  | 'all';

export interface CohortRollup {
  id: CohortId;
  label: string;
  size: number;
  engagementRate30d: number; // 0..1
  momentsOfRelevance30d: number;
  dropOffRate90d: number; // 0..1
  engagementTrend12m: { month: ISODate; rate: number }[];
  agentCommentary: string;
}

export interface DataBundle {
  employers: Employer[];
  courses: Course[];
  alumni: Alumni[];
  prospects: ProspectiveLearner[];
  signals: CareerSignal[];
  propensity: PropensityScore[];
  cohorts: CohortRollup[];
  generatedAt: ISODateTime;
  seed: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(data): add entity types for synthetic data model"
```

---

## Task 3: Seeded RNG + faker factory

**Files:**
- Create: `lib/generators/rng.ts`
- Create: `lib/generators/rng.spec.ts`

- [ ] **Step 1: Write failing test**

`lib/generators/rng.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';

describe('makeRng', () => {
  it('returns the same sequence for the same seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 5 }, () => a.faker.number.int({ min: 0, max: 1000 }));
    const seqB = Array.from({ length: 5 }, () => b.faker.number.int({ min: 0, max: 1000 }));
    expect(seqA).toEqual(seqB);
  });

  it('returns different sequences for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 5 }, () => a.faker.number.int({ min: 0, max: 1000 }));
    const seqB = Array.from({ length: 5 }, () => b.faker.number.int({ min: 0, max: 1000 }));
    expect(seqA).not.toEqual(seqB);
  });

  it('exposes locale-en_AU faker', () => {
    const { faker } = makeRng(1);
    const zip = faker.location.zipCode();
    expect(zip).toMatch(/^\d{4}$/); // AU postcodes are 4 digits
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- rng`
Expected: FAIL with "Cannot find module './rng'".

- [ ] **Step 3: Write implementation**

`lib/generators/rng.ts`:
```ts
import { Faker, en_AU, en } from '@faker-js/faker';

export interface Rng {
  faker: Faker;
  seed: number;
}

export function makeRng(seed: number): Rng {
  const faker = new Faker({ locale: [en_AU, en] });
  faker.seed(seed);
  return { faker, seed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- rng`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/rng.ts lib/generators/rng.spec.ts
git commit -m "feat(data): seeded RNG + en_AU faker factory"
```

---

## Task 4: Employer generator

**Files:**
- Create: `lib/generators/employers.ts`
- Create: `lib/generators/employers.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateEmployers', () => {
  it('generates the requested count', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 100);
    expect(employers).toHaveLength(100);
  });

  it('assigns unique ids in acc-XXXXXX format', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 50);
    const ids = new Set(employers.map((e) => e.id));
    expect(ids.size).toBe(50);
    expect(employers[0].id).toMatch(/^acc-\d{6}$/);
  });

  it('covers all industries', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 500);
    const industries = new Set(employers.map((e) => e.industry));
    expect(industries.size).toBeGreaterThanOrEqual(8);
  });

  it('is deterministic for the same seed', () => {
    const a = generateEmployers(makeRng(7), 20);
    const b = generateEmployers(makeRng(7), 20);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- employers`
Expected: FAIL.

- [ ] **Step 3: Write implementation**

`lib/generators/employers.ts`:
```ts
import type { Employer, Industry } from '../types';
import type { Rng } from './rng';

const INDUSTRIES: Industry[] = [
  'Technology',
  'Financial Services',
  'Government',
  'Healthcare',
  'Education',
  'Consulting',
  'Manufacturing',
  'Retail',
  'Media',
  'Energy',
];

const AU_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const AU_STATE_CITIES: Record<string, string[]> = {
  NSW: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta'],
  VIC: ['Melbourne', 'Geelong', 'Ballarat'],
  QLD: ['Brisbane', 'Gold Coast', 'Cairns'],
  WA: ['Perth', 'Fremantle'],
  SA: ['Adelaide'],
  TAS: ['Hobart', 'Launceston'],
  ACT: ['Canberra'],
  NT: ['Darwin'],
};

const SIZE_BANDS = ['1-50', '51-200', '201-1000', '1001-5000', '5000+'] as const;

export function generateEmployers(rng: Rng, count: number): Employer[] {
  const { faker } = rng;
  const employers: Employer[] = [];
  for (let i = 0; i < count; i++) {
    const industry = faker.helpers.arrayElement(INDUSTRIES);
    const state = faker.helpers.weightedArrayElement([
      { value: 'NSW', weight: 40 },
      { value: 'VIC', weight: 25 },
      { value: 'QLD', weight: 12 },
      { value: 'WA', weight: 8 },
      { value: 'SA', weight: 5 },
      { value: 'ACT', weight: 5 },
      { value: 'TAS', weight: 3 },
      { value: 'NT', weight: 2 },
    ]);
    const city = faker.helpers.arrayElement(AU_STATE_CITIES[state]);
    employers.push({
      id: `acc-${String(i + 1).padStart(6, '0')}`,
      name: faker.company.name(),
      industry,
      city,
      state,
      country: 'Australia',
      employeeCountBand: faker.helpers.arrayElement(SIZE_BANDS),
    });
  }
  return employers;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- employers`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/employers.ts lib/generators/employers.spec.ts
git commit -m "feat(data): employer generator with AU-weighted geography"
```

---

## Task 5: Course catalogue generator

**Files:**
- Create: `lib/generators/courses.ts`
- Create: `lib/generators/courses.spec.ts`

Approach: seed a curated list of ~15 realistic UNSW Online-style micro-credentials, then generate variants (e.g. "AI for Leaders — Intake 24", "AI for Leaders — Intake 25") to reach the target count. Ensures the demo shows plausible course names.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateCourses } from './courses';
import { makeRng } from './rng';

describe('generateCourses', () => {
  it('generates the requested count', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 150);
    expect(courses).toHaveLength(150);
  });

  it('assigns unique ids in prog-XXXXXX format', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 50);
    const ids = new Set(courses.map((c) => c.id));
    expect(ids.size).toBe(50);
    expect(courses[0].id).toMatch(/^prog-\d{6}$/);
  });

  it('includes a variety of faculties', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 150);
    const faculties = new Set(courses.map((c) => c.faculty));
    expect(faculties.size).toBeGreaterThanOrEqual(4);
  });

  it('prices are within a plausible AUD range', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 30);
    for (const c of courses) {
      expect(c.priceAud).toBeGreaterThanOrEqual(500);
      expect(c.priceAud).toBeLessThanOrEqual(15000);
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- courses`

- [ ] **Step 3: Write implementation**

`lib/generators/courses.ts`:
```ts
import type { Course, DeliveryMode, Industry, SeniorityLevel } from '../types';
import type { Rng } from './rng';

interface CourseTemplate {
  code: string;
  name: string;
  faculty: string;
  fieldOfStudy: string;
  targetSeniority: SeniorityLevel[];
  targetIndustries: Industry[];
  minPrice: number;
  maxPrice: number;
}

const TEMPLATES: CourseTemplate[] = [
  {
    code: 'AIL',
    name: 'AI for Leaders',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Applied AI',
    targetSeniority: ['Lead', 'Manager', 'Director', 'VP'],
    targetIndustries: ['Technology', 'Financial Services', 'Consulting', 'Government'],
    minPrice: 3200,
    maxPrice: 4500,
  },
  {
    code: 'DSP',
    name: 'Data Strategy for Professionals',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Data Strategy',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Financial Services', 'Healthcare', 'Government'],
    minPrice: 2800,
    maxPrice: 3800,
  },
  {
    code: 'CYB',
    name: 'Cybersecurity Fundamentals',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Cybersecurity',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Technology', 'Government', 'Financial Services'],
    minPrice: 2400,
    maxPrice: 3600,
  },
  {
    code: 'CLD',
    name: 'Cloud Architecture Certificate',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Cloud',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Financial Services', 'Media'],
    minPrice: 2800,
    maxPrice: 4200,
  },
  {
    code: 'PMG',
    name: 'Product Management Essentials',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Product Management',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Media', 'Retail', 'Financial Services'],
    minPrice: 2600,
    maxPrice: 3900,
  },
  {
    code: 'ESG',
    name: 'ESG & Sustainable Finance',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Sustainability',
    targetSeniority: ['Senior', 'Lead', 'Director'],
    targetIndustries: ['Financial Services', 'Energy', 'Consulting', 'Government'],
    minPrice: 3400,
    maxPrice: 4800,
  },
  {
    code: 'HLA',
    name: 'Healthcare Leadership & Analytics',
    faculty: 'UNSW Medicine & Health',
    fieldOfStudy: 'Healthcare Management',
    targetSeniority: ['Senior', 'Lead', 'Manager'],
    targetIndustries: ['Healthcare', 'Government'],
    minPrice: 3200,
    maxPrice: 4600,
  },
  {
    code: 'LGL',
    name: 'Legal Innovation Certificate',
    faculty: 'UNSW Law & Justice',
    fieldOfStudy: 'Legal Tech',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Consulting', 'Financial Services', 'Government'],
    minPrice: 2800,
    maxPrice: 4200,
  },
  {
    code: 'DAT',
    name: 'Data Engineering Bootcamp',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Data Engineering',
    targetSeniority: ['Junior', 'Mid'],
    targetIndustries: ['Technology', 'Financial Services'],
    minPrice: 2200,
    maxPrice: 3400,
  },
  {
    code: 'DES',
    name: 'Design Thinking for Business',
    faculty: 'UNSW Art & Design',
    fieldOfStudy: 'Design',
    targetSeniority: ['Mid', 'Senior'],
    targetIndustries: ['Technology', 'Media', 'Retail', 'Consulting'],
    minPrice: 1800,
    maxPrice: 2800,
  },
  {
    code: 'GEN',
    name: 'Generative AI for Practitioners',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Applied AI',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Technology', 'Media', 'Consulting', 'Education'],
    minPrice: 1400,
    maxPrice: 2400,
  },
  {
    code: 'FIN',
    name: 'Financial Modelling for Non-Finance Managers',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Finance',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Consulting', 'Manufacturing', 'Retail', 'Healthcare'],
    minPrice: 1600,
    maxPrice: 2600,
  },
  {
    code: 'HRM',
    name: 'People Analytics for HR Leaders',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'HR',
    targetSeniority: ['Senior', 'Lead', 'Manager', 'Director'],
    targetIndustries: ['Consulting', 'Financial Services', 'Government', 'Healthcare'],
    minPrice: 2400,
    maxPrice: 3600,
  },
  {
    code: 'CLI',
    name: 'Climate Risk & Strategy',
    faculty: 'UNSW Science',
    fieldOfStudy: 'Climate',
    targetSeniority: ['Senior', 'Lead', 'Director'],
    targetIndustries: ['Energy', 'Financial Services', 'Government', 'Consulting'],
    minPrice: 3200,
    maxPrice: 4600,
  },
  {
    code: 'MED',
    name: 'Digital Marketing Certificate',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Marketing',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Retail', 'Media', 'Technology'],
    minPrice: 1400,
    maxPrice: 2400,
  },
];

const DELIVERY_MODES: DeliveryMode[] = ['Online', 'Hybrid', 'On Campus'];

export function generateCourses(rng: Rng, count: number): Course[] {
  const { faker } = rng;
  const courses: Course[] = [];
  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[i % TEMPLATES.length];
    const intake = 24 + Math.floor(i / TEMPLATES.length);
    courses.push({
      id: `prog-${String(i + 1).padStart(6, '0')}`,
      code: `${template.code}-${intake}`,
      name: `${template.name} — Intake ${intake}`,
      faculty: template.faculty,
      fieldOfStudy: template.fieldOfStudy,
      deliveryMode: faker.helpers.weightedArrayElement([
        { value: 'Online', weight: 70 },
        { value: 'Hybrid', weight: 25 },
        { value: 'On Campus', weight: 5 },
      ]),
      durationWeeks: faker.helpers.arrayElement([6, 8, 10, 12, 16]),
      priceAud: faker.number.int({ min: template.minPrice, max: template.maxPrice }),
      targetSeniority: template.targetSeniority,
      targetIndustries: template.targetIndustries,
    });
  }
  return courses;
}

export { TEMPLATES as COURSE_TEMPLATES };
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- courses`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/courses.ts lib/generators/courses.spec.ts
git commit -m "feat(data): course catalogue with 15 curated templates × intakes"
```

---

## Task 6: Career trajectory generator

**Files:**
- Create: `lib/generators/careers.ts`
- Create: `lib/generators/careers.spec.ts`

Approach: generate 2–5 sequential roles per alumni. Each role picks an employer, industry, seniority; progression is biased upward.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateCareerTrajectory } from './careers';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateCareerTrajectory', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);

  it('generates 2 to 5 roles', () => {
    for (let i = 0; i < 20; i++) {
      const t = generateCareerTrajectory(rng, employers, 2015);
      expect(t.length).toBeGreaterThanOrEqual(2);
      expect(t.length).toBeLessThanOrEqual(5);
    }
  });

  it('roles are chronological', () => {
    const t = generateCareerTrajectory(rng, employers, 2015);
    for (let i = 1; i < t.length; i++) {
      expect(t[i].startDate >= t[i - 1].startDate).toBe(true);
    }
  });

  it('only the last role has a null endDate', () => {
    const t = generateCareerTrajectory(rng, employers, 2015);
    for (let i = 0; i < t.length - 1; i++) {
      expect(t[i].endDate).not.toBeNull();
    }
    expect(t[t.length - 1].endDate).toBeNull();
  });

  it('first role starts on or after graduation year', () => {
    const t = generateCareerTrajectory(rng, employers, 2018);
    expect(t[0].startDate >= '2018-01-01').toBe(true);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- careers`

- [ ] **Step 3: Write implementation**

`lib/generators/careers.ts`:
```ts
import type { CareerRole, Employer, SeniorityLevel } from '../types';
import type { Rng } from './rng';

const SENIORITY_ORDER: SeniorityLevel[] = [
  'Junior',
  'Mid',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'VP',
  'C-Suite',
];

const TITLES_BY_SENIORITY: Record<SeniorityLevel, string[]> = {
  Junior: ['Analyst', 'Associate', 'Coordinator', 'Junior Engineer'],
  Mid: ['Consultant', 'Specialist', 'Engineer', 'Manager'],
  Senior: ['Senior Engineer', 'Senior Consultant', 'Senior Manager'],
  Lead: ['Lead Engineer', 'Team Lead', 'Principal Consultant'],
  Manager: ['Manager', 'Program Manager', 'Product Manager'],
  Director: ['Director', 'Head of Practice'],
  VP: ['Vice President', 'General Manager'],
  'C-Suite': ['Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer'],
};

export function generateCareerTrajectory(
  rng: Rng,
  employers: Employer[],
  graduationYear: number,
): CareerRole[] {
  const { faker } = rng;
  const roleCount = faker.number.int({ min: 2, max: 5 });
  const roles: CareerRole[] = [];

  let currentDate = new Date(`${graduationYear}-06-01`);
  let seniorityIdx = 0; // start Junior

  for (let i = 0; i < roleCount; i++) {
    const isLast = i === roleCount - 1;
    const employer = faker.helpers.arrayElement(employers);
    const seniority = SENIORITY_ORDER[Math.min(seniorityIdx, SENIORITY_ORDER.length - 1)];
    const startDate = currentDate.toISOString().slice(0, 10);

    const tenureMonths = faker.number.int({ min: 14, max: 48 });
    const endDate = isLast ? null : addMonths(currentDate, tenureMonths).toISOString().slice(0, 10);

    roles.push({
      employerId: employer.id,
      title: faker.helpers.arrayElement(TITLES_BY_SENIORITY[seniority]),
      seniority,
      industry: employer.industry,
      startDate,
      endDate,
    });

    if (!isLast) {
      currentDate = addMonths(currentDate, tenureMonths);
      // 65% chance of progression each move
      if (faker.number.float({ min: 0, max: 1 }) < 0.65) {
        seniorityIdx++;
      }
    }
  }
  return roles;
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- careers`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/careers.ts lib/generators/careers.spec.ts
git commit -m "feat(data): career trajectory generator with upward-biased progression"
```

---

## Task 7: Alumni composer

**Files:**
- Create: `lib/generators/alumni.ts`
- Create: `lib/generators/alumni.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateAlumni', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);

  it('generates the requested count', () => {
    const alumni = generateAlumni(rng, employers, 200);
    expect(alumni).toHaveLength(200);
  });

  it('unique ids in contact-XXXXXX format', () => {
    const alumni = generateAlumni(rng, employers, 100);
    const ids = new Set(alumni.map((a) => a.id));
    expect(ids.size).toBe(100);
    expect(alumni[0].id).toMatch(/^contact-\d{6}$/);
  });

  it('current employer id matches last role', () => {
    const alumni = generateAlumni(rng, employers, 50);
    for (const a of alumni) {
      const last = a.careerTrajectory[a.careerTrajectory.length - 1];
      expect(a.currentEmployerId).toBe(last.employerId);
      expect(a.currentSeniority).toBe(last.seniority);
      expect(a.currentIndustry).toBe(last.industry);
      expect(a.currentTitle).toBe(last.title);
    }
  });

  it('graduation year is plausible (1990-2020)', () => {
    const alumni = generateAlumni(rng, employers, 100);
    for (const a of alumni) {
      expect(a.graduationYear).toBeGreaterThanOrEqual(1990);
      expect(a.graduationYear).toBeLessThanOrEqual(2020);
    }
  });

  it('linkedin url uses a synthetic domain (no real linkedin.com)', () => {
    const alumni = generateAlumni(rng, employers, 20);
    for (const a of alumni) {
      expect(a.linkedinUrl).not.toContain('linkedin.com');
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- alumni`

- [ ] **Step 3: Write implementation**

`lib/generators/alumni.ts`:
```ts
import type {
  Alumni,
  Employer,
  LearnerPersona,
  NeedscopePersona,
} from '../types';
import type { Rng } from './rng';
import { generateCareerTrajectory } from './careers';

const LEARNER_PERSONAS: LearnerPersona[] = [
  'Career Switcher',
  'Skills Upgrader',
  'Returner',
  'Advancement Seeker',
];
const NEEDSCOPE_PERSONAS: NeedscopePersona[] = [
  'Ambitious',
  'Curious',
  'Pragmatic',
  'Reflective',
];

const UNSW_PROGRAMS = [
  'Bachelor of Commerce',
  'Bachelor of Engineering (Software)',
  'Bachelor of Engineering (Mechanical)',
  'Bachelor of Science (Computer Science)',
  'Bachelor of Arts',
  'Bachelor of Law',
  'Bachelor of Medicine',
  'Master of Business Administration',
  'Master of Data Science',
  'Master of Public Health',
];

const FIELDS = [
  'Business',
  'Engineering',
  'Computer Science',
  'Arts',
  'Law',
  'Medicine',
  'Data Science',
  'Public Health',
];

export function generateAlumni(rng: Rng, employers: Employer[], count: number): Alumni[] {
  const { faker } = rng;
  const alumni: Alumni[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const gradYear = faker.number.int({ min: 1990, max: 2020 });
    const trajectory = generateCareerTrajectory(rng, employers, gradYear);
    const currentRole = trajectory[trajectory.length - 1];
    const currentEmployer = employers.find((e) => e.id === currentRole.employerId)!;

    alumni.push({
      id: `contact-${String(i + 1).padStart(6, '0')}`,
      crmId: `crm-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`,
      firstName,
      lastName,
      email: faker.internet
        .email({ firstName, lastName, provider: 'synthetic.example.com' })
        .toLowerCase(),
      linkedinUrl: `https://synth.example.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.string.alphanumeric({ length: 4, casing: 'lower' })}`,
      city: currentEmployer.city,
      state: currentEmployer.state,
      country: currentEmployer.country,
      learnerPersona: faker.helpers.arrayElement(LEARNER_PERSONAS),
      needscopePersona: faker.helpers.arrayElement(NEEDSCOPE_PERSONAS),
      graduationYear: gradYear,
      completedUnswProgram: faker.helpers.arrayElement(UNSW_PROGRAMS),
      fieldOfStudy: faker.helpers.arrayElement(FIELDS),
      careerTrajectory: trajectory,
      currentEmployerId: currentRole.employerId,
      currentTitle: currentRole.title,
      currentSeniority: currentRole.seniority,
      currentIndustry: currentRole.industry,
      emailConsent: faker.datatype.boolean({ probability: 0.85 }),
      smsConsent: faker.datatype.boolean({ probability: 0.55 }),
    });
  }
  return alumni;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- alumni`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/alumni.ts lib/generators/alumni.spec.ts
git commit -m "feat(data): alumni composer with trajectory + persona + AU geography"
```

---

## Task 8: Signal generator

**Files:**
- Create: `lib/generators/signals.ts`
- Create: `lib/generators/signals.spec.ts`

Approach: derive signals from career trajectory (promotions, industry/location changes) plus some random events (redundancy risk, course recency threshold, alumni anniversary). Bias detection dates toward the last 12 months.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateSignals } from './signals';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateSignals', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 200);

  it('emits at least one signal per alumni on average', () => {
    const signals = generateSignals(rng, alumni);
    expect(signals.length).toBeGreaterThanOrEqual(alumni.length);
  });

  it('every signal references a real alumni', () => {
    const signals = generateSignals(rng, alumni);
    const ids = new Set(alumni.map((a) => a.id));
    for (const s of signals) {
      expect(ids.has(s.alumniId)).toBe(true);
    }
  });

  it('emits a promoted signal for every seniority increase in trajectory', () => {
    const singleAlumni = [alumni[0]];
    const trajectory = singleAlumni[0].careerTrajectory;
    const promotions = trajectory.filter(
      (r, i) => i > 0 && r.seniority !== trajectory[i - 1].seniority,
    ).length;
    const signals = generateSignals(rng, singleAlumni);
    const promotedSignals = signals.filter(
      (s) => s.alumniId === singleAlumni[0].id && s.type === 'promoted',
    );
    expect(promotedSignals.length).toBe(promotions);
  });

  it('at least 40% of signals are from the last 365 days', () => {
    const signals = generateSignals(rng, alumni);
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const recent = signals.filter((s) => new Date(s.detectedAt).getTime() >= oneYearAgo);
    expect(recent.length / signals.length).toBeGreaterThanOrEqual(0.4);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- signals`

- [ ] **Step 3: Write implementation**

`lib/generators/signals.ts`:
```ts
import type { Alumni, CareerSignal, SignalType } from '../types';
import type { Rng } from './rng';

let signalCounter = 0;

export function generateSignals(rng: Rng, alumni: Alumni[]): CareerSignal[] {
  const { faker } = rng;
  const signals: CareerSignal[] = [];
  signalCounter = 0;

  for (const a of alumni) {
    // Trajectory-derived signals
    const traj = a.careerTrajectory;
    for (let i = 1; i < traj.length; i++) {
      const prev = traj[i - 1];
      const curr = traj[i];
      const detectedAt = biasedTimestamp(faker, curr.startDate);

      if (prev.seniority !== curr.seniority) {
        signals.push(makeSignal(a.id, 'promoted', detectedAt, 'linkedin', 0.92, {
          from: prev.seniority,
          to: curr.seniority,
          title: curr.title,
        }));
      }
      if (prev.industry !== curr.industry) {
        signals.push(makeSignal(a.id, 'industry_change', detectedAt, 'linkedin', 0.88, {
          from: prev.industry,
          to: curr.industry,
        }));
      }
      if (prev.employerId !== curr.employerId && prev.seniority === curr.seniority) {
        signals.push(makeSignal(a.id, 'role_change', detectedAt, 'linkedin', 0.85, {
          newTitle: curr.title,
        }));
      }
    }

    // Random events
    if (faker.number.float({ min: 0, max: 1 }) < 0.08) {
      signals.push(makeSignal(a.id, 'redundancy_risk', recentTimestamp(faker), 'derived', 0.55, {
        reason: 'industry_layoffs',
      }));
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.35) {
      signals.push(
        makeSignal(a.id, 'course_recency_threshold', recentTimestamp(faker), 'derived', 0.75, {
          yearsSinceLast: faker.number.int({ min: 3, max: 12 }),
        }),
      );
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.15) {
      signals.push(
        makeSignal(a.id, 'alumni_anniversary', recentTimestamp(faker), 'unsw_events', 1.0, {
          yearsSinceGraduation: new Date().getFullYear() - a.graduationYear,
        }),
      );
    }
  }
  return signals;
}

function makeSignal(
  alumniId: string,
  type: SignalType,
  detectedAt: string,
  source: 'linkedin' | 'unsw_events' | 'derived',
  confidence: number,
  payload: Record<string, string | number | boolean>,
): CareerSignal {
  return {
    id: `sig-${String(++signalCounter).padStart(7, '0')}`,
    alumniId,
    type,
    detectedAt,
    source,
    confidence,
    payload,
  };
}

function biasedTimestamp(faker: ReturnType<typeof Object>['prototype'] | any, anchorDate: string): string {
  // Signal detected within 30 days of the anchor role start date
  const anchor = new Date(anchorDate).getTime();
  const jitter = faker.number.int({ min: 0, max: 30 * 24 * 60 * 60 * 1000 });
  return new Date(anchor + jitter).toISOString();
}

function recentTimestamp(faker: any): string {
  // 60% of recent signals within last 365 days, 40% in prior 2 years
  const now = Date.now();
  const withinYear = faker.number.float({ min: 0, max: 1 }) < 0.6;
  const maxMsAgo = withinYear ? 365 * 24 * 60 * 60 * 1000 : 3 * 365 * 24 * 60 * 60 * 1000;
  const msAgo = faker.number.int({ min: 0, max: maxMsAgo });
  return new Date(now - msAgo).toISOString();
}
```

Note: the `faker: any` in helpers is a deliberate simplification — we're passing through the same Faker instance from `rng.faker`. If typecheck complains, replace with `import type { Faker } from '@faker-js/faker'` and use `Faker` as the type.

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- signals`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/signals.ts lib/generators/signals.spec.ts
git commit -m "feat(data): signal generator — trajectory-derived + random events, recency-biased"
```

---

## Task 9: Prospective learner composer

**Files:**
- Create: `lib/generators/prospects.ts`
- Create: `lib/generators/prospects.spec.ts`

Approach: pick 500 alumni that have at least one recent (last-365-days) signal, promote them to prospects with lead rating derived from signal strength.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateProspects } from './prospects';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateSignals } from './signals';
import { makeRng } from './rng';

describe('generateProspects', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 500);
  const signals = generateSignals(rng, alumni);

  it('generates up to the requested count (may be smaller if not enough signal)', () => {
    const prospects = generateProspects(rng, alumni, signals, 200);
    expect(prospects.length).toBeGreaterThan(0);
    expect(prospects.length).toBeLessThanOrEqual(200);
  });

  it('each prospect links to a real alumni', () => {
    const prospects = generateProspects(rng, alumni, signals, 100);
    const alumniIds = new Set(alumni.map((a) => a.id));
    for (const p of prospects) {
      expect(alumniIds.has(p.alumniId)).toBe(true);
    }
  });

  it('crmId matches source alumni crmId', () => {
    const prospects = generateProspects(rng, alumni, signals, 50);
    for (const p of prospects) {
      const source = alumni.find((a) => a.id === p.alumniId)!;
      expect(p.crmId).toBe(source.crmId);
    }
  });

  it('unique lead ids in lead-XXXXXX format', () => {
    const prospects = generateProspects(rng, alumni, signals, 100);
    const ids = new Set(prospects.map((p) => p.id));
    expect(ids.size).toBe(prospects.length);
    expect(prospects[0].id).toMatch(/^lead-\d{6}$/);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- prospects`

- [ ] **Step 3: Write implementation**

`lib/generators/prospects.ts`:
```ts
import type { Alumni, CareerSignal, DeliveryMode, ProspectiveLearner } from '../types';
import type { Rng } from './rng';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const LEAD_SOURCES: ProspectiveLearner['leadSource'][] = [
  'LinkedIn Signal',
  'Alumni Anniversary',
  'Course Interest Form',
  'Referral',
];
const DELIVERY_MODES: DeliveryMode[] = ['Online', 'Hybrid', 'On Campus'];

export function generateProspects(
  rng: Rng,
  alumni: Alumni[],
  signals: CareerSignal[],
  targetCount: number,
): ProspectiveLearner[] {
  const { faker } = rng;
  const now = Date.now();

  const signalsByAlumni = new Map<string, CareerSignal[]>();
  for (const s of signals) {
    const list = signalsByAlumni.get(s.alumniId) ?? [];
    list.push(s);
    signalsByAlumni.set(s.alumniId, list);
  }

  const candidates = alumni.filter((a) => {
    const list = signalsByAlumni.get(a.id) ?? [];
    return list.some((s) => now - new Date(s.detectedAt).getTime() <= ONE_YEAR_MS);
  });

  const shuffled = faker.helpers.shuffle([...candidates]);
  const selected = shuffled.slice(0, targetCount);

  return selected.map((a, i) => {
    const recentSignals = (signalsByAlumni.get(a.id) ?? []).filter(
      (s) => now - new Date(s.detectedAt).getTime() <= ONE_YEAR_MS,
    );
    const topConfidence = Math.max(...recentSignals.map((s) => s.confidence));
    const rating = topConfidence >= 0.85 ? 'Hot' : topConfidence >= 0.65 ? 'Warm' : 'Cold';

    return {
      id: `lead-${String(i + 1).padStart(6, '0')}`,
      crmId: a.crmId,
      alumniId: a.id,
      leadRating: rating,
      leadStatus: faker.helpers.weightedArrayElement([
        { value: 'New', weight: 40 },
        { value: 'Qualified', weight: 25 },
        { value: 'Contacted', weight: 15 },
        { value: 'Nurturing', weight: 15 },
        { value: 'Disqualified', weight: 5 },
      ]),
      leadSource: faker.helpers.arrayElement(LEAD_SOURCES),
      interestedInDeliveryMode: faker.helpers.arrayElement([...DELIVERY_MODES, null]),
      interestedInFieldOfStudy: faker.helpers.arrayElement([a.fieldOfStudy, null]),
      createdAt: new Date(now - faker.number.int({ min: 0, max: ONE_YEAR_MS })).toISOString(),
    };
  });
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- prospects`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/prospects.ts lib/generators/prospects.spec.ts
git commit -m "feat(data): prospective learner composer from signal-active alumni"
```

---

## Task 10: Propensity score generator

**Files:**
- Create: `lib/generators/propensity.ts`
- Create: `lib/generators/propensity.spec.ts`

Approach: for each (alumni, course), compute a score based on industry match, seniority match, recency of last course, and a random noise term. Store top 3 features that drove the score.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generatePropensityScores } from './propensity';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateCourses } from './courses';
import { makeRng } from './rng';

describe('generatePropensityScores', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 50);
  const alumni = generateAlumni(rng, employers, 100);
  const courses = generateCourses(rng, 30);

  it('emits one row per (alumni, course) pair', () => {
    const scores = generatePropensityScores(rng, alumni, courses);
    expect(scores.length).toBe(alumni.length * courses.length);
  });

  it('scores are in [0, 1]', () => {
    const scores = generatePropensityScores(rng, alumni, courses);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });

  it('industry match increases score', () => {
    const alumni2 = generateAlumni(rng, employers, 20);
    const courses2 = generateCourses(rng, 10);
    const scores = generatePropensityScores(rng, alumni2, courses2);
    // Take one alumni, find matching and non-matching courses
    const a = alumni2[0];
    const aScores = scores.filter((s) => s.alumniId === a.id);
    const matching = aScores.filter((s) => {
      const course = courses2.find((c) => c.id === s.courseId)!;
      return course.targetIndustries.includes(a.currentIndustry);
    });
    const nonMatching = aScores.filter((s) => {
      const course = courses2.find((c) => c.id === s.courseId)!;
      return !course.targetIndustries.includes(a.currentIndustry);
    });
    if (matching.length && nonMatching.length) {
      const avgMatch = matching.reduce((sum, s) => sum + s.score, 0) / matching.length;
      const avgNon = nonMatching.reduce((sum, s) => sum + s.score, 0) / nonMatching.length;
      expect(avgMatch).toBeGreaterThan(avgNon);
    }
  });

  it('topFeatures is non-empty', () => {
    const scores = generatePropensityScores(rng, alumni.slice(0, 5), courses.slice(0, 3));
    for (const s of scores) {
      expect(s.topFeatures.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- propensity`

- [ ] **Step 3: Write implementation**

`lib/generators/propensity.ts`:
```ts
import type { Alumni, Course, PropensityScore } from '../types';
import type { Rng } from './rng';

export function generatePropensityScores(
  rng: Rng,
  alumni: Alumni[],
  courses: Course[],
): PropensityScore[] {
  const { faker } = rng;
  const now = new Date().toISOString();
  const scores: PropensityScore[] = [];

  for (const a of alumni) {
    for (const c of courses) {
      const features: string[] = [];
      let raw = 0.2; // base

      if (c.targetIndustries.includes(a.currentIndustry)) {
        raw += 0.25;
        features.push('industry_match');
      }
      if (c.targetSeniority.includes(a.currentSeniority)) {
        raw += 0.2;
        features.push('seniority_match');
      }
      if (c.fieldOfStudy.toLowerCase().includes(a.fieldOfStudy.toLowerCase().slice(0, 4))) {
        raw += 0.1;
        features.push('field_alignment');
      }
      // recency (all synthetic data has no real "last course" — mock with a coin flip)
      if (faker.number.float({ min: 0, max: 1 }) < 0.5) {
        raw += 0.1;
        features.push('recency');
      }

      const noise = faker.number.float({ min: -0.1, max: 0.1 });
      const score = Math.max(0, Math.min(1, raw + noise));

      scores.push({
        alumniId: a.id,
        courseId: c.id,
        score: Number(score.toFixed(3)),
        computedAt: now,
        topFeatures: features.length ? features.slice(0, 3) : ['base_rate'],
      });
    }
  }
  return scores;
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- propensity`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/propensity.ts lib/generators/propensity.spec.ts
git commit -m "feat(data): propensity scores with feature attribution"
```

---

## Task 11: Cohort precomputation

**Files:**
- Create: `lib/generators/cohorts.ts`
- Create: `lib/generators/cohorts.spec.ts`

Approach: precompute the 5 cohorts (recent_grads, mid_career, high_signal, dormant, all) with KPI values + a 12-month engagement trend + agent commentary. Membership rules:
- `recent_grads`: graduationYear >= currentYear - 5
- `mid_career`: seniority in [Senior, Lead, Manager]
- `high_signal`: has any signal with confidence >= 0.85 in last 90 days
- `dormant`: no signal in last 365 days
- `all`: everyone

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateCohorts } from './cohorts';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateSignals } from './signals';
import { makeRng } from './rng';

describe('generateCohorts', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 500);
  const signals = generateSignals(rng, alumni);

  it('emits exactly 5 cohorts', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    expect(cohorts).toHaveLength(5);
    const ids = cohorts.map((c) => c.id).sort();
    expect(ids).toEqual(['all', 'dormant', 'high_signal', 'mid_career', 'recent_grads']);
  });

  it('all cohort size equals alumni count', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    const all = cohorts.find((c) => c.id === 'all')!;
    expect(all.size).toBe(alumni.length);
  });

  it('trend has 12 monthly points', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.engagementTrend12m).toHaveLength(12);
    }
  });

  it('KPIs are within valid ranges', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.engagementRate30d).toBeGreaterThanOrEqual(0);
      expect(c.engagementRate30d).toBeLessThanOrEqual(1);
      expect(c.dropOffRate90d).toBeGreaterThanOrEqual(0);
      expect(c.dropOffRate90d).toBeLessThanOrEqual(1);
      expect(c.momentsOfRelevance30d).toBeGreaterThanOrEqual(0);
    }
  });

  it('agent commentary is non-empty', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.agentCommentary.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- cohorts`

- [ ] **Step 3: Write implementation**

`lib/generators/cohorts.ts`:
```ts
import type { Alumni, CareerSignal, CohortRollup, CohortId } from '../types';
import type { Rng } from './rng';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function generateCohorts(
  rng: Rng,
  alumni: Alumni[],
  signals: CareerSignal[],
): CohortRollup[] {
  const { faker } = rng;
  const now = Date.now();
  const currentYear = new Date().getFullYear();

  const signalsByAlumni = new Map<string, CareerSignal[]>();
  for (const s of signals) {
    const arr = signalsByAlumni.get(s.alumniId) ?? [];
    arr.push(s);
    signalsByAlumni.set(s.alumniId, arr);
  }

  function cohortMembers(id: CohortId): Alumni[] {
    switch (id) {
      case 'all':
        return alumni;
      case 'recent_grads':
        return alumni.filter((a) => a.graduationYear >= currentYear - 5);
      case 'mid_career':
        return alumni.filter((a) => ['Senior', 'Lead', 'Manager'].includes(a.currentSeniority));
      case 'high_signal':
        return alumni.filter((a) => {
          const ss = signalsByAlumni.get(a.id) ?? [];
          return ss.some(
            (s) =>
              s.confidence >= 0.85 && now - new Date(s.detectedAt).getTime() <= NINETY_DAYS_MS,
          );
        });
      case 'dormant':
        return alumni.filter((a) => {
          const ss = signalsByAlumni.get(a.id) ?? [];
          return !ss.some((s) => now - new Date(s.detectedAt).getTime() <= ONE_YEAR_MS);
        });
    }
  }

  const cohortSpecs: { id: CohortId; label: string; commentary: string }[] = [
    { id: 'all', label: 'All Alumni', commentary: 'Baseline view across the alumni base.' },
    {
      id: 'recent_grads',
      label: 'Recent Grads (last 5y)',
      commentary:
        'Recent grads are our highest-engagement cohort. Continue anniversary-based nurture; test career-first-job content.',
    },
    {
      id: 'mid_career',
      label: 'Mid-Career (Senior — Manager)',
      commentary:
        'Engagement in mid-career dipped 22% after cadence changed on 12 June. Recommend reverting the new template or A/B-testing against control.',
    },
    {
      id: 'high_signal',
      label: 'High-Signal (last 90d)',
      commentary:
        'Highest propensity for immediate outreach. Prioritise Hot leads for course-fit outreach in the next 14 days.',
    },
    {
      id: 'dormant',
      label: 'Dormant (no signal 12m)',
      commentary:
        'Enrichment gap. Recommend LinkedIn refresh + a low-friction re-engagement email with anniversary framing.',
    },
  ];

  return cohortSpecs.map(({ id, label, commentary }) => {
    const members = cohortMembers(id);
    const memberIds = new Set(members.map((m) => m.id));

    const relevantSignals = signals.filter((s) => memberIds.has(s.alumniId));
    const recentSignals = relevantSignals.filter(
      (s) => now - new Date(s.detectedAt).getTime() <= THIRTY_DAYS_MS,
    );

    const engagementRate30d = Number(faker.number.float({ min: 0.15, max: 0.75 }).toFixed(3));
    const dropOffRate90d = Number(faker.number.float({ min: 0.05, max: 0.4 }).toFixed(3));

    const engagementTrend12m = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (11 - i));
      const monthStr = monthDate.toISOString().slice(0, 7) + '-01';
      const base = engagementRate30d;
      const jitter = faker.number.float({ min: -0.08, max: 0.08 });
      return { month: monthStr, rate: Math.max(0, Math.min(1, Number((base + jitter).toFixed(3)))) };
    });

    return {
      id,
      label,
      size: members.length,
      engagementRate30d,
      momentsOfRelevance30d: recentSignals.length,
      dropOffRate90d,
      engagementTrend12m,
      agentCommentary: commentary,
    };
  });
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- cohorts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/generators/cohorts.ts lib/generators/cohorts.spec.ts
git commit -m "feat(data): cohort precomputation with rules-based membership + commentary"
```

---

## Task 12: Master generate-data script

**Files:**
- Create: `scripts/generate-data.ts`
- Create: `scripts/generate-data.spec.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runGeneration } from './generate-data';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('runGeneration', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-gen-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes all expected files', async () => {
    await runGeneration({ outDir: tmpDir, seed: 42, small: true });
    const files = await fs.readdir(tmpDir);
    expect(files.sort()).toEqual([
      'alumni.json',
      'bundle.json',
      'cohorts.json',
      'courses.json',
      'employers.json',
      'meta.json',
      'propensity.json',
      'prospects.json',
      'signals.json',
    ]);
  });

  it('bundle.json contains a DataBundle with the right seed', async () => {
    await runGeneration({ outDir: tmpDir, seed: 99, small: true });
    const bundle = JSON.parse(await fs.readFile(path.join(tmpDir, 'bundle.json'), 'utf8'));
    expect(bundle.seed).toBe(99);
    expect(bundle.alumni.length).toBeGreaterThan(0);
    expect(bundle.employers.length).toBeGreaterThan(0);
    expect(bundle.courses.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed', async () => {
    await runGeneration({ outDir: tmpDir, seed: 7, small: true });
    const first = await fs.readFile(path.join(tmpDir, 'alumni.json'), 'utf8');
    await runGeneration({ outDir: tmpDir, seed: 7, small: true });
    const second = await fs.readFile(path.join(tmpDir, 'alumni.json'), 'utf8');
    expect(second).toBe(first);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

Run: `npm test -- generate-data`

- [ ] **Step 3: Write implementation**

`scripts/generate-data.ts`:
```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeRng } from '../lib/generators/rng';
import { generateEmployers } from '../lib/generators/employers';
import { generateCourses } from '../lib/generators/courses';
import { generateAlumni } from '../lib/generators/alumni';
import { generateSignals } from '../lib/generators/signals';
import { generateProspects } from '../lib/generators/prospects';
import { generatePropensityScores } from '../lib/generators/propensity';
import { generateCohorts } from '../lib/generators/cohorts';
import type { DataBundle } from '../lib/types';

export interface GenerationOptions {
  outDir: string;
  seed?: number;
  small?: boolean; // reduced volumes for tests
}

interface Volumes {
  employers: number;
  courses: number;
  alumni: number;
  prospects: number;
}

const FULL: Volumes = { employers: 500, courses: 150, alumni: 2000, prospects: 500 };
const SMALL: Volumes = { employers: 30, courses: 20, alumni: 60, prospects: 20 };

export async function runGeneration(opts: GenerationOptions): Promise<DataBundle> {
  const seed = opts.seed ?? 42;
  const vol = opts.small ? SMALL : FULL;

  const rng = makeRng(seed);
  const employers = generateEmployers(rng, vol.employers);
  const courses = generateCourses(rng, vol.courses);
  const alumni = generateAlumni(rng, employers, vol.alumni);
  const signals = generateSignals(rng, alumni);
  const prospects = generateProspects(rng, alumni, signals, vol.prospects);
  const propensity = generatePropensityScores(rng, alumni, courses);
  const cohorts = generateCohorts(rng, alumni, signals);

  const bundle: DataBundle = {
    employers,
    courses,
    alumni,
    prospects,
    signals,
    propensity,
    cohorts,
    generatedAt: new Date().toISOString(),
    seed,
  };

  await fs.mkdir(opts.outDir, { recursive: true });
  const writes: Promise<void>[] = [
    fs.writeFile(path.join(opts.outDir, 'employers.json'), JSON.stringify(employers, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'courses.json'), JSON.stringify(courses, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'alumni.json'), JSON.stringify(alumni, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'prospects.json'), JSON.stringify(prospects, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'signals.json'), JSON.stringify(signals, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'propensity.json'), JSON.stringify(propensity)),
    fs.writeFile(path.join(opts.outDir, 'cohorts.json'), JSON.stringify(cohorts, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'bundle.json'), JSON.stringify(bundle)),
    fs.writeFile(
      path.join(opts.outDir, 'meta.json'),
      JSON.stringify(
        {
          generatedAt: bundle.generatedAt,
          seed,
          counts: {
            employers: employers.length,
            courses: courses.length,
            alumni: alumni.length,
            prospects: prospects.length,
            signals: signals.length,
            propensity: propensity.length,
            cohorts: cohorts.length,
          },
        },
        null,
        2,
      ),
    ),
  ];
  await Promise.all(writes);
  return bundle;
}

// CLI entry
if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = path.resolve(process.cwd(), 'data');
  const seed = process.env.SEED ? Number(process.env.SEED) : 42;
  const small = process.env.SMALL === '1';
  runGeneration({ outDir, seed, small })
    .then((b) => {
      console.log(
        `Generated ${b.alumni.length} alumni, ${b.prospects.length} prospects, ${b.signals.length} signals, ${b.propensity.length} propensity rows → ${outDir}`,
      );
    })
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run test — verify PASS**

Run: `npm test -- generate-data`
Expected: 3 passed.

- [ ] **Step 5: Run the generator end-to-end**

Run: `npm run generate-data`
Expected: log line reporting counts; `data/` folder now contains 9 JSON files.

Sanity check counts:
```bash
node -e "const f=require('./data/meta.json'); console.log(JSON.stringify(f.counts,null,2))"
```
Expected: employers 500, courses 150, alumni 2000, prospects ≤500, signals ≥2000, propensity 300000.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-data.ts scripts/generate-data.spec.ts
git commit -m "feat(data): master generator orchestrator + CLI entry"
```

---

## Task 13: Typed data loader + zod validation

**Files:**
- Create: `lib/schemas.ts`
- Create: `lib/data.ts`
- Create: `lib/data.spec.ts`

- [ ] **Step 1: Write `lib/schemas.ts` (zod mirrors of `lib/types.ts`)**

```ts
import { z } from 'zod';

export const IndustrySchema = z.enum([
  'Technology',
  'Financial Services',
  'Government',
  'Healthcare',
  'Education',
  'Consulting',
  'Manufacturing',
  'Retail',
  'Media',
  'Energy',
]);

export const SenioritySchema = z.enum([
  'Junior',
  'Mid',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'VP',
  'C-Suite',
]);

export const DeliveryModeSchema = z.enum(['Online', 'Hybrid', 'On Campus']);
export const LearnerPersonaSchema = z.enum([
  'Career Switcher',
  'Skills Upgrader',
  'Returner',
  'Advancement Seeker',
]);
export const NeedscopePersonaSchema = z.enum(['Ambitious', 'Curious', 'Pragmatic', 'Reflective']);

export const EmployerSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: IndustrySchema,
  city: z.string(),
  state: z.string(),
  country: z.string(),
  employeeCountBand: z.enum(['1-50', '51-200', '201-1000', '1001-5000', '5000+']),
});

export const CourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  faculty: z.string(),
  fieldOfStudy: z.string(),
  deliveryMode: DeliveryModeSchema,
  durationWeeks: z.number(),
  priceAud: z.number(),
  targetSeniority: z.array(SenioritySchema),
  targetIndustries: z.array(IndustrySchema),
});

export const CareerRoleSchema = z.object({
  employerId: z.string(),
  title: z.string(),
  seniority: SenioritySchema,
  industry: IndustrySchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
});

export const SignalTypeSchema = z.enum([
  'promoted',
  'role_change',
  'industry_change',
  'location_change',
  'redundancy_risk',
  'course_recency_threshold',
  'alumni_anniversary',
]);

export const CareerSignalSchema = z.object({
  id: z.string(),
  alumniId: z.string(),
  type: SignalTypeSchema,
  detectedAt: z.string(),
  source: z.enum(['linkedin', 'unsw_events', 'derived']),
  confidence: z.number(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const AlumniSchema = z.object({
  id: z.string(),
  crmId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  linkedinUrl: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  learnerPersona: LearnerPersonaSchema,
  needscopePersona: NeedscopePersonaSchema,
  graduationYear: z.number(),
  completedUnswProgram: z.string(),
  fieldOfStudy: z.string(),
  careerTrajectory: z.array(CareerRoleSchema),
  currentEmployerId: z.string(),
  currentTitle: z.string(),
  currentSeniority: SenioritySchema,
  currentIndustry: IndustrySchema,
  emailConsent: z.boolean(),
  smsConsent: z.boolean(),
});

export const ProspectiveLearnerSchema = z.object({
  id: z.string(),
  crmId: z.string(),
  alumniId: z.string(),
  leadRating: z.enum(['Hot', 'Warm', 'Cold']),
  leadStatus: z.enum(['New', 'Qualified', 'Contacted', 'Nurturing', 'Disqualified']),
  leadSource: z.enum([
    'LinkedIn Signal',
    'Alumni Anniversary',
    'Course Interest Form',
    'Referral',
  ]),
  interestedInDeliveryMode: DeliveryModeSchema.nullable(),
  interestedInFieldOfStudy: z.string().nullable(),
  createdAt: z.string(),
});

export const PropensityScoreSchema = z.object({
  alumniId: z.string(),
  courseId: z.string(),
  score: z.number(),
  computedAt: z.string(),
  topFeatures: z.array(z.string()),
});

export const CohortIdSchema = z.enum([
  'recent_grads',
  'mid_career',
  'high_signal',
  'dormant',
  'all',
]);

export const CohortRollupSchema = z.object({
  id: CohortIdSchema,
  label: z.string(),
  size: z.number(),
  engagementRate30d: z.number(),
  momentsOfRelevance30d: z.number(),
  dropOffRate90d: z.number(),
  engagementTrend12m: z.array(z.object({ month: z.string(), rate: z.number() })),
  agentCommentary: z.string(),
});

export const DataBundleSchema = z.object({
  employers: z.array(EmployerSchema),
  courses: z.array(CourseSchema),
  alumni: z.array(AlumniSchema),
  prospects: z.array(ProspectiveLearnerSchema),
  signals: z.array(CareerSignalSchema),
  propensity: z.array(PropensityScoreSchema),
  cohorts: z.array(CohortRollupSchema),
  generatedAt: z.string(),
  seed: z.number(),
});
```

- [ ] **Step 2: Write failing test for the loader**

`lib/data.spec.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../scripts/generate-data';
import { loadDataBundle } from './data';

describe('loadDataBundle', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-load-'));
    await runGeneration({ outDir: tmpDir, seed: 5, small: true });
  });

  it('loads and validates the bundle', async () => {
    const bundle = await loadDataBundle(tmpDir);
    expect(bundle.alumni.length).toBeGreaterThan(0);
    expect(bundle.employers.length).toBeGreaterThan(0);
    expect(bundle.seed).toBe(5);
  });

  it('throws on corrupted bundle', async () => {
    const badDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-bad-'));
    await fs.writeFile(path.join(badDir, 'bundle.json'), JSON.stringify({ nope: true }));
    await expect(loadDataBundle(badDir)).rejects.toThrow();
    await fs.rm(badDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run test — verify FAIL**

Run: `npm test -- lib/data`

- [ ] **Step 4: Write `lib/data.ts`**

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DataBundle } from './types';
import { DataBundleSchema } from './schemas';

let cached: DataBundle | null = null;

export async function loadDataBundle(dir?: string): Promise<DataBundle> {
  const dataDir = dir ?? path.resolve(process.cwd(), 'data');
  const raw = await fs.readFile(path.join(dataDir, 'bundle.json'), 'utf8');
  const parsed = JSON.parse(raw);
  return DataBundleSchema.parse(parsed);
}

export async function getDataBundle(): Promise<DataBundle> {
  if (cached) return cached;
  cached = await loadDataBundle();
  return cached;
}

export function clearCache(): void {
  cached = null;
}
```

- [ ] **Step 5: Run test — verify PASS**

Run: `npm test -- lib/data`
Expected: 2 passed.

- [ ] **Step 6: Typecheck + full test suite**

Run:
```bash
npm run typecheck
npm test
```
Expected: typecheck clean; all specs pass.

- [ ] **Step 7: Update README with "Regenerate data" section**

Add to `README.md` under `## Run`:

```markdown
## Regenerate synthetic data

Data files under `data/` are gitignored. Regenerate them with:

`​``bash
npm run generate-data
# → writes data/alumni.json, prospects.json, courses.json, employers.json,
#   signals.json, propensity.json, cohorts.json, bundle.json, meta.json
`​``

Change the seed with `SEED=99 npm run generate-data`. Use `SMALL=1` for a
20-alumni bundle for quick smoke tests.
```

- [ ] **Step 8: Commit**

```bash
git add lib/schemas.ts lib/data.ts lib/data.spec.ts README.md
git commit -m "feat(data): typed loader with zod validation + regeneration docs"
```

---

## Done

At this point:
- `npm run generate-data` produces a full 2000-alumni bundle in `data/`
- `npm test` passes across all generator modules + loader
- `lib/data.ts` provides a single `getDataBundle()` accessor that downstream tabs and agent tools will use
- The bundle is deterministic for a given seed

**Next plan:** `2026-07-30-agent-runtime.md` — Claude Agent SDK wired to SSE + MCP tools that query this bundle.
