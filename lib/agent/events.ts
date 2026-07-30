export type AgentEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'tool_use'; tool: string; input: unknown; toolUseId?: string }
  | { type: 'tool_result'; tool: string; output: unknown; toolUseId?: string; isError?: boolean }
  | { type: 'session_started'; sessionId: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function isTextDelta(e: AgentEvent): e is Extract<AgentEvent, { type: 'text_delta' }> {
  return e.type === 'text_delta';
}
export function isToolUse(e: AgentEvent): e is Extract<AgentEvent, { type: 'tool_use' }> {
  return e.type === 'tool_use';
}
export function isToolResult(e: AgentEvent): e is Extract<AgentEvent, { type: 'tool_result' }> {
  return e.type === 'tool_result';
}
export function isDone(e: AgentEvent): e is Extract<AgentEvent, { type: 'done' }> {
  return e.type === 'done';
}
export function isError(e: AgentEvent): e is Extract<AgentEvent, { type: 'error' }> {
  return e.type === 'error';
}
