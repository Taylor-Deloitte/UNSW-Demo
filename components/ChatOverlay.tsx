'use client';

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '../lib/chat-stream';
import { useSessionId } from '../hooks/useSessionId';
import { useVoice } from '../hooks/useVoice';
import { Presenter, type PresenterHandle } from './Presenter';
import { BaselineStream, BASELINE_STREAM_WIDTH } from './BaselineStream';
import type { PresenterStep } from '../lib/presenter/types';

export function ChatOverlay() {
  const [open, setOpen] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [pinned, setPinned] = useState('');
  const [steps, setSteps] = useState<readonly PresenterStep[]>([]);
  const presenterRef = useRef<PresenterHandle>(null);
  const sessionId = useSessionId();
  const { enabled: voiceEnabled, toggle: toggleVoice, speak } = useVoice();

  const ask = useCallback(
    async (prompt: string) => {
      if (streaming || prompt.trim() === '' || !sessionId) return;
      setStreaming(true);
      setOpen(true);
      setPinned(prompt);
      presenterRef.current?.reset(prompt);

      // Collect full text for voice-over
      let fullText = '';

      try {
        await streamChat(prompt, sessionId, {
          onSpotlight: (target, tag) => presenterRef.current?.beginStep(target, tag),
          onText: (delta) => {
            presenterRef.current?.appendText(delta);
            fullText += delta;
          },
          onToolCall: (name, input) =>
            presenterRef.current?.appendTool(`${name} · ${input.slice(0, 40)}`),
          onThinkingSignal: (phase) => presenterRef.current?.setReasoning(phase === 'start'),
          onError: (message) => presenterRef.current?.appendText(`\n\n**Error:** ${message}`),
        });
      } finally {
        presenterRef.current?.finish();
        setStreaming(false);
        // Speak the full response after streaming completes
        if (fullText.trim()) void speak(fullText);
      }
    },
    [streaming, sessionId, speak],
  );

  return (
    <>
      {/* Fixed toggle button — top-right, above the nav */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          top: 16,
          right: open ? BASELINE_STREAM_WIDTH + 16 : 16,
          zIndex: 70,
          padding: '7px 14px',
          border: '2px solid #000',
          background: open ? '#FFD100' : '#fff',
          color: '#000',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'right .3s ease, background .15s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden style={{ fontSize: 14 }}>
          {open ? '✕' : '💬'}
        </span>
        {open ? 'Close' : 'Ask MI'}
      </button>

      {open && (
        <>
          <Presenter
            ref={presenterRef}
            pinnedQuestion={pinned}
            streamOpen={open}
            visible={streaming}
            onStepsChange={setSteps}
          />
          <BaselineStream
            pinnedQuestion={pinned}
            steps={steps}
            streaming={streaming}
            voiceEnabled={voiceEnabled}
            onToggleVoice={toggleVoice}
            onSubmit={ask}
            onClose={() => setOpen(false)}
          />
        </>
      )}
    </>
  );
}
