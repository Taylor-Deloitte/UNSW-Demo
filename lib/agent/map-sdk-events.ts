import type { AgentEvent } from './events';

export function mapSdkMessageToEvents(msg: unknown): AgentEvent[] {
  if (!msg || typeof msg !== 'object') return [];
  const m = msg as Record<string, unknown>;
  const t = m.type;

  if (t === 'system' && m.subtype === 'init') {
    const sessionId = typeof m.session_id === 'string' ? m.session_id : undefined;
    return sessionId ? [{ type: 'session_started', sessionId }] : [];
  }

  if (t === 'stream_event') {
    const ev = m.event as Record<string, unknown> | undefined;
    if (!ev) return [];
    if (ev.type === 'content_block_delta') {
      const delta = ev.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        return [{ type: 'text_delta', delta: delta.text }];
      }
      if (delta?.type === 'thinking_delta' && typeof delta.thinking === 'string') {
        return [{ type: 'thinking_delta', delta: delta.thinking }];
      }
    }
    return [];
  }

  if (t === 'assistant') {
    const message = m.message as Record<string, unknown> | undefined;
    const content = (message?.content as unknown[] | undefined) ?? [];
    const out: AgentEvent[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_use' && typeof b.name === 'string') {
        out.push({
          type: 'tool_use',
          tool: normalizeToolName(b.name),
          input: b.input ?? {},
          toolUseId: typeof b.id === 'string' ? b.id : undefined,
        });
      }
    }
    return out;
  }

  if (t === 'user') {
    const message = m.message as Record<string, unknown> | undefined;
    const content = (message?.content as unknown[] | undefined) ?? [];
    const out: AgentEvent[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const b = block as Record<string, unknown>;
      if (b.type === 'tool_result') {
        out.push({
          type: 'tool_result',
          tool: 'unknown',
          output: b.content ?? null,
          toolUseId: typeof b.tool_use_id === 'string' ? b.tool_use_id : undefined,
          isError: b.is_error === true,
        });
      }
    }
    return out;
  }

  if (t === 'result') {
    if (m.subtype === 'error') {
      const errMsg = typeof m.error === 'string' ? m.error : 'agent error';
      return [{ type: 'error', message: errMsg }, { type: 'done' }];
    }
    return [{ type: 'done' }];
  }

  return [];
}

function normalizeToolName(name: string): string {
  const match = /^mcp__[^_]+__(.+)$/.exec(name);
  return match ? match[1] : name;
}
