export interface StreamCallbacks {
  onThinkingSignal?: (phase: 'start' | 'end') => void;
  onText?: (text: string) => void;
  onToolCall?: (name: string, input: string) => void;
  onSpotlight?: (target: string, tag: string) => void;
  onError?: (message: string) => void;
}

function dispatch(frame: string, cb: StreamCallbacks): void {
  const event = /^event: (.*)$/m.exec(frame)?.[1];
  const dataRaw = /^data: (.*)$/m.exec(frame)?.[1];
  if (event === undefined || dataRaw === undefined) return;
  const data = JSON.parse(dataRaw) as Record<string, string>;
  switch (event) {
    case 'thinking_signal': {
      const phase = data['phase'];
      if (phase === 'start' || phase === 'end') cb.onThinkingSignal?.(phase);
      break;
    }
    case 'text_delta':
      cb.onText?.(data['text'] ?? '');
      break;
    case 'tool_call':
      cb.onToolCall?.(data['name'] ?? '', data['input'] ?? '');
      break;
    case 'spotlight':
      cb.onSpotlight?.(data['target'] ?? '', data['tag'] ?? '');
      break;
    case 'error':
      cb.onError?.(data['message'] ?? 'unknown error');
      break;
    default:
      break;
  }
}

export async function streamChat(
  prompt: string,
  sessionId: string,
  cb: StreamCallbacks,
): Promise<void> {
  const res = await fetch('/api/overlay-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, sessionId }),
  });
  if (!res.ok) {
    let message = `request failed: ${res.status}`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  if (res.body === null) throw new Error('no response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      dispatch(buffer.slice(0, idx), cb);
      buffer = buffer.slice(idx + 2);
    }
  }
}
