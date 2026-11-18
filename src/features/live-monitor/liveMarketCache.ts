import { marketPulseApi } from '../../api/marketPulseApi.ts';
import type { AppThunk } from '../../app/store.ts';
import type {
  MarketStreamEvent,
  QuoteUpdatedEvent,
} from '../../contracts/marketStream.ts';

const { updateQueryData, selectCachedArgsForQuery } = marketPulseApi.util;

function isLaterThan(time: string, reference: string) {
  return Date.parse(time) > Date.parse(reference);
}

// Events only move cached data forward, so late, repeated, or out-of-order events cannot overwrite newer data.
export function applyMarketStreamEvent(event: MarketStreamEvent): AppThunk {
  return (dispatch) => {
    switch (event.type) {
      case 'quote.updated':
        dispatch(applyQuoteUpdate(event));
        return;
      case 'anomaly.detected':
        dispatch(
          updateQueryData('getAnomalies', undefined, (anomalyList) => {
            if (!anomalyList.anomalies.some(({ id }) => id === event.id)) {
              anomalyList.anomalies.push(event);
            }
          }),
        );
        return;
      case 'replay.clock':
        dispatch(
          updateQueryData('getMarketSnapshot', undefined, (snapshot) => {
            if (isLaterThan(event.occurredAt, snapshot.asOf)) {
              snapshot.asOf = event.occurredAt;
            }
          }),
        );
        return;
      case 'replay.restarted':
      case 'replay.changed':
        return;
    }
  };
}

function applyQuoteUpdate({
  quote,
  barVolume,
  occurredAt,
}: QuoteUpdatedEvent): AppThunk {
  return (dispatch) => {
    dispatch(
      updateQueryData('getMarketSnapshot', undefined, (snapshot) => {
        const quoteIndex = snapshot.quotes.findIndex(
          ({ symbol }) => symbol === quote.symbol,
        );
        const currentQuote = snapshot.quotes[quoteIndex];
        if (!currentQuote) {
          snapshot.quotes.push(quote);
        } else if (isLaterThan(quote.timestamp, currentQuote.timestamp)) {
          snapshot.quotes[quoteIndex] = quote;
        }
        if (isLaterThan(occurredAt, snapshot.asOf)) {
          snapshot.asOf = occurredAt;
        }
      }),
    );
    dispatch(
      updateQueryData('getPriceHistory', quote.symbol, (priceHistory) => {
        const lastPoint = priceHistory.points.at(-1);
        if (lastPoint && !isLaterThan(quote.timestamp, lastPoint.time)) {
          return;
        }
        priceHistory.points.push({
          time: quote.timestamp,
          price: quote.price,
          volume: barVolume,
        });
      }),
    );
  };
}

export function refetchLiveMarketData(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const refetchOptions = { subscribe: false, forceRefetch: true };
    const cachedHistorySymbols = selectCachedArgsForQuery(
      getState(),
      'getPriceHistory',
    );
    await Promise.all([
      dispatch(
        marketPulseApi.endpoints.getMarketSnapshot.initiate(
          undefined,
          refetchOptions,
        ),
      ),
      dispatch(
        marketPulseApi.endpoints.getAnomalies.initiate(
          undefined,
          refetchOptions,
        ),
      ),
      ...cachedHistorySymbols.map((symbol) =>
        dispatch(
          marketPulseApi.endpoints.getPriceHistory.initiate(
            symbol,
            refetchOptions,
          ),
        ),
      ),
    ]);
  };
}
