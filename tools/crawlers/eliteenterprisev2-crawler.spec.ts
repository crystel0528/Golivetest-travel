import { test, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ---------------- CONFIG ----------------
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

const MAX_DEPTH = 4;
const MAX_PAGES = 500;
const CONCURRENCY = 5;
const PAGE_TIMEOUT = 60000;
const API_SLOW_THRESHOLD = 3000;
const RETRIES = 2;

// ---------------- DATA ----------------
const visited = new Set<string>();
const brokenLinks: any[] = [];
const stagingLinks: string[] = [];
const jsErrors: any[] = [];
const apiFailures: any[] = [];
const slowApis: any[] = [];
const assetFailures: any[] = [];
const soft404: string[] = [];
const pageTimings: any[] = [];

// ---------------- REPORT FOLDER ----------------
const reportsFolder = path.join('reports', 'links');
if (!fs.existsSync(reportsFolder)) fs.mkdirSync(reportsFolder, { recursive: true });

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
    !url.startsWith(BASE_URL) ||
    url.includes('logout') ||
    url.includes('signout') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  );
}

// ---------------- TEST ----------------
test('ULTRA Enterprise Parallel SPA Crawler', async () => {
  test.setTimeout(60 * 60_000);

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // -------- LOGIN --------
  const loginPage = await context.newPage();
  await loginPage.goto(BASE_URL);
  await loginPage.click('[data-testid="sign-in-button"]');
  await loginPage.fill('[data-testid="email-input"]', EMAIL);
  await loginPage.click('[data-testid="email-navigate-login-button"]');
  await loginPage.fill('[data-testid="email-password-input"]', PASSWORD);
  await loginPage.click('[data-testid="email-password-submit-button"]');
  await loginPage.waitForLoadState('networkidle');
  await loginPage.close();

  // -------- QUEUE --------
  const queue: { url: string; depth: number }[] = [{ url: BASE_URL, depth: 0 }];

  async function crawlItem(item: { url: string; depth: number }) {
    const normalized = normalizeUrl(item.url);

    if (
      visited.has(normalized) ||
      visited.size >= MAX_PAGES ||
      item.depth > MAX_DEPTH ||
      shouldSkip(normalized)
    ) return;

    visited.add(normalized);
    console.log(`Crawling [${item.depth}]: ${normalized}`);

    for (let attempt = 1; attempt <= RETRIES + 1; attempt++) {
      const page = await context.newPage();
      page.setDefaultTimeout(PAGE_TIMEOUT);

      // JS errors
      page.on('pageerror', e => {
        jsErrors.push({ url: normalized, error: e.message });
      });

      // Console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push({ url: normalized, error: msg.text() });
        }
      });

      // Network monitoring
      page.on('response', async res => {
  const status = res.status();
  const req = res.request();
  const type = req.resourceType();

  // Fixed timing
  let timing = 0;
  try {
    const start = Date.now();
    await res.finished();
    timing = Date.now() - start;
  } catch {}

  if (status >= 400) {
    if (type === 'xhr' || type === 'fetch')
      apiFailures.push({ url: normalized, api: res.url(), status });
    else
      assetFailures.push({ url: normalized, asset: res.url(), status });
  }

  if (timing > API_SLOW_THRESHOLD && (type === 'xhr' || type === 'fetch')) {
    slowApis.push({ url: normalized, api: res.url(), time: timing });
  }
});


      try {
        const start = Date.now();
        const response = await page.goto(normalized, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - start;
        pageTimings.push({ url: normalized, time: loadTime });

        if (!response || response.status() >= 400) {
          brokenLinks.push({ url: normalized, status: response?.status() });
        }

        const bodyText = await page.textContent('body');
        if (bodyText && /not found|error|something went wrong/i.test(bodyText)) {
          soft404.push(normalized);
        }

        await page.waitForTimeout(1000);

        const links: string[] = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[href]'))
            .map(el => el.getAttribute('href') || '')
        );

        for (const link of links) {
          const full = link.startsWith('http') ? link : new URL(link, BASE_URL).href;

          if (!full.includes('dev.travelinsider.co') && /staging|localhost/.test(full)) {
            stagingLinks.push(full);
          }

          queue.push({ url: full, depth: item.depth + 1 });
        }

        await page.close();
        break;
      } catch (err) {
        if (attempt === RETRIES + 1) {
          brokenLinks.push({ url: normalized, status: 0 });
        }
        await page.close();
      }
    }
  }

  // -------- PARALLEL SPIDER --------
  while (queue.length > 0) {
    const chunk = queue.splice(0, CONCURRENCY);
    await Promise.all(chunk.map(crawlItem));
  }

  // -------- REPORTS --------
  fs.writeFileSync(path.join(reportsFolder, 'broken-links.json'), JSON.stringify(brokenLinks, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'js-errors.json'), JSON.stringify(jsErrors, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'api-failures.json'), JSON.stringify(apiFailures, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'slow-apis.json'), JSON.stringify(slowApis, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'asset-failures.json'), JSON.stringify(assetFailures, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'soft-404.json'), JSON.stringify(soft404, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'page-timings.json'), JSON.stringify(pageTimings, null, 2));

  console.log('==============================');
  console.log(`Visited: ${visited.size}`);
  console.log(`Broken links: ${brokenLinks.length}`);
  console.log(`JS Errors: ${jsErrors.length}`);
  console.log(`API Failures: ${apiFailures.length}`);
  console.log(`Slow APIs: ${slowApis.length}`);
  console.log(`Asset Failures: ${assetFailures.length}`);
  console.log(`Soft 404 Pages: ${soft404.length}`);
  console.log('==============================');

  await browser.close();
});
