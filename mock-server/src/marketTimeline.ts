import type { AnomalyDetectedEvent } from '../../src/contracts/anomalies.ts';
import type {
  AssetClass,
  Instrument,
  PricePoint,
  Quote,
} from '../../src/contracts/market.ts';
import type { QuoteUpdatedEvent } from '../../src/contracts/marketStream.ts';
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
  pricePointsBySymbol: ReadonlyMap<string, readonly PricePoint[]>;
  events: readonly TimelineEvent[];
}

interface ReplayBar {
  quote: Quote;
  barVolume: number | null;
}

const MINUTE_MS = 60_000;
const INTRADAY_INTERVAL_MS = INTRADAY_INTERVAL_MINUTES * MINUTE_MS;
const PRICE_MOVE_WINDOW_MINUTES = 30;
const priceMoveThresholdPercent: Record<AssetClass, number> = {
  index: 1,
  stock: 3,
  crypto: 2,
  currency: 0.4,
};
const assetClassPluralLabel: Record<AssetClass, string> = {
  index: 'Indices',
  stock: 'Stocks',
  crypto: 'Cryptocurrencies',
  currency: 'Currency pairs',
};
// Intraday volume of indices and crypto is not comparable with their daily volume in the recorded data.
const RELATIVE_VOLUME_ASSET_CLASS: AssetClass = 'stock';
const RELATIVE_VOLUME_THRESHOLD = 1.5;
const AVERAGE_VOLUME_SESSIONS = 20;

export function buildMarketTimeline(
  instruments: readonly DemoInstrument[],
  recordedMarketData: RecordedMarketData,
): MarketTimeline {
  const quotesBySymbol = new Map<string, readonly Quote[]>();
  const pricePointsBySymbol = new Map<string, readonly PricePoint[]>();
  const events: TimelineEvent[] = [];

  for (const demoInstrument of instruments) {
    const recordedInstrument = recordedMarketData.instruments.find(
      ({ symbol }) => symbol === demoInstrument.symbol,
    );
    if (!recordedInstrument) {
      throw new Error(`No recorded market data for ${demoInstrument.symbol}`);
    }

    const instrument = toInstrument(demoInstrument);
    const replayBars = createReplayBars(
      instrument,
      recordedInstrument.dailyBars,
      recordedInstrument.intradayBars,
    );
    const quotes = replayBars.map(({ quote }) => quote);
    quotesBySymbol.set(instrument.symbol, quotes);
    pricePointsBySymbol.set(
      instrument.symbol,
      replayBars.map(({ quote, barVolume }) => ({
        time: quote.timestamp,
        price: quote.price,
        volume: barVolume,
      })),
    );
    events.push(
      ...replayBars.map(({ quote, barVolume }): TimelineEvent => ({
        type: 'quote.updated',
        occurredAt: quote.timestamp,
        quote,
        barVolume,
      })),
      ...detectPriceMoveAnomalies(instrument, quotes),
      ...detectRelativeVolumeAnomalies(
        instrument,
        quotes,
        recordedInstrument.dailyBars,
      ),
    );
  }

  events.sort(
    (first, second) =>
      Date.parse(first.occurredAt) - Date.parse(second.occurredAt),
  );
  return { quotesBySymbol, pricePointsBySymbol, events };
}

