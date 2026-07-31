import { describe, it, expect } from 'vitest';
import { computeForecast } from './forecast';

describe('computeForecast', () => {
  it('produces 12 monthly points', () => {
    const r = computeForecast({
      segmentSize: 1000,
      baselineConversionRate: 0.01,
      upliftPct: 5,
      courseValueAud: 3000,
      campaignCostAud: 10000,
    });
    expect(r.monthly).toHaveLength(12);
  });

  it('treated conversions >= baseline when uplift > 0', () => {
    const r = computeForecast({
      segmentSize: 1000,
      baselineConversionRate: 0.01,
      upliftPct: 5,
      courseValueAud: 3000,
      campaignCostAud: 10000,
    });
    for (const p of r.monthly) {
      expect(p.treated).toBeGreaterThanOrEqual(p.baseline);
    }
  });

  it('total incremental revenue = treatedTotal - baselineTotal', () => {
    const r = computeForecast({
      segmentSize: 500,
      baselineConversionRate: 0.02,
      upliftPct: 8,
      courseValueAud: 4000,
      campaignCostAud: 20000,
    });
    const baseTotal = r.monthly.reduce((sum, m) => sum + m.baseline, 0);
    const treatedTotal = r.monthly.reduce((sum, m) => sum + m.treated, 0);
    expect(r.incrementalConversions).toBeCloseTo(treatedTotal - baseTotal, 2);
    expect(r.incrementalRevenueAud).toBeCloseTo((treatedTotal - baseTotal) * 4000, 0);
  });

  it('roi is positive when incremental revenue exceeds campaign cost', () => {
    const r = computeForecast({
      segmentSize: 10000,
      baselineConversionRate: 0.02,
      upliftPct: 10,
      courseValueAud: 3000,
      campaignCostAud: 5000,
    });
    expect(r.incrementalRevenueAud).toBeGreaterThan(5000);
    expect(r.roi).toBeGreaterThan(0);
  });
});
