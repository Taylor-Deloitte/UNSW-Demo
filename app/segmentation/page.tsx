'use client';

import { useMemo } from 'react';
import { useAgentChat } from '../../hooks/useAgentChat';
import { extractSegment } from '../../lib/agent/extract-segment';
import { SegmentPromptInput } from '../../components/SegmentPromptInput';
import { SegmentResultTable } from '../../components/SegmentResultTable';
import { SegmentActionsBar } from '../../components/SegmentActionsBar';
import { AgentPlanCard } from '../../components/AgentPlanCard';

export default function SegmentationPage() {
  const { messages, busy, send } = useAgentChat();
  const segment = useMemo(() => extractSegment(messages), [messages]);

  function handlePrompt(prompt: string) {
    // Prepend a nudge so the agent uses the right tools for segment building
    const augmented = `Build an audience segment based on this request: "${prompt}". Use query_aep or query_dynamics to identify the audience, and run_propensity_model if there's a course to rank against. Return a specific list of alumni, not a summary.`;
    void send(augmented);
  }

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-unsw-navy">
          Segmentation + Campaign
        </h1>
        <p className="mt-1 text-unsw-slate">
          Natural-language segment building across Dynamics + AEP + LinkedIn. One click to save to AEP
          or draft a campaign in AJO.
        </p>
      </header>

      <SegmentPromptInput onSubmit={handlePrompt} busy={busy} />

      {messages.length > 0 && <AgentPlanCard messages={messages} busy={busy} />}

      {segment && (
        <>
          <SegmentResultTable segment={segment} />
          <SegmentActionsBar
            segment={segment}
            busy={busy}
            onFollowUp={(p) => void send(p)}
          />
        </>
      )}
    </section>
  );
}
