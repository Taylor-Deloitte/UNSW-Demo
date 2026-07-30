import Link from 'next/link';
import type { ReactNode } from 'react';
import { brand, tabs } from '../lib/brand';
import { AgentPanel } from './AgentPanel';

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
        <div className="text-sm text-white/60">Demo · synthetic data</div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 shrink-0 border-r border-unsw-navy/10 bg-white p-3">
          <ul className="space-y-1">
            {tabs.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="block rounded-md px-3 py-2 text-sm text-unsw-navy hover:bg-unsw-mist"
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-auto p-6">{children}</main>

        <aside className="w-96 shrink-0 border-l border-unsw-navy/10 bg-white">
          <AgentPanel />
        </aside>
      </div>
    </div>
  );
}
