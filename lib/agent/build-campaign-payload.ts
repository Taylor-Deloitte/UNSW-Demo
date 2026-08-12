import type { DataBundle } from '../types';
import type { CoursePlanRecord } from './session-store';

export interface AudienceFilterInput {
  industries?: string[];
  seniorities?: string[];
  states?: string[];
  hasRecentSignal?: boolean;
}

export interface CampaignVariantInput {
  variantName: string;
  classification: 'high-propensity' | 'broad-reach' | 're-engagement';
  audienceFilter?: AudienceFilterInput;
  audienceFilterSummary: string;
  eligiblePool: number;
  avgPropensityScore?: number;
  conversionAssumptionPct: number;
  estimatedEnrolments: number;
  dataSource: string;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface BuildSegmentInput {
  courseName: string;
  objective: string;
  variants: CampaignVariantInput[];
  recommendedVariantIndex: number;
  rationale: string;
}

function findCourse(bundle: DataBundle, courseName: string) {
  const needle = courseName.toLowerCase();
  return bundle.courses.find(
    (c) =>
      c.name.toLowerCase() === needle ||
      c.name.toLowerCase().includes(needle) ||
      c.code.toLowerCase() === needle,
  );
}

export function emailConsentRate(bundle: DataBundle): number {
  if (bundle.alumni.length === 0) return 0;
  return bundle.alumni.filter((a) => a.emailConsent).length / bundle.alumni.length;
}

export function pqlFromFilter(filter: AudienceFilterInput | undefined): string {
  if (!filter) return 'profile IS NOT NULL';
  const clauses: string[] = [];
  if (filter.industries?.length)
    clauses.push(`profile.industry IN ("${filter.industries.join('","')}")`);
  if (filter.seniorities?.length)
    clauses.push(`profile.seniority IN ("${filter.seniorities.join('","')}")`);
  if (filter.states?.length) clauses.push(`profile.state IN ("${filter.states.join('","')}")`);
  if (filter.hasRecentSignal) clauses.push('careerSignals.detectedAt > now() - 90d');
  return clauses.length ? clauses.join('\nAND ') : 'profile IS NOT NULL';
}

export function buildCampaignPayload(input: BuildSegmentInput, bundle: DataBundle) {
  const now = new Date().toISOString();
  const idempotencyKey = `camp-${Math.random().toString(36).slice(2, 10)}`;
  const course = findCourse(bundle, input.courseName);
  const priceAud = course?.priceAud ?? null;
  const consentRate = emailConsentRate(bundle);
  const cappedVariants = input.variants.slice(0, 4);

  const variants = cappedVariants.map((v, i) => ({
    index: i,
    variantName: v.variantName,
    classification: v.classification,
    audienceFilterSummary: v.audienceFilterSummary,
    eligiblePool: v.eligiblePool,
    emailConsent: Math.round(v.eligiblePool * consentRate),
    avgPropensityScore: v.avgPropensityScore ?? null,
    conversionAssumptionPct: v.conversionAssumptionPct,
    estimatedEnrolments: v.estimatedEnrolments,
    estimatedRevenueAud: priceAud !== null ? Math.round(v.estimatedEnrolments * priceAud) : null,
    dataSource: v.dataSource,
    confidence: v.confidence,
  }));

  const recommendedIndex =
    input.recommendedVariantIndex >= 0 && input.recommendedVariantIndex < variants.length
      ? input.recommendedVariantIndex
      : 0;
  const recommended: (typeof variants)[number] | undefined = variants[recommendedIndex];
  const recommendedFilter = cappedVariants[recommendedIndex]?.audienceFilter;

  return {
    kind: 'agent_campaign_variants',
    generatedAt: now,
    course: input.courseName,
    coursePriceAud: priceAud,
    objective: input.objective,
    rationale: input.rationale,
    variants,
    recommendedVariantIndex: recommendedIndex,
    crmCampaign: {
      endpoint: 'https://api.dynamics.com/v9.2/campaigns',
      method: 'POST',
      body: {
        name: `UNSW Online · ${input.courseName} · agent-drafted`,
        description: `Auto-built by Marketing Intelligence agent. ${input.rationale}`,
        typecode: 1,
        statuscode: 0,
        prospectscountbase: recommended?.eligiblePool ?? 0,
        subject: `${input.courseName} — a course matched to your career trajectory`,
        customFields: {
          unsw_source: 'marketing-intelligence-agent',
          unsw_governed_by: 'UNSW policy v1.2',
          unsw_objective: input.objective,
          unsw_variant_count: variants.length,
          unsw_recommended_variant: recommended?.variantName ?? '',
          unsw_created_at: now,
          unsw_idempotency_key: idempotencyKey,
        },
        note: 'Dynamics is the lead master — AEP will sync via the CRM→AEP connector after review.',
      },
    },
    aepSegment: {
      endpoint: 'https://platform.adobe.io/data/core/ups/segment/definitions',
      method: 'POST',
      body: {
        name: `UNSW Online · ${input.courseName} · ${recommended?.variantName ?? 'default'}`,
        description: recommended?.audienceFilterSummary ?? input.objective,
        expression: { type: 'PQL', format: 'pql/text', value: pqlFromFilter(recommendedFilter) },
        profileInstances: { estimated: recommended?.eligiblePool ?? 0 },
        tags: ['unsw-online', 'agent-built', 'lifelong-learning'],
      },
    },
    nextSteps: [
      'Review the variant comparison and confirm the recommended audience',
      'Approve the Dynamics campaign record',
      'Sync the AEP segment via the CRM→AEP connector',
      'Attach to an AJO journey for email delivery',
      'Set a hold-out group to measure real uplift',
    ],
  };
}

export function toCoursePlanRecord(
  payload: ReturnType<typeof buildCampaignPayload>,
  variantIndex: number,
): Omit<CoursePlanRecord, 'id' | 'createdAt'> {
  const variant =
    payload.variants[variantIndex] ?? payload.variants[payload.recommendedVariantIndex];
  if (!variant) throw new Error('buildCampaignPayload produced no variants');
  return {
    courseName: payload.course,
    variantName: variant.variantName,
    classification: variant.classification,
    eligiblePool: variant.eligiblePool,
    estimatedEnrolments: variant.estimatedEnrolments,
    estimatedRevenueAud: variant.estimatedRevenueAud,
    confidence: variant.confidence,
    crmCampaign: payload.crmCampaign,
    aepSegment: payload.aepSegment,
  };
}
