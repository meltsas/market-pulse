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

describe('replay clock controls', () => {
  function createTestClock() {
    return createReplayClock({
      startMs,
      endMs: startMs + 60 * MINUTE_MS,
      speedMultiplier: 60,
      startedAtMs: 0,
    });
  }

  it('holds market time while paused and continues from there when resumed', () => {
    const controlledClock = createTestClock();

    controlledClock.change({ isPaused: true }, 10_000);
    const pausedPosition = controlledClock.positionAt(40_000);
    controlledClock.change({ isPaused: false }, 40_000);

    expect(pausedPosition.marketTimeMs).toBe(startMs + 10 * MINUTE_MS);
    expect(controlledClock.positionAt(45_000).marketTimeMs).toBe(
      startMs + 15 * MINUTE_MS,
    );
    expect(controlledClock.playback()).toEqual({
      isPaused: false,
      speedMultiplier: 60,
    });
  });

  it('jumps to a market time within the current cycle', () => {
    const controlledClock = createTestClock();

    controlledClock.change({ marketTimeMs: startMs + 50 * MINUTE_MS }, 70_000);

    expect(controlledClock.positionAt(70_000)).toEqual({
      cycle: 1,
      marketTimeMs: startMs + 50 * MINUTE_MS,
    });
  });

  it('applies a new speed from the moment it changes', () => {
    const controlledClock = createTestClock();

    controlledClock.change({ speedMultiplier: 300 }, 10_000);

    expect(controlledClock.positionAt(11_000).marketTimeMs).toBe(
      startMs + 15 * MINUTE_MS,
    );
  });
});
