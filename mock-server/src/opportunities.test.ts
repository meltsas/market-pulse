import { describe, expect, it } from 'vitest';
import type { DataSource } from '../../src/contracts/market.ts';
import {
  createDailyBarsEndingOn,
  createFundamentals,
  testIndex,
  testStock,
} from '../test/syntheticData.ts';
import type { DemoInstrument } from './instruments.ts';
import {
  BENCHMARK_SYMBOL,
  createDailyHistory,
  createOpportunityList,
} from './opportunities.ts';
import type { DailyBar, ReportedValue } from './recordedData.ts';

const dataSource: DataSource = {
  kind: 'historical-replay',
  providers: ['Test provider'],
  replayStart: '2026-11-04T00:00:00.000Z',
  replayEnd: '2026-11-07T00:00:00.000Z',
  speedMultiplier: 300,
  isPaused: false,
  bookmarks: [],
};

const SESSIONS = 250;
const LAST_CLOSE_DATE = '2026-11-04';
const risingCloses = Array.from({ length: SESSIONS }, (_, day) => 100 + day);
const fallingCloses = Array.from({ length: SESSIONS }, (_, day) => 400 - day);
const flatBenchmarkBars = createDailyBarsEndingOn(
  LAST_CLOSE_DATE,
  Array.from({ length: SESSIONS }, () => 100),
);

const growingRevenue: ReportedValue[] = [
  { start: '2025-04-01', end: '2025-06-30', filed: '2025-08-01', value: 100 },
  { start: '2025-07-01', end: '2025-09-30', filed: '2025-10-30', value: 100 },
  { start: '2026-04-01', end: '2026-06-30', filed: '2026-08-01', value: 110 },
  { start: '2026-07-01', end: '2026-09-30', filed: '2026-11-04', value: 130 },
];
const shrinkingRevenue: ReportedValue[] = [
  { start: '2025-07-01', end: '2025-09-30', filed: '2025-10-30', value: 100 },
  { start: '2026-07-01', end: '2026-09-30', filed: '2026-10-30', value: 90 },
];

function annualEps(value: number): ReportedValue[] {
  return [
    { start: '2025-01-01', end: '2025-12-31', filed: '2026-02-01', value },
  ];
}

interface ScreeningScenario {
  instrument?: DemoInstrument;
  dailyBars: DailyBar[];
  quarterlyRevenue?: ReportedValue[];
  annualDilutedEps?: ReportedValue[];
  analysisTime?: string;
}

function recordedDataFor(instrument: DemoInstrument, dailyBars: DailyBar[]) {
  return {
    provider: 'Test provider',
    recordedAt: '2026-11-17T00:00:00.000Z',
    instruments: [
      { symbol: instrument.symbol, dailyBars, intradayBars: [] },
      {
        symbol: BENCHMARK_SYMBOL,
        dailyBars: flatBenchmarkBars,
        intradayBars: [],
      },
    ],
  };
}

function screen({
  instrument = testStock,
  dailyBars,
  quarterlyRevenue = growingRevenue,
  annualDilutedEps = annualEps(20),
  analysisTime = '2026-11-05T15:00:00.000Z',
}: ScreeningScenario) {
  const opportunityList = createOpportunityList({
    instruments: [instrument],
    recordedMarketData: recordedDataFor(instrument, dailyBars),
    fundamentals: createFundamentals([
      {
        symbol: testStock.symbol,
        cik: '0000000001',
        entityName: 'TEST CORP',
        quarterlyRevenue,
        annualDilutedEps,
      },
    ]),
    marketTimeMs: Date.parse(analysisTime),
    dataSource,
  });
  const [opportunity] = opportunityList.opportunities;
  if (!opportunity) {
    throw new Error('The instrument was not screened');
  }
  return { opportunityList, opportunity };
}

function factorDirections({
  factors,
}: ReturnType<typeof screen>['opportunity']) {
  return Object.fromEntries(
    factors.map(({ rule, direction }) => [rule, direction]),
  );
}

