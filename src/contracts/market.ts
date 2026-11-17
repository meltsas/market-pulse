import { z } from 'zod';

export const utcTimestampSchema = z.iso.datetime();

export const dataSourceSchema = z.literal('simulated');

export const instrumentSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'Expected an ISO 4217 currency code'),
});

const quoteSchema = instrumentSchema.extend({
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().int().nonnegative().nullable(),
  timestamp: utcTimestampSchema,
});

export const marketSnapshotSchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  quotes: z.array(quoteSchema),
});

export type MarketSnapshot = z.infer<typeof marketSnapshotSchema>;
