import { test, chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';

// ---------- CONFIG ----------
const BASE_URL = 'https://dev.travelinsider.co/';
const EMAIL = 'crysteline@onedigital.dev';
const PASSWORD = 'P@ssword!123';

const MAX_DEPTH = 3;
const MAX_PAGES = 200;
const PAGE_TIMEOUT = 60_000;

// Jira
const JIRA_DOMAIN = 'yourcompany.atlassian.net';
const JIRA_PROJECT_KEY = 'SPA';
const JIRA_EMAIL = 'you@company.com';
const JIRA_API_TOKEN = 'your_api_token_here';

// ---------- DATA ----------
const visited = new Set<string>();
const brokenLinks: { url: string; status: number; screenshot?: string }[] = [];
const jsErrors: { url: string; error: string; screenshot?: string }[] = [];

// ---------- REPORTS ----------
const reportsFolder = path.join('reports', 'enterprise-v4-jira');
const screenshotsFolder = path.join(reportsFolder, 'screenshots');

test('Enterprise V4+ SPA Crawler with Jira', async () => {
  // create folders inside the test
  await fs.mkdir(reportsFolder, { recursive: true });
  await fs.mkdir(screenshotsFolder, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);

  // ... rest of the code ...
});

// ---------- HELPERS ----------
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
  return !url.startsWith(BASE_URL) || url.includes('logout') || url.includes('signout');
}

// Jira bug creator
async function createJiraIssue(title: string, description: string, screenshotPath?: string) {
  try {
    const data: any = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: title,
        description,
        issuetype: { name: 'Bug' },
        labels: ['auto-crawler', 'spa'],
      },
    };

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

    const res = await axios.post(`https://${JIRA_DOMAIN}/rest/api/3/issue`, data, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (screenshotPath) {
      const issueKey = res.data.key;
      const buffer = await fs.readFile(screenshotPath);
      const formData = new FormData();
      formData.append('file', buffer, { filename: path.basename(screenshotPath) });

      await axios.post(
        `https://${JIRA_DOMAIN}/rest/api/3/issue/${issueKey}/attachments`,
        formData,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'X-Atlassian-Token': 'no-check',
            ...formData.getHeaders(),
          },
        }
      );
    }

    console.log(`Created Jira bug: ${res.data.key}`);
  } catch (err: any) {
    console.log('Jira issue creation failed:', err.message);
  }
}

// ---------- TEST ----------
test('Enterprise V4+ SPA Crawler with Jira', async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);

  // Login
  await page.goto(BASE_URL);
  await page.click('[data-testid="sign-in-button"]');
  await page.fill('[data-testid="email-input"]', EMAIL);
  await page.click('[data-testid="email-navigate-login-button"]');
  await page.fill('[data-testid="email-password-input"]', PASSWORD);
  await page.click('[data-testid="email-password-submit-button"]');
  await page.waitForLoadState('networkidle');

  // Queue crawler
  const queue: { url: string; depth: number }[] = [{ url: BASE_URL, depth: 0 }];

  async function crawl(item: { url: string; depth: number }) {
    const url = normalizeUrl(item.url);
    if (visited.has(url) || visited.size >= MAX_PAGES || item.depth > MAX_DEPTH || shouldSkip(url))
      return;

    visited.add(url);
    console.log(`Crawling [${item.depth}]: ${url}`);

    const screenshotPath = path.join(screenshotsFolder, `${encodeURIComponent(url)}.png`);

    // Listen for JS errors
    page.on('pageerror', async e => {
      jsErrors.push({ url, error: e.message });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      await createJiraIssue(`JS error on page: ${url}`, e.message, screenshotPath);
    });

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      if (!response || response.status() >= 400) {
        brokenLinks.push({ url, status: response?.status() ?? 0 });
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await createJiraIssue(`Broken link detected: ${url}`, `HTTP status: ${response?.status ?? 'N/A'}`, screenshotPath);
      }

      // Collect links safely
      const links: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .filter((a): a is HTMLAnchorElement => a instanceof HTMLAnchorElement)
          .map(a => a.href)
      );

      for (const link of links) {
        const full = link.startsWith('http') ? link : new URL(link, BASE_URL).href;
        queue.push({ url: full, depth: item.depth + 1 });
      }
    } catch (err: any) {
      console.log(`Error crawling ${url}: ${err.message}`);
    }
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    await crawl(item);
  }

  // Save reports
  await fs.writeFile(path.join(reportsFolder, 'broken-links.json'), JSON.stringify(brokenLinks, null, 2));
  await fs.writeFile(path.join(reportsFolder, 'js-errors.json'), JSON.stringify(jsErrors, null, 2));

  console.log('Crawl complete!');
  console.log(`Pages visited: ${visited.size}`);
  console.log(`Broken links: ${brokenLinks.length}`);
  console.log(`JS errors: ${jsErrors.length}`);

  await browser.close();
});
