"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('homepage loads', async ({ page }) => {
    // Navigate to the site
    await page.goto('https://dev.travelinsider.co/', {
        waitUntil: 'networkidle',
    });
    // Inject mouse pointer overlay
    await page.evaluate(() => {
        const cursor = document.createElement('div');
        cursor.style.position = 'fixed';
        cursor.style.width = '16px';
        cursor.style.height = '16px';
        cursor.style.background = 'rgba(0,150,255,0.7)';
        cursor.style.borderRadius = '50%';
        cursor.style.pointerEvents = 'none';
        cursor.style.zIndex = '999999';
        cursor.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(cursor);
        document.addEventListener('mousemove', e => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
    });
    // Assertion
    await (0, test_1.expect)(page).toHaveTitle(/travel/i);
});
