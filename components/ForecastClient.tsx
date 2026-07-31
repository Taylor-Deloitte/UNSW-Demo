'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { computeForecast, type ForecastInput } from '../lib/tab-data/forecast';

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

export function ForecastClient() {
  const [input, setInput] = useState<ForecastInput>({
    segmentSize: 340,
    baselineConversionRate: 0.02,
    upliftPct: 6,
    courseValueAud: 3500,
    campaignCostAud: 8000,
  });

  const result = useMemo(() => computeForecast(input), [input]);

  function upd<K extends keyof ForecastInput>(key: K, value: number) {
    setInput((i) => ({ ...i, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-unsw-slate">Segment context</div>
          <div className="mt-1 text-sm text-unsw-navy">
            Forecasting for a segment of{' '}
            <input
              type="number"
              min={1}
              value={input.segmentSize}
              onChange={(e) => upd('segmentSize', Number(e.target.value))}
              className="w-24 rounded border border-unsw-navy/20 px-2 py-0.5 text-right font-mono"
            />{' '}
            alumni.
          </div>
          <div className="mt-2 text-xs text-unsw-slate">
            Tie a segment from the Segmentation tab, or set an arbitrary size to explore.
          </div>
        </div>

        <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
          <SliderRow
            label="Baseline conversion"
            value={input.baselineConversionRate * 100}
            min={0.5}
            max={10}
            step={0.5}
            suffix="%"
            onChange={(v) => upd('baselineConversionRate', v / 100)}
          />
          <SliderRow
            label="Uplift from campaign"
            value={input.upliftPct}
            min={0}
            max={20}
            step={0.5}
            suffix=" pts"
            onChange={(v) => upd('upliftPct', v)}
          />
        </div>

        <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
          <SliderRow
            label="Average course value"
            value={input.courseValueAud}
            min={500}
            max={8000}
            step={100}
            prefix="$"
            onChange={(v) => upd('courseValueAud', v)}
          />
          <SliderRow
            label="Campaign cost"
            value={input.campaignCostAud}
            min={1000}
            max={50000}
            step={1000}
            prefix="$"
            onChange={(v) => upd('campaignCostAud', v)}
          />
        </div>
      </div>

      <div className="rounded-xl border-2 border-unsw-yellow bg-white p-6 text-center shadow-sm">
        <div className="text-xs uppercase tracking-wide text-unsw-slate">
          Projected incremental revenue (12 months)
        </div>
        <div className="mt-2 text-5xl font-semibold text-unsw-navy">
          {AUD.format(result.incrementalRevenueAud)}
        </div>
        <div className="mt-1 text-sm text-unsw-slate">
          {result.incrementalConversions.toFixed(0)} incremental enrolments · ROI{' '}
          <span
            className={result.roi >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}
          >
            {(result.roi * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-unsw-navy/10 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-unsw-navy">
          Baseline vs treated — monthly enrolments
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={result.monthly} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#3E4A56' }} />
              <YAxis tick={{ fontSize: 11, fill: '#3E4A56' }} />
              <Tooltip
                formatter={(v: unknown) => Number(v).toFixed(1)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#94a3b8"
                strokeWidth={2}
                name="Baseline"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="treated"
                stroke="#001A2C"
                strokeWidth={2}
                name="Treated (with campaign)"
                dot={{ r: 3, fill: '#FFD100' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-unsw-navy/10 bg-unsw-mist p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-unsw-slate">
          Model assumptions
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-unsw-navy">
          {result.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  prefix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  prefix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-unsw-slate">{label}</label>
        <span className="font-mono text-sm text-unsw-navy">
          {prefix ?? ''}
          {value.toLocaleString()}
          {suffix ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-unsw-navy"
      />
    </div>
  );
}
