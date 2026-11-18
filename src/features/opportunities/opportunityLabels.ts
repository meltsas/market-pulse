import type { Bias } from '../../contracts/opportunities.ts';
import type {
  AssetClassFilter,
  BiasFilter,
  OpportunitySortKey,
} from './opportunityQuery.ts';

export const biasLabel: Record<Bias, string> = {
  long: 'Long bias',
  short: 'Short bias',
  mixed: 'Mixed',
};

export const biasFilterLabel: Record<BiasFilter, string> = {
  all: 'All',
  long: 'Long',
  short: 'Short',
  mixed: 'Mixed',
};

export const assetClassFilterLabel: Record<AssetClassFilter, string> = {
  all: 'All',
  stock: 'Stocks',
  index: 'Indices',
  crypto: 'Crypto',
  currency: 'Currencies',
};

export const sortKeyLabel: Record<OpportunitySortKey, string> = {
  instrument: 'Instrument',
  bias: 'Bias',
  price: 'Last close',
  trend: 'vs 200-day avg',
  relativeStrength: '3M vs S&P 500',
  drawdown: 'From 52w high',
  revenueGrowth: 'Revenue YoY',
  priceToEarnings: 'P/E',
};
