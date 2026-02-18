// tests/functional/booking-flow.spec.ts
import { test, expect, Page } from '@playwright/test';
import { authenticate } from '../utils/helpers/auth.helper';
import { 
  handleCookieConsent,
  enableMouseOverlay,
  navigateToExperiences,
  findActivityCardIndex,
  selectDateDynamic,
  selectAvailableTime,
  fillContactInformation,
  completeBooking
} from '../utils/helpers/univhelpers';

test.describe('Experience Booking Flow', () => {

  // ----------------------
  // Helper to book activity
  // ----------------------
  async function bookActivity(page: Page, targetName: string) {
    await navigateToExperiences(page);

    const targetIndex = await findActivityCardIndex(page, targetName);
    const targetCard = page.locator('[data-testid="activity-card"], .activity-card, .activities-card').nth(targetIndex);
    await targetCard.click({ delay: 300 });

    await selectDateDynamic(page, 2026, 0, 25);
    await selectAvailableTime(page);

    await fillContactInformation(page, {
      firstName: 'Karl',
      lastName: 'Salinas',
      email: 'karl.salinas@onedigital.dev',
      phone: '09171234567'
    });

    await completeBooking(page, 'Credit Card');
  }

  // ----------------------
  // Test 1: Book 1 guest
  // ----------------------
  test('TC0301-001: Book activity with 1 guest', async ({ page }) => {
    console.log('🧩 TC0301-001 Start');

    // Clear previous state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Open homepage and handle consent
    await page.goto('https://dev.travelinsider.co', { waitUntil: 'domcontentloaded' });
    try { await handleCookieConsent(page); } catch { console.log('No cookie consent detected'); }
    await enableMouseOverlay(page);

    // Login
    await authenticate(page, 'karl.salinas@onedigital.dev', 'P@ssword123', true);

    // Book activity
    await bookActivity(page, 'Japan');

    console.log('✅ Booking initiated for 1 guest');
  });

  // ----------------------
  // Test 2: End-to-end booking
  // ----------------------
  test('TC0301-002: Complete End-to-End Booking', async ({ page }) => {
    console.log('🧩 TC0301-002 Start');

    // Open homepage and handle consent
    await page.goto('https://dev.travelinsider.co', { waitUntil: 'domcontentloaded' });
    try { await handleCookieConsent(page); } catch { console.log('No cookie consent detected'); }
    await enableMouseOverlay(page);

    // Login
    await authenticate(page, 'karl.salinas@onedigital.dev', 'P@ssword123', true);

    // Book activity
    await bookActivity(page, 'Japan');

    // Verify booking
    await page.goto('https://dev.travelinsider.co/my-bookings');
    const bookingEntry = page.locator(`text=Japan`);
    await expect(bookingEntry).toBeVisible();
    console.log('✅ Booking verified in My Bookings.');
  });

});
