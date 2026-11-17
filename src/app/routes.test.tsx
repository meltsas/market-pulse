import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { routes } from './routes.tsx';

function renderAtPath(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  it.each([
    ['/opportunities', 'Opportunity Radar'],
    ['/live-monitor', 'Live Market Monitor'],
    ['/watchlist', 'Watchlist'],
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

  it('marks the current page in the main navigation', async () => {
    renderAtPath('/watchlist');

    expect(
      await screen.findByRole('link', { name: 'Watchlist' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('link', { name: 'Opportunities' }),
    ).not.toHaveAttribute('aria-current');
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
