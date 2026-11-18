import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DailyHistory } from '../../contracts/opportunities.ts';
import {
  sampleOpportunityList,
  sampleOracleDailyHistory,
} from '../../test/apiFixtures.ts';
import { renderAppAt, stubApiResponses } from '../../test/renderApp.tsx';

// The canvas chart cannot render in jsdom; the stand-in exposes what it was given.
vi.mock('./DailyPriceChart.tsx', () => ({
  DailyPriceChart: ({ bars }: { bars: DailyHistory['bars'] }) => (
    <p>{`Chart with ${String(bars.length)} daily closes`}</p>
  ),
}));

describe('OpportunityDetailPage', () => {
  beforeAll(async () => {
    // The route loads this page lazily; importing it once keeps its first render quick.
    await import('./OpportunityDetailPage.tsx');
  });

  function renderOracleDetail() {
    stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
      '/api/market/daily-history': sampleOracleDailyHistory,
    });
    return renderAppAt('/opportunities/ORCL');
  }

  it('explains which rules point long and which point short', async () => {
    renderOracleDetail();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Oracle' }),
    ).toBeInTheDocument();
    const reasons = screen.getByRole('region', { name: 'Why it surfaced' });
    expect(reasons).toHaveTextContent(
      'Mixed: 2 of 4 rules point long and 2 point short.',
    );
    const factorTitles = within(reasons)
      .getAllByRole('listitem')
      .map((factor) => factor.querySelector('p')?.textContent);
    expect(factorTitles).toEqual([
      'Below its 200-day averagePoints short',
      'Underperforming the S&P 500Points short',
      'Strong revenue growthPoints long',
      'Modest valuationPoints long',
    ]);
    expect(
      within(reasons).getByText(
        'Rule: Long above the 200-day average, short below it.',
      ),
    ).toBeInTheDocument();
  });

  it('shows risks, key metrics, and how fresh the data is', async () => {
    renderOracleDetail();

    const risks = await screen.findByRole('region', {
      name: 'Risks and caveats',
    });
    expect(within(risks).getAllByRole('listitem')).toHaveLength(2);
    const metrics = screen.getByRole('region', { name: 'Key metrics' });
    expect(metrics).toHaveTextContent('P/E (fiscal year)21.6');
    expect(metrics).toHaveTextContent('3 months vs S&P 500−10.6 pts');
    const freshness = screen.getByRole('region', { name: 'Data freshness' });
    expect(freshness).toHaveTextContent(
      'RevenueQuarter ended 31 Aug 2026, filed 11 Sept 2026',
    );
    expect(freshness).toHaveTextContent(
      'EarningsFiscal year ended 31 May 2026',
    );
    expect(
      await screen.findByText('Chart with 2 daily closes'),
    ).toBeInTheDocument();
  });

  it('says when company data does not apply', async () => {
    stubApiResponses({ '/api/opportunities': sampleOpportunityList });
    renderAppAt('/opportunities/NDX');

    const metrics = await screen.findByRole('region', { name: 'Key metrics' });
    expect(metrics).toHaveTextContent('Revenue growth (YoY)Does not apply');
    expect(metrics).toHaveTextContent('P/E (fiscal year)Does not apply');
  });

  it('adds the instrument to the watchlist and links to Live Monitor', async () => {
    const user = userEvent.setup();
    renderOracleDetail();

    await user.click(
      await screen.findByRole('button', { name: 'Add to watchlist' }),
    );

    expect(screen.getByRole('button', { name: 'Watching' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('link', { name: 'Open in Live Monitor' }),
    ).toHaveAttribute('href', '/live-monitor/ORCL');
  });

  it('explains when an instrument is not part of the screening', async () => {
    stubApiResponses({ '/api/opportunities': sampleOpportunityList });
    renderAppAt('/opportunities/TSLA');

    expect(
      await screen.findByRole('heading', {
        name: 'TSLA is not part of the screening',
      }),
    ).toBeInTheDocument();
  });
});
