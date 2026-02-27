import { test, expect } from '@playwright/test';
import { authenticate } from '../functional/utils/helpers/auth.helper';

test.describe('Monitoring - Alert Fire', () => {

  test('should login, trigger alert, and verify it appears', async ({ page, request }) => {

    // 1️⃣ Login using helper
    await authenticate(
      page,
      process.env.TEST_EMAIL || 'crysteline@onedigital.dev',
      process.env.TEST_PASSWORD || 'P@ssword!123'
    );

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');

    // 2️⃣ Trigger alert via API
    const response = await request.post(
      'https://dev.travelinsider.co/api/test-alert',
      { data: { message: 'Test Alert from Playwright' } }
    );
    expect(response.ok()).toBeTruthy();

    // 3️⃣ Verify alert appears
    const alertLocator = page.locator('.toast-message', {
      hasText: 'Test Alert from Playwright'
    });
    await expect(alertLocator).toBeVisible({ timeout: 15000 });
    await expect(alertLocator).toContainText('Test Alert from Playwright');
  });

});
