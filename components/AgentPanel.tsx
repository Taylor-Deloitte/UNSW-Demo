'use client';

import { useState } from 'react';
import { useAgentChat } from '../hooks/useAgentChat';

export function AgentPanel() {
  const { messages, busy, send } = useAgentChat();
  const [input, setInput] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const p = input;
    setInput('');
    await send(p);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-unsw-navy/10 px-4 py-3">
        <div className="text-sm font-semibold text-unsw-navy">Agent</div>
        <div className="text-xs text-unsw-slate">Ask about alumni, cohorts, segments</div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
        {messages.length === 0 && (
          <div className="text-unsw-slate/70">
            Try: &quot;Who&apos;s a good target for AI for Leaders?&quot;
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-1">
            <div
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[85%] rounded-lg bg-unsw-navy px-3 py-2 text-white'
                  : 'max-w-[85%] whitespace-pre-wrap rounded-lg bg-unsw-mist px-3 py-2 text-unsw-navy'
              }
            >
              {m.text || (m.role === 'agent' && busy ? '…' : '')}
            </div>
            {m.toolCalls.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.toolCalls.map((tc, i) => (
                  <span
                    key={i}
                    className={
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ' +
                      (tc.status === 'done'
                        ? 'border-green-500 text-green-700'
                        : 'animate-pulse border-unsw-slate text-unsw-slate')
                    }
                  >
                    <span className="font-mono">{tc.tool}</span>
                    <span>{tc.status === 'done' ? '✓' : '...'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-unsw-navy/10 p-3">
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent..."
            disabled={busy}
            className="flex-1 rounded-md border border-unsw-navy/20 px-3 py-2 text-sm focus:border-unsw-navy focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-unsw-navy px-3 py-2 text-sm font-medium text-white hover:bg-unsw-navy/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
