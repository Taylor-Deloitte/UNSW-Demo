'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueryBand, QueryStatic, QueryToken, AddConditionStub } from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import {
  DEFAULT_SIGNALS_QUERY,
  deriveSignalCounts,
  FIXED_SIGNAL_TOTALS,
  SIGNALS_TOKEN_OPTIONS,
  bestCourseFit,
  type SignalsQuery,
} from '../../lib/tab-data/signals-fixture';
import {
  SEGMENTS_SAMPLE,
  daysSince,
  formatMonthYear,
  formatWhen,
  type SegmentSampleRow,
} from '../../lib/tab-data/segments-sample';
import { useServerTool } from '../../hooks/useServerTool';

const CHIPS = [{ name: 'query_aep' }, { name: 'query_dynamics' }, { name: 'run_propensity_model' }];

export default function SignalsPage() {
  const [q, setQ] = useState<SignalsQuery>(DEFAULT_SIGNALS_QUERY);
  const { call } = useServerTool();

  const { momentsTotal, momentsUnactioned } = deriveSignalCounts(q);
  const rows = useMemo(() => filterAndRank(q), [q]);

  // Background tool calls on token change — feeds the audit log.
  useEffect(() => {
    const signalType =
      q.scope === 'promoted'
        ? 'promoted'
        : q.scope === 'role-change'
          ? 'role_change'
          : q.scope === 'redundancy'
            ? 'redundancy_risk'
            : 'promoted';
    const withinDays = q.window === '7d' ? 7 : q.window === '30d' ? 30 : 90;
    void call('query_linkedin', {
      mode: 'by_signal_type',
      signalType,
      withinDays,
      limit: 20,
    }).catch(() => {});
    void call('query_dynamics', {
      entity: 'prospects',
      filters: {},
      limit: 20,
    }).catch(() => {});
  }, [q, call]);

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryStatic>Show</QueryStatic>
        <QueryToken
          value={q.scope}
          onChange={(v) => setQ({ ...q, scope: v as SignalsQuery['scope'] })}
          options={[...SIGNALS_TOKEN_OPTIONS.scope]}
          minWidth={220}
        />
        <QueryStatic>from the last</QueryStatic>
        <QueryToken
          value={q.window}
          onChange={(v) => setQ({ ...q, window: v as SignalsQuery['window'] })}
          options={[...SIGNALS_TOKEN_OPTIONS.window]}
          minWidth={180}
        />
        <QueryStatic>, ranked by</QueryStatic>
        <QueryToken
          value={q.rank}
          onChange={(v) => setQ({ ...q, rank: v as SignalsQuery['rank'] })}
          options={[...SIGNALS_TOKEN_OPTIONS.rank]}
          minWidth={200}
        />
        <AddConditionStub />
      </QueryBand>

      <MetricStrip
        cells={[
          { label: 'Moments detected', value: momentsTotal.toLocaleString() },
          { label: 'Unactioned', value: momentsUnactioned.toLocaleString() },
          { label: 'Promoted', value: FIXED_SIGNAL_TOTALS.promoted.toString() },
          { label: 'Role change', value: FIXED_SIGNAL_TOTALS.roleChange.toString() },
          { label: 'Course gap 3y+', value: FIXED_SIGNAL_TOTALS.courseGap.toString() },
          { label: 'Redundancy risk', value: FIXED_SIGNAL_TOTALS.redundancyRisk.toString() },
        ]}
      />

      <FeedTable rows={rows} />

      <ToolFooter chips={CHIPS} />
    </div>
  );
}

function filterAndRank(q: SignalsQuery): SegmentSampleRow[] {
  const need =
    q.scope === 'all'
      ? null
      : q.scope === 'promoted'
        ? 'promoted'
        : q.scope === 'role-change'
          ? 'role-change'
          : 'redundancy';
  const windowDays = q.window === '7d' ? 7 : q.window === '30d' ? 30 : 90;
  const filtered = SEGMENTS_SAMPLE.filter((r) => {
    if (daysSince(r.eventDate) > windowDays) return false;
    if (need && !r.signals.includes(need as SegmentSampleRow['signals'][number])) return false;
    return true;
  });
  if (q.rank === 'course-value') {
    return [...filtered].sort((a, b) => a.grad - b.grad);
  }
  if (q.rank === 'recency') {
    return [...filtered].sort((a, b) => daysSince(a.eventDate) - daysSince(b.eventDate));
  }
  return [...filtered].sort((a, b) => b.score - a.score);
}

function MetricStrip({ cells }: { cells: Array<{ label: string; value: string }> }) {
  return (
    <div className="flex flex-none" style={{ borderBottom: '1px solid #000' }}>
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="flex-1"
          style={{
            padding:
              i === 0
                ? '18px 12px 18px 36px'
                : i === cells.length - 1
                  ? '18px 36px 18px 12px'
                  : '18px 12px',
            borderLeft: i === 0 ? undefined : '1px solid #e0e0e0',
          }}
        >
          <div
            className="uppercase text-muted"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}
          >
            {c.label}
          </div>
          <div
            className="text-ink"
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedTable({ rows }: { rows: SegmentSampleRow[] }) {
  const cols = [
    'When',
    'Alumnus',
    'What happened',
    'Location',
    'Last course',
    'Best course fit',
    'Confidence',
  ];
  return (
    <div className="overflow-auto" style={{ maxHeight: 760 }}>
      <table className="w-full text-left" style={{ borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {cols.map((h, i) => (
              <th
                key={h}
                className="uppercase text-muted"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding:
                    i === 0
                      ? '11px 12px 11px 36px'
                      : i === cols.length - 1
                        ? '11px 36px 11px 12px'
                        : '11px 12px',
                  textAlign: i === cols.length - 1 ? 'right' : 'left',
                  borderBottom: '1px solid #e0e0e0',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-mist"
              style={{ borderBottom: '1px solid #ededed' }}
            >
              <td
                className="text-muted"
                style={{ padding: '11px 12px 11px 36px', whiteSpace: 'nowrap' }}
              >
                {formatWhen(row.eventDate)}
              </td>
              <td style={{ padding: '11px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {row.name}
              </td>
              <td style={{ padding: '11px 12px' }}>{row.event}</td>
              <td className="text-muted" style={{ padding: '11px 12px' }}>
                {row.city}
              </td>
              <td className="text-muted" style={{ padding: '11px 12px' }}>
                {formatMonthYear(row.lastCourseDate)}
              </td>
              <td className="text-muted" style={{ padding: '11px 12px' }}>
                {bestCourseFit(row.industry)}
              </td>
              <td
                style={{
                  padding: '11px 36px 11px 12px',
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {row.score.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
