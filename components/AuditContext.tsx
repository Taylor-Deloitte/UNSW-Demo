'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getEntries, subscribe } from '../lib/agent/audit-log';

interface AuditState {
  open: boolean;
  count: number;
  toggle: () => void;
}

const AuditContext = createContext<AuditState>({ open: false, count: 0, toggle: () => {} });

export function AuditProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(getEntries().length);

  useEffect(() => {
    return subscribe((entries) => setCount(entries.length));
  }, []);

  return (
    <AuditContext.Provider value={{ open, count, toggle: () => setOpen((v) => !v) }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  return useContext(AuditContext);
}
