'use client';

import type { ExtractedSegment } from '../lib/agent/extract-segment';

export function SegmentActionsBar({
  segment,
  busy,
  onFollowUp,
}: {
  segment: ExtractedSegment;
  busy: boolean;
  onFollowUp: (prompt: string) => void;
}) {
  const label = segment.courseContext
    ? `for ${segment.courseContext}`
    : `of ${segment.audienceSize} alumni`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-unsw-navy/10 bg-white p-3 shadow-sm">
      <span className="mr-2 text-xs text-unsw-slate">Actions on this segment {label}:</span>
      <ActionButton
        label="Save to AEP"
        busy={busy}
        onClick={() =>
          onFollowUp(
            `Save the current audience as an AEP segment called "${suggestName(segment)}" and confirm the segment ID.`,
          )
        }
      />
      <ActionButton
        label="Draft AJO campaign"
        busy={busy}
        onClick={() =>
          onFollowUp(
            `Draft an email campaign in AJO for the segment you just created. Pick a compelling subject line and a 2-sentence body preview.`,
          )
        }
      />
      <ActionButton
        label="Find lookalikes"
        busy={busy}
        onClick={() =>
          onFollowUp(
            `Now find alumni who look like the top-scoring people in this segment. Same seniority band, same industries, expand geography.`,
          )
        }
      />
      <ActionButton
        label="Refine: tighter"
        busy={busy}
        onClick={() =>
          onFollowUp(
            `Refine the segment — I want a tighter, higher-propensity audience. Aim for around half the current size.`,
          )
        }
      />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md border border-unsw-navy/20 bg-white px-3 py-1.5 text-sm text-unsw-navy hover:bg-unsw-mist disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function suggestName(segment: ExtractedSegment): string {
  if (segment.courseContext) return `${segment.courseContext} — high propensity`;
  return `Audience of ${segment.audienceSize}`;
}
