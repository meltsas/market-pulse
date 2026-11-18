import { INTRADAY_INTERVAL_MINUTES } from '../src/config.ts';
import type { DemoInstrument } from '../src/instruments.ts';
import type {
  DailyBar,
  IntradayBar,
  SecFundamentals,
} from '../src/recordedData.ts';

export const testStock: DemoInstrument = {
  symbol: 'TEST',
  name: 'Test Corp',
  assetClass: 'stock',
  currency: 'USD',
  yahooSymbol: 'TEST',
  secCik: '0000000001',
};

export const testIndex: DemoInstrument = {
  symbol: 'IDX',
  name: 'Test Index',
  assetClass: 'index',
  currency: 'USD',
  yahooSymbol: '^IDX',
};

export function createIntradayBars(
  firstBarStart: string,
  closes: readonly number[],
  volume = 1000,
): IntradayBar[] {
  return closes.map((close, index) => ({
    start: new Date(
      Date.parse(firstBarStart) + index * INTRADAY_INTERVAL_MINUTES * 60_000,
    ).toISOString(),
    open: close,
    high: close,
    low: close,
    close,
    volume,
  }));
}

export function createConsecutiveDailyBars(
  firstDate: string,
  count: number,
  close: number,
): DailyBar[] {
  return Array.from({ length: count }, (_, index) =>
    createDailyBar(
      new Date(Date.parse(firstDate) + index * 86_400_000)
        .toISOString()
        .slice(0, 10),
      close,
    ),
  );
}

export function createDailyBar(
  date: string,
  close: number,
  high = close,
): DailyBar {
  return { date, open: close, high, low: close, close, volume: 1_000_000 };
}

export function createFundamentals(
  companies: SecFundamentals['companies'] = [],
): SecFundamentals {
  return {
    provider: 'SEC EDGAR',
    recordedAt: '2026-11-17T00:00:00.000Z',
    companies,
  };
}
