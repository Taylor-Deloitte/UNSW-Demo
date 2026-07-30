import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeRng } from '../lib/generators/rng';
import { generateEmployers } from '../lib/generators/employers';
import { generateCourses } from '../lib/generators/courses';
import { generateAlumni } from '../lib/generators/alumni';
import { generateSignals } from '../lib/generators/signals';
import { generateProspects } from '../lib/generators/prospects';
import { generatePropensityScores } from '../lib/generators/propensity';
import { generateCohorts } from '../lib/generators/cohorts';
import type { DataBundle } from '../lib/types';

export interface GenerationOptions {
  outDir: string;
  seed?: number;
  small?: boolean;
}

interface Volumes {
  employers: number;
  courses: number;
  alumni: number;
  prospects: number;
}

const FULL: Volumes = { employers: 500, courses: 150, alumni: 2000, prospects: 500 };
const SMALL: Volumes = { employers: 30, courses: 20, alumni: 60, prospects: 20 };

export async function runGeneration(opts: GenerationOptions): Promise<DataBundle> {
  const seed = opts.seed ?? 42;
  const vol = opts.small ? SMALL : FULL;

  const rng = makeRng(seed);
  const employers = generateEmployers(rng, vol.employers);
  const courses = generateCourses(rng, vol.courses);
  const alumni = generateAlumni(rng, employers, vol.alumni);
  const signals = generateSignals(rng, alumni);
  const prospects = generateProspects(rng, alumni, signals, vol.prospects);
  const propensity = generatePropensityScores(rng, alumni, courses);
  const cohorts = generateCohorts(rng, alumni, signals);

  const bundle: DataBundle = {
    employers,
    courses,
    alumni,
    prospects,
    signals,
    propensity,
    cohorts,
    generatedAt: new Date().toISOString(),
    seed,
  };

  await fs.mkdir(opts.outDir, { recursive: true });
  const writes: Promise<void>[] = [
    fs.writeFile(path.join(opts.outDir, 'employers.json'), JSON.stringify(employers, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'courses.json'), JSON.stringify(courses, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'alumni.json'), JSON.stringify(alumni, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'prospects.json'), JSON.stringify(prospects, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'signals.json'), JSON.stringify(signals, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'propensity.json'), JSON.stringify(propensity)),
    fs.writeFile(path.join(opts.outDir, 'cohorts.json'), JSON.stringify(cohorts, null, 2)),
    fs.writeFile(path.join(opts.outDir, 'bundle.json'), JSON.stringify(bundle)),
    fs.writeFile(
      path.join(opts.outDir, 'meta.json'),
      JSON.stringify(
        {
          generatedAt: bundle.generatedAt,
          seed,
          counts: {
            employers: employers.length,
            courses: courses.length,
            alumni: alumni.length,
            prospects: prospects.length,
            signals: signals.length,
            propensity: propensity.length,
            cohorts: cohorts.length,
          },
        },
        null,
        2,
      ),
    ),
  ];
  await Promise.all(writes);
  return bundle;
}

// CLI entry — use pathToFileURL so the comparison works on Windows (backslashes)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = path.resolve(process.cwd(), 'data');
  const seed = process.env.SEED ? Number(process.env.SEED) : 42;
  const small = process.env.SMALL === '1';
  runGeneration({ outDir, seed, small })
    .then((b) => {
      console.log(
        `Generated ${b.alumni.length} alumni, ${b.prospects.length} prospects, ${b.signals.length} signals, ${b.propensity.length} propensity rows → ${outDir}`,
      );
    })
    .catch((e: unknown) => {
      console.error(e);
      process.exit(1);
    });
}
