import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import { NextResponse } from 'next/server';
import { getDataBundle } from '../../../lib/data';
import { queryAep, type QueryAepInput } from '../../../lib/agent/mcp-tools/query-aep';
import {
  runPropensityModel,
  type RunPropensityModelInput,
} from '../../../lib/agent/mcp-tools/run-propensity-model';
import type { DataBundle } from '../../../lib/types';
import {
  buildCampaignPayload,
  type BuildSegmentInput,
} from '../../../lib/agent/build-campaign-payload';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory multi-turn history per session (single Railway instance is fine for demo)
const sessions = new Map<string, MessageParam[]>();

const SPOTLIGHT_TOOL: Tool = {
  name: 'spotlight',
  description:
    'Focus the presenter card on a specific UI element. Call this BEFORE narrating each section so the card glides to the relevant widget.',
  input_schema: {
    type: 'object' as const,
    properties: {
      target: {
        type: 'string',
        enum: ['signalsFeed', 'cohortsChart', 'segmentsResult', 'ciReasoning', 'ciRecommendations'],
        description: 'DOM id of the widget to spotlight',
      },
      tag: {
        type: 'string',
        description: 'Short human label shown in the presenter card, e.g. "Career signals"',
      },
    },
    required: ['target', 'tag'],
  },
};

const SIZE_AUDIENCE_TOOL: Tool = {
  name: 'size_audience',
  description:
    'Query the real UNSW alumni database to size an audience by criteria. Returns a real matched count and sample profiles. Call this before quoting any audience size — never estimate one.',
  input_schema: {
    type: 'object' as const,
    properties: {
      audienceCriteria: {
        type: 'object' as const,
        description: 'Filter criteria — omit a field to leave it unrestricted',
        properties: {
          industries: {
            type: 'array',
            items: { type: 'string' },
            description: 'e.g. ["Technology", "Financial Services"]',
          },
          seniorities: {
            type: 'array',
            items: { type: 'string' },
            description: 'e.g. ["Senior", "Lead", "Manager"]',
          },
          states: { type: 'array', items: { type: 'string' }, description: 'e.g. ["NSW", "VIC"]' },
          hasRecentSignal: {
            type: 'boolean',
            description: 'Restrict to alumni with a career signal detected in the last 90 days',
          },
        },
      },
      limit: {
        type: 'number',
        description:
          'Max sample profiles to return (default 20) — audienceSize is always the full real count',
      },
    },
    required: ['audienceCriteria'],
  },
};

const SCORE_PROPENSITY_TOOL: Tool = {
  name: 'score_propensity',
  description:
    'Score real alumni propensity to enrol in a specific course, ranked highest first. Optionally restrict to alumniId values returned by a prior size_audience call. Call this before quoting any conversion or enrolment estimate for a course.',
  input_schema: {
    type: 'object' as const,
    properties: {
      courseIdOrName: { type: 'string', description: 'Course name or code, e.g. "AI for Leaders"' },
      filterAlumniIds: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Optional: restrict scoring to these alumniId values (from a prior size_audience result)',
      },
      topN: { type: 'number', description: 'How many top-ranked alumni to return (default 10)' },
    },
    required: ['courseIdOrName'],
  },
};

