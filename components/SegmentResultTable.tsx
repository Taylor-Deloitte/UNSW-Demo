import type { ExtractedSegment } from '../lib/agent/extract-segment';

export function SegmentResultTable({ segment }: { segment: ExtractedSegment }) {
  const showPropensity = segment.source === 'run_propensity_model';

  return (
    <div className="rounded-xl border border-unsw-navy/10 bg-white shadow-sm">
      <header className="flex items-baseline justify-between border-b border-unsw-navy/10 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-unsw-navy">
            {segment.audienceSize.toLocaleString()} alumni matched
          </div>
          {segment.courseContext && (
            <div className="text-xs text-unsw-slate">Ranked for: {segment.courseContext}</div>
          )}
        </div>
        <span className="rounded-full border border-unsw-navy/20 px-2 py-0.5 font-mono text-xs text-unsw-slate">
          source: {segment.source}
        </span>
      </header>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-unsw-mist text-xs uppercase tracking-wide text-unsw-slate">
            <tr>
              <th className="px-4 py-2">Name</th>
              {!showPropensity && <th className="px-4 py-2">Industry</th>}
              {!showPropensity && <th className="px-4 py-2">Seniority</th>}
              {!showPropensity && <th className="px-4 py-2">Location</th>}
              {showPropensity && <th className="px-4 py-2 text-right">Propensity</th>}
              {showPropensity && <th className="px-4 py-2">Top features</th>}
            </tr>
          </thead>
          <tbody>
            {segment.rows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-unsw-slate" colSpan={5}>
                  No rows returned. Try refining the prompt.
                </td>
              </tr>
            )}
            {segment.rows.map((r) => (
              <tr key={r.id} className="border-t border-unsw-navy/5">
                <td className="px-4 py-2 font-medium text-unsw-navy">{r.displayName}</td>
                {!showPropensity && <td className="px-4 py-2">{r.industry ?? '—'}</td>}
                {!showPropensity && <td className="px-4 py-2">{r.seniority ?? '—'}</td>}
                {!showPropensity && <td className="px-4 py-2">{r.location ?? '—'}</td>}
                {showPropensity && (
                  <td className="px-4 py-2 text-right font-mono">
                    {r.propensityScore?.toFixed(3) ?? '—'}
                  </td>
                )}
                {showPropensity && (
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.topFeatures?.map((f) => (
                        <span
                          key={f}
                          className="rounded-full bg-unsw-mist px-2 py-0.5 text-xs text-unsw-slate"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
