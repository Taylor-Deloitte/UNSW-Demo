import type { DataBundle } from '../../types';

export interface RunPropensityModelInput {
  courseIdOrName: string;
  filterAlumniIds?: string[];
  topN?: number;
}

export interface RunPropensityModelOutput {
  courseId: string;
  courseName: string;
  ranked: Array<{
    alumniId: string;
    displayName: string;
    score: number;
    topFeatures: string[];
  }>;
}

export function runPropensityModel(
  bundle: DataBundle,
  input: RunPropensityModelInput,
): RunPropensityModelOutput {
  const topN = input.topN ?? 10;

  const needle = input.courseIdOrName.toLowerCase();
  const course = bundle.courses.find(
    (c) =>
      c.id === input.courseIdOrName ||
      c.code === input.courseIdOrName ||
      c.name.toLowerCase().includes(needle),
  );
  if (!course) {
    return { courseId: input.courseIdOrName, courseName: '(not found)', ranked: [] };
  }

  const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));
  const filter = input.filterAlumniIds ? new Set(input.filterAlumniIds) : null;

  const scores = bundle.propensity
    .filter((p) => p.courseId === course.id)
    .filter((p) => (filter ? filter.has(p.alumniId) : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return {
    courseId: course.id,
    courseName: course.name,
    ranked: scores.flatMap((p) => {
      const a = alumniById.get(p.alumniId);
      if (!a) return [];
      return [
        {
          alumniId: a.id,
          displayName: `${a.firstName} ${a.lastName}`,
          score: p.score,
          topFeatures: p.topFeatures,
        },
      ];
    }),
  };
}
