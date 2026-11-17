import type { Instrument } from '../../src/contracts/market.ts';

export interface DemoInstrument extends Instrument {
  yahooSymbol: string;
  secCik?: string;
}

export const demoInstruments: readonly DemoInstrument[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    assetClass: 'index',
    currency: 'USD',
    yahooSymbol: '^GSPC',
  },
  {
    symbol: 'NDX',
    name: 'Nasdaq-100',
    assetClass: 'index',
    currency: 'USD',
    yahooSymbol: '^NDX',
  },
  {
    symbol: 'DAX',
    name: 'DAX',
    assetClass: 'index',
    currency: 'EUR',
    yahooSymbol: '^GDAXI',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'NVDA',
    secCik: '0001045810',
  },
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'AMD',
    secCik: '0000002488',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet (Class A)',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'GOOGL',
    secCik: '0001652044',
  },
  {
    symbol: 'ORCL',
    name: 'Oracle',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'ORCL',
    secCik: '0001341439',
  },
  {
    symbol: 'LLY',
    name: 'Eli Lilly',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'LLY',
    secCik: '0000059478',
  },
  {
    symbol: 'MSTR',
    name: 'Strategy (formerly MicroStrategy)',
    assetClass: 'stock',
    currency: 'USD',
    yahooSymbol: 'MSTR',
    secCik: '0001050446',
  },
  {
    symbol: 'BTCUSD',
    name: 'Bitcoin',
    assetClass: 'crypto',
    currency: 'USD',
    yahooSymbol: 'BTC-USD',
  },
  {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetClass: 'currency',
    currency: 'USD',
    yahooSymbol: 'EURUSD=X',
  },
];

export function toInstrument({
  symbol,
  name,
  assetClass,
  currency,
}: DemoInstrument): Instrument {
  return { symbol, name, assetClass, currency };
}
