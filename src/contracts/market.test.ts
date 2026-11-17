import { describe, expect, it } from 'vitest';
import { sampleMarketSnapshot } from '../test/apiFixtures.ts';
import { marketSnapshotSchema } from './market.ts';

describe('marketSnapshotSchema', () => {
  it('accepts a valid snapshot', () => {
    expect(marketSnapshotSchema.safeParse(sampleMarketSnapshot).success).toBe(
      true,
    );
  });

  it('rejects timestamps that are not in UTC', () => {
    const snapshot = {
      ...sampleMarketSnapshot,
      asOf: '2026-11-17T16:30:00+02:00',
    };

    expect(marketSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it('rejects data without a known data source', () => {
    const snapshot = {
      ...sampleMarketSnapshot,
      dataSource: { ...sampleMarketSnapshot.dataSource, kind: 'live' },
    };

    expect(marketSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });
});
