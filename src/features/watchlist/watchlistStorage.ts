import { z } from 'zod';

const WATCHLIST_STORAGE_KEY = 'market-pulse-watchlist';
const storedSymbolsSchema = z.array(z.string().min(1));

export function loadWatchlistSymbols(): string[] {
  try {
    const storedValue = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (storedValue === null) {
      return [];
    }
    const parsedSymbols = storedSymbolsSchema.safeParse(
      JSON.parse(storedValue),
    );
    return parsedSymbols.success ? parsedSymbols.data : [];
  } catch {
    return [];
  }
}

export function saveWatchlistSymbols(symbols: readonly string[]) {
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // Storage is unavailable (e.g. blocked site data), so the watchlist lasts only for this page load.
  }
}
