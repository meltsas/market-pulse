import { describe, expect, it } from 'vitest';
import {
  createDailyBar,
  createIntradayBars,
  testStock,
} from '../test/syntheticData.ts';
import { buildMarketTimeline } from './marketTimeline.ts';

function buildTestTimeline(
  intradayBars: ReturnType<typeof createIntradayBars>,
) {
  return buildMarketTimeline([testStock], {
    provider: 'Test provider',
    recordedAt: '2026-11-17T00:00:00.000Z',
    instruments: [
      {
        symbol: testStock.symbol,
        dailyBars: [
          createDailyBar('2026-11-03', 100),
          createDailyBar('2026-11-04', 100),
        ],
        intradayBars,
      },
    ],
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

  it('describes a move across a market close as a move since the previous session', () => {
    const timeline = buildTestTimeline([
      ...createIntradayBars('2026-11-04T20:00:00.000Z', [100]),
      ...createIntradayBars('2026-11-05T14:30:00.000Z', [90]),
    ]);

    expect(anomalyDescriptions(timeline)).toEqual([
      'Test Corp fell 10.0% since the previous session',
    ]);
  });
});
