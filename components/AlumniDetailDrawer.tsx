'use client';

import type { AlumniWithSignals } from '../lib/tab-data/alumni-insights';

export function AlumniDetailDrawer({
  alumni,
  onClose,
}: {
  alumni: AlumniWithSignals | null;
  onClose: () => void;
}) {
  if (!alumni) return null;

  const sortedSignals = alumni.signals
    .slice()
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close drawer backdrop"
      />
      <aside className="flex w-[520px] shrink-0 flex-col overflow-auto bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-unsw-navy/10 bg-unsw-navy px-6 py-4 text-white">
          <div>
            <div className="text-lg font-semibold">
              {alumni.firstName} {alumni.lastName}
            </div>
            <div className="text-sm text-white/80">
              {alumni.currentTitle} · {alumni.currentIndustry}
            </div>
            <div className="text-xs text-white/60">
              Grad {alumni.graduationYear} · {alumni.completedUnswProgram}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <div className="space-y-6 p-6 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-unsw-slate">
              Career trajectory
            </h3>
            <ol className="space-y-2">
              {alumni.careerTrajectory
                .slice()
                .reverse()
                .map((r, i) => (
                  <li key={i} className="rounded-md border border-unsw-navy/10 p-3">
                    <div className="font-medium text-unsw-navy">{r.title}</div>
                    <div className="text-xs text-unsw-slate">
                      {r.industry} · {r.startDate} → {r.endDate ?? 'present'} · {r.seniority}
                    </div>
                  </li>
                ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-unsw-slate">
              Signals ({sortedSignals.length})
            </h3>
            <ul className="space-y-2">
              {sortedSignals.map((s) => (
                <li key={s.id} className="rounded-md border border-unsw-navy/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-unsw-navy">{s.type.replace(/_/g, ' ')}</div>
                    <div className="font-mono text-xs text-unsw-slate">
                      {new Date(s.detectedAt).toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-xs text-unsw-slate">
                    Source: {s.source} · Confidence: {s.confidence.toFixed(2)}
                  </div>
                  {Object.keys(s.payload).length > 0 && (
                    <div className="mt-1 font-mono text-xs text-unsw-slate/80">
                      {Object.entries(s.payload)
                        .map(([k, v]) => `${k}=${String(v)}`)
                        .join(' · ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-unsw-slate">
              Contact
            </h3>
            <div className="space-y-1 text-unsw-navy">
              <div>{alumni.email}</div>
              <div className="text-xs text-unsw-slate">{alumni.linkedinUrl}</div>
              <div className="text-xs text-unsw-slate">
                Email consent: {alumni.emailConsent ? 'yes' : 'no'} · SMS consent:{' '}
                {alumni.smsConsent ? 'yes' : 'no'}
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
