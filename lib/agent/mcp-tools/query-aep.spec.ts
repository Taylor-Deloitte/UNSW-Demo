import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle } from '../../types';
import { queryAep } from './query-aep';

describe('queryAep', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-qa-'));
    await runGeneration({ outDir: tmp, seed: 4, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('filters by industry list', () => {
    const r = queryAep(bundle, { audienceCriteria: { industries: ['Technology'] }, limit: 50 });
    expect(r.audienceSize).toBeGreaterThan(0);
    expect(r.profiles.every((p) => p.industry === 'Technology')).toBe(true);
  });

  it('restricts to recent-signal alumni when requested', () => {
    const all = queryAep(bundle, { audienceCriteria: {}, limit: 1 }).audienceSize;
    const recent = queryAep(bundle, {
      audienceCriteria: { hasRecentSignal: true },
      limit: 1,
    }).audienceSize;
    expect(recent).toBeLessThanOrEqual(all);
  });

  it('shapes profiles with crmId + alumniId + display name', () => {
    const r = queryAep(bundle, { audienceCriteria: {}, limit: 3 });
    for (const p of r.profiles) {
      expect(p.profileId).toMatch(/^crm-/);
      expect(p.alumniId).toMatch(/^contact-/);
      expect(p.displayName.split(' ').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('empty criteria returns everyone', () => {
    const r = queryAep(bundle, { audienceCriteria: {}, limit: 5 });
    expect(r.audienceSize).toBe(bundle.alumni.length);
  });
});
