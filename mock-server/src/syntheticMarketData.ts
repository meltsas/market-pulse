import type { AssetClass } from '../../src/contracts/market.ts';
import {
  DAILY_RECORDING_START,
  INTRADAY_INTERVAL_MINUTES,
  INTRADAY_RECORDING_START,
  REPLAY_END,
} from './config.ts';
import type { DemoInstrument } from './instruments.ts';
import type {
  DailyBar,
  IntradayBar,
  RecordedMarketData,
} from './recordedData.ts';

export const SYNTHETIC_DATA_PROVIDER = 'Generated synthetic prices';

type TradingSession = 'us' | 'xetra' | 'crypto' | 'currency';

interface PriceAnchor {
  date: string;
  price: number;
}

interface SyntheticProfile {
  session: TradingSession;
  // The daily path passes through these prices and wanders randomly between them.
  anchors: readonly PriceAnchor[];
  dailyVolatility: number;
  // Zero when the instrument has no volume, as for DAX and EUR/USD in the recorded data.
  averageDailyVolume: number;
  // Close-to-close returns and relative volume of each intraday day, 3–6 November 2026.
  intradayDays: readonly { dayReturn: number; volumeFactor: number }[];
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const SATURDAY = 6;
const SUNDAY = 0;
// Regular sessions carry most, but not all, of a day's volume; the rest trades outside them.
const REGULAR_SESSION_VOLUME_SHARE = 0.87;
const LARGE_DAY_MOVE = 0.03;
// Much of a stock's daily volatility comes from overnight gaps, so regular sessions are calmer.
const INTRADAY_VOLATILITY = 0.6;
const INTRADAY_VOLATILITY_ON_LARGE_DAYS = 1.2;

const sessionMinutes: Record<TradingSession, { open: number; close: number }> =
  {
    us: { open: 14 * 60 + 30, close: 21 * 60 },
    xetra: { open: 8 * 60, close: 16 * 60 + 30 },
    crypto: { open: 0, close: 24 * 60 },
    currency: { open: 0, close: 24 * 60 },
  };

const priceDecimals: Record<AssetClass, number> = {
  index: 2,
  stock: 2,
  crypto: 2,
  currency: 5,
};

function day(dayReturn: number, volumeFactor = 1) {
  return { dayReturn, volumeFactor };
}

// Shaped after the period's story: a strong year for chips and Eli Lilly, a deep slide for Oracle, and the 5 November sell-off.
const syntheticProfiles: Record<string, SyntheticProfile> = {
  SPX: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 5880 },
      { date: '2025-04-08', price: 4980 },
      { date: '2025-12-31', price: 6850 },
      { date: '2026-08-03', price: 7300 },
      { date: '2026-10-28', price: 7720 },
      { date: '2026-11-02', price: 7560 },
    ],
    dailyVolatility: 0.01,
    averageDailyVolume: 5_000_000_000,
    intradayDays: [day(0.003), day(0.004), day(-0.044, 1.6), day(0.012, 1.2)],
  },
  NDX: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 21_000 },
      { date: '2025-04-08', price: 17_100 },
      { date: '2026-08-03', price: 26_800 },
      { date: '2026-10-28', price: 28_500 },
      { date: '2026-11-02', price: 28_000 },
    ],
    dailyVolatility: 0.013,
    averageDailyVolume: 8_000_000_000,
    intradayDays: [day(0.005), day(0.006), day(-0.064, 1.7), day(0.015, 1.2)],
  },
  DAX: {
    session: 'xetra',
    anchors: [
      { date: '2025-01-02', price: 20_000 },
      { date: '2025-12-30', price: 24_400 },
      { date: '2026-08-03', price: 25_000 },
      { date: '2026-10-30', price: 26_600 },
      { date: '2026-11-02', price: 25_850 },
    ],
    dailyVolatility: 0.011,
    averageDailyVolume: 0,
    intradayDays: [day(0.002), day(0.005), day(-0.012), day(0.004)],
  },
  NVDA: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 138 },
      { date: '2025-04-08', price: 96 },
      { date: '2026-07-31', price: 285 },
      { date: '2026-11-02', price: 205 },
    ],
    dailyVolatility: 0.03,
    averageDailyVolume: 200_000_000,
    intradayDays: [
      day(0.01, 0.9),
      day(0.02, 1.1),
      day(-0.09, 2.4),
      day(0.045, 1.6),
    ],
  },
  AMD: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 122 },
      { date: '2025-04-08', price: 78 },
      { date: '2026-08-03', price: 420 },
      { date: '2026-10-20', price: 655 },
      { date: '2026-11-02', price: 478 },
    ],
    dailyVolatility: 0.035,
    averageDailyVolume: 50_000_000,
    intradayDays: [
      day(0.012),
      day(0.035, 1.9),
      day(-0.17, 2.8),
      day(0.075, 1.8),
    ],
  },
  GOOGL: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 190 },
      { date: '2026-08-31', price: 405 },
      { date: '2026-11-02', price: 280 },
    ],
    dailyVolatility: 0.02,
    averageDailyVolume: 35_000_000,
    intradayDays: [day(0.004), day(0.003), day(-0.06, 1.4), day(0.02)],
  },
  ORCL: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 168 },
      { date: '2025-09-15', price: 330 },
      { date: '2026-11-02', price: 127 },
    ],
    dailyVolatility: 0.028,
    averageDailyVolume: 20_000_000,
    intradayDays: [
      day(-0.005, 0.8),
      day(0.05, 1.9),
      day(-0.08, 1.4),
      day(0.01),
    ],
  },
  LLY: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 775 },
      { date: '2025-08-07', price: 640 },
      { date: '2026-08-03', price: 1120 },
      { date: '2026-11-02', price: 1395 },
    ],
    dailyVolatility: 0.02,
    averageDailyVolume: 3_500_000,
    intradayDays: [day(0.008), day(0.012), day(-0.005), day(0.015)],
  },
  MSTR: {
    session: 'us',
    anchors: [
      { date: '2025-01-02', price: 330 },
      { date: '2025-07-15', price: 450 },
      { date: '2026-08-03', price: 98 },
      { date: '2026-11-02', price: 133 },
    ],
    dailyVolatility: 0.04,
    averageDailyVolume: 12_000_000,
    intradayDays: [day(0.02), day(0.035), day(-0.1, 1.3), day(0.03)],
  },
  BTCUSD: {
    session: 'crypto',
    anchors: [
      { date: '2025-01-01', price: 94_000 },
      { date: '2025-10-06', price: 124_000 },
      { date: '2026-08-01', price: 68_000 },
      { date: '2026-11-02', price: 76_500 },
    ],
    dailyVolatility: 0.028,
    averageDailyVolume: 25_000_000_000,
    intradayDays: [day(0.01), day(0.015), day(-0.05, 1.5), day(-0.02, 1.2)],
  },
  EURUSD: {
    session: 'currency',
    anchors: [
      { date: '2025-01-02', price: 1.035 },
      { date: '2025-09-16', price: 1.18 },
      { date: '2026-11-02', price: 1.121 },
    ],
    dailyVolatility: 0.004,
    averageDailyVolume: 0,
    intradayDays: [day(-0.001), day(-0.002), day(-0.006), day(0.001)],
  },
};

