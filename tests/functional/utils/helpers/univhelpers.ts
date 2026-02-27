import { Page, expect } from '@playwright/test';


console.log('🔥 REAL univhelpers.ts LOADED');

// ---------------- HELPER FUNCTIONS ----------------

// 🖱️ Optional mouse overlay for visual debugging
export async function enableMouseOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      .playwright-mouse {
        position: fixed;
        width: 20px; height: 20px;
        background: rgba(0,150,255,0.5);
        border-radius: 50%;
        z-index: 9999;
        pointer-events: none;
        transform: translate(-10px, -10px);
        transition: transform 0.05s ease-out;
        cursor: url('https://cur.cursors-4u.net/mechanics/mec-1/mec23.cur'), auto !important;

      }
    `,
  });
  await page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.classList.add('playwright-mouse');
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', e => {
      cursor.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`;
    });
  });
}


// 🧩 Cookie consent handler
/*export async function handleCookieConsent(page: Page) {
  const selectors = [
    '[data-testid="cookie-accept"]',
    'text=/Accept|Got it|OK|Agree/i',
    'button:has-text("Accept")',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel);
    if (await el.first().isVisible({ timeout: 240000 }).catch(() => false)) {
      await el.first().click({ delay: 100 });
      console.log('✅ Cookie banner accepted.');
      return;
    }
  }
  console.log('ℹ️ No cookie banner detected.');  */

export async function handleCookieConsent(page: Page) {
  try {
    const acceptBtn = page.locator('button:has-text("Accept")');

    if (await acceptBtn.isVisible({ timeout: 3000 })) {
      await acceptBtn.click();
      console.log('✅ Cookie accepted');
    }
  } catch (error) {
    console.log('⚠️ No cookie popup found');
  }
}

// 🧩 Navigate to Experiences page
export async function navigateToExperiences(page: Page) {
  console.log('🧭 Navigating to Experiences page...');
  const locators = [
    '[data-testid="experience-href"]',
    '[data-test="nav-experiences"]',
    'a:has-text("Experiences")',
    'text=/Experiences/i',
  ];

  for (const selector of locators) {
    const locator = page.locator(selector);
    if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
      await locator.first().scrollIntoViewIfNeeded();
      await locator.first().click({ delay: 100 });
      break;
    }
  }

  await Promise.any([
    page.waitForSelector('[data-testid="activity-card"]', { timeout: 120000 }),
    page.waitForSelector('.activity-card', { timeout: 120000 }),
    page.waitForSelector('text=/Popular Experiences|Top Experiences|Things to do/i', { timeout: 120000 }),
  ]).catch(async () => {
    console.log('⚠️ Activity cards not detected, attempting fallback reload...');
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);
  });

  console.log('✅ Experiences page loaded successfully.');
}

// 🧩 Scroll and find activity card index
export async function findActivityCardIndex(page: Page, targetName: string) {
  const cardLocator = page.locator('[data-testid="activity-card"], .activity-card, .activities-card');
  for (let i = 0; i < 12; i++) {
    const allCards = await cardLocator.allTextContents();
    const index = allCards.findIndex(text => text.toLowerCase().includes(targetName.toLowerCase()));
    if (index !== -1) {
      console.log(`✅ Found "${targetName}" on scroll attempt ${i + 1}`);
      return index;
    }
    console.log(`⚠️ "${targetName}" not visible yet, scrolling (${i + 1}/12)...`);
    await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('*')).filter(el => el.scrollHeight > el.clientHeight);
      const scrollable = els.sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || window;
      scrollable.scrollBy(0, window.innerHeight * 0.8);
    });
    await page.waitForTimeout(1200);
  }
  throw new Error(`❌ Could not find activity card: ${targetName}`);
}

