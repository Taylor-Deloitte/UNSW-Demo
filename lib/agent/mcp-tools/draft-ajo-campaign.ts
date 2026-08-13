import { appendCampaign } from '../session-store';

export interface DraftAjoCampaignInput {
  sessionId: string;
  segmentId: string;
  channel: 'email' | 'sms' | 'push';
  subjectLine?: string;
  bodyPreview?: string;
}

export interface DraftAjoCampaignOutput {
  campaignId: string;
  ajoCampaignId: string;
  segmentId: string;
  channel: string;
  subjectLine?: string;
  bodyPreview?: string;
  createdAt: string;
}

let counter = 0;

export async function draftAjoCampaign(
  input: DraftAjoCampaignInput,
): Promise<DraftAjoCampaignOutput> {
  counter++;
  const id = `camp-${Date.now()}-${counter}`;
  const ajoId = `ajo-camp-${String(counter).padStart(6, '0')}`;
  await appendCampaign(input.sessionId, {
    id,
    segmentId: input.segmentId,
    channel: input.channel,
  });
  return {
    campaignId: id,
    ajoCampaignId: ajoId,
    segmentId: input.segmentId,
    channel: input.channel,
    subjectLine: input.subjectLine,
    bodyPreview: input.bodyPreview,
    createdAt: new Date().toISOString(),
  };
}
