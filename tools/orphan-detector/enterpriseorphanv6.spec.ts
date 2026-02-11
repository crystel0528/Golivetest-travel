import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(5 * 60 * 1000); // 5 minutes

const BASE_URL = 'https://dev.travelinsider.co/';
const jsonReportPath = path.resolve(__dirname, 'reports', 'orphan-pages-report.json');
const htmlReportPath = path.resolve(__dirname, 'reports', 'html-report');

// Pages we intentionally ignore from orphan checks
const IGNORED_PATHS = [
  '/privacy-policy',
  '/terms-and-conditions',
  '/faqs',
  '/contact-us'
];

// Helper to normalize URLs (remove query strings and trailing slashes)
function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, ''); // remove trailing slash
  } catch {
    return url;
  }
}

test.describe('ENTERPRISE ORPHAN DETECTOR V6', () => {
  test('Crawl site to detect true orphan pages', async ({ page }) => {
    const visitedPages = new Set<string>();
    const allLinksFound = new Map<string, Set<string>>(); // page -> links on page
    const toVisit = [BASE_URL];

    while (toVisit.length > 0) {
      const url = toVisit.shift()!;
      const normalizedUrl = normalizeUrl(url);
      if (visitedPages.has(normalizedUrl)) continue;

      visitedPages.add(normalizedUrl);

      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch (err) {
        console.warn(`⚠️ Failed to visit: ${url}`, err);
        continue;
      }

      // Collect all internal links on this page
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => (a as HTMLAnchorElement).href)
      );

      const internalLinks = links
        .filter(link => link.startsWith(BASE_URL))
        .map(normalizeUrl);

      allLinksFound.set(normalizedUrl, new Set(internalLinks));

      for (const link of internalLinks) {
        if (!visitedPages.has(link) && !toVisit.includes(link)) {
          toVisit.push(link);
        }
      }
    }

    // Flatten all links found across pages
    const linkedPages = new Set<string>();
    for (const links of allLinksFound.values()) {
      links.forEach(linkedPages.add, linkedPages);
    }

    // True orphan pages = visited pages NOT linked anywhere
    let orphanPages = Array.from(visitedPages).filter(
      url => !linkedPages.has(url) && !IGNORED_PATHS.includes(new URL(url).pathname)
    );

    // Save JSON report
    fs.mkdirSync(path.dirname(jsonReportPath), { recursive: true });
    fs.writeFileSync(
      jsonReportPath,
      JSON.stringify({ totalPages: Array.from(visitedPages), orphanPages }, null, 2)
    );

    console.log('==============================');
    console.log('Total Pages Found:', visitedPages.size);
    console.log('Orphan Pages Found:', orphanPages.length);
    orphanPages.forEach(url => console.log(url));
    console.log('JSON Report saved to:', jsonReportPath);
    console.log('HTML Report saved to:', path.join(htmlReportPath, 'index.html'));
    console.log('==============================');

    expect(visitedPages.size).toBeGreaterThan(0);
  });
});
