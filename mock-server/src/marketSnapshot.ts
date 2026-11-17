import type {
  DataSource,
  MarketSnapshot,
  Quote,
} from '../../src/contracts/market.ts';
import type { DemoInstrument } from './instruments.ts';
import type { MarketTimeline } from './marketTimeline.ts';

export function createMarketSnapshot(
  instruments: readonly DemoInstrument[],
  timeline: MarketTimeline,
  marketTimeMs: number,
  dataSource: DataSource,
): MarketSnapshot {
  const quotes = instruments.flatMap(({ symbol }) => {
    const latestQuote = findLatestQuote(
      timeline.quotesBySymbol.get(symbol) ?? [],
      marketTimeMs,
    );
    return latestQuote ? [latestQuote] : [];
  });

  return {
    asOf: new Date(marketTimeMs).toISOString(),
    dataSource,
    quotes,
  };
}

function findLatestQuote(quotes: readonly Quote[], marketTimeMs: number) {
  return quotes.findLast(
    (quote) => Date.parse(quote.timestamp) <= marketTimeMs,
  );
}
