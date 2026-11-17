import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
    env: {
      // Node's Request, used by RTK Query in tests, cannot resolve relative URLs.
      VITE_API_BASE_URL: 'http://localhost/api',
    },
  },
});
