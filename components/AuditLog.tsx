'use client';

import { useEffect, useState } from 'react';
import { getEntries, subscribe, type AuditEntry } from '../lib/agent/audit-log';

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>(getEntries());

  useEffect(() => {
    return subscribe(setEntries);
  }, []);

  const recent = entries.slice(-25).reverse();

  return (
    <div className="border-t border-unsw-navy/10 bg-unsw-mist/50">
      <div className="flex items-center justify-between border-b border-unsw-navy/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-unsw-slate">
            Audit log
          </span>
        </div>
        <span className="font-mono text-[10px] text-unsw-slate/70">
          {entries.length} events · UNSW policy v1.2
        </span>
      </div>
      <div className="max-h-40 overflow-auto px-3 py-2 text-[11px]">
        {recent.length === 0 && (
          <div className="text-unsw-slate/60">
            No tool activity yet. Every agent action lands here for review.
          </div>
        )}
        {recent.map((e) => (
          <div key={e.id + e.timestamp} className="flex items-start gap-2 py-1 font-mono">
            <span className="text-unsw-slate/70">{e.timestamp.slice(11, 19)}</span>
            <span
              className={
                'inline-block h-1.5 w-1.5 shrink-0 translate-y-1.5 rounded-full ' +
                (e.status === 'done'
                  ? 'bg-emerald-500'
                  : e.status === 'error'
                    ? 'bg-rose-500'
                    : 'animate-pulse bg-amber-400')
              }
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-unsw-navy">{e.tool}</div>
              <div className="truncate text-unsw-slate/70">{e.inputPreview}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
