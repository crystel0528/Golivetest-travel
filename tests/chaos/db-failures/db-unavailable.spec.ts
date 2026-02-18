import { test, expect } from '@playwright/test';

test('🔥 Database unavailable during booking', async ({ page }) => {

  await page.route('**/booking**', async route => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Database unavailable'
      })
    });
  });

  await page.goto('/checkout');

  await page.click('#confirm-booking');

  await expect(page.locator('.booking-error'))
    .toBeVisible();

  await expect(page.locator('.booking-success'))
    .toHaveCount(0);
});
