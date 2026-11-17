import { z } from 'zod';
import {
  dataSourceSchema,
  instrumentSchema,
  utcTimestampSchema,
} from './market.ts';

const opportunitySchema = instrumentSchema.extend({
  price: z.number().positive(),
  metrics: z.object({
    drawdownFromHighPercent: z.number().nonnegative().nullable(),
    revenueGrowthPercent: z.number().nullable(),
    priceToEarnings: z.number().nullable(),
  }),
  signals: z.array(z.string().min(1)),
  caveats: z.array(z.string().min(1)),
});

export const opportunityListSchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  opportunities: z.array(opportunitySchema),
});

export type OpportunityList = z.infer<typeof opportunityListSchema>;
