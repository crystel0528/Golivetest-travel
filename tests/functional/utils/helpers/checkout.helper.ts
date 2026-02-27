// tests/functional/utils/helpers/checkout.helper.ts
import { Page, expect } from '@playwright/test';

export async function completeCheckout(page: Page) {
  console.log('💳 Completing checkout');

  // Example: click proceed to payment
  const payButton = page.locator('text=Proceed to Payment');
  if (await payButton.isVisible().catch(() => false)) {
    await payButton.click();
  }

  // Confirm booking
  const confirmation = page.locator('text=Booking Confirmed');
  await expect(confirmation).toBeVisible();

  console.log('🎉 Checkout completed successfully!');
}