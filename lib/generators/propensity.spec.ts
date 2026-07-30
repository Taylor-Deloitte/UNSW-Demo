import { describe, it, expect } from 'vitest';
import { generatePropensityScores } from './propensity';
import { generateAlumni } from './alumni';
import { generateEmployers } from './employers';
import { generateCourses } from './courses';
import { makeRng } from './rng';

describe('generatePropensityScores', () => {
  const rng = makeRng(1);
  const employers = generateEmployers(rng, 50);
  const alumni = generateAlumni(rng, employers, 100);
  const courses = generateCourses(rng, 30);

  it('emits one row per (alumni, course) pair', () => {
    const scores = generatePropensityScores(rng, alumni, courses);
    expect(scores.length).toBe(alumni.length * courses.length);
  });

  it('scores are in [0, 1]', () => {
    const scores = generatePropensityScores(rng, alumni, courses);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(1);
    }
  });

  it('industry match increases score on aggregate', () => {
    const alumni2 = generateAlumni(rng, employers, 100);
    const courses2 = generateCourses(rng, 20);
    const scores = generatePropensityScores(rng, alumni2, courses2);
    let matchTotal = 0;
    let matchN = 0;
    let nonTotal = 0;
    let nonN = 0;
    for (const a of alumni2) {
      const aScores = scores.filter((s) => s.alumniId === a.id);
      for (const s of aScores) {
        const course = courses2.find((c) => c.id === s.courseId)!;
        if (course.targetIndustries.includes(a.currentIndustry)) {
          matchTotal += s.score;
          matchN++;
        } else {
          nonTotal += s.score;
          nonN++;
        }
      }
    }
    expect(matchTotal / matchN).toBeGreaterThan(nonTotal / nonN);
  });

  it('topFeatures is non-empty', () => {
    const scores = generatePropensityScores(rng, alumni.slice(0, 5), courses.slice(0, 3));
    for (const s of scores) {
      expect(s.topFeatures.length).toBeGreaterThan(0);
    }
  });
});
