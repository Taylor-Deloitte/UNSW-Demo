'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '';
const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? '';

async function fetchAudio(text: string): Promise<ArrayBuffer | null> {
  if (!VOICE_ID || !API_KEY || !text.trim()) return null;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

export function useVoice() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  // Audio playback state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Queue: text chunks waiting to be fetched + played
  const queueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);

  // Incomplete sentence buffer — accumulates deltas until a boundary is hit
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

  const playBuffer = useCallback(
    (buffer: ArrayBuffer): Promise<void> =>
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
              resolve();
            };
            source.start();
          },
          () => resolve(), // decode error — skip silently
        );
      }),
    [getCtx],
  );

  // Serial queue drain — fetch and play one chunk at a time in order
  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    while (queueRef.current.length > 0) {
      const text = queueRef.current.shift()!;
      if (!enabledRef.current) break; // voice toggled off mid-stream
      const buf = await fetchAudio(text);
      if (buf && enabledRef.current) await playBuffer(buf);
    }
    drainingRef.current = false;
  }, [playBuffer]);

  const enqueue = useCallback(
    (text: string) => {
      if (!enabledRef.current || !text.trim()) return;
      queueRef.current.push(text);
      void drain();
    },
    [drain],
  );

  // Called with each text delta from Claude — flushes on sentence boundaries
  const onDelta = useCallback(
    (delta: string) => {
      if (!enabledRef.current) return;
      bufferRef.current += delta;

      // Find earliest sentence-ending boundary followed by whitespace
      const buf = bufferRef.current;
      let boundary = -1;
      for (const sep of ['. ', '! ', '? ', '\n\n', '\n']) {
        const idx = buf.indexOf(sep);
        if (idx !== -1 && (boundary === -1 || idx < boundary)) {
          boundary = idx + sep.length - 1;
        }
      }

      if (boundary > 0) {
        const sentence = buf.slice(0, boundary + 1).trim();
        bufferRef.current = buf.slice(boundary + 1).trimStart();
        if (sentence.length > 3) enqueue(sentence);
      }
    },
    [enqueue],
  );

  // Flush remaining buffer when streaming ends
  const flush = useCallback(() => {
    const remaining = bufferRef.current.trim();
    bufferRef.current = '';
    if (remaining.length > 3) enqueue(remaining);
  }, [enqueue]);

  // Stop everything — called when a new conversation starts
  const stop = useCallback(() => {
    queueRef.current = [];
    bufferRef.current = '';
    drainingRef.current = false;
    currentSourceRef.current?.stop();
    currentSourceRef.current = null;
  }, []);

  return { enabled, toggle, onDelta, flush, stop };
}
