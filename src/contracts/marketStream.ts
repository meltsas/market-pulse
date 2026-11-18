import { z } from 'zod';
import { anomalyDetectedEventSchema } from './anomalies.ts';
import { quoteSchema, utcTimestampSchema } from './market.ts';

const streamEventBaseSchema = z.object({
  id: z.string().min(1),
  // Market time of the event; during a replay this is recorded time, not wall-clock time.
  occurredAt: utcTimestampSchema,
});

const quoteUpdatedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('quote.updated'),
  quote: quoteSchema,
  // Volume traded during the bar that produced this quote; null when the source has no reliable volume.
  barVolume: z.number().int().nonnegative().nullable(),
});

const replayRestartedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('replay.restarted'),
});

// The replay was paused, resumed, moved, or sped up; earlier data may no longer apply.
const replayChangedEventSchema = streamEventBaseSchema.extend({
  type: z.literal('replay.changed'),
});

// Sent every tick, so clients can follow market time and notice a silent connection.
const replayClockEventSchema = streamEventBaseSchema.extend({
  type: z.literal('replay.clock'),
});

export const marketStreamEventSchema = z.discriminatedUnion('type', [
  quoteUpdatedEventSchema,
  anomalyDetectedEventSchema,
  replayRestartedEventSchema,
  replayChangedEventSchema,
  replayClockEventSchema,
]);

export const marketStreamEventTypes = marketStreamEventSchema.options.map(
  (eventSchema) => eventSchema.shape.type.value,
);

export type QuoteUpdatedEvent = z.infer<typeof quoteUpdatedEventSchema>;
export type ReplayClockEvent = z.infer<typeof replayClockEventSchema>;
export type MarketStreamEvent = z.infer<typeof marketStreamEventSchema>;
