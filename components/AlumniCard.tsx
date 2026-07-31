import type { AlumniWithSignals } from '../lib/tab-data/alumni-insights';
import { GuardrailBadge } from './GuardrailBadge';

const SIGNAL_LABELS: Record<string, string> = {
  promoted: 'Promoted',
  role_change: 'Role change',
  industry_change: 'Industry change',
  location_change: 'Moved',
  redundancy_risk: 'Redundancy risk',
  course_recency_threshold: 'Long since last course',
  alumni_anniversary: 'Anniversary',
};

const SIGNAL_TONE: Record<string, string> = {
  promoted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  role_change: 'bg-sky-100 text-sky-800 border-sky-200',
  industry_change: 'bg-violet-100 text-violet-800 border-violet-200',
  location_change: 'bg-amber-100 text-amber-800 border-amber-200',
  redundancy_risk: 'bg-rose-100 text-rose-800 border-rose-200',
  course_recency_threshold: 'bg-slate-100 text-slate-800 border-slate-200',
  alumni_anniversary: 'bg-yellow-100 text-yellow-900 border-yellow-200',
};

export function AlumniCard({
  alumni,
  onClick,
}: {
  alumni: AlumniWithSignals;
  onClick: () => void;
}) {
  const recentSignals = alumni.signals
    .slice()
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 3);

  const initials =
    alumni.firstName.charAt(0).toUpperCase() + alumni.lastName.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-unsw-navy/10 bg-white p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-unsw-navy/30 hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-unsw-navy text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-unsw-navy">
            {alumni.firstName} {alumni.lastName}
          </div>
          <div className="truncate text-xs text-unsw-slate">
            {alumni.currentTitle} · {alumni.currentIndustry}
          </div>
        </div>
      </div>
      <div className="mb-3 text-xs text-unsw-slate">
        Grad {alumni.graduationYear} · {alumni.city}, {alumni.state}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {recentSignals.length === 0 && (
          <span className="text-xs text-unsw-slate/60">No recent signals</span>
        )}
        {recentSignals.map((s) => (
          <span
            key={s.id}
            className={
              'rounded-full border px-2 py-0.5 text-xs ' + (SIGNAL_TONE[s.type] ?? SIGNAL_TONE.role_change)
            }
          >
            {SIGNAL_LABELS[s.type] ?? s.type}
          </span>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap gap-1 border-t border-unsw-navy/5 pt-2">
        {alumni.emailConsent && <GuardrailBadge label="Email consent" />}
        {alumni.smsConsent && <GuardrailBadge label="SMS consent" />}
        <GuardrailBadge label="PII scoped" />
      </div>
    </button>
  );
}
