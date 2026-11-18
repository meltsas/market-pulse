export const MOCK_SERVER_PORT = 4000;

export const REPLAY_START = '2026-11-04T00:00:00.000Z';
export const REPLAY_END = '2026-11-07T00:00:00.000Z';
// Each real second replays one five-minute bar.
export const REPLAY_SPEED_MULTIPLIER = 300;
export const STREAM_TICK_INTERVAL_MS = 1000;
export const REPLAY_BOOKMARKS = [
  { label: '5 Nov sell-off', marketTime: '2026-11-05T14:25:00.000Z' },
];

export const INTRADAY_INTERVAL_MINUTES = 5;
// One extra day before the replay gives every instrument a last known price when the replay starts.
export const INTRADAY_RECORDING_START = '2026-11-03T00:00:00.000Z';
// Daily history covers the 52-week window plus the 200 sessions its first 200-day average needs.
export const DAILY_RECORDING_START = '2025-01-01T00:00:00.000Z';
