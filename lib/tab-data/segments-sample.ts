/**
 * Segments/Signals table row source.
 *
 * A deterministic, procedurally-generated sample of alumni rows. Both the
 * Segments and Signals screens filter this list client-side so that:
 *   - the number rendered matches the headline "N matched" (no fake
 *     "+N more" truncation); and
 *   - date-range tokens ("in the last 7 days" etc.) actually filter rows.
 *
 * All fields are computed at module load — no client-side randomness — so
 * repeated renders on the same day are stable. Dates are anchored to
 * "today at module load", which is fine for a demo: refreshing the browser
 * gives you rows dated relative to now.
 */

export interface SegmentSampleRow {
  id: string;
  name: string;
  role: string;
  employer: string;
  industry: string;
  city: string;
  state: string;
  sydneyMetro: boolean;
  study: 'cs' | 'eng' | 'commerce' | 'any';
  grad: number;
  signals: Array<
    'promoted' | 'moved' | 'role-change' | 'course-gap' | 'redundancy' | 'industry-change'
  >;
  event: string;
  /** ISO YYYY-MM-DD — when the signal event happened. */
  eventDate: string;
  /** ISO YYYY-MM-DD — first of month; drives the "Last course" display. */
  lastCourseDate: string;
  consent: string;
  score: number;
}

// ---------- date helpers (pure, used by pages too) ----------

const TODAY = new Date();
const MS_PER_DAY = 86_400_000;

/** Days between `iso` (YYYY-MM-DD) and today. Positive = in the past. */
export function daysSince(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const today = new Date(Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()));
  return Math.round((today.getTime() - d.getTime()) / MS_PER_DAY);
}

/** "2d ago" / "3w ago" / "4m ago" / "2y ago". */
export function formatWhen(iso: string): string {
  const d = daysSince(iso);
  if (d < 1) return 'today';
  if (d < 14) return `${d}d ago`;
  if (d < 60) return `${Math.round(d / 7)}w ago`;
  if (d < 365) return `${Math.round(d / 30)}m ago`;
  return `${Math.round(d / 365)}y ago`;
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "Mar 2022" style. */
export function formatMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTH_ABBR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ---------- deterministic RNG (mulberry32) ----------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x5153_5153);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

// ---------- catalogue ----------

const FIRST_NAMES = [
  'Aarav',
  'Alice',
  'Amir',
  'Ana',
  'Anika',
  'Anna',
  'Ariel',
  'Arjun',
  'Asha',
  'Ava',
  'Ben',
  'Beth',
  'Callum',
  'Cameron',
  'Caroline',
  'Chloe',
  'Claire',
  'Daniel',
  'David',
  'Dinesh',
  'Ella',
  'Emily',
  'Emma',
  'Ethan',
  'Eve',
  'Fatima',
  'Felix',
  'Finn',
  'Gemma',
  'George',
  'Grace',
  'Hana',
  'Harper',
  'Harvey',
  'Henry',
  'Hugh',
  'Ian',
  'Isabella',
  'Isla',
  'Jack',
  'James',
  'Jamie',
  'Jane',
  'Jasmin',
  'Jayden',
  'Jenny',
  'Jing',
  'Joel',
  'John',
  'Jordan',
  'Julia',
  'Kai',
  'Kate',
  'Kavya',
  'Kenji',
  'Kevin',
  'Kiran',
  'Kwame',
  'Lachlan',
  'Lara',
  'Laura',
  'Leah',
  'Liam',
  'Lily',
  'Lin',
  'Lucas',
  'Luna',
  'Maisie',
  'Marcus',
  'Mark',
  'Mary',
  'Mason',
  'Meera',
  'Mia',
  'Michael',
  'Mila',
  'Nadia',
  'Naomi',
  'Nathan',
  'Nina',
  'Noah',
  'Oliver',
  'Olivia',
  'Omar',
  'Owen',
  'Patrick',
  'Paul',
  'Peter',
  'Phoebe',
  'Priya',
  'Rachel',
  'Rahim',
  'Raj',
  'Riley',
  'Rose',
  'Ruby',
  'Ryan',
  'Sam',
  'Sana',
  'Sarah',
  'Scott',
  'Sean',
  'Shane',
  'Simone',
  'Sofia',
  'Sunil',
  'Talia',
  'Thomas',
  'Tim',
  'Tina',
  'Tom',
  'Vera',
  'Victor',
  'Wei',
  'Will',
  'Xavier',
  'Yara',
  'Yusuf',
  'Zac',
  'Zara',
];

