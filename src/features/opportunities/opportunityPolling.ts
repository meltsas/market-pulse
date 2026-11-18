// The screening changes once per replayed day; polling keeps research views current without the live stream.
export const OPPORTUNITY_POLLING = {
  pollingInterval: 30_000,
  skipPollingIfUnfocused: true,
} as const;
