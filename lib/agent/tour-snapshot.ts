import {
  DEFAULT_SIGNALS_QUERY,
  FIXED_SIGNAL_TOTALS,
  deriveSignalCounts,
} from '../tab-data/signals-fixture';
import { COHORTS, cohortFinding } from '../tab-data/cohorts-fixture';
import { DEFAULT_SEGMENTS_QUERY, SEGMENTS_TOKEN_OPTIONS, matchCount } from '../tab-data/segments-fixture';
import { getCourseIntelligence } from '../tab-data/course-intelligence-fixture';

// Mirrors app/course-intelligence/page.tsx's DEFAULT_Q — keep in sync if that default changes.
const CI_DEFAULT_QUERY = { cohort: 'cs', signal: 'role-change', window: '12m' } as const;

function labelFor<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string,
): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export interface TourSnapshot {
  signals: {
    momentsTotal: number;
    momentsUnactioned: number;
    promoted: number;
    roleChange: number;
    courseGap: number;
    redundancyRisk: number;
  };
  cohorts: {
    midCareer: { size: number; engagement: number; deltaQ1: number };
    highSignal: { size: number; engagement: number; deltaQ1: number };
    finding: string;
  };
  segments: {
    matchCount: number;
    description: string;
  };
  courseIntelligence: {
    topCourseName: string;
    matchedAlumni: number;
    historicalConversionPct: number;
    opportunityScore: number;
    catalogueGaps: { title: string; potentialCohortSize: number }[];
  };
}

// Builds a fresh snapshot of "what's live on screen right now" from the exact same fixture
// functions each tab renders from (lib/tab-data/*), using each tab's own default query. When
// those fixtures are replaced by a real query service, this function is the only place that
// needs to change — the brief narration will pick up real numbers automatically.
export function buildTourSnapshot(): TourSnapshot {
  const signalCounts = deriveSignalCounts(DEFAULT_SIGNALS_QUERY);
  const midCareer = COHORTS['mid-career'];
  const highSignal = COHORTS['high-signal'];
  const segmentsMatch = matchCount(DEFAULT_SEGMENTS_QUERY);
  const ci = getCourseIntelligence(CI_DEFAULT_QUERY.cohort, CI_DEFAULT_QUERY.signal, CI_DEFAULT_QUERY.window);
  const topRec = ci.recommendations[0];

  return {
    signals: {
      momentsTotal: signalCounts.momentsTotal,
      momentsUnactioned: signalCounts.momentsUnactioned,
      promoted: FIXED_SIGNAL_TOTALS.promoted,
      roleChange: FIXED_SIGNAL_TOTALS.roleChange,
      courseGap: FIXED_SIGNAL_TOTALS.courseGap,
      redundancyRisk: FIXED_SIGNAL_TOTALS.redundancyRisk,
    },
    cohorts: {
      midCareer: { size: midCareer.size, engagement: midCareer.engagement, deltaQ1: midCareer.deltaQ1 },
      highSignal: { size: highSignal.size, engagement: highSignal.engagement, deltaQ1: highSignal.deltaQ1 },
      finding: cohortFinding(midCareer, highSignal),
    },
    segments: {
      matchCount: segmentsMatch,
      description:
        `${labelFor(SEGMENTS_TOKEN_OPTIONS.study, DEFAULT_SEGMENTS_QUERY.study)} grads ` +
        `${labelFor(SEGMENTS_TOKEN_OPTIONS.signal, DEFAULT_SEGMENTS_QUERY.signal)} ` +
        `${labelFor(SEGMENTS_TOKEN_OPTIONS.loc, DEFAULT_SEGMENTS_QUERY.loc)}, ` +
        `in the last ${labelFor(SEGMENTS_TOKEN_OPTIONS.window, DEFAULT_SEGMENTS_QUERY.window)}, ` +
        `not enrolled in ${labelFor(SEGMENTS_TOKEN_OPTIONS.gap, DEFAULT_SEGMENTS_QUERY.gap)}+`,
    },
    courseIntelligence: {
      topCourseName: topRec.courseName,
      matchedAlumni: topRec.matchedAlumni,
      historicalConversionPct: topRec.historicalConversionPct,
      opportunityScore: topRec.opportunityScore,
      catalogueGaps: ci.catalogueGaps.map((g) => ({
        title: g.title,
        potentialCohortSize: g.potentialCohortSize,
      })),
    },
  };
}

// Renders a TourSnapshot into the same narrative-fact block that used to be hardcoded into
// TOUR_PROMPT (components/ChatOverlay.tsx). Grounds the LLM's narration in real, current numbers.
export function formatTourFacts(s: TourSnapshot): string {
  const gaps = s.courseIntelligence.catalogueGaps
    .map((g) => `${g.title} (${g.potentialCohortSize} alumni, no existing course)`)
    .join(' and ');

  return [
    "Here's exactly what's live on screen right now:",
    '',
    `Signals: ${s.signals.momentsTotal.toLocaleString()} career moments detected this month across alumni: ` +
      `${s.signals.promoted} promotions, ${s.signals.roleChange} role changes, ${s.signals.courseGap} course-profile gaps, ` +
      `${s.signals.redundancyRisk} at redundancy risk. ${s.signals.momentsUnactioned} are unactioned.`,
    '',
    `Cohorts: Mid-career (${s.cohorts.midCareer.size} alumni) is at ${s.cohorts.midCareer.engagement}% engagement, ` +
      `${s.cohorts.midCareer.deltaQ1 < 0 ? 'down' : 'up'} ${Math.abs(s.cohorts.midCareer.deltaQ1)} points this quarter. ` +
      `High-Signal (${s.cohorts.highSignal.size} alumni) is at ${s.cohorts.highSignal.engagement}% engagement and ` +
      `${s.cohorts.highSignal.deltaQ1 < 0 ? 'falling' : 'still climbing'}. ${s.cohorts.finding}`,
    '',
    `Segments: ${s.segments.description}; that's exactly ${s.segments.matchCount} alumni. Ready to contact.`,
    '',
    `Course Intelligence: ${s.courseIntelligence.topCourseName} is #1: ${s.courseIntelligence.matchedAlumni} matched alumni, ` +
      `${(s.courseIntelligence.historicalConversionPct * 100).toFixed(1)}% historical conversion, ` +
      `opportunity score ${s.courseIntelligence.opportunityScore}. Two catalogue gaps: ${gaps}.`,
  ].join('\n');
}
