import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { ReplayStatus } from '../../contracts/replay.ts';
import {
  sampleAnomalyList,
  sampleMarketSnapshot,
  sampleNvidiaHistory,
  sampleOpportunityList,
  sampleReplayStatus,
} from '../../test/apiFixtures.ts';
import { FakeEventSource } from '../../test/fakeEventSource.ts';
import { renderAppAt } from '../../test/renderApp.tsx';

vi.mock('../live-monitor/PriceChart.tsx', () => ({
  PriceChart: () => <p>Price chart</p>,
}));

// A tiny stand-in for the mock API whose replay can be paused like the real one.
function stubReplayApi() {
  let replayStatus: ReplayStatus = sampleReplayStatus;
  const responseBodies: Record<string, unknown> = {
    '/api/market/snapshot': sampleMarketSnapshot,
    '/api/market/history': sampleNvidiaHistory,
    '/api/market/anomalies': sampleAnomalyList,
    '/api/opportunities': sampleOpportunityList,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (request) => {
      if (!(request instanceof Request)) {
        throw new Error('Expected a Request');
      }
      const { pathname } = new URL(request.url);
      if (pathname === '/api/replay' && request.method === 'PATCH') {
        const replayControl = (await request.json()) as { isPaused: boolean };
        replayStatus = {
          ...replayStatus,
          dataSource: {
            ...replayStatus.dataSource,
            isPaused: replayControl.isPaused,
          },
        };
      }
      const responseBody =
        pathname === '/api/replay' ? replayStatus : responseBodies[pathname];
      return Response.json(responseBody);
    }),
  );
}

describe('ReplayPanel', () => {
  beforeAll(async () => {
    // The route loads Live Monitor lazily; importing it once keeps its first render quick.
    await import('../live-monitor/LiveMonitorPage.tsx');
  });

  // Walks through two pages, so it needs more than the default five seconds on a busy machine.
  it(
    'shows a pause made in Live Monitor on Opportunity Radar right away',
    { timeout: 15_000 },
    async () => {
      stubReplayApi();
      const user = userEvent.setup();
      renderAppAt('/live-monitor/NVDA');
      await waitFor(() => {
        expect(FakeEventSource.instances).not.toHaveLength(0);
      });
      act(() => {
        FakeEventSource.latest().open();
      });

      await user.click(
        await screen.findByRole('button', { name: 'Pause replay' }),
      );
      act(() => {
        FakeEventSource.latest().emit({
          type: 'replay.changed',
          id: '0-change-1',
          occurredAt: sampleReplayStatus.asOf,
        });
      });
      await screen.findByRole('button', { name: 'Resume replay' });
      await user.click(screen.getByRole('link', { name: 'Opportunities' }));

      const replayPanel = await screen.findByRole('complementary', {
        name: 'About this data',
      });
      expect(within(replayPanel).getByText('Paused')).toBeInTheDocument();
      expect(
        within(replayPanel).getByRole('button', { name: 'Resume replay' }),
      ).toBeEnabled();
      expect(within(replayPanel).getByRole('status')).toHaveTextContent('Live');
    },
  );
});
