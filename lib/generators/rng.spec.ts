import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';

describe('makeRng', () => {
  it('returns the same sequence for the same seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 5 }, () => a.faker.number.int({ min: 0, max: 1000 }));
    const seqB = Array.from({ length: 5 }, () => b.faker.number.int({ min: 0, max: 1000 }));
    expect(seqA).toEqual(seqB);
  });

  it('returns different sequences for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 5 }, () => a.faker.number.int({ min: 0, max: 1000 }));
    const seqB = Array.from({ length: 5 }, () => b.faker.number.int({ min: 0, max: 1000 }));
    expect(seqA).not.toEqual(seqB);
  });

  it('exposes locale-en_AU faker', () => {
    const { faker } = makeRng(1);
    const zip = faker.location.zipCode();
    expect(zip).toMatch(/^\d{4}$/);
  });
});
