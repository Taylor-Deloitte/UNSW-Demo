import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../scripts/generate-data';
import { loadDataBundle } from '../data';
import type { DataBundle } from '../types';
import { buildAlumniInsightsPage, rankByRecentSignalConfidence } from './alumni-insights';

describe('alumni-insights data shaper', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-ai-'));
    await runGeneration({ outDir: tmp, seed: 11, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('rankByRecentSignalConfidence returns alumni sorted by recency + confidence', () => {
    const ranked = rankByRecentSignalConfidence(bundle);
    expect(ranked.length).toBe(bundle.alumni.length);
    // First entry should have >= recent-signal weight of the last
    const first = ranked[0];
    const last = ranked[ranked.length - 1];
    expect(first.rankWeight).toBeGreaterThanOrEqual(last.rankWeight);
  });

  it('buildAlumniInsightsPage attaches signals to each alumni', () => {
    const page = buildAlumniInsightsPage(bundle, { limit: 20 });
    expect(page.alumni.length).toBe(20);
    for (const a of page.alumni) {
      expect(Array.isArray(a.signals)).toBe(true);
      expect(a.signals.every((s) => s.alumniId === a.id)).toBe(true);
    }
  });

  it('buildAlumniInsightsPage returns industry + state facets', () => {
    const page = buildAlumniInsightsPage(bundle, { limit: 50 });
    expect(page.facets.industries.length).toBeGreaterThan(0);
    expect(page.facets.states.length).toBeGreaterThan(0);
    // Facets carry counts
    expect(page.facets.industries[0].count).toBeGreaterThan(0);
  });
});
