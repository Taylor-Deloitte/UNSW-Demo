import type { CareerRole, Employer, SeniorityLevel } from '../types';
import type { Rng } from './rng';

const SENIORITY_ORDER: SeniorityLevel[] = [
  'Junior',
  'Mid',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'VP',
  'C-Suite',
];

const TITLES_BY_SENIORITY: Record<SeniorityLevel, string[]> = {
  Junior: ['Analyst', 'Associate', 'Coordinator', 'Junior Engineer'],
  Mid: ['Consultant', 'Specialist', 'Engineer', 'Manager'],
  Senior: ['Senior Engineer', 'Senior Consultant', 'Senior Manager'],
  Lead: ['Lead Engineer', 'Team Lead', 'Principal Consultant'],
  Manager: ['Manager', 'Program Manager', 'Product Manager'],
  Director: ['Director', 'Head of Practice'],
  VP: ['Vice President', 'General Manager'],
  'C-Suite': ['Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer'],
};

export function generateCareerTrajectory(
  rng: Rng,
  employers: Employer[],
  graduationYear: number,
): CareerRole[] {
  const { faker } = rng;
  const roleCount = faker.number.int({ min: 2, max: 5 });
  const roles: CareerRole[] = [];

  let currentDate = new Date(`${graduationYear}-06-01`);
  let seniorityIdx = 0;

  for (let i = 0; i < roleCount; i++) {
    const isLast = i === roleCount - 1;
    const employer = faker.helpers.arrayElement(employers);
    const seniority = SENIORITY_ORDER[Math.min(seniorityIdx, SENIORITY_ORDER.length - 1)];
    const startDate = currentDate.toISOString().slice(0, 10);

    const tenureMonths = faker.number.int({ min: 14, max: 48 });
    const endDate = isLast ? null : addMonths(currentDate, tenureMonths).toISOString().slice(0, 10);

    roles.push({
      employerId: employer.id,
      title: faker.helpers.arrayElement(TITLES_BY_SENIORITY[seniority]),
      seniority,
      industry: employer.industry,
      startDate,
      endDate,
    });

    if (!isLast) {
      currentDate = addMonths(currentDate, tenureMonths);
      if (faker.number.float({ min: 0, max: 1 }) < 0.65) {
        seniorityIdx++;
      }
    }
  }
  return roles;
}

function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}
