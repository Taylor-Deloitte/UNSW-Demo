import { describe, it, expect, vi } from 'vitest';
import { createAepSegment } from './create-aep-segment';

vi.mock('../session-store', () => ({
  appendSegment: vi.fn(async () => undefined),
}));

describe('createAepSegment', () => {
  it('appends a segment to the session', async () => {
    const r = await createAepSegment({
      sessionId: 'test-seg-session',
      name: 'CS grads outside Sydney',
      audienceSize: 340,
      criteriaSummary: 'industry=Technology, state!=NSW',
    });
    expect(r.segmentId).toMatch(/^seg-/);
    expect(r.aepSegmentId).toMatch(/^aep-seg-/);
    expect(r.audienceSize).toBe(340);
  });

  it('createdAt is ISO', async () => {
    const r = await createAepSegment({
      sessionId: 'test-seg-session',
      name: 'x',
      audienceSize: 1,
      criteriaSummary: 'y',
    });
    expect(() => new Date(r.createdAt).toISOString()).not.toThrow();
  });

  it('generates unique IDs across calls', async () => {
    const a = await createAepSegment({
      sessionId: 'test-seg-session',
      name: 'a',
      audienceSize: 1,
      criteriaSummary: '',
    });
    const b = await createAepSegment({
      sessionId: 'test-seg-session',
      name: 'b',
      audienceSize: 2,
      criteriaSummary: '',
    });
    expect(a.segmentId).not.toBe(b.segmentId);
    expect(a.aepSegmentId).not.toBe(b.aepSegmentId);
  });
});
