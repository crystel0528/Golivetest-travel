import { test, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ---------------- CONFIG ----------------
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

const MAX_DEPTH = 3;
const MAX_PAGES = 200;

// ---------------- DATA ----------------
const visited = new Set<string>();
const brokenLinks: { url: string; status: number }[] = [];
const stagingLinks: string[] = [];

// ---------------- REPORT FOLDER ----------------
const reportsFolder = path.join('reports', 'links');
if (!fs.existsSync(reportsFolder)) {
  fs.mkdirSync(reportsFolder, { recursive: true });
}

// ---------------- HELPERS ----------------
function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

function shouldSkip(url: string) {
  return (
    url.includes('logout') ||
    url.includes('signout') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  );
}

// ---------------- TEST ----------------
test.setTimeout(20 * 60_000); // 20 minutes for entire test file

test('Full SPA Link Crawl', async ({ page }: { page: Page }) => {
  page.setDefaultTimeout(120_000); // 2 minutes per page interactions

  // -------- LOGIN --------
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  await page.click('[data-testid="sign-in-button"]');
  await page.waitForSelector('[data-testid="email-input"]');

  await page.fill('[data-testid="email-input"]', EMAIL);
  await page.click('[data-testid="email-navigate-login-button"]');

  await page.waitForSelector('[data-testid="email-password-input"]');
  await page.fill('[data-testid="email-password-input"]', PASSWORD);

  await page.click('[data-testid="email-password-submit-button"]');
  await page.waitForLoadState('networkidle');

  // -------- CRAWLER --------
  async function crawl(url: string, depth = 0) {
    url = normalizeUrl(url);

    if (
      visited.has(url) ||
      !url.startsWith(BASE_URL) ||
      depth > MAX_DEPTH ||
      visited.size >= MAX_PAGES ||
      shouldSkip(url)
    ) return;

    visited.add(url);
    console.log(`Crawling [${depth}]: ${url}`);

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle', // wait for SPA API calls
        timeout: 120_000,         // 2 minutes per page
      });

      // Broken links
      if (!response || response.status() >= 400) {
        brokenLinks.push({ url, status: response?.status() ?? 0 });
      }

      // Staging/dev detection
      if (!url.includes('dev.travelinsider.co') && /staging|localhost/.test(url)) {
        stagingLinks.push(url);
      }

      // Small wait for SPA content
      await page.waitForTimeout(1500);

      // Collect links
      const links: string[] = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href]'))
          .map(a => (a as HTMLAnchorElement).href);
        const routerLinks = Array.from(document.querySelectorAll('[href]'))
          .map(e => (e as HTMLElement).getAttribute('href') || '');
        return [...anchors, ...routerLinks].filter(Boolean);
      });

      // Crawl each link sequentially
      for (const link of links) {
        const full = link.startsWith('http') ? link : new URL(link, BASE_URL).href;
        await crawl(full, depth + 1);
      }
    } catch (err) {
      console.log(`Error crawling ${url}: ${(err as Error).message}`);
      brokenLinks.push({ url, status: 0 });
    }
  }

  // -------- START --------
  await crawl(BASE_URL);

  // -------- SAVE REPORTS --------
  const brokenCsv = 'URL,Status\n' + brokenLinks.map(l => `${l.url},${l.status}`).join('\n');
  fs.writeFileSync(path.join(reportsFolder, 'broken-links.csv'), brokenCsv);

  if (stagingLinks.length > 0) {
    fs.writeFileSync(
      path.join(reportsFolder, 'staging-links.csv'),
      'URL\n' + stagingLinks.join('\n')
    );
  }

  // -------- SUMMARY --------
  console.log('==============================');
  console.log(`Crawl complete!`);
  console.log(`Total links visited: ${visited.size}`);
  console.log(`Broken links found: ${brokenLinks.length}`);
  console.log(`Staging/dev links found: ${stagingLinks.length}`);
  console.log(`Reports saved in: ${reportsFolder}`);
  console.log('==============================');
});
