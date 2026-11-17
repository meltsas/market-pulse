import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { utcTimestampSchema } from '../../src/contracts/market.ts';

const priceBarSchema = z.object({
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().int().nonnegative(),
});

const dailyBarSchema = priceBarSchema.extend({ date: z.iso.date() });

const intradayBarSchema = priceBarSchema.extend({
  start: utcTimestampSchema,
});

export const recordedMarketDataSchema = z.object({
  provider: z.string().min(1),
  recordedAt: utcTimestampSchema,
  instruments: z.array(
    z.object({
      symbol: z.string().min(1),
      dailyBars: z.array(dailyBarSchema),
      intradayBars: z.array(intradayBarSchema),
    }),
  ),
});

const reportedValueSchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
  filed: z.iso.date(),
  value: z.number(),
});

export const secFundamentalsSchema = z.object({
  provider: z.string().min(1),
  recordedAt: utcTimestampSchema,
  companies: z.array(
    z.object({
      symbol: z.string().min(1),
      cik: z.string().min(1),
      entityName: z.string().min(1),
      quarterlyRevenue: z.array(reportedValueSchema),
      annualDilutedEps: z.array(reportedValueSchema),
    }),
  ),
});

export type DailyBar = z.infer<typeof dailyBarSchema>;
export type IntradayBar = z.infer<typeof intradayBarSchema>;
export type RecordedMarketData = z.infer<typeof recordedMarketDataSchema>;
export type ReportedValue = z.infer<typeof reportedValueSchema>;
export type SecFundamentals = z.infer<typeof secFundamentalsSchema>;
export type CompanyFundamentals = SecFundamentals['companies'][number];

export const recordedMarketDataFile = new URL(
  '../data/recorded/market-data.json',
  import.meta.url,
);
export const secFundamentalsFile = new URL(
  '../data/sec-fundamentals.json',
  import.meta.url,
);

export async function readJsonFile<Data>(
  file: URL,
  schema: z.ZodType<Data>,
): Promise<Data> {
  const fileContent = await readFile(file, 'utf8');
  return schema.parse(JSON.parse(fileContent));
}
