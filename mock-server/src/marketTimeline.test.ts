import { describe, expect, it } from 'vitest';
import {
  createConsecutiveDailyBars,
  createDailyBar,
  createIntradayBars,
  testIndex,
  testStock,
} from '../test/syntheticData.ts';
import type { DemoInstrument } from './instruments.ts';
import { buildMarketTimeline } from './marketTimeline.ts';
import type { DailyBar } from './recordedData.ts';

function buildTestTimeline(
  intradayBars: ReturnType<typeof createIntradayBars>,
  dailyBars: DailyBar[] = [
    createDailyBar('2026-11-03', 100),
    createDailyBar('2026-11-04', 100),
  ],
  instrument: DemoInstrument = testStock,
) {
  return buildMarketTimeline([instrument], {
    provider: 'Test provider',
    recordedAt: '2026-11-17T00:00:00.000Z',
    instruments: [{ symbol: instrument.symbol, dailyBars, intradayBars }],
  });
}

function anomalyDescriptions(timeline: ReturnType<typeof buildTestTimeline>) {
  return timeline.events.flatMap((event) =>
    event.type === 'anomaly.detected' ? [event.anomaly.description] : [],
  );
}

describe('buildMarketTimeline', () => {
  it('creates quotes that are timestamped when each bar closes', () => {
    const timeline = buildTestTimeline(
      createIntradayBars('2026-11-04T14:30:00.000Z', [100, 102, 99]),
    );

    expect(timeline.quotesBySymbol.get('TEST')).toEqual([
      expect.objectContaining({
        price: 100,
        previousClose: 100,
        change: 0,
        sessionVolume: 1000,
        timestamp: '2026-11-04T14:35:00.000Z',
      }),
      expect.objectContaining({ price: 102, sessionVolume: 2000 }),
      expect.objectContaining({ price: 99, sessionVolume: 3000 }),
    ]);
    expect(timeline.pricePointsBySymbol.get('TEST')).toEqual([
      { time: '2026-11-04T14:35:00.000Z', price: 100, volume: 1000 },
      { time: '2026-11-04T14:40:00.000Z', price: 102, volume: 1000 },
      { time: '2026-11-04T14:45:00.000Z', price: 99, volume: 1000 },
    ]);
  });

  it('reports volume as unavailable when the source has none', () => {
    const timeline = buildTestTimeline(
      createIntradayBars('2026-11-04T14:30:00.000Z', [100, 101], 0),
    );

    expect(timeline.quotesBySymbol.get('TEST')?.[1]?.sessionVolume).toBeNull();
    expect(
      timeline.pricePointsBySymbol.get('TEST')?.map(({ volume }) => volume),
    ).toEqual([null, null]);
  });

  it('reports a price move over 30 minutes once while it lasts', () => {
    const timeline = buildTestTimeline(
      createIntradayBars(
        '2026-11-04T14:30:00.000Z',
        [100, 100, 99, 98, 97, 96, 95, 95, 95],
      ),
    );

    expect(anomalyDescriptions(timeline)).toEqual([
      'Test Corp fell 5.0% in 30 minutes',
    ]);
    expect(
      timeline.events.find((event) => event.type === 'anomaly.detected')
        ?.occurredAt,
    ).toBe('2026-11-04T15:05:00.000Z');
  });

  it('explains the rule behind a price move', () => {
    const timeline = buildTestTimeline(
      createIntradayBars(
        '2026-11-04T14:30:00.000Z',
        [100, 100, 100, 100, 100, 100, 101.5],
      ),
      undefined,
      testIndex,
    );

    const anomaly = timeline.events.find(
      (event) => event.type === 'anomaly.detected',
    )?.anomaly;
    expect(anomaly).toMatchObject({
      kind: 'price-move',
      symbol: 'IDX',
      referencePrice: 100,
      referenceTime: '2026-11-04T14:35:00.000Z',
      rule: 'Indices moving 1% or more within 30 minutes or since the previous session',
    });
  });

  it('describes a move across a market close as a move since the previous session', () => {
    const timeline = buildTestTimeline([
      ...createIntradayBars('2026-11-04T20:00:00.000Z', [100]),
      ...createIntradayBars('2026-11-05T14:30:00.000Z', [90]),
    ]);

    expect(anomalyDescriptions(timeline)).toEqual([
      'Test Corp fell 10.0% since the previous session',
    ]);
  });

  it('does not attribute a move or volume to bars missing inside a session', () => {
    const timeline = buildTestTimeline([
      ...createIntradayBars('2026-11-04T14:30:00.000Z', [100]),
      ...createIntradayBars('2026-11-04T16:10:00.000Z', [90], 20_000),
    ]);

    expect(anomalyDescriptions(timeline)).toEqual([]);
    expect(timeline.pricePointsBySymbol.get('TEST')?.[1]).toEqual({
      time: '2026-11-04T16:15:00.000Z',
      price: 90,
      volume: null,
    });
    expect(timeline.quotesBySymbol.get('TEST')?.[1]?.sessionVolume).toBe(
      21_000,
    );
  });

  it('reports heavy session volume once relative to the 20-day average', () => {
    const timeline = buildTestTimeline(
      createIntradayBars(
        '2026-11-04T14:30:00.000Z',
        [100, 100, 100, 100],
        600_000,
      ),
      createConsecutiveDailyBars('2026-10-10', 20, 100),
    );

    const volumeAnomalies = timeline.events.flatMap((event) =>
      event.type === 'anomaly.detected' &&
      event.anomaly.kind === 'relative-volume'
        ? [event]
        : [],
    );
    expect(volumeAnomalies).toEqual([
      expect.objectContaining({
        occurredAt: '2026-11-04T14:45:00.000Z',
        anomaly: expect.objectContaining({
          sessionVolume: 1_800_000,
          averageDailyVolume: 1_000_000,
          relativeVolume: 1.8,
          description: 'Test Corp traded 1.8× its 20-day average daily volume',
        }) as unknown,
      }),
    ]);
  });

  it('checks relative volume only for stocks', () => {
    const timeline = buildTestTimeline(
      createIntradayBars('2026-11-04T14:30:00.000Z', [100, 100], 5_000_000),
      createConsecutiveDailyBars('2026-10-10', 20, 100),
      testIndex,
    );

    expect(anomalyDescriptions(timeline)).toEqual([]);
  });
});
