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
        dispatch(advanceReplayClock(event.occurredAt));
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

const UTC_DATE_LENGTH = 'YYYY-MM-DD'.length;

function advanceReplayClock(marketTime: string): AppThunk {
  return (dispatch, getState) => {
    const previousMarketTime =
      marketPulseApi.endpoints.getReplayStatus.select(undefined)(getState())
        .data?.asOf;
    dispatch(
      updateQueryData('getReplayStatus', undefined, (replayStatus) => {
        if (isLaterThan(marketTime, replayStatus.asOf)) {
          replayStatus.asOf = marketTime;
        }
      }),
    );
    dispatch(
      updateQueryData('getMarketSnapshot', undefined, (snapshot) => {
        if (isLaterThan(marketTime, snapshot.asOf)) {
          snapshot.asOf = marketTime;
        }
      }),
    );

    // The screening runs at midnight UTC, so a new replayed day brings new results.
    const isNewReplayDay =
      previousMarketTime !== undefined &&
      isLaterThan(marketTime, previousMarketTime) &&
      marketTime.slice(0, UTC_DATE_LENGTH) !==
        previousMarketTime.slice(0, UTC_DATE_LENGTH);
    if (isNewReplayDay) {
      void dispatch(refetchCachedScreening());
    }
  };
}

const refetchOptions = { subscribe: false, forceRefetch: true };

function refetchCachedScreening(): AppThunk<Promise<unknown>> {
  return (dispatch, getState) => {
    const state = getState();
    const { getOpportunities, getDailyHistory } = marketPulseApi.endpoints;
    return Promise.all([
      ...selectCachedArgsForQuery(state, 'getOpportunities').map(() =>
        dispatch(getOpportunities.initiate(undefined, refetchOptions)),
      ),
      ...selectCachedArgsForQuery(state, 'getDailyHistory').map((symbol) =>
        dispatch(getDailyHistory.initiate(symbol, refetchOptions)),
      ),
    ]);
  };
}

// Refetches only what a page has loaded, so a replay change on one page does not load data for others.
export function refetchCachedMarketData(): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const state = getState();
    const {
      getReplayStatus,
      getMarketSnapshot,
      getAnomalies,
      getPriceHistory,
    } = marketPulseApi.endpoints;
    await Promise.all([
      ...selectCachedArgsForQuery(state, 'getReplayStatus').map(() =>
        dispatch(getReplayStatus.initiate(undefined, refetchOptions)),
      ),
      ...selectCachedArgsForQuery(state, 'getMarketSnapshot').map(() =>
        dispatch(getMarketSnapshot.initiate(undefined, refetchOptions)),
      ),
      ...selectCachedArgsForQuery(state, 'getAnomalies').map(() =>
        dispatch(getAnomalies.initiate(undefined, refetchOptions)),
      ),
      ...selectCachedArgsForQuery(state, 'getPriceHistory').map((symbol) =>
        dispatch(getPriceHistory.initiate(symbol, refetchOptions)),
      ),
      dispatch(refetchCachedScreening()),
    ]);
  };
}
