import type { Alumni, CareerSignal, DataBundle, SignalType } from '../../types';

export interface QueryLinkedInInput {
  mode: 'by_alumni' | 'by_signal_type';
  alumniId?: string;
  signalType?: SignalType;
  withinDays?: number;
  limit?: number;
}

export interface QueryLinkedInOutput {
  mode: string;
  matches: Array<{
    alumniId: string;
    displayName: string;
    trajectorySummary: string;
    signals: CareerSignal[];
  }>;
  totalMatched: number;
}

export function queryLinkedin(bundle: DataBundle, input: QueryLinkedInInput): QueryLinkedInOutput {
  const withinDays = input.withinDays ?? 365;
  const limit = input.limit ?? 20;
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;

  const alumniById = new Map(bundle.alumni.map((a) => [a.id, a]));

  if (input.mode === 'by_alumni' && input.alumniId) {
    const a = alumniById.get(input.alumniId);
    if (!a) return { mode: input.mode, matches: [], totalMatched: 0 };
    const signals = bundle.signals.filter((s) => s.alumniId === input.alumniId);
    return {
      mode: input.mode,
      matches: [
        {
          alumniId: a.id,
          displayName: `${a.firstName} ${a.lastName}`,
          trajectorySummary: summarizeTrajectory(a),
          signals,
        },
      ],
      totalMatched: 1,
    };
  }

  if (input.mode === 'by_signal_type' && input.signalType) {
    const signalsByAlumni = new Map<string, CareerSignal[]>();
    for (const s of bundle.signals) {
      if (s.type !== input.signalType) continue;
      if (new Date(s.detectedAt).getTime() < cutoff) continue;
      const arr = signalsByAlumni.get(s.alumniId) ?? [];
      arr.push(s);
      signalsByAlumni.set(s.alumniId, arr);
    }
    const entries = [...signalsByAlumni.entries()];
    return {
      mode: input.mode,
      totalMatched: entries.length,
      matches: entries.slice(0, limit).flatMap(([aid, signals]) => {
        const a = alumniById.get(aid);
        if (!a) return [];
        return [
          {
            alumniId: a.id,
            displayName: `${a.firstName} ${a.lastName}`,
            trajectorySummary: summarizeTrajectory(a),
            signals,
          },
        ];
      }),
    };
  }

  return { mode: input.mode, matches: [], totalMatched: 0 };
}

function summarizeTrajectory(a: Alumni): string {
  const first = a.careerTrajectory[0];
  const last = a.careerTrajectory[a.careerTrajectory.length - 1];
  return `${first.title} → ${last.title} (${a.careerTrajectory.length} roles, grad ${a.graduationYear})`;
}
