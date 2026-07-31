'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { UtilityStrip } from './UtilityStrip';
import { PrimaryNav } from './PrimaryNav';
import { AuditDrawer } from './AuditDrawer';
import { getEntries, subscribe } from '../lib/agent/audit-log';

export function AppShell({ children }: { children: ReactNode }) {
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditCount, setAuditCount] = useState(getEntries().length);

  useEffect(() => {
    return subscribe((e) => setAuditCount(e.length));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <UtilityStrip onToggleAudit={() => setAuditOpen((v) => !v)} />
      <PrimaryNav />
      <main className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
        {children}
      </main>
      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} auditCount={auditCount} />
    </div>
  );
}
