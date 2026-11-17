import type { DataSource, MarketSnapshot } from '../contracts/market.ts';
import type { OpportunityList } from '../contracts/opportunities.ts';

const sampleDataSource: DataSource = {
  kind: 'historical-replay',
  providers: ['Yahoo Finance'],
  replayStart: '2026-11-04T00:00:00Z',
  replayEnd: '2026-11-07T00:00:00Z',
  speedMultiplier: 300,
};

export const sampleMarketSnapshot: MarketSnapshot = {
  asOf: '2026-11-05T15:00:00Z',
  dataSource: sampleDataSource,
  quotes: [
    {
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
    },
  ],
};

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
