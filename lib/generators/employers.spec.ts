import { describe, it, expect } from 'vitest';
import { generateEmployers } from './employers';
import { makeRng } from './rng';

describe('generateEmployers', () => {
  it('generates the requested count', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 100);
    expect(employers).toHaveLength(100);
  });

  it('assigns unique ids in acc-XXXXXX format', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 50);
    const ids = new Set(employers.map((e) => e.id));
    expect(ids.size).toBe(50);
    expect(employers[0].id).toMatch(/^acc-\d{6}$/);
  });

  it('covers all industries', () => {
    const rng = makeRng(1);
    const employers = generateEmployers(rng, 500);
    const industries = new Set(employers.map((e) => e.industry));
    expect(industries.size).toBeGreaterThanOrEqual(8);
  });

  it('is deterministic for the same seed', () => {
    const a = generateEmployers(makeRng(7), 20);
    const b = generateEmployers(makeRng(7), 20);
    expect(a).toEqual(b);
  });
});