const BUILD_SEGMENT_TOOL: Tool = {
  name: 'build_segment',
  description:
    "Build a data-grounded, multi-variant campaign for a course. Call 'size_audience' and/or 'score_propensity' FIRST — every variant's eligiblePool must equal a real number already returned in this conversation, never an invented figure. Produce 2-3 variants spanning different strategies (e.g. a high-propensity variant scored via score_propensity, a broad-reach variant sized via size_audience alone, a re-engagement variant targeting a dormant or course-recency signal). After calling this, briefly confirm what you built, which variant you recommend, and why.",
  input_schema: {
    type: 'object' as const,
    properties: {
      courseName: { type: 'string', description: 'Full name of the course to promote' },
      objective: {
        type: 'string',
        description:
          'One-sentence business objective, e.g. "Fill remaining seats in the next intake"',
      },
      variants: {
        type: 'array',
        minItems: 2,
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            variantName: { type: 'string', description: 'e.g. "High-propensity reach"' },
            classification: {
              type: 'string',
              enum: ['high-propensity', 'broad-reach', 're-engagement'],
              description: 'Strategic type of this variant',
            },
            audienceFilter: {
              type: 'object',
              description: 'The criteria object actually used with size_audience for this variant',
              properties: {
                industries: { type: 'array', items: { type: 'string' } },
                seniorities: { type: 'array', items: { type: 'string' } },
                states: { type: 'array', items: { type: 'string' } },
                hasRecentSignal: { type: 'boolean' },
              },
            },
            audienceFilterSummary: {
              type: 'string',
              description:
                'Plain-language description of the filter, e.g. "Technology alumni with a promotion signal in the last 90 days"',
            },
            eligiblePool: {
              type: 'number',
              description:
                'Real matched count — must equal a number returned earlier by size_audience or score_propensity',
            },
            avgPropensityScore: {
              type: 'number',
              description:
                'Average propensity score (0-1) from score_propensity, if used for this variant',
            },
            conversionAssumptionPct: {
              type: 'number',
              description:
                'Assumed enrolment conversion rate as a percentage — justify it in dataSource',
            },
            estimatedEnrolments: {
              type: 'number',
              description: 'eligiblePool x (conversionAssumptionPct / 100), rounded',
            },
            dataSource: {
              type: 'string',
              description:
                'Which tool call(s) produced eligiblePool/avgPropensityScore — cite the literal criteria, e.g. "size_audience(industries=[Technology], hasRecentSignal=true) -> 214"',
            },
            confidence: {
              type: 'string',
              enum: ['High', 'Medium', 'Low'],
              description:
                'High = audience size AND propensity both real tool results this turn. Medium = audience size real, conversion assumed. Low = limited data backing.',
            },
          },
          required: [
            'variantName',
            'classification',
            'audienceFilterSummary',
            'eligiblePool',
            'conversionAssumptionPct',
            'estimatedEnrolments',
            'dataSource',
            'confidence',
          ],
        },
      },
      recommendedVariantIndex: {
        type: 'number',
        description: '0-based index into variants[] of the recommended option',
      },
      rationale: {
        type: 'string',
        description: 'One-to-two sentence rationale for the recommendation',
      },
    },
    required: ['courseName', 'objective', 'variants', 'recommendedVariantIndex', 'rationale'],
  },
};

function executeTool(name: string, input: unknown, bundle: DataBundle): unknown {
  switch (name) {
    case 'size_audience':
      return queryAep(bundle, input as QueryAepInput);
    case 'score_propensity':
      return runPropensityModel(bundle, input as RunPropensityModelInput);
    case 'build_segment':
      return { ok: true, note: 'Campaign variants generated and shown to the presenter.' };
    default:
      return { ok: true };
  }
}

const SYSTEM_PROMPT = `You are the Marketing Intelligence assistant for UNSW Online's lifelong learning alumni engagement tool.

The tool has four tabs — Signals, Cohorts, Segments, and Course Intelligence — each with a live data view.

You have four tools available:

1. 'spotlight' — call it BEFORE narrating each section to move the presenter card to the relevant UI element. Targets: signalsFeed, cohortsChart, segmentsResult, ciReasoning, ciRecommendations.

2. 'size_audience' — queries the real alumni database by criteria (industry, seniority, state, recent career signal) and returns a real matched count. Call this before quoting any audience size.

3. 'score_propensity' — scores real alumni propensity to enrol in a specific course, optionally restricted to alumniId values from a prior size_audience result. Call this before quoting any conversion or enrolment estimate for a course.

4. 'build_segment' — call this whenever the user asks to launch a course, build a campaign, target an audience, or promote anything. Before calling it, call 'size_audience' and/or 'score_propensity' to ground every variant in a real number from this conversation — never invent an eligiblePool. Produce 2-3 variants spanning different strategies (e.g. a high-propensity variant scored via score_propensity, a broad-reach variant sized via size_audience alone, and a re-engagement variant targeting a dormant or course-recency signal). Every variant needs a dataSource string citing the literal tool call that produced its numbers, and an honest confidence level — 'High' only when both audience size and propensity are real tool results, 'Low' when you had to assume. After calling it, briefly confirm what you built, which variant you recommend, and why.

Keep responses concise and presenter-friendly. Use **bold** for key numbers and course names.`;

