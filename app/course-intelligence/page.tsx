'use client';

import { useEffect, useMemo, useState } from 'react';
import { QueryBand, QueryStatic, QueryToken } from '../../components/QueryBand';
import { ToolFooter } from '../../components/ToolFooter';
import { usePayload } from '../../components/PayloadContext';
import { useServerTool } from '../../hooks/useServerTool';
import { useSessionId } from '../../hooks/useSessionId';
import { CampaignPlannerChat } from '../../components/CampaignPlannerChat';
import { SavedPlansPanel } from '../../components/SavedPlansPanel';
import type { CoursePlanRecord } from '../../lib/agent/session-store';
import {
  getCourseIntelligence,
  type AgentStep,
  type CatalogueGap,
  type Cohort,
  type CourseIntelligenceResult,
  type CourseRecommendation,
  type MarketTrend,
  type Signal,
  type Window,
} from '../../lib/tab-data/course-intelligence-fixture';
import { buildCrmCampaignPayload } from '../../lib/handoff/payloads';

const CHIPS = [
  { name: 'query_dynamics' },
  { name: 'query_aep' },
  { name: 'run_propensity_model' },
  { name: 'query_linkedin' },
];

const COHORT_OPTIONS = [
  { value: 'cs', label: 'CS graduates' },
  { value: 'eng', label: 'Engineering graduates' },
  { value: 'commerce', label: 'Commerce graduates' },
  { value: 'all', label: 'all alumni' },
] as const;

const SIGNAL_OPTIONS = [
  { value: 'role-change', label: 'changed role' },
  { value: 'promoted', label: 'were promoted' },
  { value: 'redundancy', label: 'are at redundancy risk' },
  { value: 'any', label: 'had any signal' },
] as const;

const WINDOW_OPTIONS = [
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: '24m', label: '24 months' },
] as const;

interface CiQuery {
  cohort: Cohort;
  signal: Signal;
  window: Window;
}

const DEFAULT_Q: CiQuery = { cohort: 'cs', signal: 'role-change', window: '12m' };

const PCT = new Intl.NumberFormat('en-AU', {
  style: 'percent',
  minimumFractionDigits: 1,
});

