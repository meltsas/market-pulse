import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { AssetClass } from '../../src/contracts/market.ts';
import {
  DAILY_RECORDING_START,
  INTRADAY_INTERVAL_MINUTES,
  INTRADAY_RECORDING_START,
  REPLAY_END,
} from '../src/config.ts';
import { demoInstruments } from '../src/instruments.ts';
import {
  recordedMarketDataFile,
  recordedMarketDataSchema,
  type RecordedMarketData,
} from '../src/recordedData.ts';

const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const REQUEST_DELAY_MS = 500;
const PROVIDER = 'Yahoo Finance';
const priceDecimals: Record<AssetClass, number> = {
  index: 2,
  stock: 2,
  crypto: 2,
  currency: 5,
};

const nullableNumbers = z.array(z.number().nullable());
const yahooChartResponseSchema = z.object({
  chart: z.object({
    result: z.tuple([
      z.object({
        meta: z.object({ exchangeTimezoneName: z.string() }),
        timestamp: z.array(z.number()),
        indicators: z.object({
          quote: z.tuple([
            z.object({
              open: nullableNumbers,
              high: nullableNumbers,
              low: nullableNumbers,
              close: nullableNumbers,
              volume: nullableNumbers,
            }),
          ]),
        }),
      }),
    ]),
  }),
});

interface TimedPriceBar {
  timeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchPriceBars(
  yahooSymbol: string,
  interval: string,
  from: string,
  to: string,
) {
  const url = new URL(encodeURIComponent(yahooSymbol), YAHOO_CHART_URL);
  url.searchParams.set('interval', interval);
  url.searchParams.set('period1', String(Date.parse(from) / 1000));
  url.searchParams.set('period2', String(Date.parse(to) / 1000));

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; market-pulse-recorder)',
    },
  });
  if (!response.ok) {
    throw new Error(
      `${PROVIDER} request for ${yahooSymbol} failed with HTTP ${String(response.status)}`,
    );
  }

  const [chart] = yahooChartResponseSchema.parse(await response.json()).chart
    .result;
  const [quote] = chart.indicators.quote;
  const bars = chart.timestamp.flatMap((timestampSeconds, index) => {
    const open = quote.open[index];
    const high = quote.high[index];
    const low = quote.low[index];
    const close = quote.close[index];
    if (open == null || high == null || low == null || close == null) {
      return [];
    }
    return [
      {
        timeMs: timestampSeconds * 1000,
        open,
        high,
        low,
        close,
        volume: Math.round(quote.volume[index] ?? 0),
      },
    ];
  });

  return { bars, exchangeTimeZone: chart.meta.exchangeTimezoneName };
}

function toExchangeDate(timeMs: number, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timeMs);
}

// Yahoo returns single-precision floats such as 7568.580078125.
function toQuotedPrecision(
  { open, high, low, close, volume }: TimedPriceBar,
  assetClass: AssetClass,
) {
  const decimals = priceDecimals[assetClass];
  const round = (price: number) => Number(price.toFixed(decimals));
  return {
    open: round(open),
    high: round(high),
    low: round(low),
    close: round(close),
    volume,
  };
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const recordedInstruments: RecordedMarketData['instruments'] = [];
for (const instrument of demoInstruments) {
  const daily = await fetchPriceBars(
    instrument.yahooSymbol,
    '1d',
    DAILY_RECORDING_START,
    REPLAY_END,
  );
  await wait(REQUEST_DELAY_MS);
  const intraday = await fetchPriceBars(
    instrument.yahooSymbol,
    `${String(INTRADAY_INTERVAL_MINUTES)}m`,
    INTRADAY_RECORDING_START,
    REPLAY_END,
  );
  await wait(REQUEST_DELAY_MS);

  recordedInstruments.push({
    symbol: instrument.symbol,
    dailyBars: daily.bars.map((bar) => ({
      date: toExchangeDate(bar.timeMs, daily.exchangeTimeZone),
      ...toQuotedPrecision(bar, instrument.assetClass),
    })),
    intradayBars: intraday.bars.map((bar) => ({
      start: new Date(bar.timeMs).toISOString(),
      ...toQuotedPrecision(bar, instrument.assetClass),
    })),
  });
  console.info(
    `${instrument.symbol}: ${String(daily.bars.length)} daily and ${String(intraday.bars.length)} intraday bars`,
  );
}

const recordedMarketData = recordedMarketDataSchema.parse({
  provider: PROVIDER,
  recordedAt: new Date().toISOString(),
  instruments: recordedInstruments,
});
await mkdir(new URL('.', recordedMarketDataFile), { recursive: true });
await writeFile(recordedMarketDataFile, JSON.stringify(recordedMarketData));
console.info(`Saved ${recordedMarketDataFile.pathname}`);
