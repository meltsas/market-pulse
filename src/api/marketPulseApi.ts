import {
  createApi,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { marketSnapshotSchema } from '../contracts/market.ts';
import { opportunityListSchema } from '../contracts/opportunities.ts';

const DEFAULT_API_BASE_URL = '/api';

export const marketPulseApi = createApi({
  reducerPath: 'marketPulseApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  }),
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
    getOpportunities: build.query({
      query: () => 'opportunities',
      responseSchema: opportunityListSchema,
    }),
  }),
});