describe('createOpportunityList', () => {
  it('screens on daily closes completed before the nightly run', () => {
    const { opportunityList, opportunity } = screen({
      dailyBars: [
        ...createDailyBarsEndingOn(LAST_CLOSE_DATE, risingCloses),
        ...createDailyBarsEndingOn('2026-11-05', [1]),
      ],
    });

    expect(opportunityList.asOf).toBe('2026-11-05T00:00:00.000Z');
    expect(opportunity.price).toBe(349);
    expect(opportunity.freshness.lastCloseDate).toBe(LAST_CLOSE_DATE);
  });

  it('leans long when trend, relative strength, growth, and valuation agree', () => {
    const { opportunity } = screen({
      dailyBars: createDailyBarsEndingOn(LAST_CLOSE_DATE, risingCloses),
    });

    expect(opportunity).toMatchObject({ bias: 'long', biasScore: 4 });
    expect(factorDirections(opportunity)).toEqual({
      trend: 'long',
      'relative-strength': 'long',
      'revenue-growth': 'long',
      valuation: 'long',
    });
    expect(opportunity.metrics.priceToEarnings).toBeCloseTo(17.45);
    expect(opportunity.risks).toEqual([]);
  });

  it('leans short when a falling, shrinking, unprofitable company trails the market', () => {
    const { opportunity } = screen({
      dailyBars: createDailyBarsEndingOn(LAST_CLOSE_DATE, fallingCloses),
      quarterlyRevenue: shrinkingRevenue,
      annualDilutedEps: annualEps(-2),
    });

    expect(opportunity).toMatchObject({ bias: 'short', biasScore: -4 });
    expect(
      opportunity.factors.find(({ rule }) => rule === 'valuation'),
    ).toMatchObject({
      title: 'Unprofitable',
      explanation:
        'Diluted earnings per share were −2.00 in the fiscal year ended 31 Dec 2025, so there is no P/E ratio.',
    });
    expect(opportunity.risks).toEqual([
      'Trades 62.3% below its 52-week high. A large drop does not by itself make it cheap; the decline may continue.',
    ]);
  });

  it('stays mixed and says so when the rules disagree', () => {
    const { opportunity } = screen({
      dailyBars: createDailyBarsEndingOn(LAST_CLOSE_DATE, fallingCloses),
      annualDilutedEps: annualEps(10),
    });

    expect(opportunity).toMatchObject({ bias: 'mixed', biasScore: 0 });
    expect(opportunity.risks).toContain(
      'Signals disagree: some rules point long and others short.',
    );
  });

  it('uses quarterly results only after they were filed', () => {
    const dailyBars = createDailyBarsEndingOn('2026-11-03', risingCloses);
    const beforeFiling = screen({
      dailyBars,
      analysisTime: '2026-11-04T15:00:00.000Z',
    });
    const afterFiling = screen({ dailyBars });

    expect(beforeFiling.opportunity.metrics.revenueGrowthPercent).toBeCloseTo(
      10,
    );
    expect(beforeFiling.opportunity.freshness.revenueQuarterEnd).toBe(
      '2026-06-30',
    );
    expect(afterFiling.opportunity.metrics.revenueGrowthPercent).toBeCloseTo(
      30,
    );
    expect(afterFiling.opportunity.freshness).toMatchObject({
      revenueQuarterEnd: '2026-09-30',
      revenueFiledOn: '2026-11-04',
      earningsFiscalYearEnd: '2025-12-31',
    });
  });

  it('applies only price rules to an index and explains the missing fundamentals', () => {
    const { opportunity } = screen({
      instrument: testIndex,
      dailyBars: createDailyBarsEndingOn(LAST_CLOSE_DATE, risingCloses),
    });

    expect(factorDirections(opportunity)).toEqual({
      trend: 'long',
      'relative-strength': 'long',
    });
    expect(opportunity.metrics).toMatchObject({
      revenueGrowthPercent: null,
      priceToEarnings: null,
    });
    expect(opportunity.risks).toEqual([
      'Company fundamentals such as revenue and earnings do not apply to an index.',
    ]);
  });

  it('does not compare the benchmark with itself', () => {
    const benchmark: DemoInstrument = {
      ...testIndex,
      symbol: BENCHMARK_SYMBOL,
    };
    const { opportunity } = screen({
      instrument: benchmark,
      dailyBars: flatBenchmarkBars,
    });

    expect(opportunity.metrics.relativeStrengthPoints).toBeNull();
    expect(factorDirections(opportunity)).toEqual({ trend: 'long' });
  });

  it('skips the trend rule when there are fewer than 200 sessions', () => {
    const { opportunity } = screen({
      dailyBars: createDailyBarsEndingOn(
        LAST_CLOSE_DATE,
        risingCloses.slice(-150),
      ),
    });

    expect(opportunity.metrics.movingAverage200).toBeNull();
    expect(factorDirections(opportunity)).not.toHaveProperty('trend');
    expect(opportunity.risks).toContain(
      'Fewer than 200 trading days of history, so there is no trend signal.',
    );
  });
});

describe('createDailyHistory', () => {
  it('returns a year of completed closes with their moving averages', () => {
    const dailyHistory = createDailyHistory({
      symbol: testStock.symbol,
      recordedMarketData: recordedDataFor(
        testStock,
        createDailyBarsEndingOn(LAST_CLOSE_DATE, risingCloses),
      ),
      marketTimeMs: Date.parse('2026-11-05T15:00:00.000Z'),
      dataSource,
    });

    expect(dailyHistory?.bars).toHaveLength(SESSIONS);
    expect(dailyHistory?.bars[0]).toEqual({
      date: '2026-02-28',
      close: 100,
      movingAverage50: null,
      movingAverage200: null,
    });
    expect(dailyHistory?.bars.at(-1)).toEqual({
      date: LAST_CLOSE_DATE,
      close: 349,
      movingAverage50: 324.5,
      movingAverage200: 249.5,
    });
  });

  it('returns nothing for an unknown instrument', () => {
    expect(
      createDailyHistory({
        symbol: 'UNKNOWN',
        recordedMarketData: recordedDataFor(testStock, []),
        marketTimeMs: Date.parse('2026-11-05T15:00:00.000Z'),
        dataSource,
      }),
    ).toBeUndefined();
  });
});
