import { configureStore } from '@reduxjs/toolkit';
import { marketPulseApi } from '../api/marketPulseApi.ts';

export function createAppStore() {
  return configureStore({
    reducer: {
      [marketPulseApi.reducerPath]: marketPulseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(marketPulseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
