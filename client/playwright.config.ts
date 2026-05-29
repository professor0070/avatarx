import { defineConfig, devices } from '@playwright/test';
import { clerkSetup } from '@clerk/testing/playwright';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // run sequentially to avoid auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 1 retry in dev so flaky network doesn't fail the suite
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    // Give each action more time — the app has polling that slows things down
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev --prefix ..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
