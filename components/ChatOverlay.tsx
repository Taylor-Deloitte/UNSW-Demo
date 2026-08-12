'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { streamChat } from '../lib/chat-stream';
import { useSessionId } from '../hooks/useSessionId';
import { useVoice } from '../hooks/useVoice';
import { Presenter, type PresenterHandle } from './Presenter';
import { isPresenterWidgetId } from '../lib/presenter/widgets';
import { PRESENTER_WIDGET_ROUTES } from '../lib/presenter/widget-routes';
import type { PresenterStep } from '../lib/presenter/types';

type Mode = 'closed' | 'brief';

// Polls for a DOM node rather than relying on a fixed delay after navigation,
// since Next.js client-side route transitions don't resolve to a fixed timing.
function waitForElement(id: string, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id) !== null) {
      resolve();
      return;
    }
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (document.getElementById(id) !== null || Date.now() - start > timeoutMs) {
        window.clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

export function ChatOverlay() {
  const [mode, setMode] = useState<Mode>('closed');
  const [streaming, setStreaming] = useState(false);
  const [pinned, setPinned] = useState('');
  const [steps, setSteps] = useState<readonly PresenterStep[]>([]);
  const presenterRef = useRef<PresenterHandle>(null);
  const sessionId = useSessionId();
  const voice = useVoice();
  const router = useRouter();
  const pathname = usePathname();

  // Tracks the route the browser is actually on. Synced from usePathname() on real
  // navigation, but also updated optimistically the instant we call router.push() —
  // usePathname() only reflects the new route after a render some time later, which
  // would otherwise be stale for a second spotlight call issued before that render.
  const currentRouteRef = useRef(pathname);
  useEffect(() => {
    currentRouteRef.current = pathname;
  }, [pathname]);

  const onSpotlight = useCallback(
    async (target: string, tag: string) => {
      if (isPresenterWidgetId(target)) {
        const owningRoute = PRESENTER_WIDGET_ROUTES[target];
        if (owningRoute !== currentRouteRef.current) {
          currentRouteRef.current = owningRoute;
          router.push(owningRoute);
          await waitForElement(target);
        }
      }
      presenterRef.current?.beginStep(target, tag);
    },
    [router],
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'brief' ? 'closed' : 'brief'));
  }, []);

  const ask = useCallback(
    async (prompt: string) => {
      if (streaming || prompt.trim() === '' || !sessionId) return;
      setStreaming(true);
      setPinned(prompt);
      presenterRef.current?.reset(prompt);
      voice.stop();

      try {
        await streamChat(prompt, sessionId, 'brief', {
          onSpotlight,
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
    [streaming, sessionId, voice, onSpotlight],
  );

  return (
    <>
      {/* Brief toggle — fixed top-right */}
      <div style={{ position: 'fixed', top: 16, right: 12, zIndex: 70 }}>
        <button
          type="button"
          onClick={toggleMode}
          style={{
            padding: '7px 14px',
            border: '2px solid #000',
            background: mode === 'brief' ? '#FFD100' : '#fff',
            color: '#000',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background .15s ease',
          }}
        >
          <span style={{ fontSize: 13 }}>✨</span>
          Brief
        </button>
      </div>

      {/* Presenter card — always mounted so the ref stays live, visible only while briefing */}
      <Presenter
        ref={presenterRef}
        pinnedQuestion={pinned}
        streamOpen={false}
        visible={mode === 'brief' && (streaming || steps.length > 1)}
        onStepsChange={setSteps}
      />

      {mode === 'brief' && (
        <BriefComposer
          streaming={streaming}
          voiceEnabled={voice.enabled}
          onToggleVoice={voice.toggle}
          onSubmit={ask}
        />
      )}
    </>
  );
}

function BriefComposer({
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
        placeholder={streaming ? 'Speaking…' : 'Ask for a briefing on the alumni data…'}
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