// A small seeded generator (mulberry32), so every start produces the same prices.
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

type Random = ReturnType<typeof createRandom>;

// FNV-1a hash of an ASCII symbol, so each instrument gets its own repeatable sequence.
function seedFrom(text: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16_777_619);
  }
  return hash;
}

function gaussian(random: Random) {
  const radius = Math.sqrt(-2 * Math.log(1 - random()));
  return radius * Math.cos(2 * Math.PI * random());
}

function toDate(timeMs: number) {
  return new Date(timeMs).toISOString().slice(0, 10);
}

function tradingDays(
  session: TradingSession,
  firstDate: string,
  endDateExclusive: string,
) {
  const dates: string[] = [];
  for (
    let timeMs = Date.parse(firstDate);
    timeMs < Date.parse(endDateExclusive);
    timeMs += DAY_MS
  ) {
    const weekday = new Date(timeMs).getUTCDay();
    const isWeekend = weekday === SATURDAY || weekday === SUNDAY;
    if (session === 'crypto' || !isWeekend) {
      dates.push(toDate(timeMs));
    }
  }
  return dates;
}

// A random walk pinned to both ends, so the path starts and finishes at the given log prices.
function bridge(
  random: Random,
  startLogPrice: number,
  endLogPrice: number,
  steps: number,
  stepVolatility: number,
) {
  const walk: number[] = [];
  let position = 0;
  for (let step = 0; step < steps; step += 1) {
    position += gaussian(random) * stepVolatility;
    walk.push(position);
  }
  const finalPosition = walk.at(-1) ?? 0;
  return walk.map((value, step) => {
    const fraction = (step + 1) / steps;
    return (
      startLogPrice +
      fraction * (endLogPrice - startLogPrice) +
      value -
      fraction * finalPosition
    );
  });
}

