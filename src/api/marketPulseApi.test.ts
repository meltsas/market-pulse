import { assert, describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../app/store.ts';
import {
  sampleMarketSnapshot,
  sampleOpportunityList,
} from '../test/apiFixtures.ts';
import { marketPulseApi } from './marketPulseApi.ts';

function mockFetchJson(responseBody: unknown) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json(responseBody)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('marketPulseApi', () => {
  it('fetches and validates the market snapshot', async () => {
    const fetchMock = mockFetchJson(sampleMarketSnapshot);
    const store = createAppStore();

    const result = await store.dispatch(
      marketPulseApi.endpoints.getMarketSnapshot.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(result.data).toEqual(sampleMarketSnapshot);
    const request = fetchMock.mock.lastCall?.[0];
    assert.instanceOf(request, Request);
    expect(request.url).toBe('http://localhost/api/market/snapshot');
  });

  it('fetches and validates the opportunity list', async () => {
    mockFetchJson(sampleOpportunityList);
    const store = createAppStore();

    const result = await store.dispatch(
      marketPulseApi.endpoints.getOpportunities.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(result.data).toEqual(sampleOpportunityList);
  });

  it('returns an error when the response does not match the contract', async () => {
    mockFetchJson({ ...sampleMarketSnapshot, quotes: [{ symbol: 'DEMO' }] });
    const store = createAppStore();

    const result = await store.dispatch(
      marketPulseApi.endpoints.getMarketSnapshot.initiate(undefined, {
        subscribe: false,
      }),
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toMatchObject({
      status: 'CUSTOM_ERROR',
      error: 'Invalid getMarketSnapshot response',
    });
  });
});
