export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // ISO 8601

export type Industry =
  | 'Technology'
  | 'Financial Services'
  | 'Government'
  | 'Healthcare'
  | 'Education'
  | 'Consulting'
  | 'Manufacturing'
  | 'Retail'
  | 'Media'
  | 'Energy';

export type SeniorityLevel =
  | 'Junior'
  | 'Mid'
  | 'Senior'
  | 'Lead'
  | 'Manager'
  | 'Director'
  | 'VP'
  | 'C-Suite';

export type DeliveryMode = 'Online' | 'Hybrid' | 'On Campus';

export type LearnerPersona =
  | 'Career Switcher'
  | 'Skills Upgrader'
  | 'Returner'
  | 'Advancement Seeker';
export type NeedscopePersona = 'Ambitious' | 'Curious' | 'Pragmatic' | 'Reflective';

export interface Employer {
  id: string; // acc-XXXXXX
  name: string;
  industry: Industry;
  city: string;
  state: string;
  country: string;
  employeeCountBand: '1-50' | '51-200' | '201-1000' | '1001-5000' | '5000+';
}

export interface Course {
  id: string; // prog-XXXXXX
  code: string;
  name: string;
  faculty: string;
  fieldOfStudy: string;
  deliveryMode: DeliveryMode;
  durationWeeks: number;
  priceAud: number;
  targetSeniority: SeniorityLevel[];
  targetIndustries: Industry[];
}

export interface CareerRole {
  employerId: string;
  title: string;
  seniority: SeniorityLevel;
  industry: Industry;
  startDate: ISODate;
  endDate: ISODate | null; // null = current
}

export type SignalType =
  | 'promoted'
  | 'role_change'
  | 'industry_change'
  | 'location_change'
  | 'redundancy_risk'
  | 'course_recency_threshold'
  | 'alumni_anniversary';

export interface CareerSignal {
  id: string;
  alumniId: string;
  type: SignalType;
  detectedAt: ISODateTime;
  source: 'linkedin' | 'unsw_events' | 'derived';
  confidence: number; // 0..1
  payload: Record<string, string | number | boolean>;
}

export interface Alumni {
  id: string; // contact-XXXXXX
  crmId: string;
  firstName: string;
  lastName: string;
  email: string;
  linkedinUrl: string;
  city: string;
  state: string;
  country: string;
  learnerPersona: LearnerPersona;
  needscopePersona: NeedscopePersona;
  graduationYear: number;
  completedUnswProgram: string;
  fieldOfStudy: string;
  careerTrajectory: CareerRole[]; // oldest → newest
  currentEmployerId: string;
  currentTitle: string;
  currentSeniority: SeniorityLevel;
  currentIndustry: Industry;
  emailConsent: boolean;
  smsConsent: boolean;
}

export interface ProspectiveLearner {
  id: string; // lead-XXXXXX
  crmId: string; // matches Alumni.crmId
  alumniId: string;
  leadRating: 'Hot' | 'Warm' | 'Cold';
  leadStatus: 'New' | 'Qualified' | 'Contacted' | 'Nurturing' | 'Disqualified';
  leadSource: 'LinkedIn Signal' | 'Alumni Anniversary' | 'Course Interest Form' | 'Referral';
  interestedInDeliveryMode: DeliveryMode | null;
  interestedInFieldOfStudy: string | null;
  createdAt: ISODateTime;
}

export interface PropensityScore {
  alumniId: string;
  courseId: string;
  score: number; // 0..1
  computedAt: ISODateTime;
  topFeatures: string[];
}

export type CohortId = 'recent_grads' | 'mid_career' | 'high_signal' | 'dormant' | 'all';

export interface CohortRollup {
  id: CohortId;
  label: string;
  size: number;
  engagementRate30d: number; // 0..1
  momentsOfRelevance30d: number;
  dropOffRate90d: number; // 0..1
  engagementTrend12m: { month: ISODate; rate: number }[];
  agentCommentary: string;
}

export interface DataBundle {
  employers: Employer[];
  courses: Course[];
  alumni: Alumni[];
  prospects: ProspectiveLearner[];
  signals: CareerSignal[];
  propensity: PropensityScore[];
  cohorts: CohortRollup[];
  generatedAt: ISODateTime;
  seed: number;
}
