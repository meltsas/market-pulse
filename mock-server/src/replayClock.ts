export interface ReplayPosition {
  cycle: number;
  marketTimeMs: number;
}

export interface ReplayClock {
  startMs: number;
  positionAt(realTimeMs: number): ReplayPosition;
}

interface ReplayClockOptions {
  startMs: number;
  endMs: number;
  speedMultiplier: number;
  startedAtMs: number;
}

export function createReplayClock({
  startMs,
  endMs,
  speedMultiplier,
  startedAtMs,
}: ReplayClockOptions): ReplayClock {
  const durationMs = endMs - startMs;

  return {
    startMs,
    positionAt(realTimeMs) {
      const elapsedMarketMs = Math.max(
        0,
        (realTimeMs - startedAtMs) * speedMultiplier,
      );
      return {
        cycle: Math.floor(elapsedMarketMs / durationMs),
        marketTimeMs: startMs + (elapsedMarketMs % durationMs),
      };
    },
  };
}
