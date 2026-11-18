import type { AnomalyList } from '../contracts/anomalies.ts';
import type {
  DataSource,
  MarketSnapshot,
  PriceHistory,
  Quote,
} from '../contracts/market.ts';
import type { QuoteUpdatedEvent } from '../contracts/marketStream.ts';
import type { ReplayStatus } from '../contracts/replay.ts';
import type {
  DailyHistory,
  Opportunity,
  OpportunityList,
} from '../contracts/opportunities.ts';

export const sampleDataSource: DataSource = {
  kind: 'historical-replay',
  providers: ['Yahoo Finance'],
  replayStart: '2026-11-04T00:00:00Z',
  replayEnd: '2026-11-07T00:00:00Z',
  speedMultiplier: 300,
  isPaused: false,
  bookmarks: [{ label: '5 Nov sell-off', marketTime: '2026-11-05T14:25:00Z' }],
};

export const sampleNvidiaQuote: Quote = {
  symbol: 'NVDA',
  name: 'NVIDIA',
  assetClass: 'stock',
  currency: 'USD',
  price: 171.4,
  previousClose: 182,
  change: -10.6,
  changePercent: -5.82,
  sessionVolume: 98_500_000,
  timestamp: '2026-11-05T15:00:00Z',
};

const sampleIndexQuote: Quote = {
  symbol: 'SPX',
  name: 'S&P 500',
  assetClass: 'index',
  currency: 'USD',
  price: 7384.68,
  previousClose: 7720.1,
  change: -335.42,
  changePercent: -4.34,
  sessionVolume: 4_205_842_000,
  timestamp: '2026-11-05T15:00:00Z',
};

export const sampleMarketSnapshot: MarketSnapshot = {
  asOf: '2026-11-05T15:00:00Z',
  dataSource: sampleDataSource,
  quotes: [sampleIndexQuote, sampleNvidiaQuote],
};

export const sampleNvidiaHistory: PriceHistory = {
  asOf: '2026-11-05T15:00:00Z',
  dataSource: sampleDataSource,
  symbol: 'NVDA',
  points: [
    { time: '2026-11-05T14:55:00Z', price: 172.1, volume: 2_100_000 },
    { time: '2026-11-05T15:00:00Z', price: 171.4, volume: 1_900_000 },
  ],
};

export const sampleAnomalyList: AnomalyList = {
  asOf: '2026-11-05T15:00:00Z',
  dataSource: sampleDataSource,
  anomalies: [
    {
      type: 'anomaly.detected',
      id: '0-120',
      occurredAt: '2026-11-05T14:35:00Z',
      anomaly: {
        kind: 'price-move',
        symbol: 'NVDA',
        price: 176,
        changePercent: -3.3,
        referencePrice: 182,
        referenceTime: '2026-11-04T21:00:00Z',
        description: 'NVIDIA fell 3.3% since the previous session',
        rule: 'Stocks moving 3% or more within 30 minutes or since the previous session',
      },
    },
  ],
};

export function createQuoteUpdatedEvent(
  quoteChanges: Partial<Quote>,
  barVolume: number | null = 1_000_000,
): QuoteUpdatedEvent {
  const quote = { ...sampleNvidiaQuote, ...quoteChanges };
  return {
    type: 'quote.updated',
    id: `0-${quote.symbol}-${quote.timestamp}`,
    occurredAt: quote.timestamp,
    quote,
    barVolume,
  };
}

const trendRule = 'Long above the 200-day average, short below it.';
const relativeStrengthRule =
  'Long when the three-month return beats the S&P 500 by 5 points or more, short when it trails by 5 points or more.';
const revenueRule =
  'Long at 20% year-over-year growth or more, short when revenue shrinks.';
const valuationRule =
  'Long at a P/E of 25 or less, short at 50 or more or when the company is unprofitable.';

export const sampleOracleOpportunity: Opportunity = {
  symbol: 'ORCL',
  name: 'Oracle',
  assetClass: 'stock',
  currency: 'USD',
  price: 126.19,
  bias: 'mixed',
  biasScore: 0,
  factors: [
    {
      rule: 'trend',
      direction: 'short',
      title: 'Below its 200-day average',
      explanation:
        'The last close is 19.3% below the average of the last 200 closes.',
      ruleDescription: trendRule,
    },
    {
      rule: 'relative-strength',
      direction: 'short',
      title: 'Underperforming the S&P 500',
      explanation:
        'Three-month return of −12.6% against −2.0% for the S&P 500.',
      ruleDescription: relativeStrengthRule,
    },
    {
      rule: 'revenue-growth',
      direction: 'long',
      title: 'Strong revenue growth',
      explanation:
        'Revenue grew 29.6% year over year in the quarter ended 31 Aug 2026.',
      ruleDescription: revenueRule,
    },
    {
      rule: 'valuation',
      direction: 'long',
      title: 'Modest valuation',
      explanation:
        'P/E of 21.6, based on diluted earnings for the fiscal year ended 31 May 2026 rather than the last twelve months.',
      ruleDescription: valuationRule,
    },
  ],
  risks: [
    'Trades 52.5% below its 52-week high. A large drop does not by itself make it cheap; the decline may continue.',
    'Signals disagree: some rules point long and others short.',
  ],
  metrics: {
    fiftyTwoWeekHigh: 265.6,
    drawdownFromHighPercent: 52.5,
    movingAverage50: 140.2,
    movingAverage200: 156.4,
    priceVs200DayAveragePercent: -19.3,
    threeMonthReturnPercent: -12.6,
    relativeStrengthPoints: -10.6,
    revenueGrowthPercent: 29.6,
    priceToEarnings: 21.6,
  },
  freshness: {
    lastCloseDate: '2026-11-03',
    revenueQuarterEnd: '2026-08-31',
    revenueFiledOn: '2026-09-11',
    earningsFiscalYearEnd: '2026-05-31',
  },
};

