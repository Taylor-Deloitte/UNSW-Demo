import type { Course, Industry, SeniorityLevel } from '../types';
import type { Rng } from './rng';

interface CourseTemplate {
  code: string;
  name: string;
  faculty: string;
  fieldOfStudy: string;
  targetSeniority: SeniorityLevel[];
  targetIndustries: Industry[];
  minPrice: number;
  maxPrice: number;
}

const TEMPLATES: CourseTemplate[] = [
  {
    code: 'AIL',
    name: 'AI for Leaders',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Applied AI',
    targetSeniority: ['Lead', 'Manager', 'Director', 'VP'],
    targetIndustries: ['Technology', 'Financial Services', 'Consulting', 'Government'],
    minPrice: 3200,
    maxPrice: 4500,
  },
  {
    code: 'DSP',
    name: 'Data Strategy for Professionals',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Data Strategy',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Financial Services', 'Healthcare', 'Government'],
    minPrice: 2800,
    maxPrice: 3800,
  },
  {
    code: 'CYB',
    name: 'Cybersecurity Fundamentals',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Cybersecurity',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Technology', 'Government', 'Financial Services'],
    minPrice: 2400,
    maxPrice: 3600,
  },
  {
    code: 'CLD',
    name: 'Cloud Architecture Certificate',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Cloud',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Financial Services', 'Media'],
    minPrice: 2800,
    maxPrice: 4200,
  },
  {
    code: 'PMG',
    name: 'Product Management Essentials',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Product Management',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Technology', 'Media', 'Retail', 'Financial Services'],
    minPrice: 2600,
    maxPrice: 3900,
  },
  {
    code: 'ESG',
    name: 'ESG & Sustainable Finance',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Sustainability',
    targetSeniority: ['Senior', 'Lead', 'Director'],
    targetIndustries: ['Financial Services', 'Energy', 'Consulting', 'Government'],
    minPrice: 3400,
    maxPrice: 4800,
  },
  {
    code: 'HLA',
    name: 'Healthcare Leadership & Analytics',
    faculty: 'UNSW Medicine & Health',
    fieldOfStudy: 'Healthcare Management',
    targetSeniority: ['Senior', 'Lead', 'Manager'],
    targetIndustries: ['Healthcare', 'Government'],
    minPrice: 3200,
    maxPrice: 4600,
  },
  {
    code: 'LGL',
    name: 'Legal Innovation Certificate',
    faculty: 'UNSW Law & Justice',
    fieldOfStudy: 'Legal Tech',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Consulting', 'Financial Services', 'Government'],
    minPrice: 2800,
    maxPrice: 4200,
  },
  {
    code: 'DAT',
    name: 'Data Engineering Bootcamp',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Data Engineering',
    targetSeniority: ['Junior', 'Mid'],
    targetIndustries: ['Technology', 'Financial Services'],
    minPrice: 2200,
    maxPrice: 3400,
  },
  {
    code: 'DES',
    name: 'Design Thinking for Business',
    faculty: 'UNSW Art & Design',
    fieldOfStudy: 'Design',
    targetSeniority: ['Mid', 'Senior'],
    targetIndustries: ['Technology', 'Media', 'Retail', 'Consulting'],
    minPrice: 1800,
    maxPrice: 2800,
  },
  {
    code: 'GEN',
    name: 'Generative AI for Practitioners',
    faculty: 'UNSW Engineering',
    fieldOfStudy: 'Applied AI',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Technology', 'Media', 'Consulting', 'Education'],
    minPrice: 1400,
    maxPrice: 2400,
  },
  {
    code: 'FIN',
    name: 'Financial Modelling for Non-Finance Managers',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Finance',
    targetSeniority: ['Mid', 'Senior', 'Lead'],
    targetIndustries: ['Consulting', 'Manufacturing', 'Retail', 'Healthcare'],
    minPrice: 1600,
    maxPrice: 2600,
  },
  {
    code: 'HRM',
    name: 'People Analytics for HR Leaders',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'HR',
    targetSeniority: ['Senior', 'Lead', 'Manager', 'Director'],
    targetIndustries: ['Consulting', 'Financial Services', 'Government', 'Healthcare'],
    minPrice: 2400,
    maxPrice: 3600,
  },
  {
    code: 'CLI',
    name: 'Climate Risk & Strategy',
    faculty: 'UNSW Science',
    fieldOfStudy: 'Climate',
    targetSeniority: ['Senior', 'Lead', 'Director'],
    targetIndustries: ['Energy', 'Financial Services', 'Government', 'Consulting'],
    minPrice: 3200,
    maxPrice: 4600,
  },
  {
    code: 'MED',
    name: 'Digital Marketing Certificate',
    faculty: 'UNSW Business School',
    fieldOfStudy: 'Marketing',
    targetSeniority: ['Junior', 'Mid', 'Senior'],
    targetIndustries: ['Retail', 'Media', 'Technology'],
    minPrice: 1400,
    maxPrice: 2400,
  },
];

export function generateCourses(rng: Rng, count: number): Course[] {
  const { faker } = rng;
  const courses: Course[] = [];
  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[i % TEMPLATES.length];
    const intake = 24 + Math.floor(i / TEMPLATES.length);
    courses.push({
      id: `prog-${String(i + 1).padStart(6, '0')}`,
      code: `${template.code}-${intake}`,
      name: `${template.name} (Intake ${intake})`,
      faculty: template.faculty,
      fieldOfStudy: template.fieldOfStudy,
      deliveryMode: faker.helpers.weightedArrayElement([
        { value: 'Online', weight: 70 },
        { value: 'Hybrid', weight: 25 },
        { value: 'On Campus', weight: 5 },
      ]),
      durationWeeks: faker.helpers.arrayElement([6, 8, 10, 12, 16]),
      priceAud: faker.number.int({ min: template.minPrice, max: template.maxPrice }),
      targetSeniority: template.targetSeniority,
      targetIndustries: template.targetIndustries,
    });
  }
  return courses;
}

export { TEMPLATES as COURSE_TEMPLATES };
