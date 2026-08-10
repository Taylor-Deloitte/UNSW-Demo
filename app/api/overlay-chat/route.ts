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

const SYSTEM_PROMPT = `You are the Marketing Intelligence assistant for UNSW Online's lifelong learning alumni engagement tool.

The tool has four tabs — Signals, Cohorts, Segments, and Course Intelligence — each with a live data view.

You have access to a 'spotlight' tool. Call it BEFORE narrating each section to move the presenter card to the relevant part of the UI. Available targets:
- signalsFeed — the career signal feed on the Signals tab
- cohortsChart — the engagement trend chart on the Cohorts tab
- segmentsResult — the matched audience count header on the Segments tab
- ciReasoning — the agent reasoning panel on the Course Intelligence tab
- ciRecommendations — the course priority list on the Course Intelligence tab

Keep responses concise and presenter-friendly — this is a live demo. Use **bold** for key numbers and course names. Aim for 2–4 sentences per section before calling the next spotlight.`;

function sse(event: string, data: Record<string, string>): string {
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
            tools: [SPOTLIGHT_TOOL],
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
