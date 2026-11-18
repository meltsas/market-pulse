import { z } from 'zod';
import {
  dataSourceSchema,
  instrumentSchema,
  utcTimestampSchema,
} from './market.ts';

export const biasSchema = z.enum(['long', 'short', 'mixed']);

export const screeningFactorSchema = z.object({
  rule: z.enum(['trend', 'relative-strength', 'revenue-growth', 'valuation']),
  direction: z.enum(['long', 'short', 'neutral']),
  title: z.string().min(1),
  explanation: z.string().min(1),
  // The thresholds behind the direction, so every result can be checked by hand.
  ruleDescription: z.string().min(1),
});

const opportunitySchema = instrumentSchema.extend({
  // Close of the latest completed trading day before the analysis ran.
  price: z.number().positive(),
  bias: biasSchema,
  // Long factors minus short factors; the bias is long at +2 or more and short at −2 or less.
  biasScore: z.number().int(),
  factors: z.array(screeningFactorSchema),
  risks: z.array(z.string().min(1)),
  metrics: z.object({
    fiftyTwoWeekHigh: z.number().positive(),
    drawdownFromHighPercent: z.number().nonnegative(),
    movingAverage50: z.number().positive().nullable(),
    movingAverage200: z.number().positive().nullable(),
    priceVs200DayAveragePercent: z.number().nullable(),
    threeMonthReturnPercent: z.number().nullable(),
    // Three-month return minus the S&P 500's, in percentage points.
    relativeStrengthPoints: z.number().nullable(),
    revenueGrowthPercent: z.number().nullable(),
    priceToEarnings: z.number().positive().nullable(),
  }),
  freshness: z.object({
    lastCloseDate: z.iso.date(),
    revenueQuarterEnd: z.iso.date().nullable(),
    revenueFiledOn: z.iso.date().nullable(),
    earningsFiscalYearEnd: z.iso.date().nullable(),
  }),
});

export const opportunityListSchema = z.object({
  // When the screening ran; it uses daily closes completed before this time.
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  opportunities: z.array(opportunitySchema),
});

export const dailyHistorySchema = z.object({
  asOf: utcTimestampSchema,
  dataSource: dataSourceSchema,
  symbol: z.string().min(1),
  bars: z.array(
    z.object({
      date: z.iso.date(),
      close: z.number().positive(),
      movingAverage50: z.number().positive().nullable(),
      movingAverage200: z.number().positive().nullable(),
    }),
  ),
});

export type Bias = z.infer<typeof biasSchema>;
export type ScreeningFactor = z.infer<typeof screeningFactorSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunityList = z.infer<typeof opportunityListSchema>;
export type DailyHistory = z.infer<typeof dailyHistorySchema>;
