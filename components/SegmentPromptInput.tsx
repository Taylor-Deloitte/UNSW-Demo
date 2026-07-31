'use client';

import { useState } from 'react';

const EXAMPLES = [
  'CS graduates promoted in the last 12 months, working outside Sydney, no course purchases in 3 years',
  'Alumni in Financial Services who moved into a Director role recently',
  'Mid-career alumni in Healthcare with a 5-year course gap',
];

export function SegmentPromptInput({
  onSubmit,
  busy,
}: {
  onSubmit: (prompt: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState('');

  function submit() {
    if (!value.trim() || busy) return;
    onSubmit(value);
    setValue('');
  }

  return (
    <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
      <label className="text-sm font-semibold text-unsw-navy">Describe the audience</label>
      <p className="mb-2 text-xs text-unsw-slate">
        Natural language, no query language required. The agent plans the query across Dynamics + AEP
        + LinkedIn.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder={EXAMPLES[0]}
        disabled={busy}
        className="w-full rounded-md border border-unsw-navy/20 px-3 py-2 text-sm focus:border-unsw-navy focus:outline-none disabled:opacity-50"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="text-xs text-unsw-slate">
          Try:{' '}
          {EXAMPLES.slice(1).map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setValue(ex)}
              disabled={busy}
              className="mr-2 rounded-full border border-unsw-navy/20 px-2 py-0.5 hover:bg-unsw-mist disabled:opacity-50"
            >
              {ex.slice(0, 40)}…
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !value.trim()}
          className="rounded-md bg-unsw-navy px-4 py-2 text-sm font-medium text-white hover:bg-unsw-navy/90 disabled:opacity-50"
        >
          {busy ? 'Building…' : 'Build segment'}
        </button>
      </div>
    </div>
  );
}
