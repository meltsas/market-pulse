import { z } from 'zod';

export const utcTimestampSchema = z.iso.datetime();

export const replayBookmarkSchema = z.object({
  label: z.string().min(1),
  marketTime: utcTimestampSchema,
});

export const dataSourceSchema = z.object({
  kind: z.literal('historical-replay'),
  providers: z.array(z.string().min(1)).min(1),
  replayStart: utcTimestampSchema,
  replayEnd: utcTimestampSchema,
  speedMultiplier: z.number().positive(),
  isPaused: z.boolean(),
  // Notable moments of the recorded period that a replay can jump to.
  bookmarks: z.array(replayBookmarkSchema),
});

export const assetClassSchema = z.enum([
  'index',
  'stock',
  'crypto',
  'currency',
]);

export const instrumentSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  assetClass: assetClassSchema,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'Expected an ISO 4217 currency code'),
});

export const quoteSchema = instrumentSchema.extend({
  price: z.number().positive(),
  previousClose: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  sessionVolume: z.number().int().nonnegative().nullable(),
  timestamp: utcTimestampSchema,
});

export const marketSnapshotSchema = z.object({
  // Market time the data describes; during a replay this is recorded time, not wall-clock time.
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  quotes: z.array(quoteSchema),
});

// Volume is the amount traded during the bar that ends at `time`; null when the source has no reliable volume.
export const pricePointSchema = z.object({
  time: utcTimestampSchema,
  price: z.number().positive(),
  volume: z.number().int().nonnegative().nullable(),
});

export const priceHistorySchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  symbol: z.string().min(1),
  points: z.array(pricePointSchema),
});

export type ReplayBookmark = z.infer<typeof replayBookmarkSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
export type AssetClass = z.infer<typeof assetClassSchema>;
export type Instrument = z.infer<typeof instrumentSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
export type PricePoint = z.infer<typeof pricePointSchema>;
export type PriceHistory = z.infer<typeof priceHistorySchema>;
