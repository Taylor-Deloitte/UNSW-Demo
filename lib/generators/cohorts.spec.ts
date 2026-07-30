import { describe, it, expect } from 'vitest';
import { generateCohorts } from './cohorts';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateSignals } from './signals';
import { makeRng } from './rng';

describe('generateCohorts', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 500);
  const signals = generateSignals(rng, alumni);

  it('emits exactly 5 cohorts', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    expect(cohorts).toHaveLength(5);
    const ids = cohorts.map((c) => c.id).sort();
    expect(ids).toEqual(['all', 'dormant', 'high_signal', 'mid_career', 'recent_grads']);
  });

  it('all cohort size equals alumni count', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    const all = cohorts.find((c) => c.id === 'all')!;
    expect(all.size).toBe(alumni.length);
  });

  it('trend has 12 monthly points', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.engagementTrend12m).toHaveLength(12);
    }
  });

  it('KPIs are within valid ranges', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.engagementRate30d).toBeGreaterThanOrEqual(0);
      expect(c.engagementRate30d).toBeLessThanOrEqual(1);
      expect(c.dropOffRate90d).toBeGreaterThanOrEqual(0);
      expect(c.dropOffRate90d).toBeLessThanOrEqual(1);
      expect(c.momentsOfRelevance30d).toBeGreaterThanOrEqual(0);
    }
  });

  it('agent commentary is non-empty', () => {
    const cohorts = generateCohorts(rng, alumni, signals);
    for (const c of cohorts) {
      expect(c.agentCommentary.length).toBeGreaterThan(20);
    }
  });
});
