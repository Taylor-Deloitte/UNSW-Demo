'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '';
const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? '';

const SPEECH_RATE = 1.0;

// Fallback pacing when there's no real audio to time against (voice off, or TTS
// unavailable/failed): approximates a comfortable narrated speaking pace so on-screen
// text and tab navigation still stay in step with each other instead of flashing by.
function estimateReadingDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const msPerWord = 340; // ~176 wpm
  return Math.min(20000, Math.max(700, (words * msPerWord) / SPEECH_RATE));
}

async function fetchAudio(text: string): Promise<ArrayBuffer | null> {
  if (!VOICE_ID || !API_KEY || !text.trim()) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export function useVoice(onReveal: (text: string) => void) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  // Audio playback state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const revealIntervalRef = useRef<number | null>(null);

  // Queue: text chunks waiting to be fetched + played, interleaved with actions
  // (e.g. presenter-tab navigation) so they stay paced with narration instead of
  // running ahead of it.
  type QueueItem = { kind: 'text'; text: string } | { kind: 'action'; run: () => void | Promise<void> };
  const queueRef = useRef<QueueItem[]>([]);
  const drainingRef = useRef(false);

  // Incomplete sentence buffer: accumulates deltas until a boundary is hit
  const bufferRef = useRef('');

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const clearRevealInterval = useCallback(() => {
    if (revealIntervalRef.current !== null) {
      window.clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
  }, []);

  // Reveals `text` on screen progressively over `durationMs`, so the on-screen
  // copy finishes appearing right as the narrated audio for it finishes playing.
  const revealOverTime = useCallback(
    (text: string, durationMs: number, bailIfDisabled = true): Promise<void> =>
      new Promise((resolve) => {
        const total = text.length;
        if (total === 0 || durationMs <= 0) {
          onRevealRef.current(text);
          resolve();
          return;
        }
        const start = Date.now();
        let revealed = 0;
        clearRevealInterval();
        revealIntervalRef.current = window.setInterval(() => {
          if (bailIfDisabled && !enabledRef.current) {
            clearRevealInterval();
            if (revealed < total) onRevealRef.current(text.slice(revealed));
            resolve();
            return;
          }
          const elapsed = Date.now() - start;
          const targetChars = Math.min(total, Math.ceil((elapsed / durationMs) * total));
          if (targetChars > revealed) {
            onRevealRef.current(text.slice(revealed, targetChars));
            revealed = targetChars;
          }
          if (elapsed >= durationMs || revealed >= total) {
            clearRevealInterval();
            if (revealed < total) onRevealRef.current(text.slice(revealed));
            resolve();
          }
        }, 40);
      }),
    [clearRevealInterval],
  );

  const playBuffer = useCallback(
    (buffer: ArrayBuffer, text: string): Promise<void> =>
      new Promise((resolve) => {
        const ctx = getCtx();
        ctx.decodeAudioData(
          buffer,
          (decoded) => {
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(ctx.destination);
            currentSourceRef.current = source;
            source.onended = () => {
              currentSourceRef.current = null;
            };
            source.start();
            void revealOverTime(text, decoded.duration * 1000).then(resolve);
          },
          () => {
            // decode error: reveal immediately so the tour isn't stuck waiting
            onRevealRef.current(text);
            resolve();
          },
        );
      }),
    [getCtx, revealOverTime],
  );

  // Serial queue drain: play (or pace) one chunk at a time in order, running any
  // interleaved actions (e.g. tab navigation) exactly when their turn comes up.
  // Always runs through this same loop regardless of the voice toggle, so text and
  // navigation stay in step with each other whether or not real audio is playing.
  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      if (item.kind === 'action') {
        await item.run();
        continue;
      }
      const { text } = item;
      if (enabledRef.current) {
        const buf = await fetchAudio(text);
        if (buf && enabledRef.current) {
          await playBuffer(buf, text);
          continue;
        }
      }
      // Voice off, or TTS unavailable/failed: pace the reveal at an estimated
      // reading speed instead of revealing (and navigating) instantly.
      await revealOverTime(text, estimateReadingDurationMs(text), false);
    }
    drainingRef.current = false;
  }, [playBuffer, revealOverTime]);

  const enqueue = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      queueRef.current.push({ kind: 'text', text });
      void drain();
    },
    [drain],
  );

  // Queues an action (e.g. presenter spotlight/navigation) to run in its turn,
  // in step with narration, whether or not voice is enabled.
  const enqueueAction = useCallback(
    (run: () => void | Promise<void>) => {
      queueRef.current.push({ kind: 'action', run });
      void drain();
    },
    [drain],
  );

  // Called with each text delta from Claude: just accumulates. The whole buffered
  // block (a tab's full narration) is sent to TTS as one chunk via flush(), so
  // ElevenLabs' own speech pacing for that chunk drives the on-screen reveal rate,
  // rather than fetching/playing per-sentence fragments.
  const onDelta = useCallback((delta: string) => {
    bufferRef.current += delta;
  }, []);

  // Flush the buffered block (one tab's worth of narration) as a single queued
  // unit. Called both at each spotlight boundary (previous tab's text) and once
  // more when streaming ends (the final tab's trailing text).
  const flush = useCallback(() => {
    const remaining = bufferRef.current.trim();
    bufferRef.current = '';
    if (remaining.length > 3) enqueue(remaining);
  }, [enqueue]);

  // Stop everything: called when a new conversation starts
  const stop = useCallback(() => {
    queueRef.current = [];
    bufferRef.current = '';
    drainingRef.current = false;
    currentSourceRef.current?.stop();
    currentSourceRef.current = null;
    clearRevealInterval();
  }, [clearRevealInterval]);

  return { enabled, toggle, onDelta, flush, stop, enqueueAction };
}
