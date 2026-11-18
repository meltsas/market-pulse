import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface WatchlistState {
  symbols: string[];
}

const initialState: WatchlistState = { symbols: [] };

export const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    watchlistToggled(state, { payload: symbol }: PayloadAction<string>) {
      state.symbols = state.symbols.includes(symbol)
        ? state.symbols.filter((watchedSymbol) => watchedSymbol !== symbol)
        : [...state.symbols, symbol];
    },
  },
  selectors: {
    selectWatchedSymbols: (state) => state.symbols,
    selectIsWatched: (state, symbol: string) => state.symbols.includes(symbol),
  },
});

export const { watchlistToggled } = watchlistSlice.actions;
export const { selectWatchedSymbols, selectIsWatched } =
  watchlistSlice.selectors;
