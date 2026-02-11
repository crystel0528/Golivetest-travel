import { test as base, expect, Page } from '@playwright/test';
import { enableMouseOverlay } from '../utils/helpers';

export const test = base.extend<{
  page: Page;
}>({
  page: async ({ page }, use) => {
    const baseURL =
      process.env.BASE_URL || 'https://dev.travelinsider.co/';

    // Navigate automatically
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // Enable mouse pointer overlay
    await enableMouseOverlay(page);

    // Hand control to the test
    await use(page);
  },
});

export { expect };
