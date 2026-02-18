import { Page, expect } from '@playwright/test';

export async function loginUser(page: Page, user: { email: string; password: string }) {
  // ✅ Set viewport to desktop size
  await page.setViewportSize({ width: 16000, height: 12000 });

  console.log('🔐 Navigating to Travel Insider...');
  await page.goto('https://dev.travelinsider.co', { waitUntil: 'domcontentloaded' });

  // Scroll to reveal Sign In
  await page.evaluate(() => window.scrollTo(0, window.innerHeight / 2));

  // Click Sign In
  const signInButton = page.getByTestId('sign-in-button');
  await expect(signInButton).toBeVisible({ timeout: 20000 });
  await signInButton.scrollIntoViewIfNeeded();
  await signInButton.click({ force: true });
  console.log('✅ Clicked Sign In');

  // Fill email
  const emailField = page.getByTestId('email-input');
  await expect(emailField).toBeVisible({ timeout: 20000 });
  await emailField.fill(user.email);
  console.log('📨 Email entered');

  // Fill password (for password login)
  const passField = page.getByTestId('email-password-input');
  if (await passField.count()) {
    await expect(passField).toBeVisible({ timeout: 30000 });
    await passField.scrollIntoViewIfNeeded();
    await passField.fill(user.password);
    console.log('🔑 Password entered');
  }

  // Submit login
  const submitBtn = page.getByTestId('email-password-submit-button');
  if (await submitBtn.count()) {
    await expect(submitBtn).toBeVisible({ timeout: 20000 });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    console.log('📤 Credentials submitted');
  }

  // Wait for post-login confirmation (adjust testid if needed)
  const postLoginElement = page.getByTestId('nav-experiences'); // a reliable visible element after login
  await expect(postLoginElement).toBeVisible({ timeout: 40000 });
  console.log('🎉 Login successful!');
}

/**
 * 🧩 Robust dynamic date selector
 * Opens calendar, navigates to target month/year, clicks day
 */
export async function selectDateDynamic(page: Page, targetDateObj: Date) {
  const targetYear = targetDateObj.getFullYear();
  const targetMonthIndex = targetDateObj.getMonth();
  const targetDay = targetDateObj.getDate();

  // 1️⃣ Click the calendar button
  const calendarButton = page.locator('[data-testid="booking-show-calendar-button"], .react-datepicker-trigger');
  await calendarButton.waitFor({ state: 'visible', timeout: 20000 });
  await calendarButton.scrollIntoViewIfNeeded();
  await calendarButton.click({ force: true });
  console.log('📅 Calendar button clicked');

  // 2️⃣ Wait for the calendar portal and pick the **visible** one
  const calendar = page.locator('[data-testid="booking-calendar"], .react-datepicker')
    .filter({ has: page.locator(':visible') })
    .first();
  await expect(calendar).toBeVisible({ timeout: 20000 });
  console.log('📆 Calendar opened');

  const monthLabel = calendar.locator('.react-datepicker__current-month');
  const nextBtn = calendar.locator('[data-testid="booking-calendar-next-month-button"], .react-datepicker__navigation--next');
  const prevBtn = calendar.locator('[data-testid="booking-calendar-previous-month-button"], .react-datepicker__navigation--previous');

  // 3️⃣ Navigate to target month/year
  for (let i = 0; i < 24; i++) {
    const label = (await monthLabel.textContent())?.trim();
    if (!label) { await page.waitForTimeout(200); continue; }

    const [monthName, yearStr] = label.split(' ');
    const current = new Date(`${monthName} 1, ${yearStr}`);
    const target = new Date(targetYear, targetMonthIndex);

    if (current.getFullYear() === target.getFullYear() && current.getMonth() === target.getMonth()) break;

    current < target ? await nextBtn.click({ force: true }) : await prevBtn.click({ force: true });
    await page.waitForTimeout(300);
  }

  // 4️⃣ Select the day (skip disabled)
  const dayLocator = calendar.locator(`.react-datepicker__day:has-text("${targetDay}")`)
    .filter({ hasNot: calendar.locator('.react-datepicker__day--disabled') })
    .first();

  await dayLocator.scrollIntoViewIfNeeded();
  await expect(dayLocator).toBeVisible({ timeout: 5000 });
  await dayLocator.click({ force: true });

  console.log(`✅ Selected date: ${targetDateObj.toDateString()}`);
}
