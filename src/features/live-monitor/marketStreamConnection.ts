import {
  marketStreamEventSchema,
  marketStreamEventTypes,
  type MarketStreamEvent,
} from '../../contracts/marketStream.ts';

export type ConnectionStatus =
  'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface MarketStreamHandlers {
  onOpen: () => void;
  onEvent: (event: MarketStreamEvent) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

const RECONNECT_DELAYS_MS = [1000, 2000, 5000];
const MAX_RECONNECT_DELAY_MS = 10_000;
const FAILED_ATTEMPTS_BEFORE_DISCONNECTED = 3;
// The server sends a replay clock event every second, so a longer silence means the connection is stuck.
export const SILENCE_TIMEOUT_MS = 5000;

export function parseMarketStreamEvent(
  data: unknown,
): MarketStreamEvent | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const result = marketStreamEventSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Reconnects with its own backoff: EventSource gives up after HTTP errors and cannot notice a stalled proxy.
export function connectToMarketStream(
  url: string,
  { onOpen, onEvent, onStatusChange }: MarketStreamHandlers,
): () => void {
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let silenceTimer: ReturnType<typeof setTimeout> | undefined;
  let failedAttempts = 0;

  function restartSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(reconnectAfterFailure, SILENCE_TIMEOUT_MS);
  }

  function handleMessage(message: MessageEvent) {
    restartSilenceTimer();
    const event = parseMarketStreamEvent(message.data);
    if (event) {
      onEvent(event);
    }
  }

  function reconnectAfterFailure() {
    clearTimeout(silenceTimer);
    eventSource?.close();
    eventSource = null;
    failedAttempts += 1;
    onStatusChange(
      failedAttempts > FAILED_ATTEMPTS_BEFORE_DISCONNECTED
        ? 'disconnected'
        : 'reconnecting',
    );
    reconnectTimer = setTimeout(
      connect,
      RECONNECT_DELAYS_MS[failedAttempts - 1] ?? MAX_RECONNECT_DELAY_MS,
    );
  }

  function connect() {
    eventSource = new EventSource(url);
    eventSource.addEventListener('open', () => {
      failedAttempts = 0;
      restartSilenceTimer();
      onStatusChange('connected');
      onOpen();
    });
    eventSource.addEventListener('error', reconnectAfterFailure);
    for (const eventType of marketStreamEventTypes) {
      eventSource.addEventListener(eventType, handleMessage);
    }
    restartSilenceTimer();
  }

  onStatusChange('connecting');
  connect();

  return () => {
    clearTimeout(reconnectTimer);
    clearTimeout(silenceTimer);
    eventSource?.close();
    eventSource = null;
  };
}
