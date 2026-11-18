import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { FakeEventSource } from './fakeEventSource.ts';

// jsdom does not implement matchMedia; tests run with a light system color scheme.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }),
});

// jsdom does not implement scrolling, which React Router's scroll restoration calls on navigation.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

// Lazily loaded routes can take longer than the default second on a busy machine.
configure({ asyncUtilTimeout: 3000 });

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
