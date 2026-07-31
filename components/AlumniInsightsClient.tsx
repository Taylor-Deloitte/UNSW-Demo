'use client';

import { useMemo, useState } from 'react';
import type { AlumniInsightsPage, AlumniWithSignals } from '../lib/tab-data/alumni-insights';
import { AlumniCard } from './AlumniCard';
import { AlumniDetailDrawer } from './AlumniDetailDrawer';

interface Filters {
  industry: string | null;
  state: string | null;
}

export function AlumniInsightsClient({ page }: { page: AlumniInsightsPage }) {
  const [filters, setFilters] = useState<Filters>({ industry: null, state: null });
  const [selected, setSelected] = useState<AlumniWithSignals | null>(null);

  const filtered = useMemo(() => {
    return page.alumni.filter((a) => {
      if (filters.industry && a.currentIndustry !== filters.industry) return false;
      if (filters.state && a.state !== filters.state) return false;
      return true;
    });
  }, [page.alumni, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-unsw-slate">Industry:</span>
        <Chip
          label="All"
          active={filters.industry === null}
          onClick={() => setFilters((f) => ({ ...f, industry: null }))}
        />
        {page.facets.industries.slice(0, 6).map((f) => (
          <Chip
            key={f.label}
            label={`${f.label} (${f.count})`}
            active={filters.industry === f.label}
            onClick={() =>
              setFilters((cur) => ({
                ...cur,
                industry: cur.industry === f.label ? null : f.label,
              }))
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-unsw-slate">State:</span>
        <Chip
          label="All"
          active={filters.state === null}
          onClick={() => setFilters((f) => ({ ...f, state: null }))}
        />
        {page.facets.states.slice(0, 6).map((f) => (
          <Chip
            key={f.label}
            label={`${f.label} (${f.count})`}
            active={filters.state === f.label}
            onClick={() =>
              setFilters((cur) => ({
                ...cur,
                state: cur.state === f.label ? null : f.label,
              }))
            }
          />
        ))}
      </div>

      <div className="text-xs text-unsw-slate">
        Showing {filtered.length} of {page.alumni.length} (ranked by recent signal confidence)
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <AlumniCard key={a.id} alumni={a} onClick={() => setSelected(a)} />
        ))}
      </div>

      <AlumniDetailDrawer alumni={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-xs transition ' +
        (active
          ? 'border-unsw-navy bg-unsw-navy text-white'
          : 'border-unsw-navy/20 bg-white text-unsw-navy hover:bg-unsw-mist')
      }
    >
      {label}
    </button>
  );
}
