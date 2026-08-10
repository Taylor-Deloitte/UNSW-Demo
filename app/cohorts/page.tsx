'use client';

import { useState } from 'react';
import { QueryBand, QueryStatic, QueryToken } from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import {
  COHORTS,
  COHORT_OPTIONS,
  COHORTS_WINDOW_OPTIONS,
  DEFAULT_COHORTS_QUERY,
  cohortFinding,
  type CohortKey,
  type CohortRow,
  type CohortsQuery,
} from '../../lib/tab-data/cohorts-fixture';
import { usePayload } from '../../components/PayloadContext';

const CHIPS = [{ name: 'query_ajo' }, { name: 'compare_cohorts' }];

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
/** Last 12 months ending with the most recent completed month, oldest-first. */
function last12Months(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 12; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(MONTH_ABBR[d.getMonth()]);
  }
  return out;
}
const MONTHS = last12Months();

export default function CohortsPage() {
  const [q, setQ] = useState<CohortsQuery>(DEFAULT_COHORTS_QUERY);
  const a = COHORTS[q.a];
  const b = COHORTS[q.b];
  const windowLabel =
    COHORTS_WINDOW_OPTIONS.find((o) => o.value === q.window)?.label ?? '12 months';

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryStatic>Compare</QueryStatic>
        <QueryToken
          value={q.a}
          onChange={(v) => setQ({ ...q, a: v as CohortKey })}
          options={COHORT_OPTIONS}
          minWidth={200}
        />
        <QueryStatic>against</QueryStatic>
        <QueryToken
          value={q.b}
          onChange={(v) => setQ({ ...q, b: v as CohortKey })}
          options={COHORT_OPTIONS}
          minWidth={200}
        />
        <QueryStatic>on engagement over</QueryStatic>
        <QueryToken
          value={q.window}
          onChange={(v) => setQ({ ...q, window: v as CohortsQuery['window'] })}
          options={COHORTS_WINDOW_OPTIONS}
          minWidth={180}
        />
      </QueryBand>

      <HeadlineRow a={a} b={b} windowLabel={windowLabel} q={q} />

      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <ChartColumn a={a} b={b} />
        <FindingsColumn a={a} b={b} />
      </div>

      <ToolFooter chips={CHIPS} />
    </div>
  );
}

function HeadlineRow({
  a,
  b,
  windowLabel,
  q,
}: {
  a: CohortRow;
  b: CohortRow;
  windowLabel: string;
  q: CohortsQuery;
}) {
  const { show } = usePayload();
  const trend = a.deltaQ1 < 0 ? `down ${Math.abs(a.deltaQ1)}%` : `up ${a.deltaQ1}%`;
  const openAbTest = () => show(`AJO A/B test · ${a.label}`, buildAbTestPayload(a, b, q));
  const openRevert = () => show(`AJO cadence revert · ${a.label}`, buildRevertPayload(a, q));

  return (
    <div
      className="flex flex-none items-end justify-between"
      style={{ padding: '20px 36px 16px', borderBottom: '1px solid #000' }}
    >
      <div>
        <div
          className="text-ink"
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          {a.label} engagement is {a.engagement}%, {trend} over {windowLabel}
        </div>
        <div className="text-muted" style={{ fontSize: 14, marginTop: 2 }}>
          {a.size.toLocaleString()} alumni · compared against {b.label} ({b.size.toLocaleString()})
        </div>
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={openAbTest}
          className="bg-unsw-yellow text-ink"
          style={{ fontSize: 14, fontWeight: 700, padding: '10px 18px' }}
        >
          A/B test the template
        </button>
        <button
          type="button"
          onClick={openRevert}
          className="bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
          style={{ border: '2px solid #000', fontSize: 14, fontWeight: 500, padding: '8px 16px' }}
        >
          Revert cadence
        </button>
      </div>
    </div>
  );
}

function buildAbTestPayload(a: CohortRow, b: CohortRow, q: CohortsQuery) {
  return {
    endpoint: 'https://platform.adobe.io/journey/authoring/experiments',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AJO API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      name: `${a.label} · cadence A/B`,
      hypothesis: `Reverting the cadence template for ${a.label} recovers engagement lost after 12 June — target: return to ${b.engagement}%+ within 60 days.`,
      variant_a: { label: 'Control (current template)', trafficShare: 0.5 },
      variant_b: { label: 'Reverted template (pre-12-June)', trafficShare: 0.5 },
      audience: { cohort: a.label, size: a.size },
      referenceCohort: { cohort: b.label, size: b.size, engagement: b.engagement },
      metricPrimary: 'engagement_rate_30d',
      metricSecondary: ['click_through_rate', 'unsubscribe_rate'],
      window: q.window,
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'cohorts',
      },
    },
  };
}

