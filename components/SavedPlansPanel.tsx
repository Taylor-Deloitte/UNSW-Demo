'use client';

import { usePayload } from './PayloadContext';
import type { CoursePlanRecord } from '../lib/agent/session-store';

const CONFIDENCE_COLOR: Record<CoursePlanRecord['confidence'], string> = {
  High: '#0d7a54',
  Medium: '#8a6d00',
  Low: '#8a1f11',
};

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const PANEL_HEIGHT = 460;

export function SavedPlansPanel({ plans }: { plans: CoursePlanRecord[] }) {
  const { show } = usePayload();

  return (
    <div
      className="flex flex-col"
      style={{ border: '2px solid #000', background: '#fff', height: PANEL_HEIGHT }}
    >
      <div
        className="text-ink flex-none"
        style={{
          fontSize: 16,
          fontWeight: 700,
          borderBottom: '2px solid #000',
          padding: '12px 18px',
        }}
      >
        Saved campaign plans
      </div>
      <div
        className="flex-1"
        style={{
          padding: plans.length === 0 ? '16px 18px' : '4px 0',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {plans.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13, fontStyle: 'italic' }}>
            Confirmed campaigns from the planner will appear here.
          </div>
        )}
        {plans.map((plan) => (
          <div key={plan.id} style={{ borderBottom: '1px solid #ededed', padding: '14px 18px' }}>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{plan.courseName}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: CONFIDENCE_COLOR[plan.confidence],
                  border: `1px solid ${CONFIDENCE_COLOR[plan.confidence]}`,
                  padding: '1px 6px',
                }}
              >
                {plan.confidence} confidence
              </span>
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              {plan.variantName} · {plan.classification.replace('-', ' ')}
            </div>
            <div className="flex" style={{ gap: 20, fontSize: 13, marginBottom: 8 }}>
              <div>
                <span className="text-muted">Eligible pool </span>
                <span style={{ fontWeight: 700 }}>{plan.eligiblePool.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted">Est. enrolments </span>
                <span style={{ fontWeight: 700 }}>{plan.estimatedEnrolments.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted">Est. revenue </span>
                <span style={{ fontWeight: 700 }}>
                  {plan.estimatedRevenueAud !== null ? AUD.format(plan.estimatedRevenueAud) : '—'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                show(`Campaign payload · ${plan.courseName}`, {
                  crmCampaign: plan.crmCampaign,
                  aepSegment: plan.aepSegment,
                })
              }
              className="bg-paper text-ink transition-colors hover:bg-ink hover:text-paper"
              style={{
                border: '2px solid #000',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
              }}
            >
              View payload
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
