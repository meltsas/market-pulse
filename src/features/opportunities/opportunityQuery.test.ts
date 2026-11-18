import { describe, expect, it } from 'vitest';
import { sampleOpportunityList } from '../../test/apiFixtures.ts';
import {
  DEFAULT_SORT,
  filterOpportunities,
  readOpportunityQuery,
  sortOpportunities,
  writeOpportunityQuery,
} from './opportunityQuery.ts';

const { opportunities } = sampleOpportunityList;
const symbolsOf = (sorted: readonly { symbol: string }[]) =>
  sorted.map(({ symbol }) => symbol);

describe('sortOpportunities', () => {
  it('orders by bias from long to short by default', () => {
    expect(symbolsOf(sortOpportunities(opportunities, DEFAULT_SORT))).toEqual([
      'LLY',
      'ORCL',
      'NDX',
    ]);
  });

  it('keeps missing metrics last in both directions', () => {
    const ascending = sortOpportunities(opportunities, {
      key: 'revenueGrowth',
      order: 'asc',
    });
    const descending = sortOpportunities(opportunities, {
      key: 'revenueGrowth',
      order: 'desc',
    });

    expect(symbolsOf(ascending)).toEqual(['ORCL', 'LLY', 'NDX']);
    expect(symbolsOf(descending)).toEqual(['LLY', 'ORCL', 'NDX']);
  });
});

describe('filterOpportunities', () => {
  it('combines asset class, bias, and a name or symbol search', () => {
    expect(
      symbolsOf(
        filterOpportunities(opportunities, {
          assetClass: 'stock',
          bias: 'all',
          searchText: '',
        }),
      ),
    ).toEqual(['ORCL', 'LLY']);
    expect(
      symbolsOf(
        filterOpportunities(opportunities, {
          assetClass: 'all',
          bias: 'short',
          searchText: '',
        }),
      ),
    ).toEqual(['NDX']);
    expect(
      symbolsOf(
        filterOpportunities(opportunities, {
          assetClass: 'all',
          bias: 'all',
          searchText: ' lilly ',
        }),
      ),
    ).toEqual(['LLY']);
  });
});

describe('opportunity query parameters', () => {
  it('round-trips filters and sorting through the URL', () => {
    const filters = {
      assetClass: 'stock',
      bias: 'long',
      searchText: 'nv',
    } as const;
    const sort = { key: 'drawdown', order: 'asc' } as const;

    const searchParams = writeOpportunityQuery(filters, sort);

    expect(searchParams.toString()).toBe(
      'assetClass=stock&bias=long&q=nv&sort=drawdown&order=asc',
    );
    expect(readOpportunityQuery(searchParams)).toEqual({ filters, sort });
  });

  it('falls back to defaults for unknown values', () => {
    expect(
      readOpportunityQuery(
        new URLSearchParams('assetClass=bonds&bias=up&sort=hype'),
      ),
    ).toEqual({
      filters: { assetClass: 'all', bias: 'all', searchText: '' },
      sort: DEFAULT_SORT,
    });
  });
});
