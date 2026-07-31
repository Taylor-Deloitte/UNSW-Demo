export interface ForecastInput {
  segmentSize: number;
  baselineConversionRate: number; // 0..1
  upliftPct: number; // percentage points added to conversion for treated group
  courseValueAud: number;
  campaignCostAud: number;
}

export interface ForecastMonth {
  month: string; // "M+1" .. "M+12"
  baseline: number; // conversions
  treated: number; // conversions
}

export interface ForecastResult {
  monthly: ForecastMonth[];
  incrementalConversions: number;
  incrementalRevenueAud: number;
  roi: number; // (revenue - cost) / cost
  assumptions: string[];
}

export function computeForecast(input: ForecastInput): ForecastResult {
  const baselinePerMonth = (input.segmentSize * input.baselineConversionRate) / 12;
  const treatedRatePerMonth = input.baselineConversionRate + input.upliftPct / 100;
  const treatedPerMonthFull = (input.segmentSize * treatedRatePerMonth) / 12;

  const monthly: ForecastMonth[] = Array.from({ length: 12 }, (_, i) => {
    const rampFactor = Math.min(1, (i + 1) / 3);
    return {
      month: `M+${i + 1}`,
      baseline: Number(baselinePerMonth.toFixed(2)),
      treated: Number(
        (baselinePerMonth + (treatedPerMonthFull - baselinePerMonth) * rampFactor).toFixed(2),
      ),
    };
  });

  const baselineTotal = monthly.reduce((s, m) => s + m.baseline, 0);
  const treatedTotal = monthly.reduce((s, m) => s + m.treated, 0);
  const incrementalConversions = treatedTotal - baselineTotal;
  const incrementalRevenueAud = incrementalConversions * input.courseValueAud;
  const roi = (incrementalRevenueAud - input.campaignCostAud) / input.campaignCostAud;

  return {
    monthly,
    incrementalConversions,
    incrementalRevenueAud,
    roi,
    assumptions: [
      'Cluster-based propensity model (mock — not fit to real UNSW data)',
      `Baseline conversion: ${(input.baselineConversionRate * 100).toFixed(2)}% annual`,
      `Treated ramps to full uplift over 3 months, holds through month 12`,
      'No cannibalisation from adjacent campaigns',
      'Course value is a single-purchase average — bundles / renewals not modelled',
    ],
  };
}
