import type { SegmentsQuery } from '../tab-data/segments-fixture';
import { SEGMENTS_TOKEN_OPTIONS } from '../tab-data/segments-fixture';
import type { SegmentSampleRow } from '../tab-data/segments-sample';

function labelFor<K extends keyof typeof SEGMENTS_TOKEN_OPTIONS>(key: K, value: string): string {
  const opt = SEGMENTS_TOKEN_OPTIONS[key].find((o) => o.value === value);
  return opt?.label ?? value;
}

function isoNow(): string {
  return new Date().toISOString();
}

function fauxId(prefix: string): string {
  const alpha = Array.from({ length: 12 }, () =>
    'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36)),
  ).join('');
  return `${prefix}-${alpha}`;
}

export interface SegmentsHandoffInput {
  source: 'segments';
  query: SegmentsQuery;
  audienceSize: number;
  rows: SegmentSampleRow[];
}

export function buildAepPayload(input: SegmentsHandoffInput) {
  const q = input.query;
  const criteriaSummary = `${labelFor('study', q.study)} graduates ${labelFor(
    'signal',
    q.signal,
  )} in the last ${labelFor('window', q.window)}, working ${labelFor(
    'loc',
    q.loc,
  )}, with no course purchase in ${labelFor('gap', q.gap)}`;

  return {
    endpoint: 'https://platform.adobe.io/data/core/ups/segment/definitions',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AEP API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      schema: {
        name: '_xdm.context.segmentdefinition',
      },
      name: `UNSW Online · ${labelFor('study', q.study)} · ${labelFor('signal', q.signal)}`,
      description: criteriaSummary,
      profileInstances: {
        estimated: input.audienceSize,
        sampledFromClient: input.rows.length,
      },
      expression: {
        type: 'PQL',
        format: 'pql/text',
        value: buildPql(q),
      },
      evaluationInfo: {
        continuous: { enabled: true },
      },
      mergePolicyId: '<merge policy — Alumni Master v2>',
      tags: ['unsw-online', 'lifelong-learning', labelFor('study', q.study).toLowerCase()],
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'agent',
        sourceQuery: q,
        createdAt: isoNow(),
        idempotencyKey: fauxId('idem'),
      },
    },
  };
}

export function buildAjoPayload(input: SegmentsHandoffInput) {
  const q = input.query;
  const subject =
    q.signal === 'promoted'
      ? `Congrats on the new role — one skill worth a fresh look`
      : q.signal === 'redundancy'
        ? `Between roles? Skills for what's next`
        : `Something new since your last course?`;
  return {
    endpoint: 'https://platform.adobe.io/journey/authoring/campaigns',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AJO API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      name: `UNSW Online · ${labelFor('study', q.study)} outreach`,
      description: `Auto-drafted from Marketing Intelligence · query: ${labelFor('signal', q.signal)} in ${labelFor('window', q.window)}`,
      state: 'draft',
      audience: {
        source: 'AEP',
        segmentId: '<pending: create the segment first via Save to AEP>',
        estimatedSize: input.audienceSize,
      },
      channel: 'email',
      startAt: null,
      endAt: null,
      content: {
        subject,
        preheader: 'A short check-in about your next step.',
        body: `Hi {{profile.firstName}},\n\nWe noticed {{profile.recentSignal}} — congrats. Alumni in your situation have found the AI for Leaders certificate a good next step. It's 8 weeks, mostly online. Want the outline?\n\n— UNSW Online`,
        cta: {
          label: 'Show me the outline',
          url: 'https://online.unsw.edu.au/ai-for-leaders?utm_campaign=agent-drafted',
        },
      },
      suppression: {
        respectEmailConsent: true,
        removeSuppressionList: true,
      },
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'agent',
        sourceQuery: q,
        createdAt: isoNow(),
        idempotencyKey: fauxId('idem'),
      },
    },
  };
}

export interface ForecastHandoffInput {
  segmentLabel: string;
  segmentSize: number;
  upliftPct: number;
  courseValueAud: number;
  campaignCostAud: number;
  projectedRevenueAud: number;
  projectedEnrolments: number;
  roi: number;
  paybackMonth: number | null;
}

export function buildForecastBriefPayload(input: ForecastHandoffInput) {
  return {
    kind: 'campaign_brief',
    version: '0.1',
    generatedAt: isoNow(),
    briefTitle: `${input.segmentLabel} · uplift campaign brief`,
    audience: {
      label: input.segmentLabel,
      estimatedSize: input.segmentSize,
    },
    hypothesis: `A targeted outreach to this audience delivers ${input.upliftPct.toFixed(1)} pts of conversion uplift vs baseline, worth AUD ${input.projectedRevenueAud.toLocaleString()} incremental over 12 months.`,
    financials: {
      currency: 'AUD',
      averageCourseValue: input.courseValueAud,
      campaignCost: input.campaignCostAud,
      projectedIncrementalRevenue: input.projectedRevenueAud,
      projectedIncrementalEnrolments: Math.round(input.projectedEnrolments),
      roiPct: Math.round(input.roi * 100),
      paybackMonth: input.paybackMonth,
    },
    assumptions: [
      'Cluster-based propensity model (mock — not fit to real UNSW data)',
      'Treated arm ramps to full uplift over 3 months, holds through M+12',
      'No cannibalisation from adjacent campaigns',
      'Course value is single-purchase average — bundles and renewals not modelled',
    ],
    nextSteps: [
      'Create the AEP segment (Save to AEP)',
      'Attach the segment to a new AJO email campaign (this handoff)',
      'Set A/B split against a hold-out to measure real uplift',
      'Review results at M+3 (payback checkpoint)',
    ],
    metadata: {
      createdBy: 'Marketing Intelligence agent · MI 0.1',
      governedByPolicy: 'UNSW policy v1.2',
    },
  };
}

