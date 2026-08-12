import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../scripts/generate-data';
import { loadDataBundle } from '../data';
import type { DataBundle } from '../types';
import {
  buildCampaignPayload,
  emailConsentRate,
  pqlFromFilter,
  toCoursePlanRecord,
  type BuildSegmentInput,
} from './build-campaign-payload';

describe('build-campaign-payload', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-bcp-'));
    await runGeneration({ outDir: tmp, seed: 7, small: true });
    bundle = await loadDataBundle(tmp);
  });

  function makeInput(overrides: Partial<BuildSegmentInput> = {}): BuildSegmentInput {
    const course = bundle.courses[0];
    return {
      courseName: course.name,
      objective: 'Fill remaining seats in the next intake',
      variants: [
        {
          variantName: 'High-propensity reach',
          classification: 'high-propensity',
          audienceFilter: { industries: ['Technology'] },
          audienceFilterSummary: 'Technology alumni scored highly for this course',
          eligiblePool: 120,
          avgPropensityScore: 0.82,
          conversionAssumptionPct: 12,
          estimatedEnrolments: 14,
          dataSource: 'score_propensity(courseIdOrName=...) -> top 120',
          confidence: 'High',
        },
        {
          variantName: 'Broad reach',
          classification: 'broad-reach',
          audienceFilterSummary: 'All alumni with a valid profile',
          eligiblePool: 800,
          conversionAssumptionPct: 3,
          estimatedEnrolments: 24,
          dataSource: 'size_audience(audienceCriteria={}) -> 800',
          confidence: 'Medium',
        },
      ],
      recommendedVariantIndex: 0,
      rationale: 'High-propensity variant has both a real audience size and a real score.',
      ...overrides,
    };
  }

  it('computes real revenue from the course price', () => {
    const input = makeInput();
    const payload = buildCampaignPayload(input, bundle);
    const course = bundle.courses.find((c) => c.name === input.courseName)!;
    expect(payload.coursePriceAud).toBe(course.priceAud);
    expect(payload.variants[0].estimatedRevenueAud).toBe(
      Math.round(input.variants[0].estimatedEnrolments * course.priceAud),
    );
  });

  it('computes emailConsent per variant using the real bundle-wide consent rate', () => {
    const input = makeInput();
    const payload = buildCampaignPayload(input, bundle);
    const rate = emailConsentRate(bundle);
    expect(payload.variants[0].emailConsent).toBe(Math.round(120 * rate));
    expect(payload.variants[1].emailConsent).toBe(Math.round(800 * rate));
  });

  it('clamps an out-of-bounds recommendedVariantIndex to 0', () => {
    const input = makeInput({ recommendedVariantIndex: 99 });
    const payload = buildCampaignPayload(input, bundle);
    expect(payload.recommendedVariantIndex).toBe(0);
  });

  it('caps variants at 4 even if more are supplied', () => {
    const base = makeInput();
    const input = makeInput({
      variants: [
        base.variants[0],
        base.variants[1],
        { ...base.variants[0], variantName: 'v3' },
        { ...base.variants[0], variantName: 'v4' },
        { ...base.variants[0], variantName: 'v5' },
      ],
    });
    const payload = buildCampaignPayload(input, bundle);
    expect(payload.variants.length).toBe(4);
  });

  it('builds crmCampaign and aepSegment bodies from the recommended variant', () => {
    const input = makeInput();
    const payload = buildCampaignPayload(input, bundle);
    expect(payload.crmCampaign.body.prospectscountbase).toBe(120);
    expect(payload.crmCampaign.body.customFields.unsw_recommended_variant).toBe(
      'High-propensity reach',
    );
    expect(payload.aepSegment.body.profileInstances.estimated).toBe(120);
  });

  it('falls back to null revenue when the course cannot be found', () => {
    const input = makeInput({ courseName: 'Not A Real Course Name At All' });
    const payload = buildCampaignPayload(input, bundle);
    expect(payload.coursePriceAud).toBeNull();
    expect(payload.variants[0].estimatedRevenueAud).toBeNull();
  });

  describe('toCoursePlanRecord', () => {
    it('extracts the confirmed variant into a CoursePlanRecord shape', () => {
      const input = makeInput();
      const payload = buildCampaignPayload(input, bundle);
      const record = toCoursePlanRecord(payload, 0);
      expect(record.courseName).toBe(input.courseName);
      expect(record.variantName).toBe('High-propensity reach');
      expect(record.classification).toBe('high-propensity');
      expect(record.eligiblePool).toBe(120);
      expect(record.estimatedEnrolments).toBe(14);
      expect(record.estimatedRevenueAud).toBe(payload.variants[0].estimatedRevenueAud);
      expect(record.confidence).toBe('High');
      expect(record.crmCampaign).toBe(payload.crmCampaign);
      expect(record.aepSegment).toBe(payload.aepSegment);
    });

    it('extracts a non-recommended variant when a different index is confirmed', () => {
      const input = makeInput();
      const payload = buildCampaignPayload(input, bundle);
      const record = toCoursePlanRecord(payload, 1);
      expect(record.variantName).toBe('Broad reach');
      expect(record.classification).toBe('broad-reach');
      expect(record.eligiblePool).toBe(800);
    });

    it('falls back to recommendedVariantIndex when variantIndex is out of range', () => {
      const input = makeInput();
      const payload = buildCampaignPayload(input, bundle);
      const record = toCoursePlanRecord(payload, 99);
      expect(record.variantName).toBe(
        payload.variants[payload.recommendedVariantIndex].variantName,
      );
    });

    it('throws when the payload has no variants at all', () => {
      const input = makeInput({ variants: [] });
      const payload = buildCampaignPayload(input, bundle);
      expect(() => toCoursePlanRecord(payload, 0)).toThrow(
        'buildCampaignPayload produced no variants',
      );
    });
  });
});

describe('pqlFromFilter', () => {
  it('returns a catch-all when no filter is given', () => {
    expect(pqlFromFilter(undefined)).toBe('profile IS NOT NULL');
  });

  it('combines multiple clauses with AND', () => {
    const pql = pqlFromFilter({ industries: ['Technology'], states: ['NSW'] });
    expect(pql).toContain('profile.industry IN ("Technology")');
    expect(pql).toContain('profile.state IN ("NSW")');
    expect(pql).toContain('\nAND ');
  });

  it('adds the recent-signal clause when requested', () => {
    const pql = pqlFromFilter({ hasRecentSignal: true });
    expect(pql).toContain('careerSignals.detectedAt > now() - 90d');
  });
});
