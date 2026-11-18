import { describe, expect, it } from 'vitest';
import type { DataSource } from '../../src/contracts/market.ts';
import {
  createDailyBar,
  createFundamentals,
  testIndex,
  testStock,
} from '../test/syntheticData.ts';
import type { DemoInstrument } from './instruments.ts';
import { createOpportunityList } from './opportunities.ts';
import type { ReportedValue } from './recordedData.ts';

const dataSource: DataSource = {
  kind: 'historical-replay',
  providers: ['Test provider'],
  replayStart: '2026-11-04T00:00:00.000Z',
  replayEnd: '2026-11-07T00:00:00.000Z',
  speedMultiplier: 300,
  isPaused: false,
  bookmarks: [],
};

const dailyBarsWithDrawdown = [
  createDailyBar('2026-06-01', 190, 200),
  createDailyBar('2026-11-03', 100),
  createDailyBar('2026-11-04', 100),
];

const quarterlyRevenue: ReportedValue[] = [
  { start: '2025-04-01', end: '2025-06-30', filed: '2025-08-01', value: 100 },
  { start: '2025-07-01', end: '2025-09-30', filed: '2025-10-30', value: 100 },
  { start: '2026-04-01', end: '2026-06-30', filed: '2026-08-01', value: 110 },
  { start: '2026-07-01', end: '2026-09-30', filed: '2026-11-04', value: 130 },
];

function screen(
  instrument: DemoInstrument,
  marketTime: string,
  annualDilutedEps: ReportedValue[] = [],
) {
  return createOpportunityList({
    instruments: [instrument],
    recordedMarketData: {
      provider: 'Test provider',
      recordedAt: '2026-11-17T00:00:00.000Z',
      instruments: [
        {
          symbol: instrument.symbol,
          dailyBars: dailyBarsWithDrawdown,
          intradayBars: [],
        },
      ],
    },
    fundamentals: createFundamentals([
      {
        symbol: testStock.symbol,
        cik: '0000000001',
        entityName: 'TEST CORP',
        quarterlyRevenue,
        annualDilutedEps,
      },
    ]),
    marketTimeMs: Date.parse(marketTime),
    dataSource,
  });
}

describe('createOpportunityList', () => {
  it('screens on daily closes completed before the nightly run', () => {
    const opportunityList = screen(testStock, '2026-11-04T15:00:00.000Z');

    const [opportunity] = opportunityList.opportunities;
    expect(opportunityList.asOf).toBe('2026-11-04T00:00:00.000Z');
    expect(opportunity).toMatchObject({
      symbol: 'TEST',
      price: 100,
      metrics: { drawdownFromHighPercent: 50 },
      signals: ['Trading 50.0% below its 52-week high'],
    });
    expect(opportunity?.metrics.revenueGrowthPercent).toBeCloseTo(10);
  });

  it('uses quarterly results only after they were filed', () => {
    const opportunityList = screen(testStock, '2026-11-05T15:00:00.000Z');

    expect(opportunityList.opportunities[0]?.signals).toContain(
      'Revenue grew 30.0% year over year in the quarter ended 2026-09-30',
    );
  });

  it('calculates P/E from positive fiscal-year earnings only', () => {
    const profitable = screen(testStock, '2026-11-05T15:00:00.000Z', [
      { start: '2025-01-01', end: '2025-12-31', filed: '2026-02-01', value: 4 },
    ]);
    const lossMaking = screen(testStock, '2026-11-05T15:00:00.000Z', [
      {
        start: '2025-01-01',
        end: '2025-12-31',
        filed: '2026-02-01',
        value: -2,
      },
    ]);

    expect(profitable.opportunities[0]?.metrics.priceToEarnings).toBe(25);
    expect(lossMaking.opportunities[0]).toMatchObject({
      metrics: { priceToEarnings: null },
      caveats: expect.arrayContaining([
        'No P/E ratio: diluted EPS was not positive for the fiscal year ended 2025-12-31',
      ]) as unknown,
    });
  });

  it('explains that company fundamentals do not apply to an index', () => {
    const opportunityList = screen(testIndex, '2026-11-05T15:00:00.000Z');

    expect(opportunityList.opportunities[0]).toMatchObject({
      metrics: { revenueGrowthPercent: null, priceToEarnings: null },
      caveats: expect.arrayContaining([
        'Company fundamentals do not apply to an index',
      ]) as unknown,
    });
  });
});
