import { describe, expect, it } from 'vitest';
import { createAppStore } from '../../app/store.ts';
import {
  selectIsWatched,
  selectWatchedSymbols,
  watchlistToggled,
} from './watchlistSlice.ts';

const WATCHLIST_STORAGE_KEY = 'market-pulse-watchlist';

describe('watchlist', () => {
  it('adds and removes instruments in the order they were added', () => {
    const store = createAppStore();

    store.dispatch(watchlistToggled('ORCL'));
    store.dispatch(watchlistToggled('LLY'));
    store.dispatch(watchlistToggled('NDX'));
    store.dispatch(watchlistToggled('LLY'));

    expect(selectWatchedSymbols(store.getState())).toEqual(['ORCL', 'NDX']);
    expect(selectIsWatched(store.getState(), 'LLY')).toBe(false);
  });

  it('remembers the watchlist in this browser', () => {
    const firstVisit = createAppStore();
    firstVisit.dispatch(watchlistToggled('ORCL'));

    const nextVisit = createAppStore();

    expect(localStorage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["ORCL"]');
    expect(selectWatchedSymbols(nextVisit.getState())).toEqual(['ORCL']);
  });

  it('starts empty when the stored watchlist is unreadable', () => {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, '{"symbols": 3}');

    expect(selectWatchedSymbols(createAppStore().getState())).toEqual([]);
  });
});
