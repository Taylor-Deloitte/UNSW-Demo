import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle, Alumni, ProspectiveLearner } from '../../types';
import { queryDynamics } from './query-dynamics';

describe('queryDynamics', () => {
  let bundle: DataBundle;

  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-qd-'));
    await runGeneration({ outDir: tmp, seed: 3, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('filters alumni by industry', () => {
    const result = queryDynamics(bundle, {
      entity: 'alumni',
      filters: { industry: 'Technology' },
      limit: 20,
    });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows.every((r) => (r as Alumni).currentIndustry === 'Technology')).toBe(true);
    expect(result.totalMatched).toBeGreaterThanOrEqual(result.rows.length);
  });

  it('filters prospects by leadRating', () => {
    const result = queryDynamics(bundle, {
      entity: 'prospects',
      filters: { leadRating: 'Hot' },
      limit: 10,
    });
    expect(result.rows.every((r) => (r as ProspectiveLearner).leadRating === 'Hot')).toBe(true);
  });

  it('caps returned rows at limit', () => {
    const result = queryDynamics(bundle, { entity: 'alumni', filters: {}, limit: 5 });
    expect(result.rows).toHaveLength(5);
  });

  it('returns empty on unknown entity', () => {
    const result = queryDynamics(bundle, {
      // @ts-expect-error — testing runtime guard
      entity: 'unknown',
      filters: {},
      limit: 10,
    });
    expect(result.rows).toHaveLength(0);
    expect(result.totalMatched).toBe(0);
  });
});
