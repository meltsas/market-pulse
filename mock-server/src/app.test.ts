import { afterAll, describe, expect, it, vi } from 'vitest';
import { anomalyListSchema } from '../../src/contracts/anomalies.ts';
import {
  marketSnapshotSchema,
  priceHistorySchema,
} from '../../src/contracts/market.ts';
import { marketStreamEventSchema } from '../../src/contracts/marketStream.ts';
import { opportunityListSchema } from '../../src/contracts/opportunities.ts';
import {
  createDailyBar,
  createFundamentals,
  createIntradayBars,
  testStock,
} from '../test/syntheticData.ts';
import { createMockServer } from './app.ts';
import { REPLAY_START } from './config.ts';
import { replayStatusSchema } from '../../src/contracts/replay.ts';

const startedAtMs = 1_000_000;
let realTimeMs = startedAtMs;

const { app, marketStream } = createMockServer({
  instruments: [testStock],
  recordedMarketData: {
    provider: 'Test provider',
    recordedAt: '2026-11-17T00:00:00.000Z',
    instruments: [
      {
        symbol: testStock.symbol,
        dailyBars: [
          createDailyBar('2026-06-01', 190, 200),
          createDailyBar('2026-11-02', 100),
          createDailyBar('2026-11-03', 100),
        ],
        intradayBars: [
          ...createIntradayBars('2026-11-03T20:55:00.000Z', [100]),
          ...createIntradayBars('2026-11-04T00:00:00.000Z', [101, 102]),
        ],
      },
    ],
  },
  fundamentals: createFundamentals(),
  now: () => realTimeMs,
  tickIntervalMs: 10,
});

afterAll(async () => {
  await app.close();
});

function readFirstServerSentData(chunk = '') {
  const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));
  if (!dataLine) {
    throw new Error('No server-sent event data received');
  }
  return JSON.parse(dataLine.slice('data: '.length)) as unknown;
}

describe('mock server', () => {
  it('serves a market snapshot that matches the API contract', async () => {
    const response = await app.inject({ url: '/api/market/snapshot' });

    const snapshot = marketSnapshotSchema.parse(response.json());
    expect(snapshot.asOf).toBe(REPLAY_START);
    expect(snapshot.dataSource.kind).toBe('historical-replay');
    expect(snapshot.quotes).toEqual([
      expect.objectContaining({
        symbol: 'TEST',
        price: 100,
        timestamp: '2026-11-03T21:00:00.000Z',
      }),
    ]);
  });

  it('serves opportunities that match the API contract', async () => {
    const response = await app.inject({ url: '/api/opportunities' });

    const opportunityList = opportunityListSchema.parse(response.json());
    expect(opportunityList.dataSource.providers).toEqual([
      'Test provider',
      'SEC EDGAR',
    ]);
    expect(opportunityList.opportunities.map(({ symbol }) => symbol)).toEqual([
      'TEST',
    ]);
  });

  it('serves the price history recorded until the replay position', async () => {
    const response = await app.inject({
      url: '/api/market/history?symbol=TEST',
    });

    const priceHistory = priceHistorySchema.parse(response.json());
    expect(priceHistory.asOf).toBe(REPLAY_START);
    expect(priceHistory.points).toEqual([
      { time: '2026-11-03T21:00:00.000Z', price: 100, volume: 1000 },
    ]);
  });

  it('rejects price history requests without a known symbol', async () => {
    const missingSymbol = await app.inject({ url: '/api/market/history' });
    const unknownSymbol = await app.inject({
      url: '/api/market/history?symbol=UNKNOWN',
    });

    expect(missingSymbol.statusCode).toBe(400);
    expect(unknownSymbol.statusCode).toBe(404);
  });

  it('serves anomalies that match the API contract', async () => {
    const response = await app.inject({ url: '/api/market/anomalies' });

    const anomalyList = anomalyListSchema.parse(response.json());
    expect(anomalyList.asOf).toBe(REPLAY_START);
    expect(anomalyList.anomalies).toEqual([]);
  });

  it('rejects invalid replay controls', async () => {
    const unknownSpeed = await app.inject({
      method: 'PATCH',
      url: '/api/replay',
      payload: { speedMultiplier: 7 },
    });
    const outsideWindow = await app.inject({
      method: 'PATCH',
      url: '/api/replay',
      payload: { marketTime: '2026-11-08T00:00:00.000Z' },
    });

    expect(unknownSpeed.statusCode).toBe(400);
    expect(outsideWindow.statusCode).toBe(400);
  });

  it('pauses, moves, and resumes the replay', async () => {
    const pausedAndMoved = await app.inject({
      method: 'PATCH',
      url: '/api/replay',
      payload: { isPaused: true, marketTime: '2026-11-04T00:05:00.000Z' },
    });
    const pausedStatus = replayStatusSchema.parse(pausedAndMoved.json());
    const snapshot = marketSnapshotSchema.parse(
      (await app.inject({ url: '/api/market/snapshot' })).json(),
    );
    await app.inject({
      method: 'PATCH',
      url: '/api/replay',
      payload: { isPaused: false, marketTime: REPLAY_START },
    });

    expect(pausedStatus).toMatchObject({
      asOf: '2026-11-04T00:05:00.000Z',
      dataSource: { isPaused: true, speedMultiplier: 300 },
    });
    expect(snapshot.dataSource.isPaused).toBe(true);
    expect(snapshot.quotes[0]?.price).toBe(101);
  });

  it('streams contract-valid events and releases disconnected clients', async () => {
    const address = await app.listen({ port: 0 });
    const response = await fetch(`${address}/api/market/stream`);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    if (!response.body) {
      throw new Error('The event stream has no body');
    }
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    realTimeMs = startedAtMs + 2_000;
    const { value } = await reader.read();
    await reader.cancel();

    expect(
      marketStreamEventSchema.parse(readFirstServerSentData(value)),
    ).toMatchObject({
      type: 'quote.updated',
      occurredAt: '2026-11-04T00:05:00.000Z',
    });
    await vi.waitFor(() => {
      expect(marketStream.listenerCount()).toBe(0);
    });
  });
});
