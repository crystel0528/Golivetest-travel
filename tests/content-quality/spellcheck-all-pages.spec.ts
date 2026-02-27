import { test, expect } from '@playwright/test';
import fs from 'fs';

// Simple dictionary (expand this or load from file)
const dictionary = new Set(
  fs.readFileSync('utils/english-dictionary.txt', 'utf-8')
    .split('\n')
    .map(word => word.trim().toLowerCase())
);

// Whitelisted words (brand names, travel terms, etc.)
const whitelist = new Set([
  'topup',
  'e-wallet',
  'cebu',
  'gcash',
  'paypal',
  'travelinsider'
]);

const pagesToTest = [
  '/',
  '/about',
  '/blogs',
];

test.describe('Spellcheck - All Pages', () => {
  for (const path of pagesToTest) {
    test(`Spellcheck page: ${path}`, async ({ page }) => {
      await page.goto(path);

      const text = await page.locator('body').innerText();
      const words = text.match(/\b[a-zA-Z-]+\b/g) || [];

      const misspelled = words.filter(word => {
        const w = word.toLowerCase();
        return !dictionary.has(w) && !whitelist.has(w);
      });

      expect(misspelled.length).toBeLessThan(5); // configurable threshold
    });
  }
});~