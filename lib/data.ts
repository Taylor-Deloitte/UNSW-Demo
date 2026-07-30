import fs from 'node:fs/promises';
import path from 'node:path';
import type { DataBundle } from './types';
import { DataBundleSchema } from './schemas';

let cached: DataBundle | null = null;

export async function loadDataBundle(dir?: string): Promise<DataBundle> {
  const dataDir = dir ?? path.resolve(process.cwd(), 'data');
  const raw = await fs.readFile(path.join(dataDir, 'bundle.json'), 'utf8');
  const parsed = JSON.parse(raw);
  return DataBundleSchema.parse(parsed);
}

export async function getDataBundle(): Promise<DataBundle> {
  if (cached) return cached;
  cached = await loadDataBundle();
  return cached;
}

export function clearCache(): void {
  cached = null;
}
