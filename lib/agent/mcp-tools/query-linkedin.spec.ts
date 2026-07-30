import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle } from '../../types';
import { queryLinkedin } from './query-linkedin';

describe('queryLinkedin', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-ql-'));
    await runGeneration({ outDir: tmp, seed: 6, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('by_alumni returns one match with signals + trajectory summary', () => {
    const target = bundle.alumni[0];
    const r = queryLinkedin(bundle, { mode: 'by_alumni', alumniId: target.id });
    expect(r.totalMatched).toBe(1);
    expect(r.matches[0].alumniId).toBe(target.id);
    expect(r.matches[0].trajectorySummary).toContain('grad');
  });

  it('by_alumni returns empty for unknown id', () => {
    const r = queryLinkedin(bundle, { mode: 'by_alumni', alumniId: 'nope-000' });
    expect(r.totalMatched).toBe(0);
    expect(r.matches).toHaveLength(0);
  });

  it('by_signal_type returns alumni with the matching signal', () => {
    const r = queryLinkedin(bundle, {
      mode: 'by_signal_type',
      signalType: 'promoted',
      withinDays: 3650,
      limit: 20,
    });
    expect(r.totalMatched).toBeGreaterThan(0);
    for (const m of r.matches) {
      expect(m.signals.every((s) => s.type === 'promoted')).toBe(true);
    }
  });

  it('by_signal_type respects withinDays cutoff', () => {
    const wide = queryLinkedin(bundle, {
      mode: 'by_signal_type',
      signalType: 'promoted',
      withinDays: 3650,
      limit: 500,
    }).totalMatched;
    const narrow = queryLinkedin(bundle, {
      mode: 'by_signal_type',
      signalType: 'promoted',
      withinDays: 30,
      limit: 500,
    }).totalMatched;
    expect(narrow).toBeLessThanOrEqual(wide);
  });
});
