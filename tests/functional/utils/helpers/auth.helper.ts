// helpers/auth.helper.ts
import { Page } from '@playwright/test';
import fs from 'fs';

export async function authenticate(page: Page, email: string, password: string, saveState = false) {
  console.log('🔐 Starting authentication flow...');

  // Clear cookies & storage safely
  await page.context().clearCookies();
  if (fs.existsSync('storageState.json')) fs.unlinkSync('storageState.json');
  console.log('🗑️ Cleared cookies and storageState.json');

  // Go to homepage
  await page.goto('https://dev.travelinsider.co', { waitUntil: 'domcontentloaded', timeout: 120000 });

  // Click Sign In button
  const signInButton = page.locator('[data-testid="sign-in-button"]').first();
  await signInButton.waitFor({ state: 'visible', timeout: 20000 });
  await signInButton.click();
  console.log('✅ Clicked Sign In');

  // Click "Sign in with password" link if present
  const passwordLink = page.locator('[data-testid="email-navigate-login-button"], text="Sign in with password"');
  try {
    await passwordLink.waitFor({ state: 'visible', timeout: 15000 });
    await passwordLink.click({ force: true });
    console.log('🔘 Clicked "Sign in with password"');
  } catch {
    console.log('ℹ️ "Sign in with password" link not found, continuing...');
  }

  // Fill Email
  const emailInput = page.locator('[data-testid="email-input"], input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 20000 });
  await emailInput.fill(email);
  console.log(`📧 Filled email: ${email}`);

  // Fill Password safely
  const passwordInput = page.locator('[data-testid="email-password-input"], input[type="password"]');
  try {
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
    await passwordInput.fill(password);
    console.log('🔑 Password filled');
  } catch {
    console.warn('⚠️ Password input not found, skipping fill');
  }

  // Click Submit
  const submitButton = page.locator('[data-testid="email-password-submit-button"]').first();
  await submitButton.waitFor({ state: 'visible', timeout: 20000 });
  await submitButton.click();
  console.log('✅ Clicked submit');

  // Confirm login
  const profileIndicator = page.locator('text=/My Account|Account Overview|Profile/i');
  await profileIndicator.waitFor({ state: 'visible', timeout: 20000 });
  console.log('🎉 Successfully logged in!');

  // Save storage state if requested
  if (saveState) {
    await page.context().storageState({ path: 'storageState.json' });
    console.log('💾 Saved storage state');
  }
}
