"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
const univhelpers_1 = require("../utils/helpers/univhelpers");
exports.test = test_1.test.extend({
    page: async ({ page }, use) => {
        const baseURL = process.env.BASE_URL ?? 'https://dev.travelinsider.co/';
        console.log(`🌐 Navigating to: ${baseURL}`);
        // Navigate automatically
        await page.goto(baseURL, {
            waitUntil: 'domcontentloaded'
        });
        // Enable mouse overlay safely
        try {
            await (0, univhelpers_1.enableMouseOverlay)(page);
        }
        catch (err) {
            console.warn('⚠️ Mouse overlay failed:', err);
        }
        // Give page control to tests
        await use(page);
    }
});
