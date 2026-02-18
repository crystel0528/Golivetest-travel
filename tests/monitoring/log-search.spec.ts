import { test, expect } from '@playwright/test';

test.describe('Monitoring - Log Search', () => {

  test('should find specific log entry in system logs', async ({ page }) => {
    // Go to your log viewer page
    await page.goto('https://dev.travelinsider.co');

    // Enter search query for a test log
    const searchInput = page.locator('#log-search-input');
    await searchInput.fill('Test log entry 123');

    // Click search or submit
    await page.locator('#log-search-button').click();

    // Verify the log appears in results
    const logResult = page.locator('.log-entry', { hasText: 'Test log entry 123' });
    await expect(logResult).toBeVisible({ timeout: 5000 });

    // Optional: verify log details
    await expect(logResult).toContainText('Test log entry 123');
  });

});
