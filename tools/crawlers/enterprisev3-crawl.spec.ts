import { test, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
//import axeSource from 'axe-core/axe.min.js';

// ---------------- CONFIG ----------------
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

const MAX_DEPTH = 4;
const MAX_PAGES = 600;
const CONCURRENCY = 5;
const PAGE_TIMEOUT = 60000;
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
const pageTimings: any[] = [];

// ---------------- REPORTS ----------------
const reportsFolder = path.join('reports', 'enterprise-v3');
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
test('ENTERPRISE V3 ULTRA SPA SPIDER', async () => {
  test.setTimeout(90 * 60_000);

  const browser = await chromium.launch();
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

      // JS Errors
      page.on('pageerror', e => jsErrors.push({ url: normalized, error: e.message }));

      // Network monitoring
      page.on('response', async res => {
        const type = res.request().resourceType();
        const status = res.status();
        let timing = 0;
try {
  const start = Date.now();
  await res.finished();
  timing = Date.now() - start;
} catch {}


        if (status >= 400) {
          if (type === 'xhr' || type === 'fetch')
            apiFailures.push({ page: normalized, api: res.url(), status });
          else
            assetFailures.push({ page: normalized, asset: res.url(), status });
        }

        if (timing > SLOW_API_MS && (type === 'xhr' || type === 'fetch')) {
          slowApis.push({ page: normalized, api: res.url(), time: timing });
        }
      });

      try {
        const start = Date.now();
        await page.goto(normalized, { waitUntil: 'networkidle' });
        pageTimings.push({ url: normalized, time: Date.now() - start });

        // Soft 404
        const body = await page.textContent('body');
        if (body && /not found|error|something went wrong/i.test(body)) {
          soft404.push(normalized);
        }

        // Accessibility scan
        await page.addScriptTag({
            path: require.resolve('axe-core/axe.min.js')
        });
        const axeResults = await page.evaluate(async () => {
        // @ts-ignore
        return await axe.run();
        });

        if (axeResults.violations.length > 0) {
          accessibilityIssues.push({ url: normalized, issues: axeResults.violations });
        }

        // Memory snapshot
        const metrics = await page.evaluate(() => (window.performance as any).memory || null);
        if (metrics && metrics.usedJSHeapSize > 200000000) {
          memoryLeaks.push({ url: normalized, heap: metrics.usedJSHeapSize });
        }

        // Visual snapshot
        const shotPath = path.join(reportsFolder, `${encodeURIComponent(normalized)}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        visualShots.push(shotPath);

        // SPA click exploration
        const clickable = await page.$$('[role="button"], button, a');
        for (let i = 0; i < Math.min(clickable.length, 5); i++) {
          try { await clickable[i].click({ timeout: 1000 }); } catch {}
        }

        await page.waitForTimeout(1000);

        const links: string[] = await page.evaluate(() =>
          Array.from(document.querySelectorAll('[href]'))
            .map(e => e.getAttribute('href') || '')
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
  fs.writeFileSync(path.join(reportsFolder, 'js-errors.json'), JSON.stringify(jsErrors, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'api-failures.json'), JSON.stringify(apiFailures, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'slow-apis.json'), JSON.stringify(slowApis, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'asset-failures.json'), JSON.stringify(assetFailures, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'accessibility.json'), JSON.stringify(accessibilityIssues, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'memory-leaks.json'), JSON.stringify(memoryLeaks, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'soft404.json'), JSON.stringify(soft404, null, 2));
  fs.writeFileSync(path.join(reportsFolder, 'page-timing.json'), JSON.stringify(pageTimings, null, 2));

  console.log('==============================');
  console.log(`Visited pages: ${visited.size}`);
  console.log(`JS Errors: ${jsErrors.length}`);
  console.log(`API Failures: ${apiFailures.length}`);
  console.log(`Accessibility Issues: ${accessibilityIssues.length}`);
  console.log(`Memory Leak Warnings: ${memoryLeaks.length}`);
  console.log('==============================');

  await browser.close();
});
