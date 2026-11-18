import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { anomalyListSchema } from '../contracts/anomalies.ts';
import {
  marketSnapshotSchema,
  priceHistorySchema,
} from '../contracts/market.ts';
import { opportunityListSchema } from '../contracts/opportunities.ts';
import { replayStatusSchema, type ReplayControl } from '../contracts/replay.ts';

const DEFAULT_API_BASE_URL = '/api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const marketPulseApi = createApi({
  reducerPath: 'marketPulseApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  catchSchemaFailure: (schemaError, { endpoint }): FetchBaseQueryError => ({
    status: 'CUSTOM_ERROR',
    error: `Invalid ${endpoint} response`,
    data: schemaError.issues,
  }),
  endpoints: (build) => ({
    getMarketSnapshot: build.query({
      query: () => 'market/snapshot',
      responseSchema: marketSnapshotSchema,
    }),
    getPriceHistory: build.query({
      query: (symbol: string) => ({
        url: 'market/history',
        params: { symbol },
      }),
      responseSchema: priceHistorySchema,
    }),
    getAnomalies: build.query({
      query: () => 'market/anomalies',
      responseSchema: anomalyListSchema,
    }),
    controlReplay: build.mutation({
      query: (replayControl: ReplayControl) => ({
        url: 'replay',
        method: 'PATCH',
        body: replayControl,
      }),
      responseSchema: replayStatusSchema,
    }),
    getOpportunities: build.query({
      query: () => 'opportunities',
      responseSchema: opportunityListSchema,
    }),
  }),
});