export default function CourseIntelligencePage() {
  const [q, setQ] = useState<CiQuery>(DEFAULT_Q);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [plans, setPlans] = useState<CoursePlanRecord[]>([]);
  const { show } = usePayload();
  const { call } = useServerTool();
  const sessionId = useSessionId();

  const result: CourseIntelligenceResult = useMemo(
    () => getCourseIntelligence(q.cohort, q.signal, q.window),
    [q],
  );

  // Cascade-reveal agent reasoning steps on load and query change
  useEffect(() => {
    setVisibleSteps(0);
    const timers = result.agentSteps.map((_, i) =>
      setTimeout(() => setVisibleSteps(i + 1), i * 450),
    );
    return () => timers.forEach(clearTimeout);
  }, [q, result.agentSteps]);

  // Fire MCP tool calls in background so audit log populates
  useEffect(() => {
    const top = result.recommendations[0];
    void call('query_dynamics', {
      entity: 'alumni',
      filter: `cohort:${q.cohort}`,
      limit: 20,
    }).catch(() => {});
    void call('query_aep', {
      audienceCriteria: { signal: q.signal, window: q.window },
      limit: 20,
    }).catch(() => {});
    void call('run_propensity_model', {
      courseIdOrName: top?.courseName ?? 'AI for Leaders',
      topN: 10,
    }).catch(() => {});
    void call('query_linkedin', {
      signal: q.signal,
      cohort: q.cohort,
      limit: 10,
    }).catch(() => {});
  }, [q, call, result.recommendations]);

  // Load any campaign plans already saved for this session
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/course-planner?sessionId=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok ? res.json() : { plans: [] }))
      .then((data: { plans?: CoursePlanRecord[] }) => {
        if (!cancelled) setPlans(data.plans ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const top = result.recommendations[0];
  const cohortLabel = COHORT_OPTIONS.find((o) => o.value === q.cohort)?.label ?? q.cohort;

  const onPushToCrm = () => {
    show(
      `CRM campaign draft · ${top.courseName} · ${cohortLabel}`,
      buildCrmCampaignPayload({
        cohortLabel,
        topCourseName: top.courseName,
        topCourseCode: top.courseCode,
        matchedAlumni: top.matchedAlumni,
        catalogueGaps: result.catalogueGaps,
      }),
    );
  };

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      <QueryBand>
        <QueryStatic>Show opportunities for</QueryStatic>
        <QueryToken
          value={q.cohort}
          onChange={(v) => setQ({ ...q, cohort: v as Cohort })}
          options={[...COHORT_OPTIONS]}
          minWidth={240}
        />
        <QueryStatic>who</QueryStatic>
        <QueryToken
          value={q.signal}
          onChange={(v) => setQ({ ...q, signal: v as Signal })}
          options={[...SIGNAL_OPTIONS]}
          minWidth={220}
        />
        <QueryStatic>in the last</QueryStatic>
        <QueryToken
          value={q.window}
          onChange={(v) => setQ({ ...q, window: v as Window })}
          options={[...WINDOW_OPTIONS]}
          minWidth={160}
        />
      </QueryBand>

      <CoursePlannerSection
        sessionId={sessionId}
        plans={plans}
        onPlanSaved={(plan) => setPlans((prev) => [...prev, plan])}
      />

      <AgentReasoningBand
        steps={result.agentSteps}
        visibleSteps={visibleSteps}
        summary={result.agentSummary}
      />

      <div className="flex flex-1" style={{ minHeight: 0, overflowY: 'auto' }}>
        <RecommendationsColumn recommendations={result.recommendations} />
        <SideColumn
          trends={result.marketTrends}
          gaps={result.catalogueGaps}
          onPushToCrm={onPushToCrm}
        />
      </div>

      <ToolFooter chips={CHIPS} />
    </div>
  );
}

function AgentReasoningBand({
  steps,
  visibleSteps,
  summary,
}: {
  steps: AgentStep[];
  visibleSteps: number;
  summary: string;
}) {
  return (
    <div
      id="ciReasoning"
      className="flex-none bg-ink"
      style={{ padding: '20px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div
        className="uppercase text-unsw-yellow"
        style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em' }}
      >
        Agent reasoning
      </div>
      <div className="flex flex-wrap" style={{ gap: '10px 32px' }}>
        {steps.map((step, i) => {
          const visible = i < visibleSteps;
          return (
            <div
              key={step.id}
              className="flex items-center text-white"
              style={{
                gap: 8,
                fontSize: 13,
                opacity: visible ? 1 : 0.25,
                transition: 'opacity 0.3s ease',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: visible ? '#1ac987' : 'transparent',
                  border: `1.5px solid ${visible ? '#1ac987' : 'rgba(255,255,255,0.3)'}`,
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {visible ? '✓' : ''}
              </span>
              <span style={{ fontWeight: 500 }}>{step.label}</span>
            </div>
          );
        })}
      </div>
      {visibleSteps >= steps.length && (
        <div
          className="text-white"
          style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, maxWidth: 860 }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

function RecommendationsColumn({ recommendations }: { recommendations: CourseRecommendation[] }) {
  return (
    <div
      id="ciRecommendations"
      className="flex flex-1 flex-col"
      style={{ padding: '22px 30px 22px 36px' }}
    >
      <div
        className="text-ink"
        style={{
          fontSize: 16,
          fontWeight: 700,
          borderBottom: '2px solid #000',
          paddingBottom: 8,
        }}
      >
        Course recommendations
      </div>
      <div
        className="flex uppercase text-muted"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          padding: '10px 0 8px',
        }}
      >
        <span style={{ flex: '0 0 32px' }}>#</span>
        <span style={{ flex: 1 }}>Course</span>
        <span style={{ width: 130 }}>Matched alumni</span>
        <span style={{ width: 120, textAlign: 'right' }}>Historical conv.</span>
        <span style={{ width: 80, textAlign: 'right' }}>Score</span>
      </div>
      <div>
        {recommendations.map((rec) => (
          <RecommendationRow key={rec.rank} rec={rec} />
        ))}
      </div>
    </div>
  );
}

function RecommendationRow({ rec }: { rec: CourseRecommendation }) {
  return (
    <div className="hover:bg-mist" style={{ borderBottom: '1px solid #ededed', cursor: 'default' }}>
      <div className="flex items-start" style={{ padding: '14px 0' }}>
        <span
          className="text-muted"
          style={{ flex: '0 0 32px', fontSize: 13, fontWeight: 700, paddingTop: 2 }}
        >
          {rec.rank}
        </span>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{rec.courseName}</span>
            {rec.badge === 'trending' && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#0d7a54',
                  border: '1px solid #1ac987',
                  padding: '1px 6px',
                  background: '#fff',
                  flexShrink: 0,
                }}
              >
                Trending
              </span>
            )}
          </div>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
            {rec.rationale}
          </div>
        </div>
        <div
          style={{
            width: 130,
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {rec.matchedAlumni.toLocaleString()}
        </div>
        <div
          style={{
            width: 120,
            textAlign: 'right',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {PCT.format(rec.historicalConversionPct)}
        </div>
        <div
          style={{
            width: 80,
            textAlign: 'right',
            fontSize: 16,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            paddingTop: 2,
          }}
        >
          {rec.opportunityScore.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function SideColumn({
  trends,
  gaps,
  onPushToCrm,
}: {
  trends: MarketTrend[];
  gaps: CatalogueGap[];
  onPushToCrm: () => void;
}) {
  return (
    <div
      className="flex flex-col"
      style={{
        width: 420,
        flexShrink: 0,
        borderLeft: '1px solid #e0e0e0',
        padding: '22px 36px 22px 30px',
        gap: 24,
        overflowY: 'auto',
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
            marginBottom: 12,
          }}
        >
          Market outlook · next 6–12 months
        </div>
        <ul
          className="text-muted"
          style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 18, listStyle: 'disc' }}
        >
          {trends.map((t) => (
            <li key={t.id}>{t.text}</li>
          ))}
        </ul>
      </div>

      <div>
        <div
          className="uppercase text-muted"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            marginBottom: 10,
          }}
        >
          Catalogue gaps
        </div>
        {gaps.map((gap) => (
          <div key={gap.id} style={{ borderBottom: '1px solid #ededed', padding: '10px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{gap.title}</div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>
              {gap.signal}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <span className="text-muted">Potential cohort: </span>
              <span style={{ fontWeight: 700 }}>{gap.potentialCohortSize.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col" style={{ marginTop: 'auto', gap: 12 }}>
        <button
          type="button"
          onClick={onPushToCrm}
          className="w-full bg-unsw-yellow text-ink transition-colors hover:bg-ink hover:text-unsw-yellow"
          style={{ fontSize: 15, fontWeight: 700, padding: '13px 22px', textAlign: 'center' }}
        >
          Push to CRM
        </button>
        <button
          type="button"
          className="w-full bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
          style={{
            border: '2px solid #000',
            fontSize: 14,
            fontWeight: 500,
            padding: '11px 20px',
          }}
          onClick={onPushToCrm}
        >
          Draft AJO campaign
        </button>
      </div>
    </div>
  );
}

function CoursePlannerSection({
  sessionId,
  plans,
  onPlanSaved,
}: {
  sessionId: string;
  plans: CoursePlanRecord[];
  onPlanSaved: (plan: CoursePlanRecord) => void;
}) {
  return (
    <div
      className="flex-none"
      style={{ borderTop: '2px solid #000', padding: '22px 36px', display: 'flex', gap: 24 }}
    >
      <div style={{ flex: 2, minWidth: 0 }}>
        <CampaignPlannerChat sessionId={sessionId} onPlanSaved={onPlanSaved} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SavedPlansPanel plans={plans} />
      </div>
    </div>
  );
}
