import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runGeneration } from '../scripts/generate-data';
import { loadDataBundle } from './data';

describe('loadDataBundle', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-load-'));
    await runGeneration({ outDir: tmpDir, seed: 5, small: true });
  });

  it('loads and validates the bundle', async () => {
    const bundle = await loadDataBundle(tmpDir);
    expect(bundle.alumni.length).toBeGreaterThan(0);
    expect(bundle.employers.length).toBeGreaterThan(0);
    expect(bundle.seed).toBe(5);
  });

  it('throws on corrupted bundle', async () => {
    const badDir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsw-bad-'));
    await fs.writeFile(path.join(badDir, 'bundle.json'), JSON.stringify({ nope: true }));
    await expect(loadDataBundle(badDir)).rejects.toThrow();
    await fs.rm(badDir, { recursive: true, force: true });
  });
});
