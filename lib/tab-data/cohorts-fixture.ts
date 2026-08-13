export type CohortKey = 'all' | 'recent-grads' | 'mid-career' | 'high-signal' | 'dormant';
export type CohortsWindow = '6m' | '12m' | '24m';

export interface CohortsQuery {
  a: CohortKey;
  b: CohortKey;
  window: CohortsWindow;
}

export const DEFAULT_COHORTS_QUERY: CohortsQuery = {
  a: 'mid-career',
  b: 'recent-grads',
  window: '12m',
};

export interface CohortRow {
  key: CohortKey;
  label: string;
  size: number;
  engagement: number; // %
  deltaQ1: number; // %
  series: number[]; // 12-point monthly values, %
}

export const COHORTS: Record<CohortKey, CohortRow> = {
  all: {
    key: 'all',
    label: 'All Alumni',
    size: 2000,
    engagement: 41,
    deltaQ1: -6,
    series: [46, 47, 46, 45, 46, 44, 43, 41, 41, 42, 41, 41],
  },
  'recent-grads': {
    key: 'recent-grads',
    label: 'Recent Grads',
    size: 412,
    engagement: 58,
    deltaQ1: 3,
    series: [55, 56, 55, 57, 56, 57, 58, 59, 58, 59, 58, 58],
  },
  'mid-career': {
    key: 'mid-career',
    label: 'Mid-Career',
    size: 786,
    engagement: 34,
    deltaQ1: -22,
    series: [56, 55, 54, 52, 47, 41, 36, 34, 33, 34, 34, 34],
  },
  'high-signal': {
    key: 'high-signal',
    label: 'High-Signal',
    size: 344,
    engagement: 71,
    deltaQ1: 4,
    series: [64, 65, 66, 67, 68, 69, 70, 71, 71, 71, 71, 71],
  },
  dormant: {
    key: 'dormant',
    label: 'Dormant',
    size: 458,
    engagement: 11,
    deltaQ1: -3,
    series: [13, 13, 12, 12, 12, 12, 11, 11, 11, 11, 11, 11],
  },
};

export const COHORT_OPTIONS = Object.values(COHORTS).map((c) => ({
  value: c.key,
  label: c.label,
}));

export const COHORTS_WINDOW_OPTIONS = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '24m', label: '24 months' },
];

export function cohortFinding(a: CohortRow, b: CohortRow): string {
  if (a.key === 'mid-career') {
    return `${a.label} engagement fell after the email cadence changed on 12 June, the drop maps cleanly to the same week the new template shipped. ${b.label}, on the same cadence, is flat to slightly up, so the change is not universal. Reverting the template or A/B testing it against control is the fastest path to recovering the ~${Math.abs(a.deltaQ1)}% we've lost.`;
  }
  if (a.deltaQ1 < 0) {
    return `${a.label} engagement is down ${Math.abs(a.deltaQ1)}% over the window, while ${b.label} is at ${b.engagement}%. The gap widened in the last quarter; worth investigating whether recent campaigns are landing differently across the two cohorts.`;
  }
  return `${a.label} engagement is holding at ${a.engagement}%, up ${a.deltaQ1}% from Q1. Continue current cadence; consider testing whether ${b.label}'s pattern generalises.`;
}
