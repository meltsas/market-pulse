export interface ReplayPosition {
  cycle: number;
  marketTimeMs: number;
}

export interface ReplayPlayback {
  isPaused: boolean;
  speedMultiplier: number;
}

export interface ReplayClockChange {
  isPaused?: boolean;
  speedMultiplier?: number;
  marketTimeMs?: number;
}

export interface ReplayClock {
  startMs: number;
  endMs: number;
  positionAt(realTimeMs: number): ReplayPosition;
  playback(): ReplayPlayback;
  change(clockChange: ReplayClockChange, realTimeMs: number): void;
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
  // Market time already replayed when the clock last changed, counted across cycles.
  let anchorReplayedMs = 0;
  let anchorRealTimeMs = startedAtMs;
  let playback: ReplayPlayback = { isPaused: false, speedMultiplier };

  function replayedMsAt(realTimeMs: number) {
    if (playback.isPaused) {
      return anchorReplayedMs;
    }
    const elapsedRealTimeMs = Math.max(0, realTimeMs - anchorRealTimeMs);
    return anchorReplayedMs + elapsedRealTimeMs * playback.speedMultiplier;
  }

  return {
    startMs,
    endMs,
    positionAt(realTimeMs) {
      const replayedMs = replayedMsAt(realTimeMs);
      return {
        cycle: Math.floor(replayedMs / durationMs),
        marketTimeMs: startMs + (replayedMs % durationMs),
      };
    },
    playback() {
      return playback;
    },
    change({ isPaused, speedMultiplier, marketTimeMs }, realTimeMs) {
      const replayedMs = replayedMsAt(realTimeMs);
      const cycleStartReplayedMs =
        Math.floor(replayedMs / durationMs) * durationMs;
      anchorReplayedMs =
        marketTimeMs === undefined
          ? replayedMs
          : cycleStartReplayedMs + (marketTimeMs - startMs);
      anchorRealTimeMs = realTimeMs;
      playback = {
        isPaused: isPaused ?? playback.isPaused,
        speedMultiplier: speedMultiplier ?? playback.speedMultiplier,
      };
    },
  };
}
