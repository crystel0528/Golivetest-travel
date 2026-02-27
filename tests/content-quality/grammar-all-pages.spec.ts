import { test, expect } from '@playwright/test';

const pagesToTest = [
  '/',
  '/about',
  '/blogs'
];

test.describe('Grammar Check - All Pages', () => {
  for (const path of pagesToTest) {
    test(`Grammar check page: ${path}`, async ({ page }) => {
      await page.goto(path);

      const text = await page.locator('body').innerText();

      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `text=${encodeURIComponent(text)}&language=en-US`
      });

      const result = await response.json();

      // Allow small suggestions but fail on major issues
      const seriousIssues = result.matches.filter(
        (m: any) => m.rule.issueType === 'misspelling'
      );

      expect(seriousIssues.length).toBeLessThan(3);
    });
  }
});