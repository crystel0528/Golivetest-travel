import { Page, expect } from '@playwright/test';

export async function bookActivity(page: Page, activityName: string, date: string) {
  console.log(`📅 Booking activity: ${activityName} on ${date}`);

// 1️⃣ Go to Experiences page
await page.goto('https://dev.travelinsider.co/experiences', { waitUntil: 'networkidle', timeout: 120000 });
await page.locator('h1', { hasText: 'Explore Experiences' }).waitFor({ state: 'visible', timeout: 30000 });
console.log('✅ Navigated to Experiences page');
/*
// 2️⃣ Wait for the page header to appear
const pageHeader = page.locator('h1', { hasText: 'Explore Experiences' }).first();
await expect(pageHeader).toBeVisible({ timeout: 30000 });
console.log('✅ Page header "Explore Experiences" is visible'); */

// 2️⃣ Scroll and locate Trending Adventure Experience section
const trendingSectionSelector = 'section, div, article';
const trendingText = 'Trending Adventure Experience';
let trendingSection: any = null;

const maxScrolls = 20;
for (let i = 0; i < maxScrolls; i++) {
  trendingSection = page.locator(trendingSectionSelector, { hasText: "Trending Adventure Experiences" }).first(); // PICK FIRST
  if ((await trendingSection.count()) > 0) {
    await trendingSection.scrollIntoViewIfNeeded();
    console.log('✅ Trending Adventure Experience section found');
    break;
  }
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);
}

if (!trendingSection || (await trendingSection.count()) === 0) {
  throw new Error('⚠️ Could not find Trending Adventure Experience section after scrolling');
}

// 3️⃣ Click first activity card inside section
const activityCard = trendingSection.locator('article, div').first();
await activityCard.waitFor({ state: 'visible', timeout: 15000 });
await activityCard.click();
console.log('✅ Clicked activity card');

  // 4️⃣ Wait for details page
  await page.waitForLoadState('networkidle');

  // 5️⃣ Fill date
  const dateInput = page.locator('input[type="date"]');
  await dateInput.waitFor({ state: 'visible', timeout: 10000 });
  await dateInput.fill(date);
  console.log('✅ Selected date');

  // 6️⃣ Confirm booking
  const confirmButton = page.getByText('Confirm Booking');
  await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
  await confirmButton.click();
  console.log('✅ Activity booking completed');
}