const sampleLillyOpportunity: Opportunity = {
  symbol: 'LLY',
  name: 'Eli Lilly',
  assetClass: 'stock',
  currency: 'USD',
  price: 1409.38,
  bias: 'long',
  biasScore: 2,
  factors: [
    {
      rule: 'trend',
      direction: 'long',
      title: 'Above its 200-day average',
      explanation:
        'The last close is 28.7% above the average of the last 200 closes.',
      ruleDescription: trendRule,
    },
    {
      rule: 'relative-strength',
      direction: 'long',
      title: 'Outperforming the S&P 500',
      explanation:
        'Three-month return of +20.5% against −2.0% for the S&P 500.',
      ruleDescription: relativeStrengthRule,
    },
  ],
  risks: [],
  metrics: {
    fiftyTwoWeekHigh: 1449.7,
    drawdownFromHighPercent: 2.8,
    movingAverage50: 1250,
    movingAverage200: 1095.1,
    priceVs200DayAveragePercent: 28.7,
    threeMonthReturnPercent: 20.5,
    relativeStrengthPoints: 22.5,
    revenueGrowthPercent: 38.6,
    priceToEarnings: 61.4,
  },
  freshness: {
    lastCloseDate: '2026-11-03',
    revenueQuarterEnd: '2026-09-30',
    revenueFiledOn: '2026-10-29',
    earningsFiscalYearEnd: '2025-12-31',
  },
};

const sampleNasdaqOpportunity: Opportunity = {
  symbol: 'NDX',
  name: 'Nasdaq-100',
  assetClass: 'index',
  currency: 'USD',
  price: 24150.5,
  bias: 'short',
  biasScore: -2,
  factors: [
    {
      rule: 'trend',
      direction: 'short',
      title: 'Below its 200-day average',
      explanation:
        'The last close is 4.8% below the average of the last 200 closes.',
      ruleDescription: trendRule,
    },
    {
      rule: 'relative-strength',
      direction: 'short',
      title: 'Underperforming the S&P 500',
      explanation:
        'Three-month return of −10.4% against −5.2% for the S&P 500.',
      ruleDescription: relativeStrengthRule,
    },
  ],
  risks: [
    'Company fundamentals such as revenue and earnings do not apply to an index.',
  ],
  metrics: {
    fiftyTwoWeekHigh: 28434.1,
    drawdownFromHighPercent: 15.1,
    movingAverage50: 25810,
    movingAverage200: 25368.2,
    priceVs200DayAveragePercent: -4.8,
    threeMonthReturnPercent: -10.4,
    relativeStrengthPoints: -5.2,
    revenueGrowthPercent: null,
    priceToEarnings: null,
  },
  freshness: {
    lastCloseDate: '2026-11-03',
    revenueQuarterEnd: null,
    revenueFiledOn: null,
    earningsFiscalYearEnd: null,
  },
};

export const sampleOpportunityList: OpportunityList = {
  asOf: '2026-11-04T00:00:00Z',
  dataSource: {
    ...sampleDataSource,
    providers: ['Yahoo Finance', 'SEC EDGAR'],
  },
  opportunities: [
    sampleNasdaqOpportunity,
    sampleOracleOpportunity,
    sampleLillyOpportunity,
  ],
};

export const sampleOracleDailyHistory: DailyHistory = {
  asOf: '2026-11-04T00:00:00Z',
  dataSource: sampleDataSource,
  symbol: 'ORCL',
  bars: [
    {
      date: '2026-11-02',
      close: 128.4,
      movingAverage50: 141.1,
      movingAverage200: 156.9,
    },
    {
      date: '2026-11-03',
      close: 126.19,
      movingAverage50: 140.2,
      movingAverage200: 156.4,
    },
  ],
};

export const sampleReplayStatus: ReplayStatus = {
  asOf: '2026-11-05T15:00:00Z',
  dataSource: {
    ...sampleDataSource,
    providers: ['Yahoo Finance', 'SEC EDGAR'],
  },
};
