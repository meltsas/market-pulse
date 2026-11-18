import type { MarketStreamEvent } from '../contracts/marketStream.ts';

type Listener = (event: MessageEvent) => void;

// jsdom has no EventSource; tests drive this stand-in explicitly.
export class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  isClosed = false;
  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeEventSource.instances.push(this);
  }

  static latest() {
    const latestInstance = FakeEventSource.instances.at(-1);
    if (!latestInstance) {
      throw new Error('No EventSource has been created');
    }
    return latestInstance;
  }

  addEventListener(type: string, listener: Listener) {
    const typeListeners = this.listeners.get(type) ?? new Set<Listener>();
    typeListeners.add(listener);
    this.listeners.set(type, typeListeners);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.isClosed = true;
  }

  open() {
    this.dispatch('open');
  }

  fail() {
    this.dispatch('error');
  }

  emit(event: MarketStreamEvent) {
    this.dispatch(event.type, JSON.stringify(event));
  }

  emitRaw(type: string, data: string) {
    this.dispatch(type, data);
  }

  private dispatch(type: string, data?: string) {
    if (this.isClosed) {
      return;
    }
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data }));
    }
  }
}
