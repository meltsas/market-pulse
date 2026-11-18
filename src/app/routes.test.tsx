import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from './routes.tsx';
import { createAppStore } from './store.ts';

function renderAtPath(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Provider store={createAppStore()}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

describe('routes', () => {
  beforeAll(async () => {
    // Lazily loaded pages are imported once, so their first render stays within the default wait time.
    await import('../features/live-monitor/LiveMonitorPage.tsx');
    await import('../features/opportunities/OpportunityDetailPage.tsx');
  });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response(null, { status: 503 })),
      ),
    );
  });

  it.each([
    ['/opportunities', 'Opportunity Radar'],
    ['/live-monitor', 'Live Market Monitor'],
    ['/live-monitor/NVDA', 'Live Market Monitor'],
    ['/watchlist', 'Watchlist'],
    ['/opportunities/ORCL', 'Opportunity Radar'],
    ['/settings', 'Settings'],
  ])('renders %s inside the shared layout', async (path, pageHeading) => {
    renderAtPath(path);

    expect(
      await screen.findByRole('heading', { level: 1, name: pageHeading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Main' }),
    ).toBeInTheDocument();
  });

  it('redirects the root path to Opportunity Radar', async () => {
    const router = renderAtPath('/');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Opportunity Radar',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/opportunities');
  });

  it('marks the current page in the navigation', async () => {
    renderAtPath('/settings');

    expect(
      await screen.findByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: 'Opportunities' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps Live Monitor active while an instrument is selected', async () => {
    renderAtPath('/live-monitor/NVDA');

    expect(
      await screen.findByRole('link', { name: 'Live Monitor' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('shows a not found page for unknown paths', async () => {
    renderAtPath('/unknown-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to Opportunity Radar' }),
    ).toHaveAttribute('href', '/opportunities');
  });
});
