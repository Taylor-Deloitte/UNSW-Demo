import type { Alumni, Employer, LearnerPersona, NeedscopePersona } from '../types';
import type { Rng } from './rng';
import { generateCareerTrajectory } from './careers';

const LEARNER_PERSONAS: LearnerPersona[] = [
  'Career Switcher',
  'Skills Upgrader',
  'Returner',
  'Advancement Seeker',
];
const NEEDSCOPE_PERSONAS: NeedscopePersona[] = [
  'Ambitious',
  'Curious',
  'Pragmatic',
  'Reflective',
];

const UNSW_PROGRAMS = [
  'Bachelor of Commerce',
  'Bachelor of Engineering (Software)',
  'Bachelor of Engineering (Mechanical)',
  'Bachelor of Science (Computer Science)',
  'Bachelor of Arts',
  'Bachelor of Law',
  'Bachelor of Medicine',
  'Master of Business Administration',
  'Master of Data Science',
  'Master of Public Health',
];

const FIELDS = [
  'Business',
  'Engineering',
  'Computer Science',
  'Arts',
  'Law',
  'Medicine',
  'Data Science',
  'Public Health',
];

export function generateAlumni(rng: Rng, employers: Employer[], count: number): Alumni[] {
  const { faker } = rng;
  const alumni: Alumni[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const gradYear = faker.number.int({ min: 1990, max: 2020 });
    const trajectory = generateCareerTrajectory(rng, employers, gradYear);
    const currentRole = trajectory[trajectory.length - 1];
    const currentEmployer = employers.find((e) => e.id === currentRole.employerId)!;

    alumni.push({
      id: `contact-${String(i + 1).padStart(6, '0')}`,
      crmId: `crm-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`,
      firstName,
      lastName,
      email: faker.internet
        .email({ firstName, lastName, provider: 'synthetic.example.com' })
        .toLowerCase(),
      linkedinUrl: `https://synth.example.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.string.alphanumeric({ length: 4, casing: 'lower' })}`,
      city: currentEmployer.city,
      state: currentEmployer.state,
      country: currentEmployer.country,
      learnerPersona: faker.helpers.arrayElement(LEARNER_PERSONAS),
      needscopePersona: faker.helpers.arrayElement(NEEDSCOPE_PERSONAS),
      graduationYear: gradYear,
      completedUnswProgram: faker.helpers.arrayElement(UNSW_PROGRAMS),
      fieldOfStudy: faker.helpers.arrayElement(FIELDS),
      careerTrajectory: trajectory,
      currentEmployerId: currentRole.employerId,
      currentTitle: currentRole.title,
      currentSeniority: currentRole.seniority,
      currentIndustry: currentRole.industry,
      emailConsent: faker.datatype.boolean({ probability: 0.85 }),
      smsConsent: faker.datatype.boolean({ probability: 0.55 }),
    });
  }
  return alumni;
}
