'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CohortRollup } from '../lib/types';

export function LifecycleHealthClient({ cohorts }: { cohorts: CohortRollup[] }) {
  const [selectedId, setSelectedId] = useState<string>(cohorts[0]?.id ?? 'all');
  const selected = cohorts.find((c) => c.id === selectedId) ?? cohorts[0];
  if (!selected) return <div>No cohorts available.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {cohorts.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={
              'rounded-full border px-3 py-1 text-sm transition ' +
              (c.id === selectedId
                ? 'border-unsw-navy bg-unsw-navy text-white'
                : 'border-unsw-navy/20 bg-white text-unsw-navy hover:bg-unsw-mist')
            }
          >
            {c.label}{' '}
            <span
              className={
                'ml-1 text-xs ' + (c.id === selectedId ? 'text-white/70' : 'text-unsw-slate')
              }
            >
              {c.size.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile label="Cohort size" value={selected.size.toLocaleString()} />
        <KpiTile
          label="Engagement (30d)"
          value={`${Math.round(selected.engagementRate30d * 100)}%`}
        />
        <KpiTile label="Moments of relevance (30d)" value={selected.momentsOfRelevance30d.toString()} />
        <KpiTile label="Drop-off (90d)" value={`${Math.round(selected.dropOffRate90d * 100)}%`} />
      </div>

      <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-unsw-navy">Engagement — last 12 months</div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={selected.engagementTrend12m}
              margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#3E4A56' }}
                tickFormatter={(v: unknown) => String(v).slice(0, 7)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#3E4A56' }}
                tickFormatter={(v: unknown) => `${Math.round(Number(v) * 100)}%`}
                domain={[0, 1]}
              />
              <Tooltip
                formatter={(v: unknown) => [`${Math.round(Number(v) * 100)}%`, 'Engagement']}
                labelFormatter={(v: unknown) => String(v).slice(0, 7)}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#001A2C"
                strokeWidth={2}
                dot={{ r: 3, fill: '#FFD100' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border-l-4 border-unsw-yellow bg-white p-4 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-unsw-slate">
          Agent commentary
        </div>
        <div className="text-sm text-unsw-navy">{selected.agentCommentary}</div>
      </div>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-unsw-slate">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-unsw-navy">{value}</div>
    </div>
  );
}
