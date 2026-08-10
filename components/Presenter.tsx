'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { computeCardPlacement, type CardPlacement } from '../lib/presenter/positioning';
import { PRESENTER_WIDGET_IDS, isPresenterWidgetId } from '../lib/presenter/widgets';
import type { PresenterStep } from '../lib/presenter/types';

const CARD_WIDTH = 372;

export interface PresenterHandle {
  beginStep(target: string, tag: string): void;
  appendText(text: string): void;
  appendTool(toolLabel: string): void;
  finish(): void;
  reset(pinnedQuestion: string): void;
  setReasoning(active: boolean): void;
}

export interface PresenterProps {
  pinnedQuestion: string;
  streamOpen: boolean;
  visible: boolean;
  hideText?: boolean; // present mode — voice reads text, card just shows spotlight progress
  onStepsChange?: (steps: readonly PresenterStep[]) => void;
}

const INTRO_STEP: PresenterStep = {
  target: null,
  tag: '',
  text: '',
  tools: [],
  revealed: true,
};

const bold = (s: string): string => s.replace(/\*\*(.+?)\*\*/g, '<b style="color:#000">$1</b>');

export const Presenter = forwardRef<PresenterHandle, PresenterProps>(function Presenter(
  { pinnedQuestion, streamOpen, visible, hideText = false, onStepsChange },
  ref,
) {
  const [steps, setSteps] = useState<PresenterStep[]>([INTRO_STEP]);
  const [current, setCurrent] = useState(0);
  const [reasoning, setReasoningState] = useState(false);
  const [placement, setPlacement] = useState<CardPlacement>({
    side: 'center',
    left: 0,
    top: 0,
    arrowOffset: 0,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const origShadow = useRef<Map<string, string>>(new Map());

  const reposition = useCallback(() => {
    const step = steps[current];
    const card = cardRef.current;
    if (step === undefined || card === null) return;
    const rect =
      step.target === null
        ? null
        : (() => {
            const el = document.getElementById(step.target);
            if (el === null) return null;
            const r = el.getBoundingClientRect();
            return {
              left: r.left,
              top: r.top,
              right: r.right,
              bottom: r.bottom,
              cx: (r.left + r.right) / 2,
              cy: (r.top + r.bottom) / 2,
            };
          })();
    const next = computeCardPlacement(
      rect,
      { vw: window.innerWidth, vh: window.innerHeight, streamOpen },
      { cw: card.offsetWidth || CARD_WIDTH, ch: card.offsetHeight || 280 },
    );
    setPlacement(next);
  }, [steps, current, streamOpen]);

  // Spotlight application
  useEffect(() => {
    const step = steps[current];
    if (step === undefined) return;
    const active = visible ? step.target : null;
    for (const id of PRESENTER_WIDGET_IDS) {
      const el = document.getElementById(id);
      if (el === null) continue;
      if (!origShadow.current.has(id)) origShadow.current.set(id, el.style.boxShadow || '');
      const orig = origShadow.current.get(id) ?? '';
      if (active === null) {
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
        el.style.boxShadow = orig;
      } else if (id === active) {
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'scale(1.01)';
        el.style.boxShadow = '0 0 0 2px #FFD100, 0 22px 55px -20px rgba(255,209,0,0.4)';
      } else {
        el.style.opacity = '0.3';
        el.style.filter = 'saturate(0.4)';
        el.style.transform = 'none';
        el.style.boxShadow = orig;
      }
    }
    if (active !== null) {
      const target = document.getElementById(active);
      const main = document.querySelector('main');
      if (target !== null && main !== null) {
        const r = target.getBoundingClientRect();
        const mr = main.getBoundingClientRect();
        if (r.top < mr.top + 70 || r.bottom > mr.bottom - 20) {
          main.scrollTo({ top: main.scrollTop + (r.top - mr.top) - 100, behavior: 'smooth' });
        }
      }
    }
    requestAnimationFrame(reposition);
    const t = window.setTimeout(reposition, 540);
    return () => window.clearTimeout(t);
  }, [steps, current, reposition, visible]);

  useEffect(() => {
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    const t = window.setTimeout(reposition, 430);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
    };
  }, [streamOpen, reposition]);

  useEffect(() => {
    onStepsChange?.(steps);
  }, [steps, onStepsChange]);

  useImperativeHandle(ref, () => ({
    beginStep(target, tag) {
      if (!isPresenterWidgetId(target)) {
        setSteps((prev) => [...prev, { target: null, tag, text: '', tools: [], revealed: false }]);
        setCurrent((c) => c + 1);
        return;
      }
      setSteps((prev) => [...prev, { target, tag, text: '', tools: [], revealed: false }]);
      setCurrent((c) => c + 1);
    },
    appendText(text) {
      setSteps((prev) => {
        const last = prev.length - 1;
        const step = prev[last];
        if (step === undefined) return prev;
        const next = [...prev];
        next[last] = { ...step, text: step.text + text, revealed: true };
        return next;
      });
    },
    appendTool(toolLabel) {
      setSteps((prev) => {
        const last = prev.length - 1;
        const step = prev[last];
        if (step === undefined) return prev;
        const next = [...prev];
        next[last] = { ...step, tools: [...step.tools, toolLabel] };
        return next;
      });
    },
    finish() {},
    reset(_pinnedQuestion) {
      setSteps([INTRO_STEP]);
      setCurrent(0);
    },
    setReasoning(active) {
      setReasoningState(active);
    },
  }));

  const step = steps[current] ?? INTRO_STEP;
  const total = steps.length;

  return (
    <div
      ref={cardRef}
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        zIndex: 50,
        left: placement.left,
        top: placement.top,
        width: CARD_WIDTH,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        border: '2px solid #000',
        padding: '16px 18px 14px',
        boxShadow: '0 22px 60px -18px rgba(0,0,0,0.35)',
        transition:
          'top .85s cubic-bezier(.6,.01,.2,1), left .85s cubic-bezier(.6,.01,.2,1), opacity .25s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      {placement.side !== 'center' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            background: 'rgba(255,255,255,0.92)',
            border: '2px solid #000',
            transform: 'rotate(45deg)',
            ...(placement.side === 'left' ? { left: -8, top: placement.arrowOffset } : {}),
            ...(placement.side === 'right' ? { right: -8, top: placement.arrowOffset } : {}),
            ...(placement.side === 'top' ? { top: -8, left: placement.arrowOffset } : {}),
            ...(placement.side === 'bottom' ? { bottom: -8, left: placement.arrowOffset } : {}),
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            aria-hidden
            style={{
              width: 28,
              height: 28,
              background: '#FFD100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.unsw.edu.au/content/dam/images/graphics/logos/unsw/unsw_0.png"
              alt=""
              style={{ height: 18, width: 'auto' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#000' }}>
              Marketing Intelligence
            </div>
            <div style={{ fontSize: 10, color: '#55565a', fontFamily: 'monospace' }}>
              presenting · demo data
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#55565a', fontFamily: 'monospace' }}>
          {current + 1} / {total}
        </div>
      </div>

      {/* Pinned question */}
      <div
        style={{
          fontSize: 11,
          color: '#55565a',
          fontStyle: 'italic',
          padding: '7px 10px',
          marginBottom: 10,
          background: '#f4f4f4',
          borderLeft: '3px solid #FFD100',
        }}
      >
        &ldquo;{pinnedQuestion}&rdquo;
      </div>

      {/* Body */}
      <div style={{ minHeight: 64 }}>
        {step.revealed && step.text.length > 0 && !hideText ? (
          <div style={{ animation: 'fadeUp .45s ease both' }}>
            {step.tag.length > 0 && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#55565a',
                  margin: '0 0 5px',
                  fontFamily: 'monospace',
                }}
              >
                ▸ {step.tag}
              </div>
            )}
            <div
              style={{ fontSize: 14, lineHeight: 1.6, color: '#000' }}
              dangerouslySetInnerHTML={{ __html: bold(step.text) }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: '#55565a',
              fontSize: 13,
              fontStyle: 'italic',
              padding: '8px 2px',
              animation: 'tpulse 1.4s ease-in-out infinite',
            }}
          >
            <span
              aria-hidden
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD100', border: '1px solid #000' }}
            />
            {reasoning ? 'Reasoning…' : step.tag.length > 0 ? `Looking at ${step.tag}…` : 'Ready.'}
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 4, margin: '14px 0 10px' }}>
        {steps.map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 3,
              background: i <= current ? '#FFD100' : '#e0e0e0',
              transition: 'background .4s ease',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="bg-paper text-ink"
          style={{
            padding: '8px 13px',
            border: '2px solid #000',
            fontSize: 12,
            fontWeight: 600,
            cursor: current === 0 ? 'not-allowed' : 'pointer',
            opacity: current === 0 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          disabled
          style={{
            flex: 1,
            padding: '8px 13px',
            border: 'none',
            background: '#FFD100',
            color: '#000',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          live
        </button>
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          disabled={current >= steps.length - 1}
          className="bg-paper text-ink"
          style={{
            padding: '8px 13px',
            border: '2px solid #000',
            fontSize: 12,
            fontWeight: 600,
            cursor: current >= steps.length - 1 ? 'not-allowed' : 'pointer',
            opacity: current >= steps.length - 1 ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
});
