import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// --- Config ---
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

// --- Data Stores ---
const visited = new Set<string>();
const brokenLinks: { url: string; status: number }[] = [];
const stagingLinks: string[] = [];

// --- Ensure reports folder exists ---
const reportsFolder = path.join('reports', 'links');
  if (!fs.existsSync(reportsFolder)) fs.mkdirSync(reportsFolder, { recursive: true });


test('Full App Link Crawl', async ({ page }) =>
{
  page.setDefaultTimeout(120_000);
  //await page.goto(BASE_URL);


    // ---- 1. Open homepage ----
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // ---- 2. Login Flow ----
    await page.click('[data-testid="sign-in-button"]');
    await page.waitForSelector('[data-testid="email-input"]');
    await page.fill('[data-testid="email-input"]', EMAIL);
    await page.click('[data-testid="email-navigate-login-button"]');
    await page.waitForSelector('[data-testid="email-password-input"]');
    await page.fill('[data-testid="email-password-input"]', PASSWORD);
    await page.click('[data-testid="email-password-submit-button"]');
    await page.waitForLoadState('domcontentloaded');

    // ---- 3. Recursive Crawl Function ----
    async function crawl(url: string): Promise<void> {
      if (visited.has(url) || !url.startsWith(BASE_URL)) return;
      visited.add(url);
      console.log(`Crawling: ${url}`);

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Broken links
        if (!response || response.status() >= 400) {
          brokenLinks.push({ url, status: response?.status() ?? 0 });
        }

        // Staging/dev detection
        if (/staging|dev|localhost/.test(url)) {
          stagingLinks.push(url);
        }

        // Extract links from current page
        const links = await page.$$eval('a[href]', (anchors: Element[]) =>
          anchors
            .map((a) => (a as HTMLAnchorElement).href)
            .filter(Boolean)
        );

        // Crawl each new link recursively
        for (const link of links) {
          if (!visited.has(link) && !link.startsWith('mailto:') && !link.startsWith('tel:')) {
            await crawl(link);
          }
        }
      } catch (err) {
        console.log(`Error crawling ${url}: ${(err as Error).message}`);
        brokenLinks.push({ url, status: 0 });
      }
    }

    // ---- 4. Start Crawl ----
    await crawl(BASE_URL);

    // ---- 5. Save CSV Reports ----
    const brokenCsv = 'URL,Status\n' + brokenLinks.map((l) => `${l.url},${l.status}`).join('\n');
    fs.writeFileSync(path.join(reportsFolder, 'broken-links.csv'), brokenCsv);

    if (stagingLinks.length > 0) {
      const stagingCsv = 'URL\n' + stagingLinks.join('\n');
      fs.writeFileSync(path.join(reportsFolder, 'staging-links.csv'), stagingCsv);
    }

    // ---- 6. Console Summary ----
    console.log('==============================');
    console.log(`Crawl complete!`);
    console.log(`Total links visited: ${visited.size}`);
    console.log(`Broken links found: ${brokenLinks.length}`);
    console.log(`Staging/dev links found: ${stagingLinks.length}`);
    console.log(`Reports saved in: ${reportsFolder}`);
    console.log('==============================');
  },
  { timeout: 10 * 60_000 } // 10 minutes
);
