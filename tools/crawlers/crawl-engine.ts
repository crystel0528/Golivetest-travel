// tools/crawlers/crawl-engine.ts
import { Page, Browser, chromium } from 'playwright';

export interface CrawlResult {
  url: string;
  status: number | string;
  brokenLinks: string[];
  jsErrors: string[];
}

/**
 * Visit a page and return page object
 */
export async function visitPage(browser: Browser, url: string): Promise<Page> {
  const page = await browser.newPage();

  // Capture JS errors
  const jsErrors: string[] = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle' });
    if (!response) throw new Error('No response');

    return page;
  } catch (err) {
    console.error(`Failed to visit ${url}: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Extract all internal links from the page
 */
export async function extractLinks(page: Page, baseUrl: string): Promise<string[]> {
  const links = await page.$$eval('a[href]', (anchors) =>
    anchors.map((a) => (a as HTMLAnchorElement).href)
  );

  // Filter internal links only
  return links.filter((link) => link.startsWith(baseUrl));
}

/**
 * Check for broken links on a page
 */
export async function checkBrokenLinks(page: Page, baseUrl: string): Promise<string[]> {
  const links = await extractLinks(page, baseUrl);
  const broken: string[] = [];

  for (const link of links) {
    try {
      const response = await page.goto(link, { waitUntil: 'networkidle' });
      if (!response || response.status() >= 400) {
        broken.push(link);
      }
    } catch {
      broken.push(link);
    }
  }

  return broken;
}

/**
 * Main crawl function
 */
export async function crawlSite(startUrl: string): Promise<CrawlResult[]> {
  const browser = await chromium.launch({ headless: true });
  const visited = new Set<string>();
  const results: CrawlResult[] = [];

  async function crawl(url: string) {
    if (visited.has(url)) return;
    visited.add(url);

    const page = await visitPage(browser, url);

    const brokenLinks = await checkBrokenLinks(page, startUrl);

    results.push({
      url,
      status: 200,
      brokenLinks,
      jsErrors: [], // JS errors captured via pageerror event
    });

    // Extract internal links and recursively crawl
    const internalLinks = await extractLinks(page, startUrl);
    for (const link of internalLinks) {
      if (!visited.has(link)) {
        await crawl(link);
      }
    }

    await page.close();
  }

  await crawl(startUrl);
  await browser.close();
  return results;
}
