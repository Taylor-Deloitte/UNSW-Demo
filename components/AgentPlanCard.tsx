import type { ChatMessage } from '../hooks/useAgentChat';

export function AgentPlanCard({ messages, busy }: { messages: ChatMessage[]; busy: boolean }) {
  if (messages.length === 0) return null;

  const agentMessages = messages.filter((m) => m.role === 'agent');

  return (
    <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-unsw-navy">Agent plan</div>
        {busy && <span className="text-xs text-unsw-slate">Working…</span>}
      </div>
      <div className="space-y-3 text-sm">
        {agentMessages.map((m) => (
          <div key={m.id}>
            {m.toolCalls.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
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
            {m.text && (
              <div className="whitespace-pre-wrap text-unsw-navy">{m.text}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
