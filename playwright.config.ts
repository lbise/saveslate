import { defineConfig, devices } from '@playwright/test';

/**
 * Override BASE_URL to target a Docker deployment:
 *   BASE_URL=http://localhost npx playwright test
 *
 * When BASE_URL is set, the dev server is NOT started automatically.
 */
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const useDevServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  ...(useDevServer
    ? {
        webServer: {
          command: 'npm run dev -- --host 127.0.0.1 --port 4173',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