export function buildAjoCampaignFromForecast(input: ForecastHandoffInput) {
  return {
    endpoint: 'https://platform.adobe.io/journey/authoring/campaigns',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AJO API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      name: `${input.segmentLabel} · uplift campaign`,
      description: `Drafted from Marketing Intelligence forecast · projected AUD ${input.projectedRevenueAud.toLocaleString()} incremental`,
      state: 'draft',
      audience: {
        source: 'AEP',
        segmentId: '<pending: create the segment first via Save to AEP>',
        estimatedSize: input.segmentSize,
      },
      channel: 'email',
      budget: {
        currency: 'AUD',
        amount: input.campaignCostAud,
      },
      target: {
        upliftPtsHypothesis: input.upliftPct,
        expectedIncrementalRevenueAud: input.projectedRevenueAud,
      },
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'forecast',
        createdAt: isoNow(),
        idempotencyKey: fauxId('idem'),
      },
    },
  };
}

export interface LookalikesHandoffInput {
  source: 'segments';
  query: SegmentsQuery;
  seedAudienceSize: number;
}

export function buildLookalikesPayload(input: LookalikesHandoffInput) {
  const q = input.query;
  return {
    endpoint: 'https://platform.adobe.io/data/core/ups/lookalike/models',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AEP API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      name: `UNSW Online · ${labelFor('study', q.study)} · lookalikes`,
      description: `Lookalike expansion from ${input.seedAudienceSize} seed alumni — ${labelFor('signal', q.signal)} in ${labelFor('window', q.window)}`,
      seedSegment: {
        estimatedSize: input.seedAudienceSize,
        pql: buildPql(q),
      },
      expansionTarget: {
        similarityThreshold: 0.75,
        maxOutputSize: 5000,
        features: [
          'career_trajectory',
          'field_of_study',
          'industry',
          'seniority_level',
          'engagement_history',
          'propensity_score',
        ],
      },
      outputSegment: {
        name: `UNSW Online · ${labelFor('study', q.study)} · lookalikes`,
        tags: ['unsw-online', 'lookalike', labelFor('study', q.study).toLowerCase()],
      },
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'agent',
        seedQuery: q,
        createdAt: isoNow(),
        idempotencyKey: fauxId('idem'),
      },
    },
  };
}

export interface CourseIntelligenceHandoffInput {
  cohortLabel: string;
  topCourseName: string;
  topCourseCode: string;
  matchedAlumni: number;
  catalogueGaps: Array<{ title: string; potentialCohortSize: number }>;
}

export function buildCrmCampaignPayload(input: CourseIntelligenceHandoffInput) {
  return {
    endpoint: 'https://api.dynamics.com/v9.2/campaigns',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Azure AD — fetched at runtime by the CRM connector>',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    },
    body: {
      name: `UNSW Online · ${input.topCourseCode} · ${input.cohortLabel}`,
      description: `Agent-drafted campaign — top opportunity from Course Intelligence. ${input.matchedAlumni.toLocaleString()} matched alumni with historical purchase signals.`,
      typecode: 1,
      statuscode: 0,
      prospectscountbase: input.matchedAlumni,
      subject: `${input.topCourseName} — right course, right moment for your career`,
      customFields: {
        unsw_source: 'marketing-intelligence-agent',
        unsw_governed_by: 'UNSW policy v1.2',
        unsw_cohort: input.cohortLabel,
        unsw_top_course: input.topCourseCode,
        unsw_catalogue_gap_titles: input.catalogueGaps.map((g) => g.title).join(', '),
        unsw_created_at: isoNow(),
        unsw_idempotency_key: fauxId('crm'),
      },
      meta: {
        note: 'Dynamics is the lead master — AEP will be populated from Dynamics via the CRM→AEP integration.',
        nextStep: 'Review in Dynamics, assign journey, then sync to AJO via the CRM-AEP connector.',
      },
    },
  };
}

function buildPql(q: SegmentsQuery): string {
  const parts: string[] = [];
  if (q.study !== 'any') {
    const field =
      q.study === 'cs' ? 'Computer Science' : q.study === 'eng' ? 'Engineering' : 'Commerce';
    parts.push(`education.fieldOfStudy = "${field}"`);
  }
  if (q.signal !== 'any') {
    const sig =
      q.signal === 'promoted'
        ? 'promoted'
        : q.signal === 'role-change'
          ? 'role_change'
          : 'redundancy_risk';
    parts.push(`careerSignals.type = "${sig}"`);
    const withinDays = q.window === '6m' ? 180 : q.window === '12m' ? 365 : 730;
    parts.push(`careerSignals.detectedAt >= now() - ${withinDays}days`);
  }
  if (q.loc === 'outside-sydney') {
    parts.push(`homeAddress.city != "Sydney"`);
  } else if (q.loc === 'regional-nsw') {
    parts.push(`homeAddress.state = "NSW" AND homeAddress.city != "Sydney"`);
  }
  const gapYears = q.gap === '1y' ? 1 : q.gap === '3y' ? 3 : 5;
  parts.push(`coursePurchases.mostRecentAt < now() - ${gapYears}years OR coursePurchases IS NULL`);
  return parts.join('\nAND ');
}
