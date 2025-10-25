import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for paper trading tests
 * Disables webServer since we're using an existing dev server on port 5173
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Do NOT start webServer - use existing dev server on port 5173
  // No webServer configuration needed
});
