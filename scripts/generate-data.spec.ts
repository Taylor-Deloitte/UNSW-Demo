import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runGeneration } from './generate-data';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('runGeneration', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-gen-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes all expected files', async () => {
    await runGeneration({ outDir: tmpDir, seed: 42, small: true });
    const files = await fs.readdir(tmpDir);
    expect(files.sort()).toEqual([
      'alumni.json',
      'bundle.json',
      'cohorts.json',
      'courses.json',
      'employers.json',
      'meta.json',
      'propensity.json',
      'prospects.json',
      'signals.json',
    ]);
  });

  it('bundle.json contains a DataBundle with the right seed', async () => {
    await runGeneration({ outDir: tmpDir, seed: 99, small: true });
    const bundle = JSON.parse(await fs.readFile(path.join(tmpDir, 'bundle.json'), 'utf8'));
    expect(bundle.seed).toBe(99);
    expect(bundle.alumni.length).toBeGreaterThan(0);
    expect(bundle.employers.length).toBeGreaterThan(0);
    expect(bundle.courses.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed', async () => {
    await runGeneration({ outDir: tmpDir, seed: 7, small: true });
    const first = await fs.readFile(path.join(tmpDir, 'alumni.json'), 'utf8');
    await runGeneration({ outDir: tmpDir, seed: 7, small: true });
    const second = await fs.readFile(path.join(tmpDir, 'alumni.json'), 'utf8');
    expect(second).toBe(first);
  });
});