function createDailyCloses(
  random: Random,
  dates: readonly string[],
  { anchors, dailyVolatility }: SyntheticProfile,
) {
  // The first anchor sets the starting price; the others are matched to the last trading day on or before them.
  const anchorIndexes = anchors.map(({ date }, anchorIndex) =>
    anchorIndex === 0
      ? 0
      : dates.findLastIndex((tradingDate) => tradingDate <= date),
  );
  const [firstAnchor] = anchors;
  if (!firstAnchor) {
    throw new Error('A synthetic profile needs at least one price anchor');
  }
  const logCloses = [Math.log(firstAnchor.price)];
  anchors.slice(1).forEach((anchor, segment) => {
    const startIndex = anchorIndexes[segment] ?? 0;
    const endIndex = anchorIndexes[segment + 1] ?? startIndex;
    const startLogPrice = logCloses[startIndex] ?? Math.log(anchor.price);
    logCloses.push(
      ...bridge(
        random,
        startLogPrice,
        Math.log(anchor.price),
        endIndex - startIndex,
        dailyVolatility,
      ),
    );
  });
  if (logCloses.length !== dates.length) {
    throw new Error('Synthetic price anchors must end on the last daily bar');
  }
  return logCloses.map((logClose) => Math.exp(logClose));
}

function roundPrice(price: number, assetClass: AssetClass) {
  return Number(price.toFixed(priceDecimals[assetClass]));
}

