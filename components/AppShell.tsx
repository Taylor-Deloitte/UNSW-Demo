'use client';

import { type ReactNode } from 'react';
import { PrimaryNav } from './PrimaryNav';
import { AuditDrawer } from './AuditDrawer';
import { AuditProvider, useAudit } from './AuditContext';
import { PayloadProvider } from './PayloadContext';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuditProvider>
      <PayloadProvider>
        <AppShellInner>{children}</AppShellInner>
      </PayloadProvider>
    </AuditProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { open, count, toggle } = useAudit();
  return (
    <div className="min-h-screen bg-paper">
      <PrimaryNav />
      <main className="flex flex-col">{children}</main>
      <AuditDrawer open={open} onClose={toggle} auditCount={count} />
    </div>
  );
}
