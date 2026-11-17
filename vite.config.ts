import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { MOCK_SERVER_PORT } from './mock-server/src/config.ts';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': `http://localhost:${String(MOCK_SERVER_PORT)}`,
    },
  },
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          env: {
            // Node's Request, used by RTK Query in tests, cannot resolve relative URLs.
            VITE_API_BASE_URL: 'http://localhost/api',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'mock-server',
          include: ['mock-server/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
