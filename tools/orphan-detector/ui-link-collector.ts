// tools/orphan-detector/ui-link-collector.ts
import { Page } from '@playwright/test';

/**
 * Collect all href links from a given page
 * @param page Playwright Page object
 */
export async function collectLinksFromPage(page: Page): Promise<string[]> {
  const anchors = await page.$$eval('a[href]', (els: Element[]) => 
    els.map(el => (el as HTMLAnchorElement).href).filter(Boolean)
  );
  return anchors;
}
