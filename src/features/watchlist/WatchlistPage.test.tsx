import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { sampleOpportunityList } from '../../test/apiFixtures.ts';
import { renderAppAt, stubApiResponses } from '../../test/renderApp.tsx';

function saveWatchlist(symbols: string[]) {
  localStorage.setItem('market-pulse-watchlist', JSON.stringify(symbols));
}

describe('WatchlistPage', () => {
  it('points to Opportunity Radar while the watchlist is empty', async () => {
    renderAppAt('/watchlist');

    expect(
      await screen.findByRole('heading', { name: 'Your watchlist is empty' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Browse Opportunity Radar' }),
    ).toHaveAttribute('href', '/opportunities');
  });

  it('shows the latest screening of watched instruments only', async () => {
    saveWatchlist(['ORCL', 'NDX']);
    stubApiResponses({ '/api/opportunities': sampleOpportunityList });
    renderAppAt('/watchlist');

    const table = await screen.findByRole('table', {
      name: 'Watched instruments',
    });
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((rowHeader) => rowHeader.textContent),
    ).toEqual(['ORCL Oracle', 'NDX Nasdaq-100']);
    expect(
      screen.getByRole('link', { name: 'Follow in Live Monitor' }),
    ).toHaveAttribute('href', '/live-monitor/ORCL?list=watchlist');
  });

  it('removes an instrument when its star is cleared', async () => {
    saveWatchlist(['ORCL']);
    stubApiResponses({ '/api/opportunities': sampleOpportunityList });
    const user = userEvent.setup();
    renderAppAt('/watchlist');

    await user.click(
      await screen.findByRole('button', { name: 'Remove ORCL from watchlist' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Your watchlist is empty' }),
    ).toBeInTheDocument();
    expect(localStorage.getItem('market-pulse-watchlist')).toBe('[]');
  });
});
