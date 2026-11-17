import type { MarketSnapshot } from '../contracts/market.ts';
import type { OpportunityList } from '../contracts/opportunities.ts';

export const sampleMarketSnapshot: MarketSnapshot = {
  asOf: '2026-11-17T14:30:00Z',
  dataSource: 'simulated',
  quotes: [
    {
      symbol: 'DEMO-NRG',
      name: 'Northwind Energy (demo)',
      currency: 'USD',
      price: 42.18,
      change: 0.54,
      changePercent: 1.3,
      volume: 1_250_000,
      timestamp: '2026-11-17T14:29:58Z',
    },
  ],
};

export const sampleOpportunityList: OpportunityList = {
  asOf: '2026-11-17T06:00:00Z',
  dataSource: 'simulated',
  opportunities: [
    {
      symbol: 'DEMO-NRG',
      name: 'Northwind Energy (demo)',
      currency: 'USD',
      price: 42.18,
      metrics: {
        drawdownFromHighPercent: 24.5,
        revenueGrowthPercent: 8.2,
        priceToEarnings: null,
      },
      signals: [
        'Trading 24.5% below its 52-week high',
        'Revenue grew 8.2% year over year',
      ],
      caveats: ['No P/E ratio: the company reported a loss'],
    },
  ],
};
