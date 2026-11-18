import type { Instrument } from '../contracts/market.ts';

type PricedInstrument = Pick<Instrument, 'assetClass' | 'currency'>;

const NUMBER_LOCALE = 'en-US';
// Day-month order and a 24-hour clock read unambiguously for an international audience.
const DATE_LOCALE = 'en-GB';
const TYPOGRAPHIC_MINUS = '−';

const currencyPairFractionDigits = 4;
const priceFractionDigits = 2;

const marketDateTimeFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'shortOffset',
});
const shortDateTimeFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const timeFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayMonthFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
});
const monthFormat = new Intl.DateTimeFormat(DATE_LOCALE, { month: 'short' });
const yearFormat = new Intl.DateTimeFormat(DATE_LOCALE, { year: 'numeric' });
// Recorded sessions are UTC calendar days, so the replay window is shown in UTC.
const replayWindowFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const replayDayFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const timeZoneNameFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  timeZoneName: 'shortOffset',
});
const compactVolumeFormat = new Intl.NumberFormat(NUMBER_LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentChangeFormat = new Intl.NumberFormat(NUMBER_LOCALE, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

function withTypographicMinus(formattedNumber: string) {
  return formattedNumber.replace('-', TYPOGRAPHIC_MINUS);
}

function createPriceFormat(
  { assetClass, currency }: PricedInstrument,
  signDisplay: 'auto' | 'exceptZero',
) {
  if (assetClass === 'currency') {
    return new Intl.NumberFormat(NUMBER_LOCALE, {
      minimumFractionDigits: currencyPairFractionDigits,
      maximumFractionDigits: currencyPairFractionDigits,
      signDisplay,
    });
  }
  // Index levels are points, not amounts of money.
  if (assetClass === 'index') {
    return new Intl.NumberFormat(NUMBER_LOCALE, {
      minimumFractionDigits: priceFractionDigits,
      maximumFractionDigits: priceFractionDigits,
      signDisplay,
    });
  }
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: priceFractionDigits,
    maximumFractionDigits: priceFractionDigits,
    signDisplay,
  });
}

const priceFormats = new Map<string, Intl.NumberFormat>();

function getPriceFormat(
  instrument: PricedInstrument,
  signDisplay: 'auto' | 'exceptZero',
) {
  const formatKey = `${instrument.assetClass}:${instrument.currency}:${signDisplay}`;
  let priceFormat = priceFormats.get(formatKey);
  if (!priceFormat) {
    priceFormat = createPriceFormat(instrument, signDisplay);
    priceFormats.set(formatKey, priceFormat);
  }
  return priceFormat;
}

export function formatPrice(price: number, instrument: PricedInstrument) {
  return withTypographicMinus(getPriceFormat(instrument, 'auto').format(price));
}

export function formatPriceChange(
  change: number,
  instrument: PricedInstrument,
) {
  return withTypographicMinus(
    getPriceFormat(instrument, 'exceptZero').format(change),
  );
}

export function formatPercentChange(changePercent: number) {
  return withTypographicMinus(percentChangeFormat.format(changePercent / 100));
}

export function formatVolume(volume: number) {
  return compactVolumeFormat.format(volume);
}

export function formatMarketDateTime(timestamp: string) {
  return marketDateTimeFormat.format(new Date(timestamp));
}

export function formatShortDateTime(timestamp: string) {
  return shortDateTimeFormat.format(new Date(timestamp));
}

export function formatTime(date: Date) {
  return timeFormat.format(date);
}

export function formatDayMonth(date: Date) {
  return dayMonthFormat.format(date);
}

export function formatMonth(date: Date) {
  return monthFormat.format(date);
}

export function formatYear(date: Date) {
  return yearFormat.format(date);
}

export function formatReplayWindow(replayStart: string, replayEnd: string) {
  // The replay end is exclusive: it is midnight after the last recorded day.
  const lastReplayedMoment = new Date(Date.parse(replayEnd) - 1);
  return replayWindowFormat.formatRange(
    new Date(replayStart),
    lastReplayedMoment,
  );
}

export function formatReplayDay(dayStart: Date) {
  return replayDayFormat.format(dayStart);
}

export function getTimeZoneLabel(timestamp: string) {
  return (
    timeZoneNameFormat
      .formatToParts(new Date(timestamp))
      .find(({ type }) => type === 'timeZoneName')?.value ?? 'local time'
  );
}
