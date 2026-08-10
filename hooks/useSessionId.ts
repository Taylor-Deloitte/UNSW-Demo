'use client';

import { useEffect, useState } from 'react';

const KEY = 'unsw-overlay-session-id';

export function useSessionId(): string {
  const [id, setId] = useState('');

  useEffect(() => {
    let stored = window.localStorage.getItem(KEY);
    if (stored === null) {
      stored = crypto.randomUUID();
      window.localStorage.setItem(KEY, stored);
    }
    setId(stored);
  }, []);

  return id;
}
