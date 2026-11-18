import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import { marketPulseApi } from '../api/marketPulseApi.ts';
import { marketStreamSlice } from '../features/market-stream/marketStreamSlice.ts';
import { watchlistSlice } from '../features/watchlist/watchlistSlice.ts';
import {
  loadWatchlistSymbols,
  saveWatchlistSymbols,
} from '../features/watchlist/watchlistStorage.ts';

export function createAppStore() {
  const store = configureStore({
    reducer: {
      [marketPulseApi.reducerPath]: marketPulseApi.reducer,
      [watchlistSlice.reducerPath]: watchlistSlice.reducer,
      [marketStreamSlice.reducerPath]: marketStreamSlice.reducer,
    },
    preloadedState: {
      [watchlistSlice.reducerPath]: { symbols: loadWatchlistSymbols() },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(marketPulseApi.middleware),
  });

  let savedWatchlistSymbols = store.getState().watchlist.symbols;
  store.subscribe(() => {
    const watchlistSymbols = store.getState().watchlist.symbols;
    if (watchlistSymbols !== savedWatchlistSymbols) {
      savedWatchlistSymbols = watchlistSymbols;
      saveWatchlistSymbols(watchlistSymbols);
    }
  });

  return store;
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export type AppThunk<ReturnValue = void> = ThunkAction<
  ReturnValue,
  RootState,
  unknown,
  UnknownAction
>;
