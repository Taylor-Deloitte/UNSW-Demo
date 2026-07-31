import type { ChatMessage, ToolCall } from '../../hooks/useAgentChat';

export interface SegmentRow {
  id: string;
  displayName: string;
  industry?: string;
  seniority?: string;
  location?: string;
  propensityScore?: number;
  topFeatures?: string[];
}

export interface ExtractedSegment {
  source: 'query_aep' | 'run_propensity_model';
  audienceSize: number;
  rows: SegmentRow[];
  courseContext?: string;
}

const RELEVANT_TOOLS = new Set(['query_aep', 'run_propensity_model']);

export function extractSegment(messages: ChatMessage[]): ExtractedSegment | null {
  // Walk newest → oldest, agent messages only, tool calls newest first
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'agent') continue;
    for (let j = msg.toolCalls.length - 1; j >= 0; j--) {
      const tc = msg.toolCalls[j];
      if (!RELEVANT_TOOLS.has(tc.tool) || tc.status !== 'done' || !tc.output) continue;
      const extracted = extractFrom(tc);
      if (extracted) return extracted;
    }
  }
  return null;
}

function extractFrom(tc: ToolCall): ExtractedSegment | null {
  const out = tc.output as Record<string, unknown> | null;
  if (!out || typeof out !== 'object') return null;

  if (tc.tool === 'run_propensity_model') {
    const ranked = out.ranked;
    if (!Array.isArray(ranked)) return null;
    return {
      source: 'run_propensity_model',
      audienceSize: ranked.length,
      courseContext: typeof out.courseName === 'string' ? out.courseName : undefined,
      rows: ranked.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          id: String(row.alumniId ?? ''),
          displayName: String(row.displayName ?? ''),
          propensityScore: typeof row.score === 'number' ? row.score : undefined,
          topFeatures: Array.isArray(row.topFeatures) ? (row.topFeatures as string[]) : undefined,
        };
      }),
    };
  }

  if (tc.tool === 'query_aep') {
    const profiles = out.profiles;
    if (!Array.isArray(profiles)) return null;
    return {
      source: 'query_aep',
      audienceSize: typeof out.audienceSize === 'number' ? out.audienceSize : profiles.length,
      rows: profiles.map((p) => {
        const row = p as Record<string, unknown>;
        return {
          id: String(row.profileId ?? ''),
          displayName: String(row.displayName ?? ''),
          industry: typeof row.industry === 'string' ? row.industry : undefined,
          seniority: typeof row.seniority === 'string' ? row.seniority : undefined,
          location: typeof row.location === 'string' ? row.location : undefined,
        };
      }),
    };
  }

  return null;
}
