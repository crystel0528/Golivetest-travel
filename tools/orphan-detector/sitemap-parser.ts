// tools/orphan-detector/sitemap-parser.ts
import fs from 'fs';
import { parseStringPromise } from 'xml2js';

/**
 * Parse sitemap XML and return all URLs as an array
 * @param filePath path to sitemap.xml
 */
export async function parseSitemap(filePath: string): Promise<string[]> {
  const xmlData = fs.readFileSync(filePath, 'utf-8');
  const parsed = await parseStringPromise(xmlData);

  const urls: string[] = [];
  if (parsed.urlset && parsed.urlset.url) {
    parsed.urlset.url.forEach((u: any) => {
      if (u.loc && u.loc[0]) urls.push(u.loc[0]);
    });
  }

  return urls;
}
