import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSession,
  setSession,
  appendSegment,
  appendCampaign,
  appendCoursePlan,
  sessionCount,
} from './session-store';

// Integration test: needs a reachable Postgres (DATABASE_URL) since this suite
// exercises the real persistence layer, not a mock.
describe.skipIf(!process.env.DATABASE_URL)('session-store', () => {
  beforeEach(async () => {
    for (let i = 0; i < 200; i++) await setSession(`__reset-${i}`, {});
  });

  it('stores and retrieves', async () => {
    await setSession('abc', { title: 'demo' });
    const s = await getSession('abc');
    expect(s).toBeDefined();
    expect(s!.title).toBe('demo');
    expect(s!.segments).toEqual([]);
    expect(s!.campaigns).toEqual([]);
    expect(s!.coursePlans).toEqual([]);
  });

  it('appends segments', async () => {
    await setSession('s1', {});
    await appendSegment('s1', { id: 'seg-1', name: 'CS grads', size: 340 });
    const s = (await getSession('s1'))!;
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].name).toBe('CS grads');
  });

  it('appends campaigns', async () => {
    await setSession('s2', {});
    await appendCampaign('s2', { id: 'camp-1', segmentId: 'seg-1', channel: 'email' });
    expect((await getSession('s2'))!.campaigns).toHaveLength(1);
  });

  it('appends course plans', async () => {
    await setSession('s3', {});
    await appendCoursePlan('s3', {
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
    const s = (await getSession('s3'))!;
    expect(s.coursePlans).toHaveLength(1);
    expect(s.coursePlans[0].courseName).toBe('AI for Leaders');
    expect(s.coursePlans[0].createdAt).toBeDefined();
  });

  it('evicts oldest when over 100', async () => {
    // Fresh evicted state via the beforeEach reset
    for (let i = 0; i < 105; i++) await setSession(`k-${i}`, {});
    expect(await sessionCount()).toBeLessThanOrEqual(100);
    expect(await getSession('k-0')).toBeUndefined();
    expect(await getSession('k-104')).toBeDefined();
  });
});
