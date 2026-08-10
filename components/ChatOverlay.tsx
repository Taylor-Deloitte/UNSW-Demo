'use client';

import { useCallback, useRef, useState } from 'react';
import { streamChat } from '../lib/chat-stream';
import { useSessionId } from '../hooks/useSessionId';
import { useVoice } from '../hooks/useVoice';
import { Presenter, type PresenterHandle } from './Presenter';
import { BaselineStream, BASELINE_STREAM_WIDTH } from './BaselineStream';
import type { PresenterStep } from '../lib/presenter/types';

type Mode = 'closed' | 'chat' | 'present';

export function ChatOverlay() {
  const [mode, setMode] = useState<Mode>('closed');
  const [streaming, setStreaming] = useState(false);
  const [pinned, setPinned] = useState('');
  const [steps, setSteps] = useState<readonly PresenterStep[]>([]);
  const presenterRef = useRef<PresenterHandle>(null);
  const sessionId = useSessionId();
  const voice = useVoice();

  const switchMode = useCallback(
    (next: Mode) => {
      setMode((prev) => (prev === next ? 'closed' : next));
    },
    [],
  );

  const ask = useCallback(
    async (prompt: string) => {
      if (streaming || prompt.trim() === '' || !sessionId) return;
      setStreaming(true);
      setPinned(prompt);
      presenterRef.current?.reset(prompt);
      voice.stop();

      try {
        await streamChat(prompt, sessionId, {
          onSpotlight: (target, tag) => presenterRef.current?.beginStep(target, tag),
          onText: (delta) => {
            presenterRef.current?.appendText(delta);
            voice.onDelta(delta);
          },
          onToolCall: (name, input) =>
            presenterRef.current?.appendTool(`${name} · ${input.slice(0, 40)}`),
          onThinkingSignal: (phase) => presenterRef.current?.setReasoning(phase === 'start'),
          onError: (message) => presenterRef.current?.appendText(`\n\n**Error:** ${message}`),
        });
      } finally {
        presenterRef.current?.finish();
        setStreaming(false);
        voice.flush();
      }
    },
    [streaming, sessionId, voice],
  );

  const streamOpen = mode === 'chat';

  return (
    <>
      {/* Mode toggle buttons — fixed top-right */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: mode === 'chat' ? BASELINE_STREAM_WIDTH + 12 : 12,
          zIndex: 70,
          display: 'flex',
          gap: 0,
          transition: 'right .3s ease',
        }}
      >
        <ModeButton
          label="Chat"
          icon="💬"
          active={mode === 'chat'}
          onClick={() => switchMode('chat')}
          side="left"
        />
        <ModeButton
          label="Present"
          icon="▶"
          active={mode === 'present'}
          onClick={() => switchMode('present')}
          side="right"
        />
      </div>

      {/* Presenter card — always mounted so the ref stays live, but only visible in present mode */}
      <Presenter
        ref={presenterRef}
        pinnedQuestion={pinned}
        streamOpen={streamOpen}
        visible={mode === 'present' && (streaming || steps.length > 1)}
        hideText={mode === 'present'}
        onStepsChange={setSteps}
      />

      {/* Baseline stream sidebar — chat mode only */}
      {mode === 'chat' && (
        <BaselineStream
          pinnedQuestion={pinned}
          steps={steps}
          streaming={streaming}
          voiceEnabled={voice.enabled}
          onToggleVoice={voice.toggle}
          onSubmit={ask}
          onClose={() => setMode('closed')}
        />
      )}

      {/* Present mode: floating send box so user can type a question */}
      {mode === 'present' && (
        <PresentModeComposer
          streaming={streaming}
          voiceEnabled={voice.enabled}
          onToggleVoice={voice.toggle}
          onSubmit={ask}
        />
      )}
    </>
  );
}

function ModeButton({
  label,
  icon,
  active,
  onClick,
  side,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  side: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 13px',
        border: '2px solid #000',
        borderRight: side === 'left' ? '1px solid #000' : '2px solid #000',
        borderLeft: side === 'right' ? '1px solid #000' : '2px solid #000',
        background: active ? '#FFD100' : '#fff',
        color: '#000',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'background .15s ease',
      }}
    >
      <span style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </button>
  );
}

function PresentModeComposer({
  streaming,
  voiceEnabled,
  onToggleVoice,
  onSubmit,
}: {
  streaming: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onSubmit: (prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (!trimmed || streaming) return;
        onSubmit(trimmed);
        setPrompt('');
      }}
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        gap: 0,
        width: 560,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
    >
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={streaming}
        placeholder={streaming ? 'Speaking…' : 'Ask about the alumni data…'}
        autoComplete="off"
        style={{
          flex: 1,
          padding: '11px 16px',
          border: '2px solid #000',
          borderRight: 'none',
          fontSize: 14,
          fontFamily: 'inherit',
          background: '#fff',
        }}
      />
      <button
        type="button"
        onClick={onToggleVoice}
        title={voiceEnabled ? 'Voice on' : 'Voice off'}
        style={{
          padding: '11px 13px',
          border: '2px solid #000',
          borderRight: 'none',
          background: voiceEnabled ? '#FFD100' : '#fff',
          color: '#000',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {voiceEnabled ? '🔊' : '🔇'}
      </button>
      <button
        type="submit"
        disabled={streaming}
        style={{
          padding: '11px 18px',
          border: '2px solid #000',
          background: streaming ? '#e0e0e0' : '#000',
          color: streaming ? '#55565a' : '#FFD100',
          fontSize: 13,
          fontWeight: 700,
          cursor: streaming ? 'not-allowed' : 'pointer',
        }}
      >
        {streaming ? '…' : 'Ask'}
      </button>
    </form>
  );
}
