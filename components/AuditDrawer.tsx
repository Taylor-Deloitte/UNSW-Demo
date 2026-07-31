'use client';

import { useEffect, useState } from 'react';
import { subscribe, getEntries, type AuditEntry } from '../lib/agent/audit-log';

export function AuditDrawer({
  open,
  onClose,
  auditCount,
}: {
  open: boolean;
  onClose: () => void;
  auditCount: number;
}) {
  const [entries, setEntries] = useState<AuditEntry[]>(getEntries());

  useEffect(() => {
    return subscribe(setEntries);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <aside
      className="fixed bg-paper"
      role="dialog"
      aria-modal="true"
      style={{
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        zIndex: 60,
        borderLeft: '2px solid #000',
        boxShadow: '-18px 0 42px rgba(0,0,0,0.16)',
      }}
    >
      <header
        className="flex items-center justify-between bg-ink"
        style={{ padding: '18px 24px' }}
      >
        <div>
          <div
            className="uppercase text-unsw-yellow"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}
          >
            Audit log
          </div>
          <div className="text-white" style={{ fontSize: 20, fontWeight: 700 }}>
            {auditCount} events this session
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-white"
          aria-label="Close audit log"
          style={{ fontSize: 22, lineHeight: 1 }}
        >
          ✕
        </button>
      </header>
      <div
        className="flex flex-col overflow-auto"
        style={{ padding: '18px 24px', gap: 14, maxHeight: 'calc(100vh - 180px)' }}
      >
        {entries.length === 0 && (
          <div style={{ fontSize: 13, color: '#8f9296' }}>
            No tool activity yet. Every agent action lands here for review.
          </div>
        )}
        {entries
          .slice()
          .reverse()
          .map((e) => (
            <div
              key={e.id + e.timestamp}
              className="flex font-mono"
              style={{ gap: 12, fontSize: 11, lineHeight: 1.6 }}
            >
              <div className="flex-none text-muted-soft">{e.timestamp.slice(11, 19)}</div>
              <div
                className="flex-none"
                style={{
                  width: 7,
                  height: 7,
                  marginTop: 5,
                  borderRadius: '50%',
                  background:
                    e.status === 'done'
                      ? '#1ac987'
                      : e.status === 'error'
                        ? '#e63946'
                        : '#f4a300',
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-ink" style={{ fontSize: 12 }}>
                  {e.tool}
                </div>
                <div className="text-muted">{e.inputPreview}</div>
              </div>
            </div>
          ))}
      </div>
      <div
        className="text-muted"
        style={{
          borderTop: '1px solid #e0e0e0',
          padding: '14px 24px',
          fontSize: 12,
          lineHeight: 1.6,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
        }}
      >
        Every agent action is recorded. Source of truth stays in Dynamics + AEP; this log is your
        second copy for review.
      </div>
    </aside>
  );
}
