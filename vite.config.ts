import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { MOCK_SERVER_PORT } from './mock-server/src/config.ts';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // React changes far less often than application code, so browsers can keep it cached.
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
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
            // Formatted local times must not depend on the machine running the tests.
            TZ: 'UTC',
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