function createReplayBars(
  instrument: Instrument,
  dailyBars: readonly DailyBar[],
  intradayBars: readonly IntradayBar[],
): ReplayBar[] {
  const reportsVolume = intradayBars.some(({ volume }) => volume > 0);
  let sessionDate = '';
  let sessionVolume = 0;
  let previousBarStartMs = -Infinity;

  return intradayBars.map((bar) => {
    const barDate = bar.start.slice(0, 10);
    const barStartMs = Date.parse(bar.start);
    const isNewSession = barDate !== sessionDate;
    // After missing bars, the source reports the whole gap's volume in the next bar.
    const followsDataGap =
      !isNewSession && barStartMs - previousBarStartMs > INTRADAY_INTERVAL_MS;
    if (isNewSession) {
      sessionDate = barDate;
      sessionVolume = 0;
    }
    sessionVolume += bar.volume;
    previousBarStartMs = barStartMs;

    const previousClose = findPreviousClose(dailyBars, barDate);
    const quote: Quote = {
      ...instrument,
      price: bar.close,
      previousClose,
      change: bar.close - previousClose,
      changePercent: (bar.close / previousClose - 1) * 100,
      sessionVolume: reportsVolume ? sessionVolume : null,
      timestamp: new Date(barStartMs + INTRADAY_INTERVAL_MS).toISOString(),
    };
    return {
      quote,
      barVolume: reportsVolume && !followsDataGap ? bar.volume : null,
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
    const elapsedMs = quoteTimeMs - Date.parse(reference.timestamp);
    const isWithinWindow =
      elapsedMs <= PRICE_MOVE_WINDOW_MINUTES * MINUTE_MS + INTRADAY_INTERVAL_MS;
    const isSameSession =
      reference.timestamp.slice(0, 10) === quote.timestamp.slice(0, 10);
    if (!isWithinWindow && isSameSession) {
      // Missing bars inside a session: the move cannot be attributed to a known time span.
      return;
    }

    const changePercent = (quote.price / reference.price - 1) * 100;
    const isAboveThreshold = Math.abs(changePercent) >= thresholdPercent;
    if (isAboveThreshold && !wasAboveThreshold) {
      anomalies.push({
        type: 'anomaly.detected',
        occurredAt: quote.timestamp,
        anomaly: {
          kind: 'price-move',
          symbol: instrument.symbol,
          price: quote.price,
          changePercent,
          referencePrice: reference.price,
          referenceTime: reference.timestamp,
          description: describePriceMove(
            instrument,
            changePercent,
            isWithinWindow ? elapsedMs : null,
          ),
          rule: `${assetClassPluralLabel[instrument.assetClass]} moving ${String(thresholdPercent)}% or more within ${String(PRICE_MOVE_WINDOW_MINUTES)} minutes or since the previous session`,
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
  elapsedMs: number | null,
) {
  const direction = changePercent < 0 ? 'fell' : 'rose';
  const size = Math.abs(changePercent).toFixed(1);
  const period =
    elapsedMs === null
      ? 'since the previous session'
      : `in ${String(Math.round(elapsedMs / MINUTE_MS))} minutes`;
  return `${instrument.name} ${direction} ${size}% ${period}`;
}

export function detectRelativeVolumeAnomalies(
  instrument: Instrument,
  quotes: readonly Quote[],
  dailyBars: readonly DailyBar[],
): TimelineEvent[] {
  if (instrument.assetClass !== RELATIVE_VOLUME_ASSET_CLASS) {
    return [];
  }

  const anomalies: TimelineEvent[] = [];
  let sessionDate = '';
  let averageDailyVolume: number | null = null;
  let hasReportedSession = false;

  for (const quote of quotes) {
    const quoteDate = quote.timestamp.slice(0, 10);
    if (quoteDate !== sessionDate) {
      sessionDate = quoteDate;
      averageDailyVolume = calculateAverageDailyVolume(dailyBars, quoteDate);
      hasReportedSession = false;
    }
    if (
      hasReportedSession ||
      averageDailyVolume === null ||
      quote.sessionVolume === null
    ) {
      continue;
    }

    const relativeVolume = quote.sessionVolume / averageDailyVolume;
    if (relativeVolume < RELATIVE_VOLUME_THRESHOLD) {
      continue;
    }
    hasReportedSession = true;
    anomalies.push({
      type: 'anomaly.detected',
      occurredAt: quote.timestamp,
      anomaly: {
        kind: 'relative-volume',
        symbol: instrument.symbol,
        price: quote.price,
        sessionVolume: quote.sessionVolume,
        averageDailyVolume,
        relativeVolume,
        description: `${instrument.name} traded ${relativeVolume.toFixed(1)}× its ${String(AVERAGE_VOLUME_SESSIONS)}-day average daily volume`,
        rule: `${assetClassPluralLabel[instrument.assetClass]} trading ${String(RELATIVE_VOLUME_THRESHOLD)}× or more of their ${String(AVERAGE_VOLUME_SESSIONS)}-day average daily volume in one session`,
      },
    });
  }

  return anomalies;
}

function calculateAverageDailyVolume(
  dailyBars: readonly DailyBar[],
  date: string,
) {
  const previousSessions = dailyBars
    .filter((bar) => bar.date < date)
    .slice(-AVERAGE_VOLUME_SESSIONS);
  if (previousSessions.length < AVERAGE_VOLUME_SESSIONS) {
    return null;
  }
  const totalVolume = previousSessions.reduce(
    (sum, { volume }) => sum + volume,
    0,
  );
  return totalVolume > 0 ? totalVolume / AVERAGE_VOLUME_SESSIONS : null;
}
