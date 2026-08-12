import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSession,
  setSession,
  appendSegment,
  appendCampaign,
  appendCoursePlan,
  sessionCount,
} from './session-store';

describe('session-store', () => {
  beforeEach(() => {
    for (let i = 0; i < 200; i++) setSession(`__reset-${i}`, {});
  });

  it('stores and retrieves', () => {
    setSession('abc', { title: 'demo' });
    const s = getSession('abc');
    expect(s).toBeDefined();
    expect(s!.title).toBe('demo');
    expect(s!.segments).toEqual([]);
    expect(s!.campaigns).toEqual([]);
    expect(s!.coursePlans).toEqual([]);
  });

  it('appends segments', () => {
    setSession('s1', {});
    appendSegment('s1', { id: 'seg-1', name: 'CS grads', size: 340 });
    const s = getSession('s1')!;
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].name).toBe('CS grads');
  });

  it('appends campaigns', () => {
    setSession('s2', {});
    appendCampaign('s2', { id: 'camp-1', segmentId: 'seg-1', channel: 'email' });
    expect(getSession('s2')!.campaigns).toHaveLength(1);
  });

  it('appends course plans', () => {
    setSession('s3', {});
    appendCoursePlan('s3', {
      id: 'plan-1',
      courseName: 'AI for Leaders',
      variantName: 'High-propensity reach',
      classification: 'high-propensity',
      eligiblePool: 120,
      estimatedEnrolments: 14,
      estimatedRevenueAud: 16800,
      confidence: 'High',
      crmCampaign: { endpoint: 'https://api.dynamics.com/v9.2/campaigns' },
      aepSegment: { endpoint: 'https://platform.adobe.io/data/core/ups/segment/definitions' },
    });
    const s = getSession('s3')!;
    expect(s.coursePlans).toHaveLength(1);
    expect(s.coursePlans[0].courseName).toBe('AI for Leaders');
    expect(s.coursePlans[0].createdAt).toBeDefined();
  });

  it('evicts oldest when over 100', () => {
    // Fresh evicted state via the beforeEach reset
    for (let i = 0; i < 105; i++) setSession(`k-${i}`, {});
    expect(sessionCount()).toBeLessThanOrEqual(100);
    expect(getSession('k-0')).toBeUndefined();
    expect(getSession('k-104')).toBeDefined();
  });
});
