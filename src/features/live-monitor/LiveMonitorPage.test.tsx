import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes.tsx';
import { createAppStore } from '../../app/store.ts';
import type { PricePoint } from '../../contracts/market.ts';
import {
  createQuoteUpdatedEvent,
  sampleAnomalyList,
  sampleMarketSnapshot,
  sampleNvidiaHistory,
} from '../../test/apiFixtures.ts';
import { FakeEventSource } from '../../test/fakeEventSource.ts';

// The canvas chart cannot render in jsdom; the stand-in exposes what it was given.
vi.mock('./PriceChart.tsx', () => ({
  PriceChart: ({ pricePoints }: { pricePoints: readonly PricePoint[] }) => (
    <p>{`Chart with ${String(pricePoints.length)} prices`}</p>
  ),
}));

function mockMarketApi({ isSnapshotAvailable = true } = {}) {
  const fetchMock = vi.fn<typeof fetch>((request) => {
    const url = new URL(
      request instanceof Request ? request.url : String(request),
    );
    switch (url.pathname) {
      case '/api/market/snapshot':
        return Promise.resolve(
          isSnapshotAvailable
            ? Response.json(sampleMarketSnapshot)
            : new Response(null, { status: 503 }),
        );
      case '/api/market/history':
        return Promise.resolve(Response.json(sampleNvidiaHistory));
      case '/api/market/anomalies':
        return Promise.resolve(Response.json(sampleAnomalyList));
      default:
        return Promise.resolve(new Response(null, { status: 404 }));
    }
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderLiveMonitor(path = '/live-monitor/NVDA') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Provider store={createAppStore()}>
      <RouterProvider router={router} />
    </Provider>,
  );
}

// The page loads lazily, so the stream exists once its connection status is shown.
async function openStream() {
  await screen.findByRole('status');
  act(() => {
    FakeEventSource.latest().open();
  });
}

async function renderConnectedLiveMonitor() {
  renderLiveMonitor();
  await openStream();
  await screen.findByText('Chart with 2 prices');
}

describe('LiveMonitorPage', () => {
  beforeAll(async () => {
    // The route loads this page lazily; importing it once keeps its first render within the default wait time.
    await import('./LiveMonitorPage.tsx');
  });

  it('connects to the live stream before loading market data', async () => {
    const fetchMock = mockMarketApi();
    renderLiveMonitor();

    expect(await screen.findByRole('status')).toHaveTextContent('Connecting');
    expect(fetchMock).not.toHaveBeenCalled();

    await openStream();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'NVIDIA' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('shows the selected instrument, the markets, and explained alerts', async () => {
    mockMarketApi();
    await renderConnectedLiveMonitor();

    const markets = screen.getByRole('navigation', { name: 'Markets' });
    expect(within(markets).getByRole('link', { name: /NVDA/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(markets).getByRole('link', { name: /SPX/ }),
    ).toHaveTextContent('7,384.68');
    const alerts = screen.getByRole('region', { name: 'Unusual activity' });
    expect(
      within(alerts).getByText('NVIDIA fell 3.3% since the previous session'),
    ).toBeInTheDocument();
    expect(
      within(alerts).getByText(/^Rule: Stocks moving 3%/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'About this data' }),
    ).toHaveTextContent('Historical replay');
  });

  it('applies live quotes to the price and the chart', async () => {
    mockMarketApi();
    await renderConnectedLiveMonitor();

    act(() => {
      FakeEventSource.latest().emit(
        createQuoteUpdatedEvent({
          price: 168.25,
          change: -13.75,
          changePercent: -7.55,
          timestamp: '2026-11-05T15:05:00.000Z',
        }),
      );
    });

    const detail = screen.getByRole('article', { name: 'NVIDIA' });
    expect(await within(detail).findByText('$168.25')).toBeInTheDocument();
    expect(within(detail).getByText('Chart with 3 prices')).toBeInTheDocument();
  });

  it('reloads market data when the replay is changed', async () => {
    const fetchMock = mockMarketApi();
    await renderConnectedLiveMonitor();
    const countSnapshotRequests = () =>
      fetchMock.mock.calls.filter(
        ([request]) =>
          request instanceof Request &&
          request.url.endsWith('/api/market/snapshot'),
      ).length;
    const snapshotRequestsBeforeChange = countSnapshotRequests();

    act(() => {
      FakeEventSource.latest().emit({
        type: 'replay.changed',
        id: '0-change-1',
        occurredAt: '2026-11-04T00:00:00.000Z',
      });
    });

    await waitFor(() => {
      expect(countSnapshotRequests()).toBe(snapshotRequestsBeforeChange + 1);
    });
  });

  it('pauses live updates while the stream reconnects', async () => {
    mockMarketApi();
    await renderConnectedLiveMonitor();

    act(() => {
      FakeEventSource.latest().fail();
    });

    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Live updates are paused',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'NVIDIA' }),
    ).toBeInTheDocument();
  });

  it('offers a retry when market data cannot be loaded', async () => {
    const fetchMock = mockMarketApi({ isSnapshotAvailable: false });
    const user = userEvent.setup();
    renderLiveMonitor();
    await openStream();

    const retryButton = await screen.findByRole('button', {
      name: 'Try again',
    });
    expect(
      screen.getByRole('heading', { name: 'Market data is unavailable' }),
    ).toBeInTheDocument();

    fetchMock.mockImplementation(() =>
      Promise.resolve(Response.json(sampleMarketSnapshot)),
    );
    await user.click(retryButton);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'NVIDIA' }),
    ).toBeInTheDocument();
  });

  it('explains when an instrument is not part of the demo', async () => {
    mockMarketApi();
    renderLiveMonitor('/live-monitor/TSLA');
    await openStream();

    expect(
      await screen.findByRole('heading', { name: 'TSLA is not tracked' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Show the S&P 500' }),
    ).toHaveAttribute('href', '/live-monitor/SPX');
  });
});
