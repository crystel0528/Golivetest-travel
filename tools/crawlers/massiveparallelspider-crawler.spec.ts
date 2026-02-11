import { test, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import axe from 'axe-core';

// ---------------- CONFIG ----------------
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

const MAX_DEPTH = 4;
const MAX_PAGES = 800;
const CONCURRENCY = 5;
const PAGE_TIMEOUT = 60_000;
const RETRIES = 2;
const SLOW_API_MS = 3000;

// ---------------- DATA ----------------
const visited = new Set<string>();
const jsErrors: any[] = [];
const apiFailures: any[] = [];
const slowApis: any[] = [];
const assetFailures: any[] = [];
const accessibilityIssues: any[] = [];
const visualShots: string[] = [];
const memoryLeaks: any[] = [];
const soft404: string[] = [];
const brokenLinks: { url: string; status: number }[] = [];
const pageTimings: any[] = [];
const bookingFlowFailures: any[] = [];

// ---------------- REPORTS ----------------
const reportsFolder = path.join('reports', 'enterprise-v4');
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

async function runBookingSimulation(page: any) {
  try {
    const buttons = await page.$$(`button, [role="button"]`);
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => '');
      if (/book|checkout|reserve/i.test(text)) {
        try {
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(1000);
        } catch {
          bookingFlowFailures.push({ page: page.url(), button: text });
        }
      }
    }
  } catch {}
}

// ---------------- TEST ----------------
test('Enterprise V4 Autonomous QA SPA Crawler', async () => {
  test.setTimeout(120 * 60_000); // 2 hours max

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // -------- LOGIN --------
  const login = await context.newPage();
  await login.goto(BASE_URL);
  await login.click('[data-testid="sign-in-button"]');
  await login.fill('[data-testid="email-input"]', EMAIL);
  await login.click('[data-testid="email-navigate-login-button"]');
  await login.fill('[data-testid="email-password-input"]', PASSWORD);
  await login.click('[data-testid="email-password-submit-button"]');
  await login.waitForLoadState('networkidle');
  await login.close();

  // -------- QUEUE --------
  const queue: { url: string; depth: number }[] = [{ url: BASE_URL, depth: 0 }];

  async function crawl(item: { url: string; depth: number }) {
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

      page.on('pageerror', e => jsErrors.push({ url: normalized, error: e.message }));

      page.on('response', async res => {
        const type = res.request().resourceType();
        const status = res.status();

        // Track failures
        if (status >= 400) {
          if (type === 'xhr' || type === 'fetch')
            apiFailures.push({ page: normalized, api: res.url(), status });
          else assetFailures.push({ page: normalized, asset: res.url(), status });
        }

        // For slow APIs, track duration using request timing manually
        // Optional: implement performance.now() per request if needed
      });

      try {
        const start = Date.now();
        await page.goto(normalized, { waitUntil: 'networkidle' });
        pageTimings.push({ url: normalized, time: Date.now() - start });

        const body = await page.textContent('body');
        if (body && /not found|error|something went wrong/i.test(body)) {
          soft404.push(normalized);
        }

        // ---------------- ACCESSIBILITY ----------------
        await page.addScriptTag({ content: axe.source });
        const axeResults = await page.evaluate(async () => {
          // @ts-ignore
          return await (window as any).axe.run();
        });
        if (axeResults.violations.length > 0) {
          accessibilityIssues.push({ url: normalized, issues: axeResults.violations });
        }

        // ---------------- MEMORY ----------------
        const metrics = await page.evaluate(() => (window.performance as any).memory || null);
        if (metrics && metrics.usedJSHeapSize > 200_000_000) {
          memoryLeaks.push({ url: normalized, heap: metrics.usedJSHeapSize });
        }

        // ---------------- SCREENSHOT ----------------
        const shotPath = path.join(reportsFolder, `${encodeURIComponent(normalized)}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        visualShots.push(shotPath);

        // ---------------- BOOKING SIMULATION ----------------
        await runBookingSimulation(page);

        // ---------------- LINKS ----------------
        const links: string[] = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[href]')).map(e => e.getAttribute('href') || '')
        );
        for (const link of links) {
          const full = link.startsWith('http') ? link : new URL(link, BASE_URL).href;
          queue.push({ url: full, depth: item.depth + 1 });
        }

        await page.close();
        break;
      } catch {
        await page.close();
      }
    }
  }

  // -------- PARALLEL SPIDER --------
  while (queue.length > 0) {
    const chunk = queue.splice(0, CONCURRENCY);
    await Promise.all(chunk.map(crawl));
  }

  // -------- REPORTS --------
  const writeJson = (file: string, data: any) =>
    fs.writeFileSync(path.join(reportsFolder, file), JSON.stringify(data, null, 2));

  writeJson('js-errors.json', jsErrors);
  writeJson('api-failures.json', apiFailures);
  writeJson('slow-apis.json', slowApis);
  writeJson('asset-failures.json', assetFailures);
  writeJson('accessibility.json', accessibilityIssues);
  writeJson('memory-leaks.json', memoryLeaks);
  writeJson('soft404.json', soft404);
  writeJson('broken-links.json', brokenLinks);
  writeJson('page-timings.json', pageTimings);
  writeJson('booking-flow-failures.json', bookingFlowFailures);

  console.log('==============================');
  console.log(`Visited pages: ${visited.size}`);
  console.log(`JS Errors: ${jsErrors.length}`);
  console.log(`API Failures: ${apiFailures.length}`);
  console.log(`Accessibility Issues: ${accessibilityIssues.length}`);
  console.log(`Memory Leak Warnings: ${memoryLeaks.length}`);
  console.log(`Booking flow issues: ${bookingFlowFailures.length}`);
  console.log('==============================');

  await browser.close();
});