const LAST_NAMES = [
  'Ahmed',
  'Anderson',
  'Ansari',
  'Bailey',
  'Bell',
  'Brown',
  'Campbell',
  'Chen',
  'Clarke',
  'Cole',
  'Cooper',
  'Davies',
  'Dixon',
  'Edwards',
  'Evans',
  'Ferguson',
  'Fisher',
  'Fitzgerald',
  'Foster',
  'Gao',
  'Garcia',
  'Grant',
  'Green',
  'Hamilton',
  'Harris',
  'Hassan',
  'Henderson',
  'Hughes',
  'Iyer',
  'Jackson',
  'James',
  'Johnson',
  'Jones',
  'Kim',
  'King',
  'Kingsley',
  'Kumar',
  'Lam',
  'Lee',
  'Lewis',
  'Li',
  'Lopez',
  'Martin',
  'McDonald',
  'McLeod',
  'Mehta',
  'Miller',
  'Mitchell',
  'Moore',
  'Morgan',
  'Murphy',
  'Nair',
  'Nguyen',
  'O’Connor',
  'Okafor',
  'Park',
  'Patel',
  'Peters',
  'Phillips',
  'Price',
  'Rahman',
  'Ramirez',
  'Reed',
  'Reid',
  'Richards',
  'Roberts',
  'Robinson',
  'Rodriguez',
  'Ross',
  'Ryan',
  'Sanchez',
  'Scott',
  'Shah',
  'Simmons',
  'Sinclair',
  'Singh',
  'Smith',
  'Stewart',
  'Sullivan',
  'Tan',
  'Taylor',
  'Thomas',
  'Thompson',
  'Turner',
  'Walker',
  'Wang',
  'Ward',
  'Watson',
  'Whitfield',
  'Williams',
  'Wilson',
  'Wong',
  'Wright',
  'Xu',
  'Young',
  'Zhang',
];

interface RoleCatalog {
  role: string;
  study: SegmentSampleRow['study'];
  industry: string;
  employers: string[];
}

const ROLES: RoleCatalog[] = [
  {
    role: 'Senior Software Engineer',
    study: 'cs',
    industry: 'Technology',
    employers: [
      'Atlassian',
      'Canva',
      'Culture Amp',
      'MYOB',
      'REA Group',
      'Xero',
      'Google',
      'Amazon',
      'Freelancer.com',
      'SafetyCulture',
    ],
  },
  {
    role: 'Staff Engineer',
    study: 'cs',
    industry: 'Technology',
    employers: ['Google', 'Atlassian', 'Amazon', 'Canva'],
  },
  {
    role: 'Principal Software Engineer',
    study: 'cs',
    industry: 'Technology',
    employers: ['Atlassian', 'Canva', 'Culture Amp', 'SafetyCulture'],
  },
  {
    role: 'Engineering Manager',
    study: 'cs',
    industry: 'Technology',
    employers: ['Atlassian', 'Canva', 'MYOB', 'REA Group', 'Xero', 'Deputy'],
  },
  {
    role: 'Head of Engineering',
    study: 'cs',
    industry: 'Technology',
    employers: ['Culture Amp', 'Freelancer.com', 'SafetyCulture', 'Deputy'],
  },
  {
    role: 'Engineering Director',
    study: 'cs',
    industry: 'Technology',
    employers: ['Atlassian', 'Canva', 'Amazon', 'Google'],
  },
  {
    role: 'Head of Data Engineering',
    study: 'cs',
    industry: 'Technology',
    employers: ['Atlassian', 'Culture Amp', 'Deputy', 'Xero'],
  },
  {
    role: 'Lead Data Scientist',
    study: 'cs',
    industry: 'Technology',
    employers: ['Xero', 'Canva', 'Atlassian', 'Deputy'],
  },
  {
    role: 'Senior Data Analyst',
    study: 'cs',
    industry: 'Technology',
    employers: ['Deputy', 'MYOB', 'REA Group', 'Ansell'],
  },
  {
    role: 'DevOps Lead',
    study: 'cs',
    industry: 'Financial Services',
    employers: ['NAB', 'Commonwealth Bank', 'ANZ', 'Westpac', 'Zip Co'],
  },
  {
    role: 'Senior Backend Engineer',
    study: 'eng',
    industry: 'Technology',
    employers: ['REA Group', 'Atlassian', 'Culture Amp', 'Google'],
  },
  {
    role: 'Senior Platform Engineer',
    study: 'eng',
    industry: 'Technology',
    employers: ['Canva', 'Xero', 'Atlassian', 'MYOB'],
  },
  {
    role: 'Site Reliability Engineer',
    study: 'eng',
    industry: 'Technology',
    employers: ['Google', 'Amazon', 'Atlassian', 'Canva'],
  },
  {
    role: 'Manufacturing Operations Lead',
    study: 'eng',
    industry: 'Manufacturing',
    employers: ['Ansell', 'BlueScope Steel', 'Cochlear', 'Orica'],
  },
  {
    role: 'Energy Systems Engineer',
    study: 'eng',
    industry: 'Energy',
    employers: ['AGL', 'Origin Energy', 'Woodside', 'Santos'],
  },
  {
    role: 'Product Manager',
    study: 'commerce',
    industry: 'Technology',
    employers: ['Deputy', 'Canva', 'Xero', 'MYOB', 'Culture Amp'],
  },
  {
    role: 'Head of Product',
    study: 'commerce',
    industry: 'Technology',
    employers: ['Canva', 'Culture Amp', 'SafetyCulture'],
  },
  {
    role: 'Senior Consultant',
    study: 'commerce',
    industry: 'Consulting',
    employers: ['Deloitte', 'KPMG', 'PwC', 'EY', 'Accenture'],
  },
  {
    role: 'Engagement Manager',
    study: 'commerce',
    industry: 'Consulting',
    employers: ['Deloitte', 'KPMG', 'PwC', 'EY', 'Bain'],
  },
  {
    role: 'Investment Analyst',
    study: 'commerce',
    industry: 'Financial Services',
    employers: ['Macquarie', 'NAB', 'ANZ', 'Commonwealth Bank', 'Westpac'],
  },
  {
    role: 'Head of Finance',
    study: 'commerce',
    industry: 'Financial Services',
    employers: ['Zip Co', 'NAB', 'Macquarie', 'ANZ'],
  },
  {
    role: 'Retail Category Manager',
    study: 'commerce',
    industry: 'Retail',
    employers: ['Woolworths', 'Coles', 'Bunnings', 'Kmart'],
  },
];

