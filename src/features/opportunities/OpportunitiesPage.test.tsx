import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  sampleOpportunityList,
  sampleReplayStatus,
} from '../../test/apiFixtures.ts';
import { renderAppAt, stubApiResponses } from '../../test/renderApp.tsx';

function rowSymbols() {
  const table = screen.getByRole('table', { name: 'Screening results' });
  return within(table)
    .getAllByRole('rowheader')
    .map((rowHeader) => rowHeader.textContent);
}

describe('OpportunitiesPage', () => {
  it('lists every screened instrument with its bias and metrics', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    renderAppAt('/opportunities');

    const oracleLink = await screen.findByRole('link', { name: /ORCL/ });
    const oracleRow = oracleLink.closest('tr');
    if (!oracleRow) {
      throw new Error('Expected a table row');
    }
    expect(oracleLink).toHaveAttribute('href', '/opportunities/ORCL');
    expect(within(oracleRow).getByText('Mixed')).toBeInTheDocument();
    expect(within(oracleRow).getByText('$126.19')).toBeInTheDocument();
    expect(within(oracleRow).getByText('−52.5%')).toBeInTheDocument();
    expect(rowSymbols()).toEqual([
      'LLY Eli Lilly',
      'ORCL Oracle',
      'NDX Nasdaq-100',
    ]);
    expect(screen.getByText('Showing 3 of 3 instruments')).toBeInTheDocument();
    const replayPanel = await screen.findByRole('complementary', {
      name: 'About this data',
    });
    expect(replayPanel).toHaveTextContent(
      'Screening ran Wed, 4 Nov 2026, 00:00 GMT',
    );
    expect(
      within(replayPanel).getByRole('button', { name: 'Pause replay' }),
    ).toBeInTheDocument();
  });

  it('marks unavailable metrics instead of showing zeros', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    renderAppAt('/opportunities');

    const nasdaqRow = (
      await screen.findByRole('link', { name: /NDX/ })
    ).closest('tr');
    if (!nasdaqRow) {
      throw new Error('Expected a table row');
    }
    expect(within(nasdaqRow).getAllByText('Not available')).toHaveLength(2);
  });

  it('filters by bias and keeps the filter in the URL', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    const user = userEvent.setup();
    const { router } = renderAppAt('/opportunities');

    await user.click(await screen.findByRole('radio', { name: 'Short' }));

    expect(rowSymbols()).toEqual(['NDX Nasdaq-100']);
    expect(router.state.location.search).toBe('?bias=short');
  });

  it('sorts by a column and reverses the order on a second click', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    const user = userEvent.setup();
    renderAppAt('/opportunities');

    const drawdownHeader = await screen.findByRole('button', {
      name: 'From 52w high',
    });
    await user.click(drawdownHeader);

    expect(rowSymbols()).toEqual([
      'ORCL Oracle',
      'NDX Nasdaq-100',
      'LLY Eli Lilly',
    ]);
    expect(drawdownHeader.closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await user.click(drawdownHeader);

    expect(rowSymbols()).toEqual([
      'LLY Eli Lilly',
      'NDX Nasdaq-100',
      'ORCL Oracle',
    ]);
  });

  it('explains an empty result and clears the filters', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    const user = userEvent.setup();
    renderAppAt('/opportunities?assetClass=crypto');

    expect(
      await screen.findByRole('heading', {
        name: 'No instruments match these filters',
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(rowSymbols()).toHaveLength(3);
  });

  it('offers a retry when the screening cannot be loaded', async () => {
    const fetchMock = stubApiResponses({});
    const user = userEvent.setup();
    renderAppAt('/opportunities');

    const retryButton = await screen.findByRole('button', {
      name: 'Try again',
    });
    fetchMock.mockImplementation(() =>
      Promise.resolve(Response.json(sampleOpportunityList)),
    );
    await user.click(retryButton);

    expect(
      await screen.findByRole('link', { name: /ORCL/ }),
    ).toBeInTheDocument();
  });

  it('adds an instrument to the watchlist from the table', async () => {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/replay': sampleReplayStatus,
    });
    const user = userEvent.setup();
    renderAppAt('/opportunities');

    await user.click(
      await screen.findByRole('button', { name: 'Add ORCL to watchlist' }),
    );

    expect(
      screen.getByRole('button', { name: 'Remove ORCL from watchlist' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('link', { name: 'Watchlist, 1 saved' }),
    ).toBeInTheDocument();
  });
});
