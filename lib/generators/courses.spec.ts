import { describe, it, expect } from 'vitest';
import { generateCourses } from './courses';
import { makeRng } from './rng';

describe('generateCourses', () => {
  it('generates the requested count', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 150);
    expect(courses).toHaveLength(150);
  });

  it('assigns unique ids in prog-XXXXXX format', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 50);
    const ids = new Set(courses.map((c) => c.id));
    expect(ids.size).toBe(50);
    expect(courses[0].id).toMatch(/^prog-\d{6}$/);
  });

  it('includes a variety of faculties', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 150);
    const faculties = new Set(courses.map((c) => c.faculty));
    expect(faculties.size).toBeGreaterThanOrEqual(4);
  });

  it('prices are within a plausible AUD range', () => {
    const rng = makeRng(1);
    const courses = generateCourses(rng, 30);
    for (const c of courses) {
      expect(c.priceAud).toBeGreaterThanOrEqual(500);
      expect(c.priceAud).toBeLessThanOrEqual(15000);
    }
  });
});
