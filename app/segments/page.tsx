'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  QueryBand,
  QueryStatic,
  QueryToken,
  AddConditionStub,
  RemoveConditionButton,
} from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import {
  DEFAULT_SEGMENTS_QUERY,
  matchCount,
  SEGMENTS_TOKEN_OPTIONS,
  type SegmentsQuery,
} from '../../lib/tab-data/segments-fixture';
import {
  SEGMENTS_SAMPLE,
  daysSince,
  formatMonthYear,
  type SegmentSampleRow,
} from '../../lib/tab-data/segments-sample';
import { useServerTool } from '../../hooks/useServerTool';
import { usePayload } from '../../components/PayloadContext';
import { buildAjoPayload, buildLookalikesPayload } from '../../lib/handoff/payloads';

const CHIPS = [
  { name: 'query_dynamics' },
  { name: 'query_aep' },
  { name: 'enrich_linkedin' },
  { name: 'run_propensity_model' },
];

const EXTRA_CONDITION_DEFS = {
  industry: {
    label: 'Industry',
    prefix: ', in',
    defaultValue: 'Technology',
    options: [
      { value: 'Technology', label: 'Technology' },
      { value: 'Financial Services', label: 'Financial Services' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Government', label: 'Government' },
      { value: 'Education', label: 'Education' },
      { value: 'Consulting', label: 'Consulting' },
    ],
  },
  state: {
    label: 'State',
    prefix: ', based in',
    defaultValue: 'NSW',
    options: [
      { value: 'NSW', label: 'New South Wales' },
      { value: 'VIC', label: 'Victoria' },
      { value: 'QLD', label: 'Queensland' },
      { value: 'WA', label: 'Western Australia' },
      { value: 'SA', label: 'South Australia' },
    ],
  },
} as const;

type ExtraConditionType = keyof typeof EXTRA_CONDITION_DEFS;
interface ExtraCondition { type: ExtraConditionType; value: string }

export default function SegmentsPage() {
  const [q, setQ] = useState<SegmentsQuery>(DEFAULT_SEGMENTS_QUERY);
  const [extras, setExtras] = useState<ExtraCondition[]>([]);
  const { call } = useServerTool();
  const { show } = usePayload();

  const rows = useMemo(() => filterSample(q, extras), [q, extras]);
  const count = matchCount(q);
  const emailConsentCount = Math.round(count * 0.87);

  // Fire real MCP tool calls in the background on token change.
  // Populates the audit log so the agent activity is visible; on-screen
  // numbers stay fixture-driven per the demo narrative.
  useEffect(() => {
    const criteria = mapQueryToAepCriteria(q);
    void call('query_aep', {
      audienceCriteria: criteria,
      limit: 20,
    }).catch(() => {});
    void call('run_propensity_model', {
      courseIdOrName: 'AI for Leaders',
      topN: 10,
    }).catch(() => {});
  }, [q, call]);

  const addExtra = (type: string) => {
    const t = type as ExtraConditionType;
    if (extras.some((e) => e.type === t)) return;
    setExtras((prev) => [...prev, { type: t, value: EXTRA_CONDITION_DEFS[t].defaultValue }]);
  };
  const updateExtra = (type: ExtraConditionType, value: string) =>
    setExtras((prev) => prev.map((e) => (e.type === type ? { ...e, value } : e)));
  const removeExtra = (type: ExtraConditionType) =>
    setExtras((prev) => prev.filter((e) => e.type !== type));

  const availableConditions = (Object.keys(EXTRA_CONDITION_DEFS) as ExtraConditionType[])
    .filter((t) => !extras.some((e) => e.type === t))
    .map((t) => ({ type: t, label: `Add ${EXTRA_CONDITION_DEFS[t].label.toLowerCase()} filter` }));

  const onDraftAjo = () => {
    show(
      `AJO campaign · ${label('study', q.study)} · ${label('signal', q.signal)}`,
      buildAjoPayload({ source: 'segments', query: q, audienceSize: count, rows }),
    );
  };

  const onFindLookalikes = () => {
    show(
      `Lookalike model · ${label('study', q.study)} · ${label('signal', q.signal)}`,
      buildLookalikesPayload({ source: 'segments', query: q, seedAudienceSize: count }),
    );
  };

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryToken
          value={q.study}
          onChange={(v) => setQ({ ...q, study: v as SegmentsQuery['study'] })}
          options={[...SEGMENTS_TOKEN_OPTIONS.study]}
          minWidth={220}
        />
        <QueryStatic>graduates</QueryStatic>
        <QueryToken
          value={q.signal}
          onChange={(v) => setQ({ ...q, signal: v as SegmentsQuery['signal'] })}
          options={[...SEGMENTS_TOKEN_OPTIONS.signal]}
          minWidth={240}
        />
        <QueryStatic>in the last</QueryStatic>
        <QueryToken
          value={q.window}
          onChange={(v) => setQ({ ...q, window: v as SegmentsQuery['window'] })}
          options={[...SEGMENTS_TOKEN_OPTIONS.window]}
          minWidth={200}
        />
        <QueryStatic>, working</QueryStatic>
        <QueryToken
          value={q.loc}
          onChange={(v) => setQ({ ...q, loc: v as SegmentsQuery['loc'] })}
          options={[...SEGMENTS_TOKEN_OPTIONS.loc]}
          minWidth={240}
        />
        <QueryStatic>, with no course purchase in</QueryStatic>
        <QueryToken
          value={q.gap}
          onChange={(v) => setQ({ ...q, gap: v as SegmentsQuery['gap'] })}
          options={[...SEGMENTS_TOKEN_OPTIONS.gap]}
          minWidth={200}
        />
        {extras.map((c) => (
          <Fragment key={c.type}>
            <QueryStatic>{EXTRA_CONDITION_DEFS[c.type].prefix}</QueryStatic>
            <QueryToken
              value={c.value}
              options={[...EXTRA_CONDITION_DEFS[c.type].options]}
              onChange={(v) => updateExtra(c.type, v)}
              minWidth={200}
            />
            <RemoveConditionButton onClick={() => removeExtra(c.type)} />
          </Fragment>
        ))}
        <AddConditionStub available={availableConditions} onAdd={addExtra} />
      </QueryBand>

      <ResultHeader
        count={count}
        emailConsentCount={emailConsentCount}
        onDraftAjo={onDraftAjo}
        onFindLookalikes={onFindLookalikes}
      />

      <ResultTable rows={rows} />

      <ToolFooter chips={CHIPS} />
    </div>
  );
}

