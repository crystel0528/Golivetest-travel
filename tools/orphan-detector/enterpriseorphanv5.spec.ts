// tools/orphan-detector/enterprise-orphan-v6.spec.ts
import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { parseSitemap } from './sitemap-parser';
import { collectLinksFromPage } from './ui-link-collector';
import { normalizeUrl, filterIgnoredPaths } from './orphan-utils';

// Configuration
const BASE_URL = 'https://dev.travelinsider.co/';
const JSON_REPORT = path.join(__dirname, 'reports', 'orphan-pages-report.json');
const HTML_REPORT = path.join(__dirname, 'reports', 'orphan-pages-report.html');
const IGNORED_PATHS = ['/privacy-policy', '/terms-and-conditions', '/faqs', '/contact-us'];

test.setTimeout(10 * 60 * 1000); // 10 minutes

test('ENTERPRISE ORPHAN DETECTOR V6', async ({ page }: { page: Page }) => {
  const visitedPages = new Set<string>();
  const allLinksFound = new Map<string, Set<string>>(); // page -> links on page
  const toVisit: string[] = [];

  // --- 1. Preload URLs from sitemap if available ---
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    const sitemapUrls = await parseSitemap(sitemapPath);
    toVisit.push(...sitemapUrls.map(normalizeUrl));
  } else {
    toVisit.push(BASE_URL);
  }

  // --- 2. Crawl pages recursively ---
  while (toVisit.length > 0) {
    const url = toVisit.shift()!;
    const normalizedUrl = normalizeUrl(url);
    if (visitedPages.has(normalizedUrl)) continue;

    visitedPages.add(normalizedUrl);

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    } catch (err) {
      console.warn(`⚠️ Failed to visit: ${url}`, (err as Error).message);
      continue;
    }

    // --- 3. Collect links from the page ---
    const links = await collectLinksFromPage(page);
    const internalLinks = links
      .filter(link => link.startsWith(BASE_URL))
      .map(normalizeUrl);

    allLinksFound.set(normalizedUrl, new Set(internalLinks));

    // --- 4. Queue new links ---
    for (const link of internalLinks) {
      if (!visitedPages.has(link) && !toVisit.includes(link)) {
        toVisit.push(link);
      }
    }
  }

  // --- 5. Detect orphan pages ---
  const linkedPages = new Set<string>();
  for (const links of allLinksFound.values()) {
    links.forEach(linkedPages.add, linkedPages);
  }

  let orphanPages = Array.from(visitedPages).filter(
    url => !linkedPages.has(url) && filterIgnoredPaths(url, IGNORED_PATHS)
  );

  // --- 6. Save JSON report ---
  fs.mkdirSync(path.dirname(JSON_REPORT), { recursive: true });
  fs.writeFileSync(JSON_REPORT, JSON.stringify({ totalPages: Array.from(visitedPages), orphanPages }, null, 2));

  // --- 7. Save HTML report ---
  const htmlContent = `
    <html>
      <head><title>Orphan Pages Report</title></head>
      <body>
        <h1>Orphan Pages Report</h1>
        <p>Total Pages: ${visitedPages.size}</p>
        <p>Orphan Pages: ${orphanPages.length}</p>
        <ul>${orphanPages.map(url => `<li>${url}</li>`).join('')}</ul>
      </body>
    </html>
  `;
  fs.writeFileSync(HTML_REPORT, htmlContent);

  // --- 8. Console summary ---
  console.log('==============================');
  console.log('Total Pages Found:', visitedPages.size);
  console.log('Orphan Pages Found:', orphanPages.length);
  orphanPages.forEach(url => console.log(url));
  console.log('JSON Report:', JSON_REPORT);
  console.log('HTML Report:', HTML_REPORT);
  console.log('==============================');

  expect(visitedPages.size).toBeGreaterThan(0);
});
