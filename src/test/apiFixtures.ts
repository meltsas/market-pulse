import type { AnomalyList } from '../contracts/anomalies.ts';
import type {
  DataSource,
  MarketSnapshot,
  PriceHistory,
  Quote,
} from '../contracts/market.ts';
import type { QuoteUpdatedEvent } from '../contracts/marketStream.ts';
import type { OpportunityList } from '../contracts/opportunities.ts';

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

export const sampleOpportunityList: OpportunityList = {
  asOf: '2026-11-05T00:00:00Z',
  dataSource: {
    ...sampleDataSource,
    providers: ['Yahoo Finance', 'SEC EDGAR'],
  },
  opportunities: [
    {
      symbol: 'ORCL',
      name: 'Oracle',
      assetClass: 'stock',
      currency: 'USD',
      price: 121.5,
      metrics: {
        drawdownFromHighPercent: 51.2,
        revenueGrowthPercent: 12.4,
        priceToEarnings: null,
      },
      signals: ['Trading 51.2% below its 52-week high'],
      caveats: ['No P/E ratio: diluted EPS was not positive'],
    },
  ],
};
