import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import {
  createDailyBar,
  createIntradayBars,
  testStock,
} from '../test/syntheticData.ts';
import {
  collectAnomaliesUntil,
  collectStreamEvents,
  createMarketStream,
} from './marketStream.ts';
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

  it('publishes events and the replay clock only while someone is subscribed', () => {
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
      {
        id: `0-clock-${String(replayStartMs + 5 * MINUTE_MS)}`,
        type: 'replay.clock',
        occurredAt: '2026-11-04T00:05:00.000Z',
      },
    ]);
    expect(marketStream.listenerCount()).toBe(0);
  });
});

describe('announceReplayChange', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the change and continues from the new position without replaying skipped events', () => {
    vi.useFakeTimers();
    let realTimeMs = 0;
    const clock = createReplayClock({
      startMs: replayStartMs,
      endMs: replayStartMs + 60 * MINUTE_MS,
      speedMultiplier: 300,
      startedAtMs: 0,
    });
    const marketStream = createMarketStream({
      timeline,
      clock,
      tickIntervalMs: 1000,
      now: () => realTimeMs,
    });
    const receivedEvents: MarketStreamEvent[] = [];
    const unsubscribe = marketStream.subscribe((event) => {
      receivedEvents.push(event);
    });

    clock.change({ marketTimeMs: replayStartMs + 12 * MINUTE_MS }, realTimeMs);
    marketStream.announceReplayChange();
    realTimeMs = 1000;
    vi.advanceTimersByTime(1000);
    unsubscribe();

    expect(summarize(receivedEvents)).toEqual([
      {
        id: '0-change-1',
        type: 'replay.changed',
        occurredAt: '2026-11-04T00:12:00.000Z',
      },
      {
        id: '0-2',
        type: 'quote.updated',
        occurredAt: '2026-11-04T00:15:00.000Z',
      },
      {
        id: `0-clock-${String(replayStartMs + 17 * MINUTE_MS)}`,
        type: 'replay.clock',
        occurredAt: '2026-11-04T00:17:00.000Z',
      },
    ]);
  });
});

describe('collectAnomaliesUntil', () => {
  it('returns anomalies of the current cycle up to the replay position', () => {
    const volatileTimeline = buildMarketTimeline([testStock], {
      provider: 'Test provider',
      recordedAt: '2026-11-17T00:00:00.000Z',
      instruments: [
        {
          symbol: testStock.symbol,
          dailyBars: [
            createDailyBar('2026-11-02', 100),
            createDailyBar('2026-11-03', 100),
          ],
          intradayBars: [
            ...createIntradayBars('2026-11-03T20:55:00.000Z', [100]),
            ...createIntradayBars(
              '2026-11-04T14:30:00.000Z',
              [90, 90, 90, 90, 90, 90, 90, 95],
            ),
          ],
        },
      ],
    });

    const anomalies = collectAnomaliesUntil(volatileTimeline, replayStartMs, {
      cycle: 2,
      marketTimeMs: Date.parse('2026-11-04T15:00:00.000Z'),
    });

    expect(summarize(anomalies)).toEqual([
      {
        id: '2-2',
        type: 'anomaly.detected',
        occurredAt: '2026-11-04T14:35:00.000Z',
      },
    ]);
  });
});
