'use client';

import { useCallback, useRef, useState } from 'react';
import type { AgentEvent } from '../lib/agent/events';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  toolCalls: Array<{
    tool: string;
    input: unknown;
    toolUseId?: string;
    status: 'running' | 'done';
  }>;
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | undefined>(undefined);

  const send = useCallback(async (prompt: string) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: prompt,
      toolCalls: [],
    };
    const agentMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'agent',
      text: '',
      toolCalls: [],
    };
    setMessages((m) => [...m, userMsg, agentMsg]);
    setBusy(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId: sessionIdRef.current }),
    });

    if (!res.ok || !res.body) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentMsg.id ? { ...msg, text: `[error: ${res.status}]` } : msg,
        ),
      );
      setBusy(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        const raw = part.slice(6);
        let ev: AgentEvent;
        try {
          ev = JSON.parse(raw) as AgentEvent;
        } catch {
          continue;
        }
        applyEvent(agentMsg.id, ev, setMessages, sessionIdRef);
        if (ev.type === 'done') {
          setBusy(false);
          return;
        }
      }
    }
    setBusy(false);
  }, []);

  return { messages, busy, send };
}

function applyEvent(
  agentMsgId: string,
  ev: AgentEvent,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  sessionIdRef: React.MutableRefObject<string | undefined>,
) {
  if (ev.type === 'session_started') {
    sessionIdRef.current = ev.sessionId;
    return;
  }
  if (ev.type === 'text_delta') {
    setMessages((m) =>
      m.map((msg) => (msg.id === agentMsgId ? { ...msg, text: msg.text + ev.delta } : msg)),
    );
    return;
  }
  if (ev.type === 'tool_use') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId
          ? {
              ...msg,
              toolCalls: [
                ...msg.toolCalls,
                { tool: ev.tool, input: ev.input, toolUseId: ev.toolUseId, status: 'running' },
              ],
            }
          : msg,
      ),
    );
    return;
  }
  if (ev.type === 'tool_result') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId
          ? {
              ...msg,
              toolCalls: msg.toolCalls.map((tc) =>
                tc.toolUseId === ev.toolUseId ? { ...tc, status: 'done' } : tc,
              ),
            }
          : msg,
      ),
    );
    return;
  }
  if (ev.type === 'error') {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentMsgId ? { ...msg, text: msg.text + `\n[error: ${ev.message}]` } : msg,
      ),
    );
  }
}
