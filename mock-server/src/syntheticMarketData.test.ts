import { describe, expect, it } from 'vitest';
import { marketSnapshotSchema } from '../../src/contracts/market.ts';
import { createFundamentals } from '../test/syntheticData.ts';
import { createMockServer } from './app.ts';
import { REPLAY_END, REPLAY_START } from './config.ts';
import { demoInstruments } from './instruments.ts';
import { buildMarketTimeline } from './marketTimeline.ts';
import { recordedMarketDataSchema } from './recordedData.ts';
import { createSyntheticMarketData } from './syntheticMarketData.ts';

const syntheticMarketData = createSyntheticMarketData(demoInstruments);

describe('createSyntheticMarketData', () => {
  it('produces the same valid data on every start', () => {
    expect(recordedMarketDataSchema.parse(syntheticMarketData)).toEqual(
      createSyntheticMarketData(demoInstruments),
    );
  });

  it('covers every instrument across the replay window', () => {
    for (const {
      symbol,
      intradayBars,
      dailyBars,
    } of syntheticMarketData.instruments) {
      expect(dailyBars.length, symbol).toBeGreaterThan(250);
      expect(
        intradayBars.some(({ start }) => start < REPLAY_START),
        symbol,
      ).toBe(true);
      expect(intradayBars.at(-1)?.start.slice(0, 10), symbol).toBe(
        new Date(Date.parse(REPLAY_END) - 1).toISOString().slice(0, 10),
      );
    }
  });

  it('replays the 5 November sell-off with alerts at the US open', () => {
    const timeline = buildMarketTimeline(demoInstruments, syntheticMarketData);
    const openingAlerts = timeline.events.flatMap((event) =>
      event.type === 'anomaly.detected' &&
      event.occurredAt === '2026-11-05T14:35:00.000Z'
        ? [event.anomaly.symbol]
        : [],
    );

    expect(openingAlerts).toEqual(
      expect.arrayContaining(['SPX', 'NDX', 'NVDA', 'AMD']),
    );
  });

  it('labels the replay as synthetic', async () => {
    const { app } = createMockServer({
      instruments: demoInstruments,
      recordedMarketData: syntheticMarketData,
      fundamentals: createFundamentals(),
      isSyntheticData: true,
    });

    const response = await app.inject({ url: '/api/market/snapshot' });
    await app.close();

    expect(
      marketSnapshotSchema.parse(response.json()).dataSource,
    ).toMatchObject({
      kind: 'synthetic-replay',
      providers: ['Generated synthetic prices'],
    });
  });
});