function createSyntheticInstrument(
  instrument: DemoInstrument,
  profile: SyntheticProfile,
): RecordedMarketData['instruments'][number] {
  const random = createRandom(seedFrom(instrument.symbol));
  const round = (price: number) => roundPrice(price, instrument.assetClass);
  const { dailyVolatility, averageDailyVolume, session } = profile;
  const dailyDates = tradingDays(
    session,
    DAILY_RECORDING_START.slice(0, 10),
    INTRADAY_RECORDING_START.slice(0, 10),
  );
  const closes = createDailyCloses(random, dailyDates, profile);

  const dailyBars: DailyBar[] = dailyDates.map((date, index) => {
    const close = closes[index] ?? 0;
    const open =
      (closes[index - 1] ?? close) *
      Math.exp(gaussian(random) * dailyVolatility * 0.3);
    const spread = () =>
      Math.exp(Math.abs(gaussian(random)) * dailyVolatility * 0.5);
    return {
      date,
      open: round(open),
      high: round(Math.max(open, close) * spread()),
      low: round(Math.min(open, close) / spread()),
      close: round(close),
      volume: Math.round(
        averageDailyVolume * Math.exp(gaussian(random) * 0.25),
      ),
    };
  });

  const intradayBars: IntradayBar[] = [];
  const intradayDates = tradingDays(
    session,
    INTRADAY_RECORDING_START.slice(0, 10),
    REPLAY_END.slice(0, 10),
  );
  let previousClose = closes.at(-1) ?? 1;
  intradayDates.forEach((date, dayIndex) => {
    const { dayReturn, volumeFactor } = profile.intradayDays[dayIndex] ?? {
      dayReturn: 0,
      volumeFactor: 1,
    };
    const isLargeMove = Math.abs(dayReturn) >= LARGE_DAY_MOVE;
    const { open: openMinute, close: closeMinute } = sessionMinutes[session];
    const barCount = (closeMinute - openMinute) / INTRADAY_INTERVAL_MINUTES;
    // Big days open with a gap that carries much of the move, as the 5 November sell-off did.
    const openPrice =
      previousClose * (1 + dayReturn * (isLargeMove ? 0.55 : 0.2));
    const closePrice = previousClose * (1 + dayReturn);
    const barCloses = bridge(
      random,
      Math.log(openPrice),
      Math.log(closePrice),
      barCount,
      (dailyVolatility *
        (isLargeMove
          ? INTRADAY_VOLATILITY_ON_LARGE_DAYS
          : INTRADAY_VOLATILITY)) /
        Math.sqrt(barCount),
    ).map((logPrice) => Math.exp(logPrice));
    const volumeWeights = barCloses.map((_, barIndex) =>
      session === 'crypto' || session === 'currency'
        ? 1
        : 1 +
          1.6 * Math.exp(-barIndex / 6) +
          1.2 * Math.exp(-(barCount - 1 - barIndex) / 4),
    );
    const totalWeight = volumeWeights.reduce((sum, weight) => sum + weight, 0);
    const sessionVolume =
      averageDailyVolume * volumeFactor * REGULAR_SESSION_VOLUME_SHARE;

    let barOpen = openPrice;
    const dayBars = barCloses.map((barClose, barIndex): IntradayBar => {
      const wiggle = () =>
        Math.exp(
          (Math.abs(gaussian(random)) * dailyVolatility) / Math.sqrt(barCount),
        );
      const bar: IntradayBar = {
        start: new Date(
          Date.parse(date) +
            (openMinute + barIndex * INTRADAY_INTERVAL_MINUTES) * MINUTE_MS,
        ).toISOString(),
        open: round(barOpen),
        high: round(Math.max(barOpen, barClose) * wiggle()),
        low: round(Math.min(barOpen, barClose) / wiggle()),
        close: round(barClose),
        volume: Math.round(
          ((sessionVolume * (volumeWeights[barIndex] ?? 1)) / totalWeight) *
            Math.exp(gaussian(random) * 0.2),
        ),
      };
      barOpen = barClose;
      return bar;
    });

    intradayBars.push(...dayBars);
    dailyBars.push({
      date,
      open: round(openPrice),
      high: Math.max(...dayBars.map(({ high }) => high)),
      low: Math.min(...dayBars.map(({ low }) => low)),
      close: round(closePrice),
      volume: Math.round(sessionVolume / REGULAR_SESSION_VOLUME_SHARE),
    });
    previousClose = closePrice;
  });

  return { symbol: instrument.symbol, dailyBars, intradayBars };
}

// Stands in for recorded prices, which cannot be redistributed and expire at the source after about 60 days.
export function createSyntheticMarketData(
  instruments: readonly DemoInstrument[],
): RecordedMarketData {
  return {
    provider: SYNTHETIC_DATA_PROVIDER,
    recordedAt: REPLAY_END,
    instruments: instruments.map((instrument) => {
      const profile = syntheticProfiles[instrument.symbol];
      if (!profile) {
        throw new Error(`No synthetic profile for ${instrument.symbol}`);
      }
      return createSyntheticInstrument(instrument, profile);
    }),
  };
}
