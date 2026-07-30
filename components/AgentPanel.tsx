'use client';

import { useState } from 'react';

export function AgentPanel() {
  const [messages, setMessages] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);
  const [input, setInput] = useState('');

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    // TODO wire to /api/chat SSE
    setMessages((m) => [
      ...m,
      { role: 'agent', text: '(agent stream not wired — this is a scaffolding placeholder)' },
    ]);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-unsw-navy/10 px-4 py-3">
        <div className="text-sm font-semibold text-unsw-navy">Agent</div>
        <div className="text-xs text-unsw-slate">Ask about alumni, cohorts, segments</div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
        {messages.length === 0 && (
          <div className="text-unsw-slate/70">Try: "Who's a good target for AI for Leaders?"</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-lg bg-unsw-navy px-3 py-2 text-white'
                : 'max-w-[85%] rounded-lg bg-unsw-mist px-3 py-2 text-unsw-navy'
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="border-t border-unsw-navy/10 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent..."
            className="flex-1 rounded-md border border-unsw-navy/20 px-3 py-2 text-sm focus:border-unsw-navy focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-unsw-navy px-3 py-2 text-sm font-medium text-white hover:bg-unsw-navy/90"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