// 🧩 Robust dynamic date selection (scrolls, waits, navigates)
export async function selectDateDynamic(page: Page, year: number, monthIndex: number, day: number) {
  const calendarButton = page.locator('[data-testid="booking-show-calendar-button"], .react-datepicker-trigger');
  await expect(calendarButton).toBeVisible({ timeout: 120000 });
  await calendarButton.click({ force: true });

  await page.waitForSelector('.react-datepicker, [data-testid="booking-calendar"]', { state: 'visible', timeout: 120000 });

  const calendar = page.locator('.react-datepicker, [data-testid="booking-calendar"]').filter({ has: page.locator(':visible') }).first();
  await expect(calendar).toBeVisible({ timeout: 10000 });

  const monthLabel = calendar.locator('.react-datepicker__current-month');
  const nextBtn = calendar.locator('.react-datepicker__navigation--next');

  for (let i = 0; i < 24; i++) {
    const label = (await monthLabel.textContent())?.trim();
    if (!label) { await page.waitForTimeout(200); continue; }

    const [monthName, yearStr] = label.split(' ');
    const current = new Date(`${monthName} 1, ${yearStr}`);
    const target = new Date(year, monthIndex);

    if (current.getFullYear() === target.getFullYear() && current.getMonth() === target.getMonth()) break;

    await nextBtn.click({ force: true });
    await page.waitForTimeout(300);
  }

  const dayBtn = calendar.locator(`.react-datepicker__day:not(.react-datepicker__day--disabled):has-text("${day}")`).first();
  await dayBtn.waitFor({ state: 'visible', timeout: 120000 });
  await dayBtn.click({ force: true });

  console.log(`✅ Date selected: ${new Date(year, monthIndex, day).toDateString()}`);
}

// Select Available Time
export async function selectAvailableTime(page: Page) {
  console.log('⏰ Selecting available time...');

  const timeSlots = page.locator('[data-testid="time-slot"], .time-slot');

  const count = await timeSlots.count();

  if (count === 0) {
    throw new Error('❌ No available time slots found.');
  }

  await timeSlots.first().click({ delay: 200 });

  console.log('✅ Time selected.');
}


// Fill Contact Information
export async function fillContactInformation(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }
) {
  console.log('📝 Filling contact information...');

  await page.fill('input[name="firstName"]', data.firstName);
  await page.fill('input[name="lastName"]', data.lastName);
  await page.fill('input[name="email"]', data.email);
  await page.fill('input[name="phone"]', data.phone);

  console.log('✅ Contact information filled.');
}


// 🧩 Checkout & Payment Flow
export async function completeBooking(page: Page, paymentMethod: string = 'Credit Card') {
  console.log('💳 Proceeding to payment...');

  const paymentOption = page.locator(`button:has-text("${paymentMethod}")`);
  await paymentOption.waitFor({ state: 'visible', timeout: 120000 });
  await paymentOption.scrollIntoViewIfNeeded();
  await paymentOption.click({ force: true });

  const cardNumber = page.locator('input[name="cardnumber"]');
  const expDate = page.locator('input[name="exp-date"]');
  const cvc = page.locator('input[name="cvc"]');
  const payBtn = page.locator('button:has-text("Pay Now")');

  await cardNumber.fill('4242 4242 4242 4242');
  await expDate.fill('12/26');
  await cvc.fill('123');

  await payBtn.scrollIntoViewIfNeeded();
  await expect(payBtn).toBeEnabled();
  await payBtn.click({ force: true });

  const confirmationMessage = page.locator('text=/Booking Confirmed|Thank you for your booking/i');
  await confirmationMessage.waitFor({ timeout: 120000 });

  const bookingRef = await page.locator('#confirmation-number').textContent().catch(() => null);
  console.log('📌 Booking Reference Number:', bookingRef ?? 'N/A');
}


// 🔹 Universal Login Helper
export async function login(page: Page) {
  await page.goto('https://dev.travelinsider.co/');

  await page.getByTestId('email-input')
    .fill(process.env.TEST_EMAIL || 'crysteline@onedigital.dev');

  await page.getByTestId('email-password-input')
    .fill(process.env.TEST_PASSWORD || 'P@ssword!123');

  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/dashboard/i);
}