function label<K extends keyof typeof SEGMENTS_TOKEN_OPTIONS>(key: K, value: string): string {
  return SEGMENTS_TOKEN_OPTIONS[key].find((o) => o.value === value)?.label ?? value;
}

function mapQueryToAepCriteria(q: SegmentsQuery) {
  const industries =
    q.study === 'cs'
      ? ['Technology']
      : q.study === 'eng'
        ? ['Technology', 'Manufacturing', 'Energy']
        : q.study === 'commerce'
          ? ['Financial Services', 'Consulting', 'Retail']
          : undefined;
  const states =
    q.loc === 'outside-sydney'
      ? ['VIC', 'QLD', 'WA', 'SA', 'ACT', 'TAS', 'NT']
      : q.loc === 'regional-nsw'
        ? ['NSW']
        : undefined;
  return { industries, states, hasRecentSignal: true };
}

function filterSample(q: SegmentsQuery, extras: ExtraCondition[] = []): SegmentSampleRow[] {
  const windowDays = q.window === '6m' ? 183 : q.window === '12m' ? 365 : 730;
  const gapDays = q.gap === '1y' ? 365 : q.gap === '3y' ? 3 * 365 : 5 * 365;
  return SEGMENTS_SAMPLE.filter((row) => {
    if (q.study !== 'any' && row.study !== q.study) return false;
    if (q.signal !== 'any') {
      const need =
        q.signal === 'promoted'
          ? 'promoted'
          : q.signal === 'role-change'
            ? 'role-change'
            : 'redundancy';
      if (!row.signals.includes(need as SegmentSampleRow['signals'][number])) return false;
    }
    if (q.loc === 'outside-sydney' && row.sydneyMetro) return false;
    if (q.loc === 'regional-nsw' && !(row.state === 'NSW' && !row.sydneyMetro)) return false;
    if (daysSince(row.eventDate) > windowDays) return false;
    if (daysSince(row.lastCourseDate) < gapDays) return false;
    for (const c of extras) {
      if (c.type === 'industry' && row.industry !== c.value) return false;
      if (c.type === 'state' && row.state !== c.value) return false;
    }
    return true;
  });
}

