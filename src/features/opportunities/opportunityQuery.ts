import type { AssetClass } from '../../contracts/market.ts';
import type { Bias, Opportunity } from '../../contracts/opportunities.ts';

export const opportunitySortKeys = [
  'instrument',
  'bias',
  'price',
  'trend',
  'relativeStrength',
  'drawdown',
  'revenueGrowth',
  'priceToEarnings',
] as const;
export type OpportunitySortKey = (typeof opportunitySortKeys)[number];
export type SortOrder = 'asc' | 'desc';

export interface OpportunitySort {
  key: OpportunitySortKey;
  order: SortOrder;
}

export type AssetClassFilter = AssetClass | 'all';
export type BiasFilter = Bias | 'all';

export interface OpportunityFilters {
  assetClass: AssetClassFilter;
  bias: BiasFilter;
  searchText: string;
}

export const DEFAULT_SORT: OpportunitySort = { key: 'bias', order: 'desc' };
export const assetClassFilters: readonly AssetClassFilter[] = [
  'all',
  'stock',
  'index',
  'crypto',
  'currency',
];
export const biasFilters: readonly BiasFilter[] = [
  'all',
  'long',
  'short',
  'mixed',
];

const sortValue: Record<
  OpportunitySortKey,
  (opportunity: Opportunity) => number | string | null
> = {
  instrument: ({ symbol }) => symbol,
  bias: ({ biasScore }) => biasScore,
  price: ({ price }) => price,
  trend: ({ metrics }) => metrics.priceVs200DayAveragePercent,
  relativeStrength: ({ metrics }) => metrics.relativeStrengthPoints,
  drawdown: ({ metrics }) => metrics.drawdownFromHighPercent,
  revenueGrowth: ({ metrics }) => metrics.revenueGrowthPercent,
  priceToEarnings: ({ metrics }) => metrics.priceToEarnings,
};

function compareValues(first: number | string, second: number | string) {
  if (typeof first === 'string' || typeof second === 'string') {
    return String(first).localeCompare(String(second));
  }
  return first - second;
}

// Missing metrics always sort last, so ordering never suggests a value that does not exist.
export function sortOpportunities(
  opportunities: readonly Opportunity[],
  { key, order }: OpportunitySort,
): Opportunity[] {
  const direction = order === 'asc' ? 1 : -1;
  return opportunities.toSorted((first, second) => {
    const firstValue = sortValue[key](first);
    const secondValue = sortValue[key](second);
    if (firstValue === null || secondValue === null) {
      return Number(firstValue === null) - Number(secondValue === null);
    }
    return (
      compareValues(firstValue, secondValue) * direction ||
      first.symbol.localeCompare(second.symbol)
    );
  });
}

export function filterOpportunities(
  opportunities: readonly Opportunity[],
  { assetClass, bias, searchText }: OpportunityFilters,
): Opportunity[] {
  const normalizedSearch = searchText.trim().toLowerCase();
  return opportunities.filter(
    (opportunity) =>
      (assetClass === 'all' || opportunity.assetClass === assetClass) &&
      (bias === 'all' || opportunity.bias === bias) &&
      (normalizedSearch === '' ||
        opportunity.symbol.toLowerCase().includes(normalizedSearch) ||
        opportunity.name.toLowerCase().includes(normalizedSearch)),
  );
}

function isOneOf<Value extends string>(
  options: readonly Value[],
  value: string | null,
): value is Value {
  return options.some((option) => option === value);
}

export function readOpportunityQuery(searchParams: URLSearchParams) {
  const assetClass = searchParams.get('assetClass');
  const bias = searchParams.get('bias');
  const sortKey = searchParams.get('sort');
  const sortOrder = searchParams.get('order');
  const filters: OpportunityFilters = {
    assetClass: isOneOf(assetClassFilters, assetClass) ? assetClass : 'all',
    bias: isOneOf(biasFilters, bias) ? bias : 'all',
    searchText: searchParams.get('q') ?? '',
  };
  const sort: OpportunitySort = isOneOf(opportunitySortKeys, sortKey)
    ? {
        key: sortKey,
        order: isOneOf(['asc', 'desc'] as const, sortOrder)
          ? sortOrder
          : 'desc',
      }
    : DEFAULT_SORT;
  return { filters, sort };
}

export function writeOpportunityQuery(
  filters: OpportunityFilters,
  sort: OpportunitySort,
) {
  const searchParams = new URLSearchParams();
  if (filters.assetClass !== 'all') {
    searchParams.set('assetClass', filters.assetClass);
  }
  if (filters.bias !== 'all') {
    searchParams.set('bias', filters.bias);
  }
  if (filters.searchText !== '') {
    searchParams.set('q', filters.searchText);
  }
  if (sort.key !== DEFAULT_SORT.key || sort.order !== DEFAULT_SORT.order) {
    searchParams.set('sort', sort.key);
    searchParams.set('order', sort.order);
  }
  return searchParams;
}
