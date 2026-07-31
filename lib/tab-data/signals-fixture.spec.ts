import { describe, it, expect } from 'vitest';
import { deriveSignalCounts } from './signals-fixture';

describe('signals derived counts', () => {
  it('default (all, 30d) gives 1288 / 214', () => {
    const c = deriveSignalCounts({ scope: 'all', window: '30d' });
    expect(c.momentsTotal).toBe(1288);
    expect(c.momentsUnactioned).toBe(214);
  });

  it('7d window scales down', () => {
    const c = deriveSignalCounts({ scope: 'all', window: '7d' });
    expect(c.momentsTotal).toBeLessThan(1288);
  });

  it('promotions-only scope scales down', () => {
    const c = deriveSignalCounts({ scope: 'promoted', window: '30d' });
    expect(c.momentsTotal).toBeLessThan(1288);
  });

  it('90d wider than 30d', () => {
    const c = deriveSignalCounts({ scope: 'all', window: '90d' });
    expect(c.momentsTotal).toBeGreaterThan(1288);
  });
});
