"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('🔥 Payment service down', async ({ page }) => {
    // simulate payment API outage
    await page.route('**/payment**', async (route) => {
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
    await (0, test_1.expect)(page.locator('.payment-error'))
        .toBeVisible();
    // spinner must stop
    await (0, test_1.expect)(page.locator('.loading-spinner'))
        .toBeHidden();
    // retry button available
    await (0, test_1.expect)(page.locator('#pay-now'))
        .toBeEnabled();
});
