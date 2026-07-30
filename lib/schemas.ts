import { z } from 'zod';

export const IndustrySchema = z.enum([
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
]);

export const SenioritySchema = z.enum([
  'Junior',
  'Mid',
  'Senior',
  'Lead',
  'Manager',
  'Director',
  'VP',
  'C-Suite',
]);

export const DeliveryModeSchema = z.enum(['Online', 'Hybrid', 'On Campus']);
export const LearnerPersonaSchema = z.enum([
  'Career Switcher',
  'Skills Upgrader',
  'Returner',
  'Advancement Seeker',
]);
export const NeedscopePersonaSchema = z.enum(['Ambitious', 'Curious', 'Pragmatic', 'Reflective']);

export const EmployerSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: IndustrySchema,
  city: z.string(),
  state: z.string(),
  country: z.string(),
  employeeCountBand: z.enum(['1-50', '51-200', '201-1000', '1001-5000', '5000+']),
});

export const CourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  faculty: z.string(),
  fieldOfStudy: z.string(),
  deliveryMode: DeliveryModeSchema,
  durationWeeks: z.number(),
  priceAud: z.number(),
  targetSeniority: z.array(SenioritySchema),
  targetIndustries: z.array(IndustrySchema),
});

export const CareerRoleSchema = z.object({
  employerId: z.string(),
  title: z.string(),
  seniority: SenioritySchema,
  industry: IndustrySchema,
  startDate: z.string(),
  endDate: z.string().nullable(),
});

export const SignalTypeSchema = z.enum([
  'promoted',
  'role_change',
  'industry_change',
  'location_change',
  'redundancy_risk',
  'course_recency_threshold',
  'alumni_anniversary',
]);

export const CareerSignalSchema = z.object({
  id: z.string(),
  alumniId: z.string(),
  type: SignalTypeSchema,
  detectedAt: z.string(),
  source: z.enum(['linkedin', 'unsw_events', 'derived']),
  confidence: z.number(),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const AlumniSchema = z.object({
  id: z.string(),
  crmId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  linkedinUrl: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  learnerPersona: LearnerPersonaSchema,
  needscopePersona: NeedscopePersonaSchema,
  graduationYear: z.number(),
  completedUnswProgram: z.string(),
  fieldOfStudy: z.string(),
  careerTrajectory: z.array(CareerRoleSchema),
  currentEmployerId: z.string(),
  currentTitle: z.string(),
  currentSeniority: SenioritySchema,
  currentIndustry: IndustrySchema,
  emailConsent: z.boolean(),
  smsConsent: z.boolean(),
});

export const ProspectiveLearnerSchema = z.object({
  id: z.string(),
  crmId: z.string(),
  alumniId: z.string(),
  leadRating: z.enum(['Hot', 'Warm', 'Cold']),
  leadStatus: z.enum(['New', 'Qualified', 'Contacted', 'Nurturing', 'Disqualified']),
  leadSource: z.enum([
    'LinkedIn Signal',
    'Alumni Anniversary',
    'Course Interest Form',
    'Referral',
  ]),
  interestedInDeliveryMode: DeliveryModeSchema.nullable(),
  interestedInFieldOfStudy: z.string().nullable(),
  createdAt: z.string(),
});

export const PropensityScoreSchema = z.object({
  alumniId: z.string(),
  courseId: z.string(),
  score: z.number(),
  computedAt: z.string(),
  topFeatures: z.array(z.string()),
});

export const CohortIdSchema = z.enum([
  'recent_grads',
  'mid_career',
  'high_signal',
  'dormant',
  'all',
]);

export const CohortRollupSchema = z.object({
  id: CohortIdSchema,
  label: z.string(),
  size: z.number(),
  engagementRate30d: z.number(),
  momentsOfRelevance30d: z.number(),
  dropOffRate90d: z.number(),
  engagementTrend12m: z.array(z.object({ month: z.string(), rate: z.number() })),
  agentCommentary: z.string(),
});

export const DataBundleSchema = z.object({
  employers: z.array(EmployerSchema),
  courses: z.array(CourseSchema),
  alumni: z.array(AlumniSchema),
  prospects: z.array(ProspectiveLearnerSchema),
  signals: z.array(CareerSignalSchema),
  propensity: z.array(PropensityScoreSchema),
  cohorts: z.array(CohortRollupSchema),
  generatedAt: z.string(),
  seed: z.number(),
});
