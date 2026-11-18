export const routePaths = {
  home: '/',
  opportunities: '/opportunities',
  liveMonitor: '/live-monitor',
  watchlist: '/watchlist',
  settings: '/settings',
} as const;

export function liveMonitorInstrumentPath(symbol: string) {
  return `${routePaths.liveMonitor}/${encodeURIComponent(symbol)}`;
}

export function opportunityDetailPath(symbol: string) {
  return `${routePaths.opportunities}/${encodeURIComponent(symbol)}`;
}

export const LIVE_MONITOR_WATCHLIST_SEARCH = '?list=watchlist';

export function liveMonitorWatchlistPath(symbol: string) {
  return `${liveMonitorInstrumentPath(symbol)}${LIVE_MONITOR_WATCHLIST_SEARCH}`;
}
