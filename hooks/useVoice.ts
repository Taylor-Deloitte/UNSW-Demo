'use client';

import { useCallback, useRef, useState } from 'react';

const VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '';
const API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? '';

export function useVoice() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled || !VOICE_ID || !API_KEY || text.trim() === '') return;

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: 'POST',
            headers: {
              'xi-api-key': API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: { stability: 0.5, similarity_boost: 0.8 },
            }),
          },
        );
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => URL.revokeObjectURL(url);
        void audio.play();
      } catch {
        // Non-fatal — voice is best-effort
      }
    },
    [enabled],
  );

  return { enabled, toggle, speak };
}
