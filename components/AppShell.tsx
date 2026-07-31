'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
    <div className="min-h-screen bg-paper">
      <PrimaryNav onToggleAudit={() => setAuditOpen((v) => !v)} />
      <main className="flex flex-col">{children}</main>
      <AuditDrawer open={auditOpen} onClose={() => setAuditOpen(false)} auditCount={auditCount} />
    </div>
  );
}
