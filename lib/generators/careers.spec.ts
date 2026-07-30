import { describe, it, expect } from 'vitest';
import { generateCareerTrajectory } from './careers';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateCareerTrajectory', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);

  it('generates 2 to 5 roles', () => {
    for (let i = 0; i < 20; i++) {
      const t = generateCareerTrajectory(rng, employers, 2015);
      expect(t.length).toBeGreaterThanOrEqual(2);
      expect(t.length).toBeLessThanOrEqual(5);
    }
  });

  it('roles are chronological', () => {
    const t = generateCareerTrajectory(rng, employers, 2015);
    for (let i = 1; i < t.length; i++) {
      expect(t[i].startDate >= t[i - 1].startDate).toBe(true);
    }
  });

  it('only the last role has a null endDate', () => {
    const t = generateCareerTrajectory(rng, employers, 2015);
    for (let i = 0; i < t.length - 1; i++) {
      expect(t[i].endDate).not.toBeNull();
    }
    expect(t[t.length - 1].endDate).toBeNull();
  });

  it('first role starts on or after graduation year', () => {
    const t = generateCareerTrajectory(rng, employers, 2018);
    expect(t[0].startDate >= '2018-01-01').toBe(true);
  });
});
