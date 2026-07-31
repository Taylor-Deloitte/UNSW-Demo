export type SignalsScope = 'all' | 'promoted' | 'role-change' | 'redundancy';
export type SignalsWindow = '7d' | '30d' | '90d';
export type SignalsRank = 'confidence' | 'recency' | 'course-value';

export interface SignalsQuery {
  scope: SignalsScope;
  window: SignalsWindow;
  rank: SignalsRank;
}

export const DEFAULT_SIGNALS_QUERY: SignalsQuery = {
  scope: 'all',
  window: '30d',
  rank: 'confidence',
};

const WINDOW_FACTOR: Record<SignalsWindow, number> = {
  '7d': 0.24,
  '30d': 1,
  '90d': 2.7,
};

const SCOPE_FACTOR: Record<SignalsScope, number> = {
  all: 1,
  promoted: 0.32,
  'role-change': 0.25,
  redundancy: 0.09,
};

export function deriveSignalCounts(q: { scope: SignalsScope; window: SignalsWindow }) {
  const f = WINDOW_FACTOR[q.window] * SCOPE_FACTOR[q.scope];
  return {
    momentsTotal: Math.round(1288 * f),
    momentsUnactioned: Math.round(214 * f),
  };
}

// Fixed signal-type totals (last four metric cells)
export const FIXED_SIGNAL_TOTALS = {
  promoted: 418,
  roleChange: 327,
  courseGap: 256,
  redundancyRisk: 112,
};

export const SIGNALS_TOKEN_OPTIONS = {
  scope: [
    { value: 'all', label: 'all signals' },
    { value: 'promoted', label: 'promotions only' },
    { value: 'role-change', label: 'role changes only' },
    { value: 'redundancy', label: 'redundancy risk only' },
  ],
  window: [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
  ],
  rank: [
    { value: 'confidence', label: 'confidence' },
    { value: 'recency', label: 'recency' },
    { value: 'course-value', label: 'course value' },
  ],
} as const;

const COURSE_FIT_BY_INDUSTRY: Record<string, string> = {
  Technology: 'AI for Leaders',
  'Financial Services': 'ESG & Sustainable Finance',
  Government: 'Data Strategy for Professionals',
  Healthcare: 'Healthcare Leadership & Analytics',
  Manufacturing: 'Financial Modelling for Non-Finance Managers',
  Media: 'Digital Marketing Certificate',
  Consulting: 'People Analytics for HR Leaders',
  Education: 'Generative AI for Practitioners',
  Retail: 'Product Management Essentials',
  Energy: 'Climate Risk & Strategy',
};

export function bestCourseFit(industry: string): string {
  return COURSE_FIT_BY_INDUSTRY[industry] ?? 'AI for Leaders';
}