interface CityCatalog {
  city: string;
  state: string;
  sydneyMetro: boolean;
}
const CITIES: CityCatalog[] = [
  { city: 'Sydney', state: 'NSW', sydneyMetro: true },
  { city: 'Sydney', state: 'NSW', sydneyMetro: true },
  { city: 'Sydney', state: 'NSW', sydneyMetro: true },
  { city: 'Parramatta', state: 'NSW', sydneyMetro: true },
  { city: 'Melbourne', state: 'VIC', sydneyMetro: false },
  { city: 'Melbourne', state: 'VIC', sydneyMetro: false },
  { city: 'Melbourne', state: 'VIC', sydneyMetro: false },
  { city: 'Brisbane', state: 'QLD', sydneyMetro: false },
  { city: 'Brisbane', state: 'QLD', sydneyMetro: false },
  { city: 'Perth', state: 'WA', sydneyMetro: false },
  { city: 'Adelaide', state: 'SA', sydneyMetro: false },
  { city: 'Canberra', state: 'ACT', sydneyMetro: false },
  { city: 'Hobart', state: 'TAS', sydneyMetro: false },
  { city: 'Newcastle', state: 'NSW', sydneyMetro: false },
  { city: 'Wollongong', state: 'NSW', sydneyMetro: false },
];

const CONSENTS = ['Email + SMS', 'Email', 'Email', 'Email + SMS', 'Email'];

// ---------- generation ----------

