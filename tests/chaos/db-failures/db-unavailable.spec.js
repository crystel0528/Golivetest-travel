"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('🔥 Database unavailable during booking', async ({ page }) => {
    await page.route('**/booking**', async (route) => {
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
    await (0, test_1.expect)(page.locator('.booking-error'))
        .toBeVisible();
    await (0, test_1.expect)(page.locator('.booking-success'))
        .toHaveCount(0);
});
