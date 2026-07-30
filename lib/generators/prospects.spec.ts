import { describe, it, expect } from 'vitest';
import { generateProspects } from './prospects';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateSignals } from './signals';
import { makeRng } from './rng';

describe('generateProspects', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 100);
  const alumni = generateAlumni(rng, employers, 500);
  const signals = generateSignals(rng, alumni);

  it('generates up to the requested count (may be smaller if not enough signal)', () => {
    const prospects = generateProspects(rng, alumni, signals, 200);
    expect(prospects.length).toBeGreaterThan(0);
    expect(prospects.length).toBeLessThanOrEqual(200);
  });

  it('each prospect links to a real alumni', () => {
    const prospects = generateProspects(rng, alumni, signals, 100);
    const alumniIds = new Set(alumni.map((a) => a.id));
    for (const p of prospects) {
      expect(alumniIds.has(p.alumniId)).toBe(true);
    }
  });

  it('crmId matches source alumni crmId', () => {
    const prospects = generateProspects(rng, alumni, signals, 50);
    for (const p of prospects) {
      const source = alumni.find((a) => a.id === p.alumniId)!;
      expect(p.crmId).toBe(source.crmId);
    }
  });

  it('unique lead ids in lead-XXXXXX format', () => {
    const prospects = generateProspects(rng, alumni, signals, 100);
    const ids = new Set(prospects.map((p) => p.id));
    expect(ids.size).toBe(prospects.length);
    expect(prospects[0].id).toMatch(/^lead-\d{6}$/);
  });
});
