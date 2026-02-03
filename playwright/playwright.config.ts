import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: '../../tests', // relative path from playwright/
  timeout: 60_000,
  retries: 1,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    [
      'html',
      {
        outputFolder: path.join(__dirname, '../test-results/playwright-report'),
        open: 'never',
      },
    ],
  ],

  globalSetup: require.resolve('./fixtures/global-setup.ts'),

  use: {
    baseURL: process.env.BASE_URL || 'https://dev.travelinsider.co/',
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 0,
    launchOptions: { slowMo: 250 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'edge', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
  ],
});