function sse(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string; sessionId?: string };
  const prompt = body.prompt?.trim();
  const sessionId = body.sessionId ?? 'default';

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const bundle = await getDataBundle();
  const history = sessions.get(sessionId) ?? [];
  const messages: MessageParam[] = [...history, { role: 'user', content: prompt }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        // Agentic loop — continues until stop_reason is 'end_turn'
        let iterations = 0;
        while (iterations < 12) {
          iterations++;

          // Track current tool_use accumulation across events
          let currentToolName = '';
          let currentToolId = '';
          let currentToolInput = '';
          let inToolUse = false;

          // client.messages.stream() gives us event iteration + .finalMessage()
          const sdkStream = client.messages.stream({
            model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            tools: [SPOTLIGHT_TOOL, SIZE_AUDIENCE_TOOL, SCORE_PROPENSITY_TOOL, BUILD_SEGMENT_TOOL],
            messages,
          });

          for await (const event of sdkStream) {
            if (event.type === 'content_block_start') {
              const block = event.content_block;
              if (block.type === 'thinking') {
                send(sse('thinking_signal', { phase: 'start' }));
              } else if (block.type === 'tool_use') {
                inToolUse = true;
                currentToolName = block.name;
                currentToolId = block.id;
                currentToolInput = '';
              }
            } else if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if (delta.type === 'text_delta') {
                send(sse('text_delta', { text: delta.text }));
              } else if (delta.type === 'input_json_delta') {
                currentToolInput += delta.partial_json;
              }
            } else if (event.type === 'content_block_stop') {
              if (inToolUse) {
                inToolUse = false;
                if (currentToolName === 'spotlight') {
                  let parsed: { target?: string; tag?: string } = {};
                  try {
                    parsed = JSON.parse(currentToolInput) as { target?: string; tag?: string };
                  } catch {
                    // malformed input — skip
                  }
                  send(sse('spotlight', { target: parsed.target ?? '', tag: parsed.tag ?? '' }));
                } else if (currentToolName === 'build_segment') {
                  try {
                    const parsed = JSON.parse(currentToolInput) as BuildSegmentInput;
                    const payload = buildCampaignPayload(parsed, bundle);
                    send(
                      sse('segment_built', {
                        title: `Campaign · ${parsed.courseName}`,
                        payload: JSON.stringify(payload),
                      }),
                    );
                    send(sse('tool_call', { name: 'build_segment ✓', input: '' }));
                  } catch {
                    send(sse('tool_call', { name: 'build_segment (parse error)', input: '' }));
                  }
                } else {
                  send(sse('tool_call', { name: currentToolName, input: currentToolInput }));
                }
                currentToolName = '';
                currentToolId = '';
                currentToolInput = '';
              } else {
                // closing a thinking block
                send(sse('thinking_signal', { phase: 'end' }));
              }
            }
          }

          // finalMessage() gives us properly-typed ContentBlock[] for history
          const finalMessage = await sdkStream.finalMessage();
          messages.push({ role: 'assistant', content: finalMessage.content });

          if (finalMessage.stop_reason === 'tool_use') {
            // Execute each tool for real and return its result and loop
            const toolResults: MessageParam['content'] = finalMessage.content
              .filter((b) => b.type === 'tool_use')
              .map((b) => {
                const block = b as ToolUseBlock;
                return {
                  type: 'tool_result' as const,
                  tool_use_id: block.id,
                  content: JSON.stringify(executeTool(block.name, block.input, bundle)),
                };
              });
            messages.push({ role: 'user', content: toolResults });
          } else {
            break;
          }
        }

        // Persist history (cap at 40 to avoid unbounded growth)
        sessions.set(sessionId, messages.slice(-40));
        send(sse('done', {}));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send(sse('error', { message }));
        send(sse('done', {}));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
