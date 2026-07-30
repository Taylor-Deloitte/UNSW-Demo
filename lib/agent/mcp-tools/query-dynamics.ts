import type { Alumni, DataBundle, ProspectiveLearner } from '../../types';

export interface QueryDynamicsInput {
  entity: 'alumni' | 'prospects';
  filters: {
    industry?: string;
    state?: string;
    seniority?: string;
    leadRating?: 'Hot' | 'Warm' | 'Cold';
    graduationYearMin?: number;
    graduationYearMax?: number;
  };
  limit?: number;
}

export interface QueryDynamicsOutput {
  rows: Array<Alumni | ProspectiveLearner>;
  totalMatched: number;
  entity: string;
}

export function queryDynamics(bundle: DataBundle, input: QueryDynamicsInput): QueryDynamicsOutput {
  const limit = input.limit ?? 20;
  const f = input.filters;

  let candidates: Array<Alumni | ProspectiveLearner>;
  if (input.entity === 'alumni') {
    candidates = bundle.alumni.filter((a) => {
      if (f.industry && a.currentIndustry !== f.industry) return false;
      if (f.state && a.state !== f.state) return false;
      if (f.seniority && a.currentSeniority !== f.seniority) return false;
      if (f.graduationYearMin && a.graduationYear < f.graduationYearMin) return false;
      if (f.graduationYearMax && a.graduationYear > f.graduationYearMax) return false;
      return true;
    });
  } else if (input.entity === 'prospects') {
    const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));
    candidates = bundle.prospects.filter((p) => {
      if (f.leadRating && p.leadRating !== f.leadRating) return false;
      const a = alumniById.get(p.alumniId);
      if (!a) return false;
      if (f.industry && a.currentIndustry !== f.industry) return false;
      if (f.state && a.state !== f.state) return false;
      if (f.seniority && a.currentSeniority !== f.seniority) return false;
      return true;
    });
  } else {
    return { rows: [], totalMatched: 0, entity: String(input.entity) };
  }

  return {
    rows: candidates.slice(0, limit),
    totalMatched: candidates.length,
    entity: input.entity,
  };
}
