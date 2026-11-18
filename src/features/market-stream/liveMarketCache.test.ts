import { describe, expect, it, vi } from 'vitest';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import { createAppStore } from '../../app/store.ts';
import type { AnomalyDetectedEvent } from '../../contracts/anomalies.ts';
import {
  createQuoteUpdatedEvent,
  sampleAnomalyList,
  sampleMarketSnapshot,
  sampleNvidiaHistory,
  sampleOpportunityList,
  sampleReplayStatus,
} from '../../test/apiFixtures.ts';
import { requestedPaths, stubApiResponses } from '../../test/renderApp.tsx';
import {
  applyMarketStreamEvent,
  refetchCachedMarketData,
} from './liveMarketCache.ts';

async function createStoreWithCachedData() {
  const store = createAppStore();
  await Promise.all([
    store.dispatch(
      marketPulseApi.util.upsertQueryData(
        'getMarketSnapshot',
        undefined,
        sampleMarketSnapshot,
      ),
    ),
    store.dispatch(
      marketPulseApi.util.upsertQueryData(
        'getPriceHistory',
        'NVDA',
        sampleNvidiaHistory,
      ),
    ),
    store.dispatch(
      marketPulseApi.util.upsertQueryData(
        'getAnomalies',
        undefined,
        sampleAnomalyList,
      ),
    ),
  ]);
  const { select } = marketPulseApi.endpoints.getMarketSnapshot;
  return {
    store,
    snapshot: () => select(undefined)(store.getState()).data,
    history: () =>
      marketPulseApi.endpoints.getPriceHistory.select('NVDA')(store.getState())
        .data,
    anomalies: () =>
      marketPulseApi.endpoints.getAnomalies.select(undefined)(store.getState())
        .data?.anomalies,
  };
}

describe('applyMarketStreamEvent', () => {
  it('updates the quote, market time, and price history with a newer quote', async () => {
    const { store, snapshot, history } = await createStoreWithCachedData();

    store.dispatch(
      applyMarketStreamEvent(
        createQuoteUpdatedEvent(
          { price: 170, timestamp: '2026-11-05T15:05:00.000Z' },
          1_500_000,
        ),
      ),
    );

    expect(
      snapshot()?.quotes.find(({ symbol }) => symbol === 'NVDA')?.price,
    ).toBe(170);
    expect(snapshot()?.asOf).toBe('2026-11-05T15:05:00.000Z');
    expect(history()?.points.at(-1)).toEqual({
      time: '2026-11-05T15:05:00.000Z',
      price: 170,
      volume: 1_500_000,
    });
  });

  it('ignores quotes that are not newer than the cached data', async () => {
    const { store, snapshot, history } = await createStoreWithCachedData();

    store.dispatch(
      applyMarketStreamEvent(
        createQuoteUpdatedEvent({
          price: 175,
          timestamp: '2026-11-05T14:55:00.000Z',
        }),
      ),
    );

    expect(
      snapshot()?.quotes.find(({ symbol }) => symbol === 'NVDA')?.price,
    ).toBe(171.4);
    expect(snapshot()?.asOf).toBe(sampleMarketSnapshot.asOf);
    expect(history()?.points).toEqual(sampleNvidiaHistory.points);
  });

  it('adds each anomaly once', async () => {
    const { store, anomalies } = await createStoreWithCachedData();
    const [knownAnomaly] = sampleAnomalyList.anomalies;
    if (!knownAnomaly) {
      throw new Error('Fixture has no anomaly');
    }
    const newAnomaly: AnomalyDetectedEvent = {
      ...knownAnomaly,
      id: '0-200',
      occurredAt: '2026-11-05T15:05:00Z',
    };

    store.dispatch(applyMarketStreamEvent(knownAnomaly));
    store.dispatch(applyMarketStreamEvent(newAnomaly));
    store.dispatch(applyMarketStreamEvent(newAnomaly));

    expect(anomalies()?.map(({ id }) => id)).toEqual(['0-120', '0-200']);
  });

  it('moves the market clock forward only', async () => {
    const { store, snapshot } = await createStoreWithCachedData();

    store.dispatch(
      applyMarketStreamEvent({
        type: 'replay.clock',
        id: 'clock-1',
        occurredAt: '2026-11-05T15:10:00.000Z',
      }),
    );
    store.dispatch(
      applyMarketStreamEvent({
        type: 'replay.clock',
        id: 'clock-0',
        occurredAt: '2026-11-05T15:05:00.000Z',
      }),
    );

    expect(snapshot()?.asOf).toBe('2026-11-05T15:10:00.000Z');
  });
});

describe('replay clock', () => {
  it('advances the replay status and reloads the screening when a new replayed day starts', async () => {
    const { store } = await createStoreWithCachedData();
    await Promise.all([
      store.dispatch(
        marketPulseApi.util.upsertQueryData(
          'getReplayStatus',
          undefined,
          sampleReplayStatus,
        ),
      ),
      store.dispatch(
        marketPulseApi.util.upsertQueryData(
          'getOpportunities',
          undefined,
          sampleOpportunityList,
        ),
      ),
    ]);
    const fetchMock = stubApiResponses({
      '/api/opportunities': sampleOpportunityList,
    });
    const replayTime = () =>
      marketPulseApi.endpoints.getReplayStatus.select(undefined)(
        store.getState(),
      ).data?.asOf;

    store.dispatch(
      applyMarketStreamEvent({
        type: 'replay.clock',
        id: 'clock-1',
        occurredAt: '2026-11-05T23:55:00.000Z',
      }),
    );
    expect(replayTime()).toBe('2026-11-05T23:55:00.000Z');
    expect(fetchMock).not.toHaveBeenCalled();

    store.dispatch(
      applyMarketStreamEvent({
        type: 'replay.clock',
        id: 'clock-2',
        occurredAt: '2026-11-06T00:05:00.000Z',
      }),
    );

    await vi.waitFor(() => {
      expect(requestedPaths(fetchMock)).toEqual(['/api/opportunities']);
    });
  });
});

describe('refetchCachedMarketData', () => {
  it('refetches the snapshot, anomalies, and every cached price history', async () => {
    const { store } = await createStoreWithCachedData();
    const fetchMock = vi.fn<typeof fetch>((request) => {
      const { pathname } = new URL(
        request instanceof Request ? request.url : String(request),
      );
      const responses: Record<string, unknown> = {
        '/api/market/snapshot': sampleMarketSnapshot,
        '/api/market/history': sampleNvidiaHistory,
        '/api/market/anomalies': sampleAnomalyList,
      };
      return Promise.resolve(Response.json(responses[pathname]));
    });
    vi.stubGlobal('fetch', fetchMock);

    await store.dispatch(refetchCachedMarketData());

    const requestedUrls = fetchMock.mock.calls.map(([request]) =>
      request instanceof Request ? request.url : String(request),
    );
    expect(requestedUrls.toSorted()).toEqual([
      'http://localhost/api/market/anomalies',
      'http://localhost/api/market/history?symbol=NVDA',
      'http://localhost/api/market/snapshot',
    ]);
  });
});