function daysAgoIso(days: number): string {
  const d = new Date(TODAY.getTime() - days * MS_PER_DAY);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Weighted event-date offset: 8% within 7 days, 22% 8–30 days, 30% 31–90 days,
 * 40% 91–730 days. Keeps 7d/30d/90d windows meaningfully different, without
 * front-loading so hard that "last 7 days" returns hundreds.
 */
function eventOffsetDays(): number {
  const r = rand();
  if (r < 0.08) return Math.floor(rand() * 7);
  if (r < 0.3) return 7 + Math.floor(rand() * 24);
  if (r < 0.6) return 31 + Math.floor(rand() * 60);
  return 91 + Math.floor(rand() * 640);
}

function pickSignals(): SegmentSampleRow['signals'] {
  const out: SegmentSampleRow['signals'] = [];
  if (chance(0.6)) out.push('promoted');
  if (chance(0.28)) out.push('role-change');
  if (chance(0.14)) out.push('redundancy');
  if (chance(0.22)) out.push('course-gap');
  if (chance(0.15)) out.push('moved');
  if (chance(0.08)) out.push('industry-change');
  if (out.length === 0) out.push('promoted');
  return out;
}

function eventPhrase(sigs: SegmentSampleRow['signals'], role: string): string {
  if (sigs.includes('promoted') && sigs.includes('course-gap'))
    return `Promoted to ${role}, course gap`;
  if (sigs.includes('promoted') && sigs.includes('moved')) return `Promoted after relocating`;
  if (sigs.includes('promoted')) return `Promoted to ${role}`;
  if (sigs.includes('role-change')) return `New role: ${role}`;
  if (sigs.includes('redundancy')) return `Redundancy risk flagged`;
  if (sigs.includes('industry-change')) return `Switched industry`;
  if (sigs.includes('course-gap')) return `No course purchase in 3y+`;
  return `Update: ${role}`;
}

function makeGenerated(seq: number): SegmentSampleRow {
  const r = ROLES[Math.floor(rand() * ROLES.length)];
  const employer = pick(r.employers);
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const loc = pick(CITIES);
  const grad = 2005 + Math.floor(rand() * 18); // 2005–2022
  const signals = pickSignals();
  const eventDays = eventOffsetDays();
  const lastCourseDays = 180 + Math.floor(rand() * (11 * 365)); // 6mo – 11y ago
  const score = 0.35 + rand() * 0.35; // 0.35–0.70; premium rows sit above
  return {
    id: `a-${String(seq).padStart(3, '0')}`,
    name: `${first} ${last}`,
    role: r.role,
    employer,
    industry: r.industry,
    city: loc.city,
    state: loc.state,
    sydneyMetro: loc.sydneyMetro,
    study: r.study,
    grad,
    signals,
    event: eventPhrase(signals, r.role),
    eventDate: daysAgoIso(eventDays),
    lastCourseDate: daysAgoIso(lastCourseDays),
    consent: pick(CONSENTS),
    score: Math.round(score * 1000) / 1000,
  };
}

const PREMIUM: SegmentSampleRow[] = [
  {
    id: 'a-001',
    name: 'Priya Nair',
    role: 'Head of Data Engineering',
    employer: 'Atlassian',
    industry: 'Technology',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2013,
    signals: ['promoted'],
    event: 'Promoted to Head of Data Engineering',
    eventDate: daysAgoIso(42),
    lastCourseDate: daysAgoIso(5 * 365),
    consent: 'Email + SMS',
    score: 0.912,
  },
  {
    id: 'a-002',
    name: 'James O’Connor',
    role: 'Senior Platform Engineer',
    employer: 'Canva',
    industry: 'Technology',
    city: 'Brisbane',
    state: 'QLD',
    sydneyMetro: false,
    study: 'cs',
    grad: 2015,
    signals: ['promoted', 'moved'],
    event: 'Promoted after Sydney→Brisbane move',
    eventDate: daysAgoIso(120),
    lastCourseDate: daysAgoIso(4 * 365),
    consent: 'Email',
    score: 0.887,
  },
  {
    id: 'a-003',
    name: 'Wei Chen',
    role: 'Engineering Manager',
    employer: 'Commonwealth Bank',
    industry: 'Financial Services',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2011,
    signals: ['promoted'],
    event: 'Promoted to EM',
    eventDate: daysAgoIso(90),
    lastCourseDate: daysAgoIso(6 * 365),
    consent: 'Email + SMS',
    score: 0.874,
  },
  {
    id: 'a-004',
    name: 'Aisha Rahman',
    role: 'Lead Data Scientist',
    employer: 'Xero',
    industry: 'Technology',
    city: 'Newcastle',
    state: 'NSW',
    sydneyMetro: false,
    study: 'cs',
    grad: 2014,
    signals: ['promoted'],
    event: 'Promoted to Lead',
    eventDate: daysAgoIso(56),
    lastCourseDate: daysAgoIso(3 * 365),
    consent: 'Email + SMS',
    score: 0.851,
  },
  {
    id: 'a-005',
    name: 'Tom Whitfield',
    role: 'Principal Software Engineer',
    employer: 'Culture Amp',
    industry: 'Technology',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2012,
    signals: ['promoted', 'course-gap'],
    event: 'Promoted, no course in 5y',
    eventDate: daysAgoIso(60),
    lastCourseDate: daysAgoIso(5 * 365),
    consent: 'Email',
    score: 0.838,
  },
  {
    id: 'a-006',
    name: 'Zoe Ferguson',
    role: 'Head of Engineering',
    employer: 'Freelancer.com',
    industry: 'Technology',
    city: 'Perth',
    state: 'WA',
    sydneyMetro: false,
    study: 'cs',
    grad: 2010,
    signals: ['promoted'],
    event: 'Promoted to Head of',
    eventDate: daysAgoIso(150),
    lastCourseDate: daysAgoIso(7 * 365),
    consent: 'Email + SMS',
    score: 0.822,
  },
  {
    id: 'a-007',
    name: 'Rahim Ahmed',
    role: 'Staff Engineer',
    employer: 'Google',
    industry: 'Technology',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2013,
    signals: ['promoted'],
    event: 'Promoted to Staff',
    eventDate: daysAgoIso(63),
    lastCourseDate: daysAgoIso(4 * 365),
    consent: 'Email',
    score: 0.809,
  },
  {
    id: 'a-008',
    name: 'Laura Kingsley',
    role: 'Engineering Director',
    employer: 'Zip Co',
    industry: 'Financial Services',
    city: 'Newcastle',
    state: 'NSW',
    sydneyMetro: false,
    study: 'cs',
    grad: 2009,
    signals: ['promoted', 'industry-change'],
    event: 'Promoted to Director',
    eventDate: daysAgoIso(77),
    lastCourseDate: daysAgoIso(6 * 365),
    consent: 'Email + SMS',
    score: 0.798,
  },
  {
    id: 'a-009',
    name: 'Ben Ross',
    role: 'Senior Backend Engineer',
    employer: 'REA Group',
    industry: 'Technology',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'eng',
    grad: 2016,
    signals: ['role-change'],
    event: 'New role at REA',
    eventDate: daysAgoIso(90),
    lastCourseDate: daysAgoIso(2 * 365),
    consent: 'Email',
    score: 0.762,
  },
  {
    id: 'a-010',
    name: 'Meera Patel',
    role: 'Product Manager',
    employer: 'Deputy',
    industry: 'Technology',
    city: 'Adelaide',
    state: 'SA',
    sydneyMetro: false,
    study: 'commerce',
    grad: 2015,
    signals: ['promoted'],
    event: 'Promoted to PM',
    eventDate: daysAgoIso(120),
    lastCourseDate: daysAgoIso(4 * 365),
    consent: 'Email + SMS',
    score: 0.748,
  },
  {
    id: 'a-011',
    name: 'Sarah Nguyen',
    role: 'Senior Data Analyst',
    employer: 'Ansell',
    industry: 'Manufacturing',
    city: 'Wollongong',
    state: 'NSW',
    sydneyMetro: false,
    study: 'cs',
    grad: 2018,
    signals: ['course-gap'],
    event: 'No course in 3y',
    eventDate: daysAgoIso(200),
    lastCourseDate: daysAgoIso(3 * 365),
    consent: 'Email',
    score: 0.712,
  },
  {
    id: 'a-012',
    name: 'Marcus Cole',
    role: 'DevOps Lead',
    employer: 'NAB',
    industry: 'Financial Services',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2012,
    signals: ['promoted'],
    event: 'Promoted to Lead',
    eventDate: daysAgoIso(150),
    lastCourseDate: daysAgoIso(5 * 365),
    consent: 'Email + SMS',
    score: 0.694,
  },
  {
    id: 'a-013',
    name: 'Emma Sinclair',
    role: 'Senior Software Engineer',
    employer: 'Culture Amp',
    industry: 'Technology',
    city: 'Sydney',
    state: 'NSW',
    sydneyMetro: true,
    study: 'cs',
    grad: 2016,
    signals: ['promoted'],
    event: 'Promoted (Sydney-based)',
    eventDate: daysAgoIso(60),
    lastCourseDate: daysAgoIso(4 * 365),
    consent: 'Email',
    score: 0.671,
  },
  {
    id: 'a-014',
    name: 'Daniel Park',
    role: 'Engineering Manager',
    employer: 'MYOB',
    industry: 'Technology',
    city: 'Melbourne',
    state: 'VIC',
    sydneyMetro: false,
    study: 'cs',
    grad: 2011,
    signals: ['promoted', 'course-gap'],
    event: 'Promoted, 6y course gap',
    eventDate: daysAgoIso(180),
    lastCourseDate: daysAgoIso(6 * 365),
    consent: 'Email + SMS',
    score: 0.648,
  },
];

const GENERATED_COUNT = 900;
const GENERATED: SegmentSampleRow[] = Array.from({ length: GENERATED_COUNT }, (_, i) =>
  makeGenerated(15 + i),
);

export const SEGMENTS_SAMPLE: SegmentSampleRow[] = [...PREMIUM, ...GENERATED];
