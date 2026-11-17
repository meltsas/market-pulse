import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import {
  createDailyBar,
  createIntradayBars,
  testStock,
} from '../test/syntheticData.ts';
import { collectStreamEvents, createMarketStream } from './marketStream.ts';
import { buildMarketTimeline } from './marketTimeline.ts';
import { createReplayClock } from './replayClock.ts';

const MINUTE_MS = 60_000;
const replayStartMs = Date.parse('2026-11-04T00:00:00.000Z');
const timeline = buildMarketTimeline([testStock], {
  provider: 'Test provider',
  recordedAt: '2026-11-17T00:00:00.000Z',
  instruments: [
    {
      symbol: testStock.symbol,
      dailyBars: [createDailyBar('2026-11-03', 100)],
      intradayBars: createIntradayBars(
        '2026-11-04T00:00:00.000Z',
        [100, 101, 102],
      ),
    },
  ],
});

function summarize(events: readonly MarketStreamEvent[]) {
  return events.map(({ id, type, occurredAt }) => ({ id, type, occurredAt }));
}

describe('collectStreamEvents', () => {
  it('returns events that happened since the previous position', () => {
    const events = collectStreamEvents(
      timeline,
      replayStartMs,
      { cycle: 0, marketTimeMs: replayStartMs },
      { cycle: 0, marketTimeMs: replayStartMs + 10 * MINUTE_MS },
    );

    expect(summarize(events)).toEqual([
      {
        id: '0-0',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:05:00.000Z',
      },
      {
        id: '0-1',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:10:00.000Z',
      },
    ]);
  });

  it('finishes the previous cycle and announces the restart', () => {
    const events = collectStreamEvents(
      timeline,
      replayStartMs,
      { cycle: 0, marketTimeMs: replayStartMs + 12 * MINUTE_MS },
      { cycle: 1, marketTimeMs: replayStartMs + 6 * MINUTE_MS },
    );

    expect(summarize(events)).toEqual([
      {
        id: '0-2',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:15:00.000Z',
      },
      {
        id: '1-restart',
        type: 'replay.restarted',
        occurredAt: '2026-11-04T00:00:00.000Z',
      },
      {
        id: '1-0',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:05:00.000Z',
      },
    ]);
  });
});

describe('createMarketStream', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes events only while someone is subscribed', () => {
    vi.useFakeTimers();
    let realTimeMs = 0;
    const marketStream = createMarketStream({
      timeline,
      clock: createReplayClock({
        startMs: replayStartMs,
        endMs: replayStartMs + 60 * MINUTE_MS,
        speedMultiplier: 300,
        startedAtMs: 0,
      }),
      tickIntervalMs: 1000,
      now: () => realTimeMs,
    });
    const receivedEvents: MarketStreamEvent[] = [];

    const unsubscribe = marketStream.subscribe((event) => {
      receivedEvents.push(event);
    });
    realTimeMs = 1000;
    vi.advanceTimersByTime(1000);
    unsubscribe();
    realTimeMs = 2000;
    vi.advanceTimersByTime(1000);

    expect(summarize(receivedEvents)).toEqual([
      {
        id: '0-0',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:05:00.000Z',
      },
    ]);
    expect(marketStream.listenerCount()).toBe(0);
  });
});
