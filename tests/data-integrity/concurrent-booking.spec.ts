import { test, expect, BrowserContext, Page } from '@playwright/test';

const BOOKING_URL = '/checkout';
const ITEM_ID = 'item-42'; // Replace with your actual item/seat ID

async function bookItem(page: Page, userName: string, attempt: number = 1) {
  try {
    await page.goto(BOOKING_URL);

    // Select the item
    await page.click(`#${ITEM_ID}`);

    // Fill booking details
    await page.fill('#name', userName);
    await page.fill('#email', `${userName}@example.com`);

    // Click confirm or pay button
    await page.click('#confirm-booking');

    // Wait for either success or error
    const bookingSuccess = page.locator('.booking-success');
    const bookingError = page.locator('.booking-error');

    await expect(bookingSuccess.or(bookingError)).toBeVisible({ timeout: 10000 });

    // Take screenshot for each attempt
    await page.screenshot({ path: `screenshots/${userName}-attempt${attempt}.png` });

    if (await bookingSuccess.isVisible()) return 'success';
    if (await bookingError.isVisible()) return 'error';
    return 'unknown';
  } catch (err) {
    console.error(`Booking attempt ${attempt} failed for ${userName}:`, err);
    await page.screenshot({ path: `screenshots/${userName}-attempt${attempt}-error.png` });
    return 'error';
  }
}

test.describe('Concurrent Booking with retries and reporting', () => {
  test('should allow only one successful booking for the same item', async ({ browser }) => {
    const users = ['Alice', 'Bob', 'Charlie', 'David'];
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < users.length; i++) {
      const context = await browser.newContext({
        recordVideo: { dir: `videos/${users[i]}` }, // record video per user
      });
      contexts.push(context);
      pages.push(await context.newPage());
    }

    // Run all bookings concurrently with retries
    const results = await Promise.all(
      pages.map((page, idx) => bookItem(page, users[idx], 1))
    );

    console.log('Concurrent booking results:', results);

    // Validate only one success
    const successCount = results.filter(r => r === 'success').length;
    const errorCount = results.filter(r => r === 'error').length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(users.length - 1);

    // Close all contexts
    for (const context of contexts) {
      await context.close();
    }
  });
});
