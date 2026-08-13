import { describe, it, expect, vi } from 'vitest';
import { draftAjoCampaign } from './draft-ajo-campaign';

vi.mock('../session-store', () => ({
  appendCampaign: vi.fn(async () => undefined),
}));

describe('draftAjoCampaign', () => {
  it('appends a campaign to the session', async () => {
    const r = await draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 'seg-1',
      channel: 'email',
      subjectLine: 'Your next chapter',
      bodyPreview: 'Hi {firstName}, we noticed...',
    });
    expect(r.campaignId).toMatch(/^camp-/);
    expect(r.ajoCampaignId).toMatch(/^ajo-camp-/);
    expect(r.channel).toBe('email');
  });

  it('accepts sms and push channels', async () => {
    const r = await draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 'seg-2',
      channel: 'sms',
    });
    expect(r.channel).toBe('sms');
  });

  it('generates unique IDs', async () => {
    const a = await draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 's',
      channel: 'email',
    });
    const b = await draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 's',
      channel: 'email',
    });
    expect(a.campaignId).not.toBe(b.campaignId);
  });
});
