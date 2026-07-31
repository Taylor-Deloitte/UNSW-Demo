import type { ForecastResult } from './forecast';

/** First month (1-indexed) where cumulative incremental revenue ≥ campaign cost. Null if never. */
export function paybackMonth(
  monthly: ForecastResult['monthly'],
  courseValueAud: number,
  campaignCostAud: number,
): number | null {
  let cum = 0;
  for (let i = 0; i < monthly.length; i++) {
    const incremental = monthly[i].treated - monthly[i].baseline;
    cum += incremental * courseValueAud;
    if (cum >= campaignCostAud) return i + 1;
  }
  return null;
}
