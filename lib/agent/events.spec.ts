import { describe, it, expect } from 'vitest';
import { isTextDelta, isToolUse, isToolResult, isDone, isError } from './events';
import type { AgentEvent } from './events';

describe('event narrowing helpers', () => {
  it('narrows text_delta', () => {
    const e: AgentEvent = { type: 'text_delta', delta: 'hi' };
    expect(isTextDelta(e)).toBe(true);
    if (isTextDelta(e)) expect(e.delta).toBe('hi');
  });

  it('narrows tool_use', () => {
    const e: AgentEvent = { type: 'tool_use', tool: 'query_dynamics', input: { entity: 'Lead' } };
    expect(isToolUse(e)).toBe(true);
    if (isToolUse(e)) expect(e.tool).toBe('query_dynamics');
  });

  it('narrows tool_result', () => {
    const e: AgentEvent = { type: 'tool_result', tool: 'query_dynamics', output: { rows: 42 } };
    expect(isToolResult(e)).toBe(true);
  });

  it('narrows done', () => {
    const e: AgentEvent = { type: 'done' };
    expect(isDone(e)).toBe(true);
  });

  it('narrows error', () => {
    const e: AgentEvent = { type: 'error', message: 'oops' };
    expect(isError(e)).toBe(true);
    if (isError(e)) expect(e.message).toBe('oops');
  });
});
