// tests/functional/utils/helpers/auth.helper.ts
import { Page } from '@playwright/test';
import fs from 'fs';

export async function authenticate(
  page: Page,
  email: string,
  password: string,
  saveState: boolean = false
) {
  console.log('🔐 Starting authentication flow...');

  // Clear cookies & old storage state
  await page.context().clearCookies();
  if (fs.existsSync('storageState.json')) fs.unlinkSync('storageState.json');

  // Navigate to homepage
  await page.goto('https://dev.travelinsider.co', {
    waitUntil: 'networkidle',
    timeout: 120000
  });

  // Click Sign In button
  const signInButton = page.locator('[data-testid="sign-in-button"]').first();
  if (await signInButton.isVisible({ timeout: 15000 }).catch(() => false)) {
    //await signInButton.click({ force: true });
    // Scroll the button into view and click like a real user
await signInButton.scrollIntoViewIfNeeded();
await signInButton.click({ delay: 50 }); // simulate real user click
    console.log('✅ Clicked Sign In');
  } else {
    console.error('⚠️ Sign In button not visible');
    return;
  }

  // Detect login modal using close button or header
  const modal = page.locator('[data-testid="close-auth-modal"]');
  if (!(await modal.isVisible({ timeout: 5000 }).catch(() => false))) {
    console.error('⚠️ Login modal did NOT appear');
    await page.screenshot({ path: 'login-modal-not-found.png', fullPage: true });
    return;
  }
  console.log('✅ Login modal appeared');

  // Click "Sign in with password" link
  const passwordLink = page.locator('[data-testid="email-navigate-login-button"]');
  if (await passwordLink.isVisible({ timeout: 10000 }).catch(() => false)) {
    await passwordLink.click({ force: true });
    console.log('🔘 Clicked "Sign in with password"');
  } else {
    console.error('⚠️ "Sign in with password" link not found');
    return;
  }

  // Fill email & password safely
  const emailInput = page.locator('[data-testid="email-input"]');
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await emailInput.fill(email);
  } else {
    console.error('⚠️ Email input not visible');
    return;
  }

  const passwordInput = page.locator('[data-testid="email-password-input"]');
  if (await passwordInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    await passwordInput.fill(password);
  } else {
    console.error('⚠️ Password input not visible');
    return;
  }

  // Click submit
  const submitButton = page.locator('[data-testid="email-password-submit-button"]').first();
  if (await submitButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await submitButton.click();
    console.log('✅ Submitted login');
  } else {
    console.error('⚠️ Submit button not visible');
    return;
  }

  // Confirm login using profile picture or text
  const profilePic = page.locator('img[alt^="QA TEL"]'); // adjust as needed
  if (await profilePic.isVisible({ timeout: 15000 }).catch(() => false)) {
  console.log('🎉 Successfully logged in! Profile picture visible.');

  // 🔥 ADD THIS
  await page.waitForLoadState('networkidle');
  console.log('Current URL after login:', page.url());

} else {
  console.error('⚠️ Login may have failed — profile picture not visible.');
  await page.screenshot({ path: 'login-failed.png', fullPage: true });
}

  // Save storage state
  if (saveState) {
    await page.context().storageState({ path: 'storageState.json' });
    console.log('💾 Saved storage state');
  }
}