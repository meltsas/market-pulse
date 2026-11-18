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
