import type { Alumni, CareerSignal, DataBundle } from '../types';

export interface AlumniWithSignals extends Alumni {
  signals: CareerSignal[];
  rankWeight: number;
}

export interface FacetEntry {
  label: string;
  count: number;
}

export interface AlumniInsightsPage {
  alumni: AlumniWithSignals[];
  facets: {
    industries: FacetEntry[];
    states: FacetEntry[];
    signalTypes: FacetEntry[];
  };
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Rank weight = sum(signal.confidence * recency factor). Recent + high-confidence = high. */
export function rankByRecentSignalConfidence(bundle: DataBundle): AlumniWithSignals[] {
  const now = Date.now();
  const signalsByAlumni = new Map<string, CareerSignal[]>();
  for (const s of bundle.signals) {
    const arr = signalsByAlumni.get(s.alumniId) ?? [];
    arr.push(s);
    signalsByAlumni.set(s.alumniId, arr);
  }

  return bundle.alumni
    .map((a) => {
      const signals = signalsByAlumni.get(a.id) ?? [];
      const rankWeight = signals.reduce((sum, s) => {
        const ageMs = now - new Date(s.detectedAt).getTime();
        let recencyFactor: number;
        if (ageMs <= NINETY_DAYS_MS) recencyFactor = 1.0;
        else if (ageMs <= ONE_YEAR_MS) recencyFactor = 0.5;
        else recencyFactor = 0.1;
        return sum + s.confidence * recencyFactor;
      }, 0);
      return { ...a, signals, rankWeight };
    })
    .sort((a, b) => b.rankWeight - a.rankWeight);
}

export function buildAlumniInsightsPage(
  bundle: DataBundle,
  opts: { limit: number },
): AlumniInsightsPage {
  const ranked = rankByRecentSignalConfidence(bundle);
  const top = ranked.slice(0, opts.limit);

  return {
    alumni: top,
    facets: {
      industries: countBy(ranked, (a) => a.currentIndustry),
      states: countBy(ranked, (a) => a.state),
      signalTypes: countBy(bundle.signals, (s) => s.type),
    },
  };
}

function countBy<T>(items: T[], key: (t: T) => string): FacetEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
