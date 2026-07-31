'use client';

import { useEffect, useState } from 'react';
import { subscribe, getEntries } from '../lib/agent/audit-log';

export function UtilityStrip({ onToggleAudit }: { onToggleAudit: () => void }) {
  const [count, setCount] = useState(getEntries().length);

  useEffect(() => {
    return subscribe((e) => setCount(e.length));
  }, []);

  return (
    <div
      className="flex flex-none items-center justify-between bg-ink text-white/80"
      style={{ height: 34, padding: '0 36px', fontSize: 12 }}
    >
      <div>Marketing Intelligence · Alumni Engagement</div>
      <div className="flex items-center" style={{ gap: 20 }}>
        <span className="text-unsw-yellow">Governed by UNSW policy v1.2</span>
        <button
          type="button"
          onClick={onToggleAudit}
          className="cursor-pointer"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.4)' }}
        >
          Audit log ({count})
        </button>
        <span>Demo · synthetic data</span>
      </div>
    </div>
  );
}
