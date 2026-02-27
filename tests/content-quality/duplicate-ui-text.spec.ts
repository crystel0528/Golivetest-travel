import { test, expect } from '@playwright/test';

const pagesToTest = [
  '/',
  '/about',
  '/contact'
];

test.describe('Duplicate UI Text Check', () => {
  test('Detect duplicate visible text across pages', async ({ page }) => {

    const pageTexts: Record<string, string[]> = {};

    for (const path of pagesToTest) {
      await page.goto(path);

      const text = await page.locator('body').innerText();
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 30); // ignore short UI labels

      pageTexts[path] = lines;
    }

    const duplicates: string[] = [];

    const allLines = Object.values(pageTexts).flat();

    const seen = new Set<string>();

    for (const line of allLines) {
      if (seen.has(line)) {
        duplicates.push(line);
      } else {
        seen.add(line);
      }
    }

    // Allow small shared content (like footer text)
    expect(duplicates.length).toBeLessThan(5);
  });
});