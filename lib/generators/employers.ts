import type { Employer, Industry } from '../types';
import type { Rng } from './rng';

const INDUSTRIES: Industry[] = [
  'Technology',
  'Financial Services',
  'Government',
  'Healthcare',
  'Education',
  'Consulting',
  'Manufacturing',
  'Retail',
  'Media',
  'Energy',
];

const AU_STATE_CITIES: Record<string, string[]> = {
  NSW: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta'],
  VIC: ['Melbourne', 'Geelong', 'Ballarat'],
  QLD: ['Brisbane', 'Gold Coast', 'Cairns'],
  WA: ['Perth', 'Fremantle'],
  SA: ['Adelaide'],
  TAS: ['Hobart', 'Launceston'],
  ACT: ['Canberra'],
  NT: ['Darwin'],
};

const SIZE_BANDS = ['1-50', '51-200', '201-1000', '1001-5000', '5000+'] as const;

export function generateEmployers(rng: Rng, count: number): Employer[] {
  const { faker } = rng;
  const employers: Employer[] = [];
  for (let i = 0; i < count; i++) {
    const industry = faker.helpers.arrayElement(INDUSTRIES);
    const state = faker.helpers.weightedArrayElement([
      { value: 'NSW', weight: 40 },
      { value: 'VIC', weight: 25 },
      { value: 'QLD', weight: 12 },
      { value: 'WA', weight: 8 },
      { value: 'SA', weight: 5 },
      { value: 'ACT', weight: 5 },
      { value: 'TAS', weight: 3 },
      { value: 'NT', weight: 2 },
    ]);
    const city = faker.helpers.arrayElement(AU_STATE_CITIES[state]);
    employers.push({
      id: `acc-${String(i + 1).padStart(6, '0')}`,
      name: faker.company.name(),
      industry,
      city,
      state,
      country: 'Australia',
      employeeCountBand: faker.helpers.arrayElement(SIZE_BANDS),
    });
  }
  return employers;
}
