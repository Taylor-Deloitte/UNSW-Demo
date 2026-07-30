import { describe, it, expect, beforeEach } from 'vitest';
import { draftAjoCampaign } from './draft-ajo-campaign';
import { setSession, getSession } from '../session-store';

describe('draftAjoCampaign', () => {
  beforeEach(() => {
    setSession('test-camp-session', {});
  });

  it('appends a campaign to the session', () => {
    const r = draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 'seg-1',
      channel: 'email',
      subjectLine: 'Your next chapter',
      bodyPreview: 'Hi {firstName}, we noticed...',
    });
    expect(r.campaignId).toMatch(/^camp-/);
    expect(r.ajoCampaignId).toMatch(/^ajo-camp-/);
    expect(r.channel).toBe('email');
    expect(getSession('test-camp-session')!.campaigns).toHaveLength(1);
  });

  it('accepts sms and push channels', () => {
    const r = draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 'seg-2',
      channel: 'sms',
    });
    expect(r.channel).toBe('sms');
  });

  it('generates unique IDs', () => {
    const a = draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 's',
      channel: 'email',
    });
    const b = draftAjoCampaign({
      sessionId: 'test-camp-session',
      segmentId: 's',
      channel: 'email',
    });
    expect(a.campaignId).not.toBe(b.campaignId);
  });
});
