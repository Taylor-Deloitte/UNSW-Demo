import type { Faker } from '@faker-js/faker';
import type { Alumni, CareerSignal, SignalType } from '../types';
import type { Rng } from './rng';

let signalCounter = 0;

export function generateSignals(rng: Rng, alumni: Alumni[]): CareerSignal[] {
  const { faker } = rng;
  const signals: CareerSignal[] = [];
  signalCounter = 0;

  for (const a of alumni) {
    const traj = a.careerTrajectory;
    for (let i = 1; i < traj.length; i++) {
      const prev = traj[i - 1];
      const curr = traj[i];
      const detectedAt = biasedTimestamp(faker, curr.startDate);

      if (prev.seniority !== curr.seniority) {
        signals.push(
          makeSignal(a.id, 'promoted', detectedAt, 'linkedin', 0.92, {
            from: prev.seniority,
            to: curr.seniority,
            title: curr.title,
          }),
        );
      }
      if (prev.industry !== curr.industry) {
        signals.push(
          makeSignal(a.id, 'industry_change', detectedAt, 'linkedin', 0.88, {
            from: prev.industry,
            to: curr.industry,
          }),
        );
      }
      if (prev.employerId !== curr.employerId && prev.seniority === curr.seniority) {
        signals.push(
          makeSignal(a.id, 'role_change', detectedAt, 'linkedin', 0.85, {
            newTitle: curr.title,
          }),
        );
      }
    }

    if (faker.number.float({ min: 0, max: 1 }) < 0.08) {
      signals.push(
        makeSignal(a.id, 'redundancy_risk', recentTimestamp(faker), 'derived', 0.55, {
          reason: 'industry_layoffs',
        }),
      );
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.35) {
      signals.push(
        makeSignal(a.id, 'course_recency_threshold', recentTimestamp(faker), 'derived', 0.75, {
          yearsSinceLast: faker.number.int({ min: 3, max: 12 }),
        }),
      );
    }
    if (faker.number.float({ min: 0, max: 1 }) < 0.15) {
      signals.push(
        makeSignal(a.id, 'alumni_anniversary', recentTimestamp(faker), 'unsw_events', 1.0, {
          yearsSinceGraduation: new Date().getFullYear() - a.graduationYear,
        }),
      );
    }

    // Recent LinkedIn activity pass — mimics always-on detection.
    // Emits 0-3 fresh signals per alumni (recent timestamps, mix of types).
    const recentBurstCount = faker.helpers.weightedArrayElement([
      { value: 0, weight: 5 },
      { value: 1, weight: 15 },
      { value: 2, weight: 25 },
      { value: 3, weight: 25 },
      { value: 4, weight: 20 },
      { value: 5, weight: 10 },
    ]);
    for (let k = 0; k < recentBurstCount; k++) {
      const type = faker.helpers.arrayElement<SignalType>([
        'promoted',
        'role_change',
        'industry_change',
        'location_change',
      ]);
      signals.push(
        makeSignal(a.id, type, veryRecentTimestamp(faker), 'linkedin', 0.8, {
          detection: 'linkedin_burst',
        }),
      );
    }
  }
  return signals;
}

function makeSignal(
  alumniId: string,
  type: SignalType,
  detectedAt: string,
  source: 'linkedin' | 'unsw_events' | 'derived',
  confidence: number,
  payload: Record<string, string | number | boolean>,
): CareerSignal {
  return {
    id: `sig-${String(++signalCounter).padStart(7, '0')}`,
    alumniId,
    type,
    detectedAt,
    source,
    confidence,
    payload,
  };
}

function biasedTimestamp(faker: Faker, anchorDate: string): string {
  const anchor = new Date(anchorDate).getTime();
  const jitter = faker.number.int({ min: 0, max: 30 * 24 * 60 * 60 * 1000 });
  return new Date(anchor + jitter).toISOString();
}

function recentTimestamp(faker: Faker): string {
  const now = Date.now();
  const withinYear = faker.number.float({ min: 0, max: 1 }) < 0.6;
  const maxMsAgo = withinYear ? 365 * 24 * 60 * 60 * 1000 : 3 * 365 * 24 * 60 * 60 * 1000;
  const msAgo = faker.number.int({ min: 0, max: maxMsAgo });
  return new Date(now - msAgo).toISOString();
}

function veryRecentTimestamp(faker: Faker): string {
  // Uniformly within the last 180 days
  const now = Date.now();
  const msAgo = faker.number.int({ min: 0, max: 180 * 24 * 60 * 60 * 1000 });
  return new Date(now - msAgo).toISOString();
}
