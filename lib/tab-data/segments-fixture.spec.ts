import { describe, it, expect } from 'vitest';
import { matchCount, DEFAULT_SEGMENTS_QUERY } from './segments-fixture';

describe('segments matchCount fixture', () => {
  it('default combo returns exactly 340 (demo narrative depends on this)', () => {
    expect(matchCount(DEFAULT_SEGMENTS_QUERY)).toBe(340);
  });

  it('changing study to Any field expands the base', () => {
    const n = matchCount({ ...DEFAULT_SEGMENTS_QUERY, study: 'any' });
    expect(n).toBeGreaterThan(matchCount(DEFAULT_SEGMENTS_QUERY));
  });

  it('narrower gap reduces the count', () => {
    const wider = matchCount({ ...DEFAULT_SEGMENTS_QUERY, gap: '5y' });
    const default_ = matchCount(DEFAULT_SEGMENTS_QUERY);
    expect(wider).toBeLessThan(default_);
  });

  it('regional NSW reduces count vs outside Sydney', () => {
    const regional = matchCount({ ...DEFAULT_SEGMENTS_QUERY, loc: 'regional-nsw' });
    expect(regional).toBeLessThan(matchCount(DEFAULT_SEGMENTS_QUERY));
  });
});
