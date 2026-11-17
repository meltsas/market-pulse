import type {
  AssetClass,
  Instrument,
  Quote,
} from '../../src/contracts/market.ts';
import type {
  AnomalyDetectedEvent,
  QuoteUpdatedEvent,
} from '../../src/contracts/marketStream.ts';
import { INTRADAY_INTERVAL_MINUTES } from './config.ts';
import { toInstrument, type DemoInstrument } from './instruments.ts';
import type {
  DailyBar,
  IntradayBar,
  RecordedMarketData,
} from './recordedData.ts';

type WithoutId<Event> = Event extends unknown ? Omit<Event, 'id'> : never;
export type TimelineEvent = WithoutId<QuoteUpdatedEvent | AnomalyDetectedEvent>;

export interface MarketTimeline {
  quotesBySymbol: ReadonlyMap<string, readonly Quote[]>;
  events: readonly TimelineEvent[];
}

const MINUTE_MS = 60_000;
const PRICE_MOVE_WINDOW_MINUTES = 30;
const priceMoveThresholdPercent: Record<AssetClass, number> = {
  index: 1,
  stock: 3,
  crypto: 2,
  currency: 0.4,
};

export function buildMarketTimeline(
  instruments: readonly DemoInstrument[],
  recordedMarketData: RecordedMarketData,
): MarketTimeline {
  const quotesBySymbol = new Map<string, readonly Quote[]>();
  const events: TimelineEvent[] = [];

  for (const demoInstrument of instruments) {
    const recordedInstrument = recordedMarketData.instruments.find(
      ({ symbol }) => symbol === demoInstrument.symbol,
    );
    if (!recordedInstrument) {
      throw new Error(`No recorded market data for ${demoInstrument.symbol}`);
    }

    const instrument = toInstrument(demoInstrument);
    const quotes = createQuotes(
      instrument,
      recordedInstrument.dailyBars,
      recordedInstrument.intradayBars,
    );
    quotesBySymbol.set(instrument.symbol, quotes);
    events.push(
      ...quotes.map((quote): TimelineEvent => ({
        type: 'quote.updated',
        occurredAt: quote.timestamp,
        quote,
      })),
      ...detectPriceMoveAnomalies(instrument, quotes),
    );
  }

  events.sort(
    (first, second) =>
      Date.parse(first.occurredAt) - Date.parse(second.occurredAt),
  );
  return { quotesBySymbol, events };
}

function createQuotes(
  instrument: Instrument,
  dailyBars: readonly DailyBar[],
  intradayBars: readonly IntradayBar[],
): Quote[] {
  let sessionDate = '';
  let sessionVolume = 0;

  return intradayBars.map((bar) => {
    const barDate = bar.start.slice(0, 10);
    if (barDate !== sessionDate) {
      sessionDate = barDate;
      sessionVolume = 0;
    }
    sessionVolume += bar.volume;

    const previousClose = findPreviousClose(dailyBars, barDate);
    const barEndMs =
      Date.parse(bar.start) + INTRADAY_INTERVAL_MINUTES * MINUTE_MS;

    return {
      ...instrument,
      price: bar.close,
      previousClose,
      change: bar.close - previousClose,
      changePercent: (bar.close / previousClose - 1) * 100,
      sessionVolume:
        instrument.assetClass === 'currency' ? null : sessionVolume,
      timestamp: new Date(barEndMs).toISOString(),
    };
  });
}

function findPreviousClose(dailyBars: readonly DailyBar[], date: string) {
  const previousBar = dailyBars.findLast((bar) => bar.date < date);
  if (!previousBar) {
    throw new Error(`No daily close before ${date}`);
  }
  return previousBar.close;
}

export function detectPriceMoveAnomalies(
  instrument: Instrument,
  quotes: readonly Quote[],
): TimelineEvent[] {
  const thresholdPercent = priceMoveThresholdPercent[instrument.assetClass];
  const quoteTimesMs = quotes.map((quote) => Date.parse(quote.timestamp));
  const anomalies: TimelineEvent[] = [];
  let referenceIndex = 0;
  let wasAboveThreshold = false;

  quotes.forEach((quote, quoteIndex) => {
    const quoteTimeMs = Date.parse(quote.timestamp);
    const windowStartMs = quoteTimeMs - PRICE_MOVE_WINDOW_MINUTES * MINUTE_MS;
    while (
      referenceIndex + 1 < quoteIndex &&
      (quoteTimesMs[referenceIndex + 1] ?? Infinity) <= windowStartMs
    ) {
      referenceIndex += 1;
    }

    const reference = quotes[referenceIndex];
    if (!reference || Date.parse(reference.timestamp) > windowStartMs) {
      return;
    }

    const changePercent = (quote.price / reference.price - 1) * 100;
    const isAboveThreshold = Math.abs(changePercent) >= thresholdPercent;
    if (isAboveThreshold && !wasAboveThreshold) {
      anomalies.push({
        type: 'anomaly.detected',
        occurredAt: quote.timestamp,
        anomaly: {
          symbol: instrument.symbol,
          kind: 'price-move',
          changePercent,
          referencePrice: reference.price,
          referenceTime: reference.timestamp,
          price: quote.price,
          description: describePriceMove(
            instrument,
            changePercent,
            quoteTimeMs - Date.parse(reference.timestamp),
          ),
        },
      });
    }
    wasAboveThreshold = isAboveThreshold;
  });

  return anomalies;
}

function describePriceMove(
  instrument: Instrument,
  changePercent: number,
  elapsedMs: number,
) {
  const direction = changePercent < 0 ? 'fell' : 'rose';
  const size = Math.abs(changePercent).toFixed(1);
  const elapsedMinutes = Math.round(elapsedMs / MINUTE_MS);
  const period =
    elapsedMinutes <= PRICE_MOVE_WINDOW_MINUTES + INTRADAY_INTERVAL_MINUTES
      ? `in ${String(elapsedMinutes)} minutes`
      : 'since the previous session';
  return `${instrument.name} ${direction} ${size}% ${period}`;
}
