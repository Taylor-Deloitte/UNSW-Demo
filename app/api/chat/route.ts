import { NextResponse } from 'next/server';

/**
 * SSE stub. Emits a canned stream shaped to match a future Claude Agent SDK
 * mapping (see docs/03-AGENT-LAYER.md). Not wired to the UI yet.
 */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { prompt?: string };
  const prompt = body.prompt ?? '';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: 'text_delta', delta: 'Looking across Dynamics and AEP...' });
      await sleep(400);
      send({
        type: 'tool_use',
        tool: 'query_dynamics',
        input: { entity: 'Lead', prompt },
      });
      await sleep(600);
      send({
        type: 'tool_result',
        tool: 'query_dynamics',
        output: { rows: 340 },
      });
      await sleep(300);
      send({
        type: 'text_delta',
        delta: ' I found 340 alumni matching. (canned scaffolding response)',
      });
      send({ type: 'done' });
      controller.close();
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
