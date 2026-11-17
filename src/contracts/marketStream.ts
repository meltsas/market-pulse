import { z } from 'zod';
import { quoteSchema, utcTimestampSchema } from './market.ts';

const streamEventBaseSchema = z.object({
  id: z.string().min(1),
  // Market time of the event; during a replay this is recorded time, not wall-clock time.
  occurredAt: utcTimestampSchema,
});

const quoteUpdatedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('quote.updated'),
  quote: quoteSchema,
});

const anomalyDetectedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('anomaly.detected'),
  anomaly: z.object({
    symbol: z.string().min(1),
    kind: z.literal('price-move'),
    changePercent: z.number(),
    referencePrice: z.number().positive(),
    referenceTime: utcTimestampSchema,
    price: z.number().positive(),
    description: z.string().min(1),
  }),
});

const replayRestartedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('replay.restarted'),
});

export const marketStreamEventSchema = z.discriminatedUnion('type', [
  quoteUpdatedEventSchema,
  anomalyDetectedEventSchema,
  replayRestartedEventSchema,
]);

export type QuoteUpdatedEvent = z.infer<typeof quoteUpdatedEventSchema>;
export type AnomalyDetectedEvent = z.infer<typeof anomalyDetectedEventSchema>;
export type MarketStreamEvent = z.infer<typeof marketStreamEventSchema>;