function ResultHeader({
  count,
  emailConsentCount,
  onDraftAjo,
  onFindLookalikes,
}: {
  count: number;
  emailConsentCount: number;
  onDraftAjo: () => void;
  onFindLookalikes: () => void;
}) {
  return (
    <div
      className="flex flex-none items-end justify-between"
      style={{ padding: '18px 36px 14px', borderBottom: '1px solid #000' }}
    >
      <div>
        <div
          className="text-ink"
          style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          {count.toLocaleString()} alumni matched
        </div>
        <div className="text-muted" style={{ fontSize: 14, marginTop: 2 }}>
          ranked for AI for Leaders · {emailConsentCount.toLocaleString()} hold email consent · 12
          removed by suppression list
        </div>
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <OutlineButton onClick={onDraftAjo}>Draft AJO campaign</OutlineButton>
        <OutlineButton onClick={onFindLookalikes}>Find lookalikes</OutlineButton>
        <OutlineButton href="/forecast">Forecast this segment</OutlineButton>
      </div>
    </div>
  );
}

function OutlineButton({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = 'cursor-pointer bg-paper text-ink transition-colors hover:bg-ink hover:text-paper';
  const style = {
    border: '2px solid #000',
    fontSize: 14,
    fontWeight: 500,
    padding: '9px 16px',
  } as const;
  if (href) {
    return (
      <a href={href} className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

const PAGE_SIZE = 20;

function ResultTable({ rows }: { rows: SegmentSampleRow[] }) {
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const from = rows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, rows.length);

  const cols = ['Name', 'Current role', 'Employer', 'Location', 'Signals', 'Last course', 'Consent', 'Propensity'];

  return (
    <div className="flex flex-col">
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
                    i === 0 ? '11px 12px 11px 36px' : i === 7 ? '11px 36px 11px 12px' : '11px 12px',
                  borderBottom: '1px solid #e0e0e0',
                  textAlign: i === 7 ? 'right' : 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="text-muted"
                style={{ padding: '14px 36px', borderBottom: '1px solid #ededed' }}
              >
                No alumni in the sample match this query — widen a condition above.
              </td>
            </tr>
          )}
          {pageRows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-mist"
              style={{ borderBottom: '1px solid #ededed' }}
            >
              <td style={{ padding: '12px 12px 12px 36px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {row.name}
              </td>
              <td style={{ padding: '12px' }}>{row.role}</td>
              <td style={{ padding: '12px' }} className="text-muted">
                {row.employer}
              </td>
              <td style={{ padding: '12px' }} className="text-muted">
                {row.city}
              </td>
              <td style={{ padding: '12px' }} className="text-muted">
                {row.signals.join(', ')}
              </td>
              <td style={{ padding: '12px' }} className="text-muted">
                {formatMonthYear(row.lastCourseDate)}
              </td>
              <td style={{ padding: '12px' }} className="text-ok-text">
                {row.consent}
              </td>
              <td
                style={{
                  padding: '12px 36px 12px 12px',
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
      {totalPages > 1 && (
        <Pagination
          from={from}
          to={to}
          total={rows.length}
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}

function Pagination({
  from,
  to,
  total,
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="flex flex-none items-center justify-between bg-paper"
      style={{ padding: '10px 36px', borderTop: '1px solid #e0e0e0' }}
    >
      <span className="text-muted" style={{ fontSize: 13 }}>
        {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 0}
          className="text-ink disabled:text-muted-soft"
          style={{ border: '2px solid currentColor', fontSize: 13, fontWeight: 500, padding: '5px 14px' }}
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="text-ink disabled:text-muted-soft"
          style={{ border: '2px solid currentColor', fontSize: 13, fontWeight: 500, padding: '5px 14px' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
