import { describe, expect, it } from 'vitest';
import { createReplayClock } from './replayClock.ts';

const MINUTE_MS = 60_000;
const startMs = Date.parse('2026-11-04T00:00:00.000Z');
const clock = createReplayClock({
  startMs,
  endMs: startMs + 60 * MINUTE_MS,
  speedMultiplier: 60,
  startedAtMs: 1_000,
});

describe('createReplayClock', () => {
  it('starts at the beginning of the replay window', () => {
    expect(clock.positionAt(1_000)).toEqual({
      cycle: 0,
      marketTimeMs: startMs,
    });
  });

  it('advances market time by the speed multiplier', () => {
    expect(clock.positionAt(31_000)).toEqual({
      cycle: 0,
      marketTimeMs: startMs + 30 * MINUTE_MS,
    });
  });

  it('restarts from the beginning after the window ends', () => {
    expect(clock.positionAt(66_000)).toEqual({
      cycle: 1,
      marketTimeMs: startMs + 5 * MINUTE_MS,
    });
  });
});
