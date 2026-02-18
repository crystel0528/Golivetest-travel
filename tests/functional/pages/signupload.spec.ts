import { test, expect, chromium, Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ---------------------- DYNAMIC USER GENERATION ----------------------
const users = Array.from({ length: 5 }).map((_, i) => ({
  email: `loadtest_user_${Date.now()}_${i}@example.com`,
  otp: '123456', // Replace this with a dynamic OTP if your app sends one
}));

// ---------------------- SETUP DIRECTORIES ----------------------
const screenshotsDir = path.resolve('screenshots');
const videosDir = path.resolve('videos');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir);

// ---------------------- SIGN UP FUNCTION ----------------------
async function signup(page: Page, email: string, otp: string) {
  await page.goto('https://dev.travelinsider.co');
  await page.click('text=Sign In');
  await page.click('text=Sign Up');
  await page.click('text=Continue with Email');

  // Fill email
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Send Verification Code")');

  // Enter OTP (replace with your OTP flow selector)
  await page.fill('input[type="text"]', otp);
  await page.click('button:has-text("Verify & Register")');

  // Fill additional profile info (if required)
  // Example:
  // await page.fill('input[name="firstName"]', `TestUser${email.split('_').pop()}`);
  // await page.fill('input[name="lastName"]', 'LoadTest');
  // await page.click('button:has-text("Complete Registration")');

  await page.waitForURL('**/dashboard');
  console.log(`✅ ${email} signed up successfully`);
}

// ---------------------- TEST ----------------------
test.describe('Parallel Sign-Up Load Test', () => {
  test('Multiple users sign up concurrently', async () => {
    test.setTimeout(300_000);

    await Promise.all(
      users.map(async (user) => {
        let browser: Browser | null = null;
        try {
          browser = await chromium.launch();
          const context = await browser.newContext({
            recordVideo: { dir: videosDir, size: { width: 1280, height: 720 } },
          });
          const page = await context.newPage();

          await signup(page, user.email, user.otp);

          const screenshotPath = path.join(screenshotsDir, `${user.email}-signup.png`);
          await page.screenshot({ path: screenshotPath });

        } catch (err) {
          console.error(`❌ Error during signup for ${user.email}:`, err);
        } finally {
          if (browser) await browser.close();
        }
      })
    );
  });
});
