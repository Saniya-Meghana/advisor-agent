import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: true,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    port: 5174,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
