import { test, expect } from '@playwright/test';

test('🔥 Payment service down', async ({ page }) => {

  // simulate payment API outage
  await page.route('**/payment**', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Payment service down'
      })
    });
  });

  await page.goto('/checkout');

  await page.click('#pay-now');

  // verify error shown
  await expect(page.locator('.payment-error'))
    .toBeVisible();

  // spinner must stop
  await expect(page.locator('.loading-spinner'))
    .toBeHidden();

  // retry button available
  await expect(page.locator('#pay-now'))
    .toBeEnabled();
});
