import { test as base, expect, Page } from '@playwright/test';
import { enableMouseOverlay } from '../utils/helpers/univhelpers';





type Fixtures = {
  page: Page;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {

    const baseURL =
      process.env.BASE_URL ?? 'https://dev.travelinsider.co/';

    console.log(`🌐 Navigating to: ${baseURL}`);

    // Navigate automatically
    await page.goto(baseURL, {
      waitUntil: 'domcontentloaded'
    });

    // Enable mouse overlay safely
    try {
      await enableMouseOverlay(page);
    } catch (err) {
      console.warn('⚠️ Mouse overlay failed:', err);
    }

    // Give page control to tests
    await use(page);
  }
});

export { expect };
