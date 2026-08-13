import { appendSegment } from '../session-store';

export interface CreateAepSegmentInput {
  sessionId: string;
  name: string;
  audienceSize: number;
  criteriaSummary: string;
}

export interface CreateAepSegmentOutput {
  segmentId: string;
  aepSegmentId: string;
  name: string;
  audienceSize: number;
  createdAt: string;
}

let counter = 0;

export async function createAepSegment(
  input: CreateAepSegmentInput,
): Promise<CreateAepSegmentOutput> {
  counter++;
  const id = `seg-${Date.now()}-${counter}`;
  const aepId = `aep-seg-${String(counter).padStart(6, '0')}`;
  await appendSegment(input.sessionId, {
    id,
    name: input.name,
    size: input.audienceSize,
  });
  return {
    segmentId: id,
    aepSegmentId: aepId,
    name: input.name,
    audienceSize: input.audienceSize,
    createdAt: new Date().toISOString(),
  };
}
