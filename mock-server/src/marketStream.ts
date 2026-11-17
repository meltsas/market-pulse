import type { MarketStreamEvent } from '../../src/contracts/marketStream.ts';
import type { MarketTimeline } from './marketTimeline.ts';
import type { ReplayClock, ReplayPosition } from './replayClock.ts';

export type MarketStreamListener = (event: MarketStreamEvent) => void;

export interface MarketStream {
  subscribe(listener: MarketStreamListener): () => void;
  listenerCount(): number;
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

  function publishNewEvents() {
    const position = clock.positionAt(now());
    const events = collectStreamEvents(
      timeline,
      clock.startMs,
      lastPosition,
      position,
    );
    lastPosition = position;
    for (const event of events) {
      for (const listener of listeners) {
        listener(event);
      }
    }
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
