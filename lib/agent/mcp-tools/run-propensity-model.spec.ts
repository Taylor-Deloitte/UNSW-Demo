import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../../../scripts/generate-data';
import { loadDataBundle } from '../../data';
import type { DataBundle } from '../../types';
import { runPropensityModel } from './run-propensity-model';

describe('runPropensityModel', () => {
  let bundle: DataBundle;
  beforeAll(async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-prop-'));
    await runGeneration({ outDir: tmp, seed: 9, small: true });
    bundle = await loadDataBundle(tmp);
  });

  it('returns top-N ranked by score descending', () => {
    const anyCourse = bundle.courses[0];
    const r = runPropensityModel(bundle, { courseIdOrName: anyCourse.id, topN: 5 });
    expect(r.courseId).toBe(anyCourse.id);
    expect(r.ranked.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.ranked.length; i++) {
      expect(r.ranked[i].score).toBeLessThanOrEqual(r.ranked[i - 1].score);
    }
  });

  it('fuzzy matches by name substring', () => {
    // Course names in the generator include "AI for Leaders — Intake N"
    const r = runPropensityModel(bundle, { courseIdOrName: 'AI for Leaders', topN: 3 });
    expect(r.courseName).toContain('AI for Leaders');
    expect(r.ranked.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown course', () => {
    const r = runPropensityModel(bundle, { courseIdOrName: 'does-not-exist-xyz', topN: 5 });
    expect(r.ranked).toHaveLength(0);
    expect(r.courseName).toBe('(not found)');
  });

  it('respects filterAlumniIds', () => {
    const anyCourse = bundle.courses[0];
    const someAlumni = bundle.alumni.slice(0, 3).map((a) => a.id);
    const r = runPropensityModel(bundle, {
      courseIdOrName: anyCourse.id,
      filterAlumniIds: someAlumni,
      topN: 10,
    });
    for (const row of r.ranked) {
      expect(someAlumni).toContain(row.alumniId);
    }
    expect(r.ranked.length).toBeLessThanOrEqual(someAlumni.length);
  });
});
