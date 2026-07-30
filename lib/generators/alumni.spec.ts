import { describe, it, expect } from 'vitest';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateAlumni', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);

  it('generates the requested count', () => {
    const alumni = generateAlumni(rng, employers, 200);
    expect(alumni).toHaveLength(200);
  });

  it('unique ids in contact-XXXXXX format', () => {
    const alumni = generateAlumni(rng, employers, 100);
    const ids = new Set(alumni.map((a) => a.id));
    expect(ids.size).toBe(100);
    expect(alumni[0].id).toMatch(/^contact-\d{6}$/);
  });

  it('current employer id matches last role', () => {
    const alumni = generateAlumni(rng, employers, 50);
    for (const a of alumni) {
      const last = a.careerTrajectory[a.careerTrajectory.length - 1];
      expect(a.currentEmployerId).toBe(last.employerId);
      expect(a.currentSeniority).toBe(last.seniority);
      expect(a.currentIndustry).toBe(last.industry);
      expect(a.currentTitle).toBe(last.title);
    }
  });

  it('graduation year is plausible (1990-2020)', () => {
    const alumni = generateAlumni(rng, employers, 100);
    for (const a of alumni) {
      expect(a.graduationYear).toBeGreaterThanOrEqual(1990);
      expect(a.graduationYear).toBeLessThanOrEqual(2020);
    }
  });

  it('linkedin url uses a synthetic domain (no real linkedin.com)', () => {
    const alumni = generateAlumni(rng, employers, 20);
    for (const a of alumni) {
      expect(a.linkedinUrl).not.toContain('linkedin.com');
    }
  });
});
