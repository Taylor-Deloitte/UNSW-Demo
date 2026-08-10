import { describe, it, expect } from 'vitest';
import { getCourseIntelligence } from './course-intelligence-fixture.js';

describe('getCourseIntelligence', () => {
  it('returns 5 recommendations ranked 1-5', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.recommendations).toHaveLength(5);
    expect(result.recommendations.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns 4 agent steps', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.agentSteps).toHaveLength(4);
    expect(result.agentSteps.every((s) => s.label.length > 0 && s.detail.length > 0)).toBe(true);
  });

  it('returns 2 catalogue gaps', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.catalogueGaps).toHaveLength(2);
    expect(result.catalogueGaps.every((g) => g.potentialCohortSize > 0)).toBe(true);
  });

  it('returns 4 market trends', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.marketTrends).toHaveLength(4);
  });

  it('CS cohort has AIL as top recommendation', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('AIL');
  });

  it('Engineering cohort has DSP as top recommendation', () => {
    const result = getCourseIntelligence('eng', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('DSP');
  });

  it('Commerce cohort has FIN as top recommendation', () => {
    const result = getCourseIntelligence('commerce', 'role-change', '12m');
    expect(result.recommendations[0].courseCode).toBe('FIN');
  });

  it('all cohorts returns valid opportunity scores', () => {
    const result = getCourseIntelligence('all', 'any', '24m');
    expect(result.recommendations.every((r) => r.opportunityScore > 0 && r.opportunityScore <= 1)).toBe(true);
  });

  it('agent summary mentions the cohort label', () => {
    const cs = getCourseIntelligence('cs', 'role-change', '12m');
    expect(cs.agentSummary).toContain('CS graduates');

    const eng = getCourseIntelligence('eng', 'promoted', '6m');
    expect(eng.agentSummary).toContain('Engineering graduates');
  });

  it('badge values are valid', () => {
    const result = getCourseIntelligence('cs', 'role-change', '12m');
    const validBadges = new Set(['trending', 'gap', null]);
    expect(result.recommendations.every((r) => validBadges.has(r.badge))).toBe(true);
  });
});
