import { describe, it, expect, beforeEach } from 'vitest';
import { createAepSegment } from './create-aep-segment';
import { setSession, getSession } from '../session-store';

describe('createAepSegment', () => {
  beforeEach(() => {
    setSession('test-seg-session', {});
  });

  it('appends a segment to the session', () => {
    const r = createAepSegment({
      sessionId: 'test-seg-session',
      name: 'CS grads outside Sydney',
      audienceSize: 340,
      criteriaSummary: 'industry=Technology, state!=NSW',
    });
    expect(r.segmentId).toMatch(/^seg-/);
    expect(r.aepSegmentId).toMatch(/^aep-seg-/);
    expect(r.audienceSize).toBe(340);
    expect(getSession('test-seg-session')!.segments).toHaveLength(1);
  });

  it('createdAt is ISO', () => {
    const r = createAepSegment({
      sessionId: 'test-seg-session',
      name: 'x',
      audienceSize: 1,
      criteriaSummary: 'y',
    });
    expect(() => new Date(r.createdAt).toISOString()).not.toThrow();
  });

  it('generates unique IDs across calls', () => {
    const a = createAepSegment({
      sessionId: 'test-seg-session',
      name: 'a',
      audienceSize: 1,
      criteriaSummary: '',
    });
    const b = createAepSegment({
      sessionId: 'test-seg-session',
      name: 'b',
      audienceSize: 2,
      criteriaSummary: '',
    });
    expect(a.segmentId).not.toBe(b.segmentId);
    expect(a.aepSegmentId).not.toBe(b.aepSegmentId);
  });
});