function buildRevertPayload(a: CohortRow, q: CohortsQuery) {
  return {
    endpoint: 'https://platform.adobe.io/journey/authoring/campaigns/{id}/actions/revert-template',
    method: 'POST',
    headers: {
      Authorization: '<bearer token from Adobe IMS>',
      'x-api-key': '<AJO API key>',
      'x-sandbox-name': 'unsw-marketing-prod',
      'Content-Type': 'application/json',
    },
    body: {
      cohort: a.label,
      cohortSize: a.size,
      revertToVersion: 'pre-2026-06-12',
      reason: `Engagement dropped ${Math.abs(a.deltaQ1)}% after 12 June cadence change. Reverting for ${a.label}.`,
      applyTo: 'active_journeys',
      window: q.window,
      metadata: {
        createdBy: 'Marketing Intelligence agent · MI 0.1',
        governedByPolicy: 'UNSW policy v1.2',
        source: 'cohorts',
      },
    },
  };
}

function ChartColumn({
  a,
  b,
}: {
  a: { label: string; series: number[] };
  b: { label: string; series: number[] };
}) {
  const points = (series: number[]) =>
    series
      .map((v, i) => {
        const x = 20 + i * (860 / (series.length - 1));
        const y = 190 - (v / 100) * 168;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <div id="cohortsChart" className="flex flex-1 flex-col" style={{ padding: '22px 30px 22px 36px' }}>
      <div className="flex items-center justify-between">
        <div className="text-ink" style={{ fontSize: 16, fontWeight: 700 }}>
          Engagement, rolling 30-day
        </div>
        <div className="flex text-muted" style={{ gap: 16, fontSize: 13 }}>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span style={{ width: 18, height: 3, background: '#000', display: 'inline-block' }} />
            {a.label}
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span
              style={{ width: 18, height: 2, background: '#c8c8c8', display: 'inline-block' }}
            />
            {b.label}
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 900 200"
        preserveAspectRatio="none"
        style={{ width: '100%', flex: 1, minHeight: 220, marginTop: 12 }}
      >
        <line x1={0} x2={900} y1={20} y2={20} stroke="#ededed" strokeWidth={1} />
        <line x1={0} x2={900} y1={105} y2={105} stroke="#ededed" strokeWidth={1} />
        <line x1={0} x2={900} y1={190} y2={190} stroke="#000" strokeWidth={1.5} />
        <polyline points={points(b.series)} fill="none" stroke="#c8c8c8" strokeWidth={2} />
        <polyline points={points(a.series)} fill="none" stroke="#000" strokeWidth={3} />
      </svg>
      <div className="flex justify-between text-muted" style={{ fontSize: 12, marginTop: 6 }}>
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function FindingsColumn({
  a,
  b,
}: {
  a: import('../../lib/tab-data/cohorts-fixture').CohortRow;
  b: import('../../lib/tab-data/cohorts-fixture').CohortRow;
}) {
  const finding = cohortFinding(a, b);
  const allCohorts = Object.values(COHORTS);
  return (
    <div
      className="flex flex-col"
      style={{
        width: 420,
        borderLeft: '1px solid #e0e0e0',
        padding: '22px 36px 22px 30px',
        gap: 18,
      }}
    >
      <div>
        <div
          className="text-ink"
          style={{
            fontSize: 16,
            fontWeight: 700,
            borderBottom: '2px solid #000',
            paddingBottom: 8,
          }}
        >
          What the agent found
        </div>
        <div
          className="text-ink"
          style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}
        >
          {finding}
        </div>
      </div>
      <div>
        <div
          className="uppercase text-muted"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}
        >
          All cohorts
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Cohort', 'Size', 'Eng.', 'Δ vs Q1'].map((h, i) => (
                <th
                  key={h}
                  className="text-muted"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '9px 0',
                    textAlign: i === 0 ? 'left' : 'right',
                    borderBottom: '1px solid #ededed',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allCohorts.map((c) => (
              <tr key={c.key} style={{ borderBottom: '1px solid #ededed' }}>
                <td style={{ padding: '9px 0' }}>{c.label}</td>
                <td style={{ padding: '9px 0', textAlign: 'right' }} className="text-muted">
                  {c.size.toLocaleString()}
                </td>
                <td style={{ padding: '9px 0', fontWeight: 700, textAlign: 'right' }}>
                  {c.engagement}%
                </td>
                <td
                  style={{
                    padding: '9px 0',
                    textAlign: 'right',
                    color: c.deltaQ1 < 0 ? '#a13a3a' : '#0d7a54',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {c.deltaQ1 > 0 ? '+' : ''}
                  {c.deltaQ1}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex" style={{ gap: 8, marginTop: 'auto' }}>
        <span
          className="font-mono bg-paper"
          style={{
            border: '1px solid #1ac987',
            color: '#0d7a54',
            fontSize: 11,
            padding: '2px 8px',
          }}
        >
          query_ajo ✓
        </span>
        <span
          className="font-mono bg-paper"
          style={{
            border: '1px solid #1ac987',
            color: '#0d7a54',
            fontSize: 11,
            padding: '2px 8px',
          }}
        >
          compare_cohorts ✓
        </span>
      </div>
    </div>
  );
}
