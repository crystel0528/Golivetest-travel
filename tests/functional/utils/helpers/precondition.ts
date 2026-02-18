// tests/helpers/precondition.ts
import { Page, expect, Locator } from '@playwright/test';

export async function precondition(page: Page): Promise<void> {
  console.log('🔧 Running Precondition Setup...');

  // Step 1: Navigate to homepage
  await page.goto('https://dev.travelinsider.co', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  console.log('✅ Homepage loaded.');

  // Step 2: Handle cookie consent if visible
  try {
    const cookieButton: Locator = page.locator(
      '[data-testid="cookie-accept"], text=/Accept All|Got it|OK|Agree/i, button:has-text("Accept All")'
    );
    if (await cookieButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieButton.first().click({ delay: 100 });
      console.log('✅ Cookie banner accepted.');
      await page.waitForTimeout(1000);
    } else {
      console.log('ℹ️ No cookie banner detected.');
    }
  } catch {
    console.log('⚠️ Cookie banner not found or already dismissed.');
  }

  // Step 3: Try to open sign-in modal
  const signInTriggers: Locator[] = [
    page.locator('[data-testid="sign-in-button"]'),
    page.locator('text=/Sign[ -]?In/i'),
    page.locator('button:has-text("Sign In")'),
  ];

  let foundSignInButton: Locator | null = null;
  for (const btn of signInTriggers) {
    if ((await btn.count()) > 0 && (await btn.first().isVisible())) {
      foundSignInButton = btn.first();
      break;
    }
  }

  if (!foundSignInButton) {
    console.log('⚠️ No visible sign-in button found (maybe already logged in).');
  } else {
    await foundSignInButton.click();
    console.log('✅ Opened sign-in modal.');
  }

  // Step 4: Sign in
  const signinPassword: Locator = page.locator('[data-testid="email-navigate-login-button"]');
  if (await signinPassword.isVisible({ timeout: 5000 }).catch(() => false)) {
    await signinPassword.click();
  }

  const emailInput: Locator = page.locator('[data-testid="email-input"]');
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill('karl.salinas@onedigital.dev');

  const passwordInput: Locator = page.locator('[data-testid="email-password-input"]');
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill('P@ssword125');

  const signinButton: Locator = page.locator('[data-testid="email-password-submit-button"]');
  await expect(signinButton).toBeVisible({ timeout: 10000 });
  await signinButton.click();

  console.log('✅ Sign-in flow executed.');

  // Step 5: Click the Experiences navigation
  const candidates: Locator[] = [
    page.getByRole('button', { name: /experiences/i }),
    page.getByRole('link', { name: /experiences/i }),
    page.locator('a:has-text("Experiences")'),
    page.locator('text=/Experiences/i'),
  ];

  let experiencesNav: Locator | null = null;
  for (const locator of candidates) {
    if ((await locator.count()) > 0) {
      experiencesNav = locator.first();
      break;
    }
  }

  if (!experiencesNav) {
    console.error('❌ Experiences navigation button not found!');
    await page.screenshot({ path: 'test-results/no-experiences-button.png', fullPage: true });
    throw new Error('Experiences navigation not found.');
  }

  await expect(experiencesNav).toBeVisible({ timeout: 10000 });
  await experiencesNav.click({ delay: 100 });
  console.log('✅ Clicked the Experiences navigation button.');

  await page.screenshot({ path: 'test-results/experiences-clicked.png', fullPage: true });
  console.log('🧾 Screenshot saved.');
}
