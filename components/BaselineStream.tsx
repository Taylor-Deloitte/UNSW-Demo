'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { PresenterStep } from '../lib/presenter/types';

export interface BaselineStreamProps {
  pinnedQuestion: string;
  steps: readonly PresenterStep[];
  streaming: boolean;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onSubmit: (prompt: string) => void;
  onClose: () => void;
}

export const BASELINE_STREAM_WIDTH = 384;

const bold = (s: string): string => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid #1ac987',
  background: '#fff',
  color: '#0d7a54',
  fontFamily: 'monospace',
  fontSize: 10,
  padding: '2px 8px',
  margin: '3px 6px 3px 0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

export function BaselineStream({
  pinnedQuestion,
  steps,
  streaming,
  voiceEnabled,
  onToggleVoice,
  onSubmit,
  onClose,
}: BaselineStreamProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [steps]);

  return (
    <aside
      style={{
        position: 'fixed',
        zIndex: 60,
        top: 0,
        right: 0,
        height: '100vh',
        width: BASELINE_STREAM_WIDTH,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        borderLeft: '1px solid #e0e0e0',
        boxShadow: '-24px 0 60px -28px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #e0e0e0',
          background: '#000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.unsw.edu.au/content/dam/images/graphics/logos/unsw/unsw_0.png"
            alt="UNSW"
            style={{ height: 22, width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>
              Marketing Intelligence
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
              full transcript · demo data
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Voice on — click to mute' : 'Voice off — click to enable'}
            style={{
              padding: '5px 10px',
              border: voiceEnabled ? '2px solid #FFD100' : '1px solid rgba(255,255,255,0.3)',
              background: voiceEnabled ? '#FFD100' : 'transparent',
              color: voiceEnabled ? '#000' : 'rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '5px 10px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 20,
          overflowWrap: 'break-word',
        }}
      >
        {pinnedQuestion && (
          <div
            style={{
              margin: '0 0 16px auto',
              maxWidth: '84%',
              width: 'fit-content',
              background: '#000',
              color: '#fff',
              borderRadius: '0',
              padding: '10px 14px',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {pinnedQuestion}
          </div>
        )}
        <div
          style={{
            fontFamily: 'monospace',
            color: '#55565a',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            margin: '0 0 12px',
          }}
        >
          Marketing Intelligence
        </div>

        {steps.map((step, i) => {
          const isCur = i === steps.length - 1 && streaming;
          return (
            <div
              key={i}
              style={{
                margin: '0 0 16px',
                padding: isCur ? '10px 12px' : 0,
                background: isCur ? 'rgba(255,209,0,0.08)' : 'transparent',
                borderLeft: isCur ? '3px solid #FFD100' : undefined,
              }}
            >
              {step.tools.length > 0 && (
                <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap' }}>
                  {step.tools.map((t, ti) => (
                    <span key={ti} style={chipStyle}>
                      <span
                        aria-hidden
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          background: '#1ac987',
                          marginRight: 5,
                          flexShrink: 0,
                        }}
                      />
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {step.revealed ? (
                <>
                  {step.tag.length > 0 && (
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: '#55565a',
                        margin: '0 0 4px',
                      }}
                    >
                      ▸ {step.tag}
                    </div>
                  )}
                  <div
                    style={{ fontSize: 13, lineHeight: 1.6, color: '#000' }}
                    dangerouslySetInnerHTML={{ __html: bold(step.text) }}
                  />
                </>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#55565a',
                    fontSize: 12,
                    fontStyle: 'italic',
                    animation: 'tpulse 1.4s ease-in-out infinite',
                  }}
                >
                  <span
                    aria-hidden
                    style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFD100', border: '1px solid #000' }}
                  />
                  {step.tag.length > 0 ? `Looking at ${step.tag}…` : 'Reasoning…'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = prompt.trim();
          if (trimmed === '' || streaming) return;
          onSubmit(trimmed);
          setPrompt('');
        }}
        style={{
          flex: 'none',
          padding: '12px 14px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={streaming}
          placeholder="Ask about the alumni data…"
          autoComplete="off"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #e0e0e0',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          disabled={streaming}
          style={{
            padding: '8px 14px',
            border: 'none',
            background: streaming ? '#e0e0e0' : '#FFD100',
            color: '#000',
            fontSize: 13,
            fontWeight: 700,
            cursor: streaming ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </form>

      {/* Footer */}
      <div
        style={{
          flex: 'none',
          padding: '10px 18px',
          borderTop: '1px solid #e0e0e0',
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#8f9296',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}
      >
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#1ac987' }} />
        Governed by UNSW policy v1.2 · synthetic data
      </div>
    </aside>
  );
}
