import { test } from '@playwright/test';
import { authenticate } from '../utils/helpers/auth.helper';
import { bookActivity } from '../utils/helpers/booking.helper';
import { completeCheckout } from '../utils/helpers/checkout.helper';


test('check sign in button', async ({ page }) => {
  await page.goto('https://dev.travelinsider.co', { waitUntil: 'networkidle' });

  console.log('Count of sign in button:', await page.locator('[data-testid="sign-in-button"]').count());

  const visible = await page.locator('[data-testid="sign-in-button"]').isVisible();
  console.log('Is visible:', visible);

  await page.screenshot({ path: 'page.png', fullPage: true });
});