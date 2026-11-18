import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createQuoteUpdatedEvent } from '../../test/apiFixtures.ts';
import { FakeEventSource } from '../../test/fakeEventSource.ts';
import {
  connectToMarketStream,
  parseMarketStreamEvent,
  SILENCE_TIMEOUT_MS,
  type ConnectionStatus,
} from './marketStreamConnection.ts';

function connectWithSpies() {
  const statuses: ConnectionStatus[] = [];
  const handlers = {
    onOpen: vi.fn<() => void>(),
    onEvent: vi.fn(),
    onStatusChange: (status: ConnectionStatus) => {
      statuses.push(status);
    },
  };
  const disconnect = connectToMarketStream('/api/market/stream', handlers);
  return { handlers, statuses, disconnect };
}

describe('parseMarketStreamEvent', () => {
  it('accepts events that match the contract', () => {
    const event = createQuoteUpdatedEvent({});

    expect(parseMarketStreamEvent(JSON.stringify(event))).toEqual(event);
  });

  it.each([
    ['malformed JSON', '{"type":'],
    ['an unknown event type', '{"type":"quote.deleted","id":"1"}'],
    ['a non-string payload', undefined],
  ])('rejects %s', (_description, data) => {
    expect(parseMarketStreamEvent(data)).toBeNull();
  });
});

describe('connectToMarketStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the connection and forwards valid events only', () => {
    const { handlers, statuses } = connectWithSpies();
    const eventSource = FakeEventSource.latest();
    const event = createQuoteUpdatedEvent({});

    eventSource.open();
    eventSource.emit(event);
    eventSource.emitRaw('quote.updated', '{"type":"quote.updated"}');

    expect(eventSource.url).toBe('/api/market/stream');
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(handlers.onOpen).toHaveBeenCalledOnce();
    expect(handlers.onEvent).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('reconnects with a growing delay and reports a lasting outage', () => {
    const { statuses } = connectWithSpies();

    FakeEventSource.latest().fail();
    expect(FakeEventSource.instances[0]?.isClosed).toBe(true);
    vi.advanceTimersByTime(999);
    expect(FakeEventSource.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.latest().fail();
    vi.advanceTimersByTime(2000);
    FakeEventSource.latest().fail();
    vi.advanceTimersByTime(5000);
    FakeEventSource.latest().fail();

    expect(statuses).toEqual([
      'connecting',
      'reconnecting',
      'reconnecting',
      'reconnecting',
      'disconnected',
    ]);
  });

  it('starts over after a successful reconnection', () => {
    const { handlers, statuses } = connectWithSpies();
    FakeEventSource.latest().open();
    FakeEventSource.latest().fail();
    vi.advanceTimersByTime(1000);

    FakeEventSource.latest().open();

    expect(statuses).toEqual([
      'connecting',
      'connected',
      'reconnecting',
      'connected',
    ]);
    expect(handlers.onOpen).toHaveBeenCalledTimes(2);
  });

  it('reconnects when an open stream goes silent', () => {
    const { statuses } = connectWithSpies();
    FakeEventSource.latest().open();

    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS - 1);
    FakeEventSource.latest().emit(createQuoteUpdatedEvent({}));
    vi.advanceTimersByTime(SILENCE_TIMEOUT_MS - 1);
    expect(statuses.at(-1)).toBe('connected');

    vi.advanceTimersByTime(1);
    expect(statuses.at(-1)).toBe('reconnecting');
    expect(FakeEventSource.instances[0]?.isClosed).toBe(true);
  });

  it('closes the connection and stops reconnecting when disconnected', () => {
    const { disconnect } = connectWithSpies();
    FakeEventSource.latest().fail();

    disconnect();
    vi.advanceTimersByTime(60_000);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
