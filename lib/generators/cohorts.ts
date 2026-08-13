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
      label: 'Mid-Career (Senior/Manager)',
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
      return {
        month: monthStr,
        rate: Math.max(0, Math.min(1, Number((base + jitter).toFixed(3)))),
      };
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
