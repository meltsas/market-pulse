import { describe, expect, it } from 'vitest';
import {
  formatMarketDateTime,
  formatPercentChange,
  formatPrice,
  formatPriceChange,
  formatReplayWindow,
  formatVolume,
  getTimeZoneLabel,
} from './marketFormat.ts';

// The app test project runs with TZ=UTC, so local times are UTC here.
describe('market formatting', () => {
  it.each([
    [{ assetClass: 'stock', currency: 'USD' }, 182.784, '$182.78'],
    [{ assetClass: 'crypto', currency: 'USD' }, 80540.891, '$80,540.89'],
    [{ assetClass: 'index', currency: 'USD' }, 7384.678, '7,384.68'],
    [{ assetClass: 'currency', currency: 'USD' }, 1.123456, '1.1235'],
  ] as const)('formats a %o price', (instrument, price, expected) => {
    expect(formatPrice(price, instrument)).toBe(expected);
  });

  it('formats signed changes with a typographic minus', () => {
    const stock = { assetClass: 'stock', currency: 'USD' } as const;

    expect(formatPriceChange(-4.561, stock)).toBe('−$4.56');
    expect(formatPriceChange(1.2, stock)).toBe('+$1.20');
    expect(formatPercentChange(-4.234)).toBe('−4.23%');
    expect(formatPercentChange(0)).toBe('0.00%');
  });

  it('formats volume compactly', () => {
    expect(formatVolume(262_672_272)).toBe('262.7M');
  });

  it('shows market times with their time zone', () => {
    // ICU versions differ in whether UTC is written as GMT or GMT+0.
    expect(formatMarketDateTime('2026-11-05T14:35:00.000Z')).toMatch(
      /^Thu, 5 Nov 2026, 14:35 GMT(\+0)?$/,
    );
    expect(getTimeZoneLabel('2026-11-05T14:35:00.000Z')).toMatch(/^GMT(\+0)?$/);
  });

  it('shows the replay window as recorded calendar days', () => {
    expect(
      formatReplayWindow(
        '2026-11-04T00:00:00.000Z',
        '2026-11-07T00:00:00.000Z',
      ),
    ).toBe('4 – 6 Nov 2026');
  });
});
