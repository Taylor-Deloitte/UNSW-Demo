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

const TOUR_PINNED_LABEL = 'Signals → Cohorts → Segments → Course Intelligence';

const TOUR_PROMPT =
  'Walk me through this tool: 4 tabs, tight and conversational, like you\'re pointing at a screen with a CMO in the room. ' +
  'Spotlight each widget before you speak. Lead with the number or the insight, not with what the tab does. 2-3 sentences per tab, no filler.\n\n' +
  'Here\'s exactly what\'s live on screen right now:\n\n' +
  'Signals: 1,288 career moments detected this month across alumni: 418 promotions, 327 role changes, 256 course-profile gaps, 112 at redundancy risk. 214 are unactioned.\n\n' +
  'Cohorts: Mid-career (786 alumni) has fallen 22 points since June; it maps cleanly to when a new email template shipped. ' +
  'High-Signal (344 alumni) is at 71% engagement and still climbing. The divergence is the story.\n\n' +
  'Segments: CS grads, promoted, outside Sydney, in the last 12 months, not enrolled in 3+ years; that\'s exactly 340 alumni. Ready to contact.\n\n' +
  'Course Intelligence: AI for Leaders is #1: 214 matched alumni, 8.9% historical conversion, opportunity score 0.91. ' +
  'Two catalogue gaps: Platform Engineering (340 alumni, no existing course) and AI Ethics & Governance (520 alumni, no existing course).\n\n' +
  'Go tab by tab in that order. Be direct.';

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
  const voice = useVoice((text) => presenterRef.current?.appendText(text));
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

  // Queued through voice.enqueueAction so tab navigation happens in step with
  // narration instead of racing ahead of it (see hooks/useVoice.ts). Flushes the
  // previous tab's buffered narration first, so it's sent to TTS as one bulk chunk
  // (not per-sentence) before the next tab's navigation is queued behind it.
  const onSpotlight = useCallback(
    (target: string, tag: string) => {
      voice.flush();
      voice.enqueueAction(async () => {
        if (isPresenterWidgetId(target)) {
          const owningRoute = PRESENTER_WIDGET_ROUTES[target];
          if (owningRoute !== currentRouteRef.current) {
            currentRouteRef.current = owningRoute;
            router.push(owningRoute);
            await waitForElement(target);
          }
        }
        presenterRef.current?.beginStep(target, tag);
      });
    },
    [router, voice],
  );

  const runTour = useCallback(async () => {
    if (streaming || !sessionId) return;
    setStreaming(true);
    setPinned(TOUR_PINNED_LABEL);
    presenterRef.current?.reset(TOUR_PINNED_LABEL);
    voice.stop();

    try {
      await streamChat(TOUR_PROMPT, sessionId, 'brief', {
        onSpotlight,
        onText: (delta) => {
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
  }, [streaming, sessionId, voice, onSpotlight]);

  const onToggleBrief = useCallback(() => {
    if (mode === 'brief') {
      setMode('closed');
      return;
    }
    setMode('brief');
    void runTour();
  }, [mode, runTour]);

  return (
    <>
      {/* Brief + voice toggles — fixed top-right */}
      <div style={{ position: 'fixed', top: 16, right: 12, zIndex: 70, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onToggleBrief}
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
        <button
          type="button"
          onClick={voice.toggle}
          title={voice.enabled ? 'Voice on' : 'Voice off'}
          style={{
            padding: '7px 12px',
            border: '2px solid #000',
            background: voice.enabled ? '#FFD100' : '#fff',
            color: '#000',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {voice.enabled ? '🔊' : '🔇'}
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
    </>
  );
}
