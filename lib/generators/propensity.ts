import type { Alumni, Course, PropensityScore } from '../types';
import type { Rng } from './rng';

export function generatePropensityScores(
  rng: Rng,
  alumni: Alumni[],
  courses: Course[],
): PropensityScore[] {
  const { faker } = rng;
  const now = new Date().toISOString();
  const scores: PropensityScore[] = [];

  for (const a of alumni) {
    for (const c of courses) {
      const features: string[] = [];
      let raw = 0.2;

      if (c.targetIndustries.includes(a.currentIndustry)) {
        raw += 0.25;
        features.push('industry_match');
      }
      if (c.targetSeniority.includes(a.currentSeniority)) {
        raw += 0.2;
        features.push('seniority_match');
      }
      if (c.fieldOfStudy.toLowerCase().includes(a.fieldOfStudy.toLowerCase().slice(0, 4))) {
        raw += 0.1;
        features.push('field_alignment');
      }
      if (faker.number.float({ min: 0, max: 1 }) < 0.5) {
        raw += 0.1;
        features.push('recency');
      }

      const noise = faker.number.float({ min: -0.1, max: 0.1 });
      const score = Math.max(0, Math.min(1, raw + noise));

      scores.push({
        alumniId: a.id,
        courseId: c.id,
        score: Number(score.toFixed(3)),
        computedAt: now,
        topFeatures: features.length ? features.slice(0, 3) : ['base_rate'],
      });
    }
  }
  return scores;
}
