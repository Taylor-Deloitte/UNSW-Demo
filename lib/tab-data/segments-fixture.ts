/**
 * Segments-screen match count fixture.
 * Per handoff §"Screen 3 derived values" — this is a demo fixture, not a real query.
 * Default token combo MUST return exactly 340 (the demo narrative depends on it).
 * Replace this block with a real count from the query service when integrating.
 */

export type SegmentsStudy = 'cs' | 'eng' | 'commerce' | 'any';
export type SegmentsSignal = 'promoted' | 'role-change' | 'redundancy' | 'any';
export type SegmentsWindow = '6m' | '12m' | '24m';
export type SegmentsLoc = 'outside-sydney' | 'anywhere' | 'regional-nsw';
export type SegmentsGap = '1y' | '3y' | '5y';

export interface SegmentsQuery {
  study: SegmentsStudy;
  signal: SegmentsSignal;
  window: SegmentsWindow;
  loc: SegmentsLoc;
  gap: SegmentsGap;
}

export const DEFAULT_SEGMENTS_QUERY: SegmentsQuery = {
  study: 'cs',
  signal: 'promoted',
  window: '12m',
  loc: 'outside-sydney',
  gap: '3y',
};

const MATCH_BASE: Record<SegmentsStudy, number> = {
  cs: 340,
  eng: 318,
  commerce: 274,
  any: 1180,
};

const F_SIGNAL: Record<SegmentsSignal, number> = {
  promoted: 1,
  'role-change': 0.78,
  redundancy: 0.27,
  any: 2.1,
};

const F_WINDOW: Record<SegmentsWindow, number> = {
  '6m': 0.58,
  '12m': 1,
  '24m': 1.54,
};

const F_LOC: Record<SegmentsLoc, number> = {
  'outside-sydney': 1,
  anywhere: 1.62,
  'regional-nsw': 0.44,
};

const F_GAP: Record<SegmentsGap, number> = {
  '1y': 1.31,
  '3y': 1,
  '5y': 0.62,
};

export function matchCount(q: SegmentsQuery): number {
  return Math.round(
    MATCH_BASE[q.study] * F_SIGNAL[q.signal] * F_WINDOW[q.window] * F_LOC[q.loc] * F_GAP[q.gap],
  );
}

export const SEGMENTS_TOKEN_OPTIONS = {
  study: [
    { value: 'cs', label: 'Computer Science' },
    { value: 'eng', label: 'Engineering' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'any', label: 'Any field' },
  ],
  signal: [
    { value: 'promoted', label: 'promoted' },
    { value: 'role-change', label: 'who changed role' },
    { value: 'redundancy', label: 'at redundancy risk' },
    { value: 'any', label: 'with any signal' },
  ],
  window: [
    { value: '6m', label: '6 months' },
    { value: '12m', label: '12 months' },
    { value: '24m', label: '24 months' },
  ],
  loc: [
    { value: 'outside-sydney', label: 'outside Sydney' },
    { value: 'anywhere', label: 'anywhere in Australia' },
    { value: 'regional-nsw', label: 'in regional NSW' },
  ],
  gap: [
    { value: '1y', label: '1 year' },
    { value: '3y', label: '3 years' },
    { value: '5y', label: '5 years' },
  ],
} as const;
