'use client';

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '../lib/chat-stream';
import type { CoursePlanRecord } from '../lib/agent/session-store';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

function bold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

const PANEL_HEIGHT = 460;

export function CampaignPlannerChat({
  sessionId,
  onPlanSaved,
}: {
  sessionId: string;
  onPlanSaved: (plan: CoursePlanRecord) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const streamingTextRef = useRef('');

  const ask = useCallback(
    async (text: string) => {
      if (streaming || text.trim() === '' || !sessionId) return;
      setStreaming(true);
      streamingTextRef.current = '';
      setMessages((prev) => [...prev, { role: 'user', text }, { role: 'assistant', text: '' }]);

      const appendAssistantText = (delta: string) => {
        streamingTextRef.current += delta;
        setMessages((prev) => {
          const last = prev.length - 1;
          const m = prev[last];
          if (m === undefined || m.role !== 'assistant') return prev;
          const next = [...prev];
          next[last] = { ...m, text: streamingTextRef.current };
          return next;
        });
      };

      try {
        await streamChat(text, sessionId, 'campaign', {
          onText: appendAssistantText,
          onCampaignSaved: (plan) => onPlanSaved(plan as CoursePlanRecord),
          onError: (message) => appendAssistantText(`\n\n**Error:** ${message}`),
        });
      } finally {
        setStreaming(false);
      }
    },
    [streaming, sessionId, onPlanSaved],
  );

  const lastIsEmptyAssistant =
    streaming && messages.length > 0 && messages[messages.length - 1]?.text === '';

  return (
    <div
      className="flex flex-col"
      style={{ border: '2px solid #000', background: '#fff', height: PANEL_HEIGHT }}
    >
      <div
        className="text-ink flex-none"
        style={{
          fontSize: 16,
          fontWeight: 700,
          borderBottom: '2px solid #000',
          padding: '12px 18px',
        }}
      >
        Campaign planner
      </div>
      <div
        className="flex-1"
        style={{
          padding: '16px 18px',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
            Tell me which course to promote and what you&apos;re trying to achieve, and I&apos;ll size
            the audience, score propensity, and draft campaign variants grounded in real data.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              className="uppercase text-muted"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}
            >
              {m.role === 'user' ? 'You' : 'Campaign planner'}
            </div>
            {m.text.length > 0 ? (
              <div
                style={{ fontSize: 14, lineHeight: 1.6, color: '#000', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: bold(m.text) }}
              />
            ) : (
              i === messages.length - 1 &&
              lastIsEmptyAssistant && (
                <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
                  Thinking…
                </div>
              )
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = prompt.trim();
          if (!trimmed || streaming) return;
          void ask(trimmed);
          setPrompt('');
        }}
        className="flex-none"
        style={{ display: 'flex', borderTop: '2px solid #000' }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={streaming || !sessionId}
          placeholder={streaming ? 'Thinking…' : 'e.g. Build a campaign for AI for Leaders'}
          autoComplete="off"
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={streaming || !sessionId}
          className="bg-unsw-yellow text-ink"
          style={{
            padding: '12px 20px',
            border: 'none',
            borderLeft: '2px solid #000',
            fontSize: 13,
            fontWeight: 700,
            cursor: streaming ? 'not-allowed' : 'pointer',
            opacity: streaming ? 0.5 : 1,
          }}
        >
          {streaming ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
