import { z } from 'zod';
import { dataSourceSchema, utcTimestampSchema } from './market.ts';

export const replaySpeedMultipliers = [60, 150, 300, 900] as const;

export const replayControlSchema = z
  .strictObject({
    isPaused: z.boolean().optional(),
    speedMultiplier: z.literal(replaySpeedMultipliers).optional(),
    marketTime: utcTimestampSchema.optional(),
  })
  .refine(
    (control) => Object.keys(control).length > 0,
    'Expected at least one replay setting to change',
  );

export const replayStatusSchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
});

export type ReplaySpeedMultiplier = (typeof replaySpeedMultipliers)[number];
export type ReplayControl = z.infer<typeof replayControlSchema>;
export type ReplayStatus = z.infer<typeof replayStatusSchema>;
