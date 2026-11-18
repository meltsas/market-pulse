import { z } from 'zod';
import { dataSourceSchema, utcTimestampSchema } from './market.ts';

const anomalyBaseSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  description: z.string().min(1),
  rule: z.string().min(1),
});

const priceMoveAnomalySchema = anomalyBaseSchema.extend({
  kind: z.literal('price-move'),
  changePercent: z.number(),
  referencePrice: z.number().positive(),
  referenceTime: utcTimestampSchema,
});

const relativeVolumeAnomalySchema = anomalyBaseSchema.extend({
  kind: z.literal('relative-volume'),
  sessionVolume: z.number().int().nonnegative(),
  averageDailyVolume: z.number().positive(),
  relativeVolume: z.number().positive(),
});

export const anomalySchema = z.discriminatedUnion('kind', [
  priceMoveAnomalySchema,
  relativeVolumeAnomalySchema,
]);

export const anomalyDetectedEventSchema = z.object({
  type: z.literal('anomaly.detected'),
  id: z.string().min(1),
  // Market time of the event; during a replay this is recorded time, not wall-clock time.
  occurredAt: utcTimestampSchema,
  anomaly: anomalySchema,
});

export const anomalyListSchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  anomalies: z.array(anomalyDetectedEventSchema),
});

export type Anomaly = z.infer<typeof anomalySchema>;
export type AnomalyKind = Anomaly['kind'];
export type AnomalyDetectedEvent = z.infer<typeof anomalyDetectedEventSchema>;
export type AnomalyList = z.infer<typeof anomalyListSchema>;
