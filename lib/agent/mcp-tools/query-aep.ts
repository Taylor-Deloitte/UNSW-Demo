import type { Alumni, DataBundle } from '../../types';

export interface QueryAepInput {
  audienceCriteria: {
    industries?: string[];
    seniorities?: string[];
    states?: string[];
    hasRecentSignal?: boolean;
  };
  limit?: number;
}

export interface QueryAepOutput {
  profiles: Array<{
    profileId: string;
    displayName: string;
    industry: string;
    seniority: string;
    location: string;
  }>;
  audienceSize: number;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function queryAep(bundle: DataBundle, input: QueryAepInput): QueryAepOutput {
  const limit = input.limit ?? 20;
  const now = Date.now();
  const c = input.audienceCriteria;

  const recentSignalAlumni = c.hasRecentSignal
    ? new Set(
        bundle.signals
          .filter((s) => now - new Date(s.detectedAt).getTime() <= NINETY_DAYS_MS)
          .map((s) => s.alumniId),
      )
    : null;

  const matched: Alumni[] = bundle.alumni.filter((a) => {
    if (c.industries && c.industries.length && !c.industries.includes(a.currentIndustry))
      return false;
    if (c.seniorities && c.seniorities.length && !c.seniorities.includes(a.currentSeniority))
      return false;
    if (c.states && c.states.length && !c.states.includes(a.state)) return false;
    if (recentSignalAlumni && !recentSignalAlumni.has(a.id)) return false;
    return true;
  });

  return {
    profiles: matched.slice(0, limit).map((a) => ({
      profileId: a.crmId,
      displayName: `${a.firstName} ${a.lastName}`,
      industry: a.currentIndustry,
      seniority: a.currentSeniority,
      location: `${a.city}, ${a.state}`,
    })),
    audienceSize: matched.length,
  };
}
