import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages';
import { NextResponse } from 'next/server';

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

const BUILD_SEGMENT_TOOL: Tool = {
  name: 'build_segment',
  description:
    'Build a targeted audience segment and CRM campaign draft for a course. Call this whenever the user asks to launch a campaign, target an audience, build a segment, or promote a new course. Infer audience parameters from the conversation — do not ask for clarification before calling.',
  input_schema: {
    type: 'object' as const,
    properties: {
      courseName: {
        type: 'string',
        description: 'Full name of the course to promote',
      },
      targetDescription: {
        type: 'string',
        description: 'Natural language summary of the target audience, e.g. "CS graduates promoted in the last 12 months"',
      },
      fieldsOfStudy: {
        type: 'array',
        items: { type: 'string' },
        description: 'Relevant degree fields, e.g. ["Computer Science", "Engineering"]',
      },
      careerSignal: {
        type: 'string',
        enum: ['promoted', 'role-change', 'redundancy', 'any'],
        description: 'Career event to filter on',
      },
      estimatedSize: {
        type: 'number',
        description: 'Estimated matched audience size',
      },
      rationale: {
        type: 'string',
        description: 'One sentence explaining why this audience is a strong match for this course',
      },
    },
    required: ['courseName', 'targetDescription', 'estimatedSize', 'rationale'],
  },
};

interface BuildSegmentInput {
  courseName: string;
  targetDescription: string;
  fieldsOfStudy?: string[];
  careerSignal?: string;
  estimatedSize: number;
  rationale: string;
}

function buildSegmentPayload(input: BuildSegmentInput) {
  const idempotencyKey = `seg-${Math.random().toString(36).slice(2, 10)}`;
  const now = new Date().toISOString();
  const emailConsent = Math.round(input.estimatedSize * 0.87);

  return {
    kind: 'agent_segment_campaign',
    generatedAt: now,
    course: input.courseName,
    audience: {
      description: input.targetDescription,
      fieldsOfStudy: input.fieldsOfStudy ?? [],
      careerSignal: input.careerSignal ?? 'any',
      estimatedSize: input.estimatedSize,
      emailConsent,
      rationale: input.rationale,
    },
    crmCampaign: {
      endpoint: 'https://api.dynamics.com/v9.2/campaigns',
      method: 'POST',
      body: {
        name: `UNSW Online · ${input.courseName} · agent-drafted`,
        description: `Auto-built by Marketing Intelligence agent. ${input.rationale}`,
        typecode: 1,
        statuscode: 0,
        prospectscountbase: input.estimatedSize,
        subject: `${input.courseName} — a course matched to your career trajectory`,
        customFields: {
          unsw_source: 'marketing-intelligence-agent',
          unsw_governed_by: 'UNSW policy v1.2',
          unsw_audience: input.targetDescription,
          unsw_created_at: now,
          unsw_idempotency_key: idempotencyKey,
        },
        note: 'Dynamics is the lead master — AEP will sync via the CRM→AEP connector after review.',
      },
    },
    aepSegment: {
      endpoint: 'https://platform.adobe.io/data/core/ups/segment/definitions',
      method: 'POST',
      body: {
        name: `UNSW Online · ${input.courseName} · ${input.careerSignal ?? 'any signal'}`,
        description: input.targetDescription,
        expression: {
          type: 'PQL',
          format: 'pql/text',
          value: [
            ...(input.fieldsOfStudy?.length
              ? [`education.fieldOfStudy IN ("${input.fieldsOfStudy.join('","')}")`]
              : []),
            ...(input.careerSignal && input.careerSignal !== 'any'
              ? [`careerSignals.type = "${input.careerSignal}"`]
              : []),
            `coursePurchases.mostRecentAt < now() - 1year OR coursePurchases IS NULL`,
          ].join('\nAND '),
        },
        profileInstances: { estimated: input.estimatedSize },
        tags: ['unsw-online', 'agent-built', 'lifelong-learning'],
      },
    },
    nextSteps: [
      'Review and approve the Dynamics campaign record',
      'Sync the AEP segment via the CRM→AEP connector',
      'Attach to an AJO journey for email delivery',
      'Set a hold-out group to measure real uplift',
    ],
  };
}

const SYSTEM_PROMPT = `You are the Marketing Intelligence assistant for UNSW Online's lifelong learning alumni engagement tool.

The tool has four tabs — Signals, Cohorts, Segments, and Course Intelligence — each with a live data view.

You have two tools available:

1. 'spotlight' — call it BEFORE narrating each section to move the presenter card to the relevant UI element. Targets: signalsFeed, cohortsChart, segmentsResult, ciReasoning, ciRecommendations.

2. 'build_segment' — call this whenever the user asks to launch a course, build a campaign, target an audience, or promote anything. Infer the audience from context; do not ask for clarification first. After calling it, briefly confirm what you built and why the audience is a strong fit.

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

  const history = sessions.get(sessionId) ?? [];
  const messages: MessageParam[] = [...history, { role: 'user', content: prompt }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        // Agentic loop — continues until stop_reason is 'end_turn'
        let iterations = 0;
        while (iterations < 8) {
          iterations++;

          // Track current tool_use accumulation across events
          let currentToolName = '';
          let currentToolId = '';
          let currentToolInput = '';
          let inToolUse = false;

          // client.messages.stream() gives us event iteration + .finalMessage()
          const sdkStream = client.messages.stream({
            model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: [SPOTLIGHT_TOOL, BUILD_SEGMENT_TOOL],
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
                let parsedInput: Record<string, string> = {};
                try {
                  parsedInput = JSON.parse(currentToolInput) as Record<string, string>;
                } catch {
                  // malformed input — skip
                }
                if (currentToolName === 'spotlight') {
                  send(
                    sse('spotlight', {
                      target: parsedInput['target'] ?? '',
                      tag: parsedInput['tag'] ?? '',
                    }),
                  );
                } else if (currentToolName === 'build_segment') {
                  const payload = buildSegmentPayload(parsedInput as unknown as BuildSegmentInput);
                  send(
                    sse('segment_built', {
                      title: `Campaign · ${parsedInput['courseName'] ?? 'New course'}`,
                      payload: JSON.stringify(payload),
                    }),
                  );
                  send(sse('tool_call', { name: 'build_segment ✓', input: '' }));
                } else {
                  send(
                    sse('tool_call', { name: currentToolName, input: currentToolInput }),
                  );
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
            // Return tool results and loop
            const toolResults: MessageParam['content'] = finalMessage.content
              .filter((b) => b.type === 'tool_use')
              .map((b) => ({
                type: 'tool_result' as const,
                tool_use_id: (b as { type: 'tool_use'; id: string }).id,
                content: 'ok',
              }));
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
