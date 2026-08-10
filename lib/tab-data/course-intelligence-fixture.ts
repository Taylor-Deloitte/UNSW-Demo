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
  commerce:
    'Financial Modelling is the top pick — commerce grads in new senior roles show the highest historical match.',
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
    rationale:
      '89 CS grads who changed roles in the last 12 months purchased this course. Match rate 3.2× above baseline.',
  },
  {
    rank: 2,
    courseCode: 'PMG',
    courseName: 'Product Management Essentials',
    matchedAlumni: 156,
    historicalConversionPct: 0.062,
    opportunityScore: 0.78,
    badge: 'trending',
    rationale:
      '62 alumni transitioned to product roles. Role change is a strong predictor for PM uptake.',
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
    rationale:
      'Commerce grads moving into senior management roles show the highest conversion for financial skills top-ups.',
  },
  {
    rank: 2,
    courseCode: 'DSP',
    courseName: 'Data Strategy for Professionals',
    matchedAlumni: 131,
    historicalConversionPct: 0.058,
    opportunityScore: 0.72,
    badge: null,
    rationale:
      'Data fluency is increasingly required across commercial, finance, and consulting roles.',
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
    rationale:
      'AI adoption in commercial roles is accelerating — currently underpenetrated in this cohort.',
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
    rationale:
      'Highest cross-cohort demand. Alumni who changed roles show 2.8× above-baseline conversion.',
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
        detail: 'Applying market trend signals from LinkedIn activity and AJO engagement data',
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
