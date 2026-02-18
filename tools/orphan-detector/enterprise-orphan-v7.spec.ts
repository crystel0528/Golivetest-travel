import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const BASE_URL = 'https://dev.travelinsider.co/';
const REPORT_FOLDER = path.join(__dirname, 'reports');
const JSON_REPORT = path.join(REPORT_FOLDER, 'orphan-pages-report.json');
const HTML_REPORT = path.join(REPORT_FOLDER, 'orphan-pages-report.html');
const SITEMAP_URL = `${BASE_URL}sitemap.xml`;

// Pages intentionally ignored
const IGNORED_PATHS = [
  '/privacy-policy',
  '/terms-and-conditions',
  '/faqs',
  '/contact-us'
];

// Helper to normalize URLs
function normalizeUrl(url: string) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, ''); // remove trailing slash
  } catch {
    return url;
  }
}

// Parse sitemap using built-in fetch
async function fetchSitemapUrls(): Promise<Set<string>> {
  try {
    const res = await fetch(SITEMAP_URL); // Node 22+ has fetch globally
    if (!res.ok) return new Set();
    const xmlData = await res.text();
    const parsed = await parseStringPromise(xmlData);
    const urls: string[] = [];
    if (parsed.urlset && parsed.urlset.url) {
      parsed.urlset.url.forEach((u: any) => {
        if (u.loc && u.loc[0]) urls.push(normalizeUrl(u.loc[0]));
      });
    }
    return new Set(urls);
  } catch (err) {
    console.warn('Failed to fetch sitemap:', err);
    return new Set();
  }
}

test.describe('ENTERPRISE ORPHAN DETECTOR V7', () => {
  test('Crawl site and detect orphan pages', async ({ page }) => {
    const visitedPages = new Set<string>();
    const allLinksFound = new Map<string, Set<string>>();
    const toVisit = [BASE_URL];

    // Crawl all pages starting from BASE_URL
    while (toVisit.length > 0) {
      const url = toVisit.shift()!;
      const normalizedUrl = normalizeUrl(url);
      if (visitedPages.has(normalizedUrl)) continue;
      visitedPages.add(normalizedUrl);

      try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      } catch {
        console.warn(`⚠️ Failed to visit: ${url}`);
        continue;
      }

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

    // Get sitemap URLs
    const sitemapUrls = await fetchSitemapUrls();

    // Combine visited pages + sitemap pages
    const allPages = new Set([...visitedPages, ...sitemapUrls]);

    // Flatten all links found across pages
    const linkedPages = new Set<string>();
    for (const links of allLinksFound.values()) {
      links.forEach(linkedPages.add, linkedPages);
    }

    // True orphan pages = allPages NOT linked anywhere
    const orphanPages = Array.from(allPages).filter(
      url => !linkedPages.has(url) && !IGNORED_PATHS.includes(new URL(url).pathname)
    );

    // Save JSON report
    fs.mkdirSync(REPORT_FOLDER, { recursive: true });
    fs.writeFileSync(JSON_REPORT, JSON.stringify({ totalPages: Array.from(allPages), orphanPages }, null, 2));

    // Save simple HTML report
    const htmlContent = `
      <h1>Orphan Pages Report</h1>
      <h2>Visited Pages (${allPages.size})</h2>
      <ul>${Array.from(allPages).map(u => `<li>${u}</li>`).join('')}</ul>
      <h2>Orphan Pages (${orphanPages.length})</h2>
      <ul>${orphanPages.length > 0 ? orphanPages.map(u => `<li>${u}</li>`).join('') : '<li>✅ No orphan pages found.</li>'}</ul>
    `;
    fs.writeFileSync(HTML_REPORT, htmlContent);

    // Console output
    console.log('========== Visited Pages ==========');
    Array.from(allPages).forEach(u => console.log(u));
    console.log('Total pages visited:', allPages.size);

    console.log('========== Orphan Pages ==========');
    if (orphanPages.length === 0) console.log('✅ No orphan pages found.');
    else orphanPages.forEach(url => console.log(url));
    console.log('Total orphan pages:', orphanPages.length);

    console.log(`\nJSON report: ${JSON_REPORT}`);
    console.log(`HTML report: ${HTML_REPORT}`);

    expect(allPages.size).toBeGreaterThan(0);
  });
});
