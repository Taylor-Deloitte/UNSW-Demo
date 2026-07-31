'use client';

import { useMemo, useState } from 'react';
import { QueryBand, QueryStatic, QueryToken } from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import { computeForecast } from '../../lib/tab-data/forecast';
import { paybackMonth } from '../../lib/tab-data/forecast-payback';

const CHIPS = [{ name: 'simulate_forecast' }];

const SEGMENT_OPTIONS = [
  { value: 'cs-promoted', label: 'CS grads promoted', size: 340 },
  { value: 'leadership-lookalikes', label: 'Leadership lookalikes', size: 612 },
  { value: 'healthcare-gap', label: 'Healthcare 5-year gap', size: 288 },
  { value: 'dormant-senior', label: 'Dormant, high seniority', size: 458 },
] as const;

const UPLIFT_OPTIONS = [
  { value: '3', label: '3.0 pts' },
  { value: '6', label: '6.0 pts' },
  { value: '9', label: '9.0 pts' },
  { value: '12', label: '12.0 pts' },
] as const;

const VALUE_OPTIONS = [
  { value: '2500', label: '$2,500' },
  { value: '3500', label: '$3,500' },
  { value: '4500', label: '$4,500' },
  { value: '6000', label: '$6,000' },
] as const;

const COST_OPTIONS = [
  { value: '4000', label: '$4,000' },
  { value: '8000', label: '$8,000' },
  { value: '14000', label: '$14,000' },
  { value: '25000', label: '$25,000' },
] as const;

const SCENARIOS = [
  { key: 'uplift-9', label: 'Uplift 9 pts', patch: { uplift: '9' } },
  {
    key: 'lookalikes',
    label: 'Widen to lookalikes (612)',
    patch: { segment: 'leadership-lookalikes' },
  },
  { key: 'premium', label: 'Premium course at $6,000', patch: { value: '6000' } },
  { key: 'halve-spend', label: 'Halve the spend to $4,000', patch: { cost: '4000' } },
] as const;

interface FcQuery {
  segment: (typeof SEGMENT_OPTIONS)[number]['value'];
  uplift: string;
  value: string;
  cost: string;
}

const DEFAULT_FC: FcQuery = {
  segment: 'cs-promoted',
  uplift: '6',
  value: '3500',
  cost: '8000',
};

const AUD_LARGE = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

export default function ForecastPage() {
  const [q, setQ] = useState<FcQuery>(DEFAULT_FC);

  const segment = SEGMENT_OPTIONS.find((s) => s.value === q.segment) ?? SEGMENT_OPTIONS[0];
  const upliftPct = Number(q.uplift);
  const courseValueAud = Number(q.value);
  const campaignCostAud = Number(q.cost);

  const result = useMemo(
    () =>
      computeForecast({
        segmentSize: segment.size,
        baselineConversionRate: 0.02,
        upliftPct,
        courseValueAud,
        campaignCostAud,
      }),
    [segment.size, upliftPct, courseValueAud, campaignCostAud],
  );

  const payback = paybackMonth(result.monthly, courseValueAud, campaignCostAud);

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryStatic>Forecast</QueryStatic>
        <QueryToken
          value={q.segment}
          onChange={(v) => setQ({ ...q, segment: v as FcQuery['segment'] })}
          options={SEGMENT_OPTIONS.map((s) => ({ value: s.value, label: `${s.label} (${s.size})` }))}
          minWidth={280}
        />
        <QueryStatic>at</QueryStatic>
        <QueryToken
          value={q.uplift}
          onChange={(v) => setQ({ ...q, uplift: v })}
          options={[...UPLIFT_OPTIONS]}
          minWidth={140}
        />
        <QueryStatic>uplift,</QueryStatic>
        <QueryToken
          value={q.value}
          onChange={(v) => setQ({ ...q, value: v })}
          options={[...VALUE_OPTIONS]}
          minWidth={140}
        />
        <QueryStatic>course value and</QueryStatic>
        <QueryToken
          value={q.cost}
          onChange={(v) => setQ({ ...q, cost: v })}
          options={[...COST_OPTIONS]}
          minWidth={140}
        />
        <QueryStatic>of spend.</QueryStatic>
      </QueryBand>

      <HeadlineBand
        revenue={result.incrementalRevenueAud}
        enrolments={result.incrementalConversions}
        roi={result.roi}
        payback={payback}
        segmentLabel={segment.label}
      />

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <ChartColumn monthly={result.monthly} />
        <ScenarioColumn
          current={q}
          onApply={(patch) => setQ({ ...q, ...patch })}
          assumptions={result.assumptions}
        />
      </div>

      <ToolFooter chips={CHIPS} onToggleAudit={() => {}} auditOpen={false} auditCount={0} />
    </div>
  );
}

