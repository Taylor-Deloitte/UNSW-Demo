import type { Alumni, CareerSignal, DeliveryMode, ProspectiveLearner } from '../types';
import type { Rng } from './rng';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const LEAD_SOURCES: ProspectiveLearner['leadSource'][] = [
  'LinkedIn Signal',
  'Alumni Anniversary',
  'Course Interest Form',
  'Referral',
];
const DELIVERY_MODES: DeliveryMode[] = ['Online', 'Hybrid', 'On Campus'];

export function generateProspects(
  rng: Rng,
  alumni: Alumni[],
  signals: CareerSignal[],
  targetCount: number,
): ProspectiveLearner[] {
  const { faker } = rng;
  const now = Date.now();

  const signalsByAlumni = new Map<string, CareerSignal[]>();
  for (const s of signals) {
    const list = signalsByAlumni.get(s.alumniId) ?? [];
    list.push(s);
    signalsByAlumni.set(s.alumniId, list);
  }

  const candidates = alumni.filter((a) => {
    const list = signalsByAlumni.get(a.id) ?? [];
    return list.some((s) => now - new Date(s.detectedAt).getTime() <= ONE_YEAR_MS);
  });

  const shuffled = faker.helpers.shuffle([...candidates]);
  const selected = shuffled.slice(0, targetCount);

  return selected.map((a, i) => {
    const recentSignals = (signalsByAlumni.get(a.id) ?? []).filter(
      (s) => now - new Date(s.detectedAt).getTime() <= ONE_YEAR_MS,
    );
    const topConfidence = Math.max(...recentSignals.map((s) => s.confidence));
    const rating = topConfidence >= 0.85 ? 'Hot' : topConfidence >= 0.65 ? 'Warm' : 'Cold';

    return {
      id: `lead-${String(i + 1).padStart(6, '0')}`,
      crmId: a.crmId,
      alumniId: a.id,
      leadRating: rating,
      leadStatus: faker.helpers.weightedArrayElement([
        { value: 'New', weight: 40 },
        { value: 'Qualified', weight: 25 },
        { value: 'Contacted', weight: 15 },
        { value: 'Nurturing', weight: 15 },
        { value: 'Disqualified', weight: 5 },
      ]),
      leadSource: faker.helpers.arrayElement(LEAD_SOURCES),
      interestedInDeliveryMode: faker.helpers.arrayElement([...DELIVERY_MODES, null]),
      interestedInFieldOfStudy: faker.helpers.arrayElement([a.fieldOfStudy, null]),
      createdAt: new Date(now - faker.number.int({ min: 0, max: ONE_YEAR_MS })).toISOString(),
    };
  });
}
