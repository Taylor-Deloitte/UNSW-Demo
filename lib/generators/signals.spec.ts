import { describe, it, expect } from 'vitest';
import { generateSignals } from './signals';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateSignals', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 200);

  it('emits at least one signal per alumni on average', () => {
    const signals = generateSignals(rng, alumni);
    expect(signals.length).toBeGreaterThanOrEqual(alumni.length);
  });

  it('every signal references a real alumni', () => {
    const signals = generateSignals(rng, alumni);
    const ids = new Set(alumni.map((a) => a.id));
    for (const s of signals) {
      expect(ids.has(s.alumniId)).toBe(true);
    }
  });

  it('emits at least one promoted signal per seniority increase in trajectory', () => {
    const singleAlumni = [alumni[0]];
    const trajectory = singleAlumni[0].careerTrajectory;
    const promotions = trajectory.filter(
      (r, i) => i > 0 && r.seniority !== trajectory[i - 1].seniority,
    ).length;
    const signals = generateSignals(rng, singleAlumni);
    const promotedSignals = signals.filter(
      (s) => s.alumniId === singleAlumni[0].id && s.type === 'promoted',
    );
    expect(promotedSignals.length).toBeGreaterThanOrEqual(promotions);
  });

  it('at least 40% of signals are from the last 365 days', () => {
    const signals = generateSignals(rng, alumni);
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const recent = signals.filter((s) => new Date(s.detectedAt).getTime() >= oneYearAgo);
    expect(recent.length / signals.length).toBeGreaterThanOrEqual(0.4);
  });
});