function HeadlineBand({
  revenue,
  enrolments,
  roi,
  payback,
  segmentLabel,
}: {
  revenue: number;
  enrolments: number;
  roi: number;
  payback: number | null;
  segmentLabel: string;
}) {
  return (
    <div className="flex flex-none items-end bg-ink" style={{ padding: '30px 36px', gap: 40 }}>
      <div>
        <div
          className="uppercase text-unsw-yellow"
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em' }}
        >
          Projected incremental revenue · 12 months
        </div>
        <div
          className="text-white"
          style={{
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            marginTop: 6,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {AUD_LARGE.format(revenue)}
        </div>
      </div>
      <div className="flex" style={{ gap: 34, paddingBottom: 14 }}>
        <Stat label="Enrolments" value={enrolments.toFixed(0)} />
        <Stat label="ROI" value={`${Math.round(roi * 100)}%`} />
        <Stat label="Payback" value={payback ? `M+${payback}` : '—'} />
        <Stat label="Segment" value={segmentLabel} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="uppercase"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
      <div
        className="text-white"
        style={{
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ChartColumn({
  monthly,
}: {
  monthly: Array<{ baseline: number; treated: number }>;
}) {
  const maxTreated = Math.max(...monthly.map((m) => m.treated), 1);
  const pt = (v: number, i: number) => {
    const x = 20 + i * (860 / (monthly.length - 1));
    const y = 190 - (v / maxTreated) * 168;
    return { x, y };
  };
  const treatedPts = monthly.map((m, i) => pt(m.treated, i));
  const baselinePts = monthly.map((m, i) => pt(m.baseline, i));
  const areaPts = [
    ...treatedPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    ...baselinePts
      .slice()
      .reverse()
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
  ].join(' ');
  const line = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-1 flex-col" style={{ padding: '22px 30px 22px 36px' }}>
      <div
        className="flex items-center justify-between"
        style={{ borderBottom: '1px solid #000', paddingBottom: 8 }}
      >
        <div className="text-ink" style={{ fontSize: 16, fontWeight: 700 }}>
          Baseline vs treated — monthly enrolments
        </div>
        <div className="flex text-muted" style={{ gap: 16, fontSize: 13 }}>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span
              style={{
                width: 18,
                height: 0,
                borderTop: '2px dashed #8f9296',
                display: 'inline-block',
              }}
            />
            Baseline
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 18, height: 3, background: '#000', display: 'inline-block' }} />
            Treated
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 900 200"
        preserveAspectRatio="none"
        style={{ width: '100%', flex: 1, minHeight: 230, marginTop: 12 }}
      >
        <polygon points={areaPts} fill="#FFD100" opacity={0.5} />
        <line x1={0} x2={900} y1={20} y2={20} stroke="#ededed" strokeWidth={1} />
        <line x1={0} x2={900} y1={190} y2={190} stroke="#000" strokeWidth={1.5} />
        <polyline
          points={line(baselinePts)}
          fill="none"
          stroke="#8f9296"
          strokeWidth={2}
          strokeDasharray="7 5"
        />
        <polyline points={line(treatedPts)} fill="none" stroke="#000" strokeWidth={3} />
      </svg>
      <div className="flex justify-between text-muted" style={{ fontSize: 12, marginTop: 6 }}>
        {monthly.map((_, i) => (
          <span key={i}>M+{i + 1}</span>
        ))}
      </div>
    </div>
  );
}

function ScenarioColumn({
  current,
  onApply,
  assumptions,
}: {
  current: FcQuery;
  onApply: (patch: Partial<FcQuery>) => void;
  assumptions: string[];
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 460,
        borderLeft: '1px solid #e0e0e0',
        padding: '22px 36px 22px 30px',
        gap: 18,
      }}
    >
      <div>
        <div
          className="text-ink"
          style={{ fontSize: 16, fontWeight: 700, borderBottom: '2px solid #000', paddingBottom: 8 }}
        >
          Scenarios
        </div>
        <div>
          {SCENARIOS.map((s) => {
            const projected = projectScenarioRoi(current, s.patch as Partial<FcQuery>);
            return (
              <button
                type="button"
                key={s.key}
                onClick={() => onApply(s.patch as Partial<FcQuery>)}
                className="flex w-full cursor-pointer items-center justify-between text-left hover:bg-mist"
                style={{ padding: '10px 0', borderBottom: '1px solid #ededed' }}
              >
                <span style={{ fontSize: 15 }}>{s.label}</span>
                <span className="flex items-center" style={{ gap: 14 }}>
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    {AUD_LARGE.format(projected.revenue)}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>
                    {Math.round(projected.roi * 100)}%
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div
          className="uppercase text-muted"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6 }}
        >
          Model assumptions
        </div>
        <ul
          className="text-muted"
          style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18, listStyle: 'disc' }}
        >
          {assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col" style={{ marginTop: 'auto' }}>
        <button
          type="button"
          className="w-full bg-unsw-yellow text-ink"
          style={{ fontSize: 15, fontWeight: 700, padding: '13px 22px', textAlign: 'center' }}
        >
          Export the brief
        </button>
        <button
          type="button"
          className="mt-3 w-full bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
          style={{ border: '2px solid #000', fontSize: 14, fontWeight: 500, padding: '11px 20px' }}
        >
          Draft the campaign in AJO
        </button>
      </div>
    </div>
  );
}

function projectScenarioRoi(current: FcQuery, patch: Partial<FcQuery>) {
  const merged = { ...current, ...patch };
  const seg = SEGMENT_OPTIONS.find((s) => s.value === merged.segment) ?? SEGMENT_OPTIONS[0];
  const res = computeForecast({
    segmentSize: seg.size,
    baselineConversionRate: 0.02,
    upliftPct: Number(merged.uplift),
    courseValueAud: Number(merged.value),
    campaignCostAud: Number(merged.cost),
  });
  return { revenue: res.incrementalRevenueAud, roi: res.roi };
}
