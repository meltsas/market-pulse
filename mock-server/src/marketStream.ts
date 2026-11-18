import type { AnomalyDetectedEvent } from '../../src/contracts/anomalies.ts';
import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import type { MarketTimeline } from './marketTimeline.ts';
import type { ReplayClock, ReplayPosition } from './replayClock.ts';

export type MarketStreamListener = (event: MarketStreamEvent) => void;

export interface MarketStream {
  subscribe(listener: MarketStreamListener): () => void;
  listenerCount(): number;
  // Continues from the clock's new position instead of replaying the skipped market time.
  announceReplayChange(): void;
}

interface MarketStreamOptions {
  timeline: MarketTimeline;
  clock: ReplayClock;
  tickIntervalMs: number;
  now: () => number;
}

export function createMarketStream({
  timeline,
  clock,
  tickIntervalMs,
  now,
}: MarketStreamOptions): MarketStream {
  const listeners = new Set<MarketStreamListener>();
  let tickTimer: ReturnType<typeof setInterval> | undefined;
  let lastPosition = clock.positionAt(now());
  let replayChangeCount = 0;

  function publish(events: readonly MarketStreamEvent[]) {
    for (const event of events) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  function publishNewEvents() {
    const position = clock.positionAt(now());
    const events: MarketStreamEvent[] = [
      ...collectStreamEvents(timeline, clock.startMs, lastPosition, position),
      {
        type: 'replay.clock',
        id: `${String(position.cycle)}-clock-${String(position.marketTimeMs)}`,
        occurredAt: new Date(position.marketTimeMs).toISOString(),
      },
    ];
    lastPosition = position;
    publish(events);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (!tickTimer) {
        lastPosition = clock.positionAt(now());
        tickTimer = setInterval(publishNewEvents, tickIntervalMs);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearInterval(tickTimer);
          tickTimer = undefined;
        }
      };
    },
    listenerCount() {
      return listeners.size;
    },
    announceReplayChange() {
      lastPosition = clock.positionAt(now());
      replayChangeCount += 1;
      publish([
        {
          type: 'replay.changed',
          id: `${String(lastPosition.cycle)}-change-${String(replayChangeCount)}`,
          occurredAt: new Date(lastPosition.marketTimeMs).toISOString(),
        },
      ]);
    },
  };
}

export function collectStreamEvents(
  timeline: MarketTimeline,
  replayStartMs: number,
  from: ReplayPosition,
  to: ReplayPosition,
): MarketStreamEvent[] {
  if (to.cycle === from.cycle) {
    return eventsBetween(
      timeline,
      from.cycle,
      from.marketTimeMs,
      to.marketTimeMs,
    );
  }

  const restartEvent: MarketStreamEvent = {
    type: 'replay.restarted',
    id: `${String(to.cycle)}-restart`,
    occurredAt: new Date(replayStartMs).toISOString(),
  };
  const remainingEventsOfPreviousCycle =
    to.cycle === from.cycle + 1
      ? eventsBetween(timeline, from.cycle, from.marketTimeMs, Infinity)
      : [];

  return [
    ...remainingEventsOfPreviousCycle,
    restartEvent,
    ...eventsBetween(timeline, to.cycle, replayStartMs - 1, to.marketTimeMs),
  ];
}

export function collectAnomaliesUntil(
  timeline: MarketTimeline,
  replayStartMs: number,
  position: ReplayPosition,
): AnomalyDetectedEvent[] {
  return eventsBetween(
    timeline,
    position.cycle,
    replayStartMs - 1,
    position.marketTimeMs,
  ).filter((event) => event.type === 'anomaly.detected');
}

function eventsBetween(
  timeline: MarketTimeline,
  cycle: number,
  afterMs: number,
  untilMs: number,
): MarketStreamEvent[] {
  return timeline.events.flatMap((event, eventIndex) => {
    const occurredAtMs = Date.parse(event.occurredAt);
    if (occurredAtMs <= afterMs || occurredAtMs > untilMs) {
      return [];
    }
    return [{ ...event, id: `${String(cycle)}-${String(eventIndex)}` }];
  });
}
