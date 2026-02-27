import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import path from 'path';

// ✅ Constants
const REPORT_FOLDER = process.env.REPORT_FOLDER || 'playwright-report';
const BASE_URL = process.env.BASE_URL || 'https://dev.travelinsider.co/';

// ✅ Export config
export default defineConfig({
  testDir: './',
  testMatch: [
    'functional/**/*.spec.ts',
    'performance/**/*.spec.ts',
    'tests/**/*.spec.ts',
    'tools/orphan-detector/**/*.spec.ts'
  ],
  timeout: 60_000,
  retries: 1,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  outputDir: 'test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: REPORT_FOLDER, open: 'never' }]
  ],

  // ✅ Projects go here, NOT inside use
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'edge', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
  ],
  
  use: {
    headless: false,               // show browser
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 0,
    launchOptions: { 
      slowMo: 250,  // slow motion to see mouse
      args: ['--start-maximized'] // or ['--window-size=1920,1080']
  },
}
});
