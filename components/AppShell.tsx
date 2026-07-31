import Link from 'next/link';
import type { ReactNode } from 'react';
import { brand, tabs } from '../lib/brand';
import { AgentPanel } from './AgentPanel';
import { AuditLog } from './AuditLog';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col bg-unsw-mist">
      <header className="flex items-center justify-between border-b border-unsw-navy/10 bg-unsw-navy px-6 py-3 text-white">
        <div className="flex items-center gap-4">
          <div className="h-6 w-6 rounded-sm bg-unsw-yellow" aria-hidden />
          <span className="font-semibold tracking-tight">{brand.name}</span>
          <span className="text-unsw-yellow/80">·</span>
          <span className="text-white/80">{brand.productName}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="rounded-full border border-white/20 px-3 py-1 text-white/80">
            Viewing as: <span className="text-white">Marketing Manager · Alumni Engagement</span>
          </span>
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-emerald-300">
            Governed by UNSW policy v1.2
          </span>
          <span className="text-white/60">Demo · synthetic</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 shrink-0 border-r border-unsw-navy/10 bg-white p-3">
          <ul className="space-y-1">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="block rounded-md px-3 py-2 text-sm text-unsw-navy transition hover:bg-unsw-mist hover:pl-4"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-auto p-6">{children}</main>

        <aside className="flex w-96 shrink-0 flex-col border-l border-unsw-navy/10 bg-white">
          <div className="flex-1 overflow-hidden">
            <AgentPanel />
          </div>
          <AuditLog />
        </aside>
      </div>
    </div>
  );
}
