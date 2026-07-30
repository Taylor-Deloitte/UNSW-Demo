import { NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { getDataBundle } from '../../../lib/data';
import { createUnswMcpServer } from '../../../lib/agent/mcp-server';
import { SYSTEM_PROMPT } from '../../../lib/agent/system-prompt';
import { mapSdkMessageToEvents } from '../../../lib/agent/map-sdk-events';
import { setSession } from '../../../lib/agent/session-store';
import type { AgentEvent } from '../../../lib/agent/events';

interface ChatRequestBody {
  prompt: string;
  sessionId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as ChatRequestBody;
  const prompt = body.prompt?.trim();
  const resumeSessionId = body.sessionId;

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const bundle = await getDataBundle();
  const sessionIdForTools = resumeSessionId ?? `pending-${Date.now()}`;
  setSession(sessionIdForTools, {});
  const mcpServer = createUnswMcpServer(bundle, sessionIdForTools);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      try {
        const iter = query({
          prompt,
          options: {
            model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7',
            systemPrompt: SYSTEM_PROMPT,
            mcpServers: { 'unsw-marketing': mcpServer },
            allowedTools: [
              'mcp__unsw-marketing__query_dynamics',
              'mcp__unsw-marketing__query_aep',
              'mcp__unsw-marketing__query_linkedin',
              'mcp__unsw-marketing__create_aep_segment',
              'mcp__unsw-marketing__draft_ajo_campaign',
              'mcp__unsw-marketing__run_propensity_model',
            ],
            includePartialMessages: true,
            ...(resumeSessionId ? { resume: resumeSessionId } : {}),
          },
        });

        for await (const msg of iter) {
          for (const ev of mapSdkMessageToEvents(msg)) {
            send(ev);
          }
        }
        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message });
        send({ type: 'done' });
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
