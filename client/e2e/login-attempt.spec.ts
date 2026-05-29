import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('attempt login with OTP and capture screenshots', async ({ page }) => {
  test.setTimeout(180000);
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to sign-in page...');
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  console.log('Entering email...');
  const emailInput = page.locator('input[name="identifier"], input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.fill('ashokpandit408@yahoo.com');

  console.log('Clicking continue...');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  
  console.log('Waiting for password step...');
  await page.waitForURL('**/factor-one**', { timeout: 15000 });
  const passwordInput = page.locator('input[name="password"], input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);
  await passwordInput.fill('Testpwd@2026');

  console.log('Clicking continue on password...');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  console.log('Waiting for verification code step...');
  const otpInput = page.locator('input').nth(1);
  await expect(otpInput).toBeAttached({ timeout: 25000 });
  await page.screenshot({ path: 'C:/Users/pandi/.gemini/antigravity/brain/ba8ed59d-d002-4669-a0ef-acec1d44d384/login_step_otp_page.png' });

  // Dynamically wait for user to write OTP to client/e2e/otp.txt
  const otpFilePath = path.join(__dirname, 'otp.txt');
  fs.writeFileSync(otpFilePath, '');
  console.log('--------------------------------------------------');
  console.log(`[ACTION] Please check your email for the new OTP.`);
  console.log(`Write the 6-digit OTP into: ${otpFilePath}`);
  console.log('--------------------------------------------------');

  let otpCode = '';
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(1000);
    const content = fs.readFileSync(otpFilePath, 'utf-8').trim();
    if (content.length === 6 && /^\d+$/.test(content)) {
      otpCode = content;
      console.log('Successfully read OTP from file:', otpCode);
      break;
    }
  }

  if (!otpCode) {
    throw new Error('Timed out waiting for OTP in otp.txt');
  }

  console.log('Focusing second input on the page and typing OTP...');
  await otpInput.focus();
  await page.keyboard.type(otpCode, { delay: 150 });

  console.log('Waiting 10 seconds for redirect and session syncing...');
  await page.waitForTimeout(10000);

  console.log('Capturing post-OTP landing screen...');
  await page.screenshot({ path: 'C:/Users/pandi/.gemini/antigravity/brain/ba8ed59d-d002-4669-a0ef-acec1d44d384/login_step_otp_final.png', fullPage: true });

  console.log('Completed E2E auth flow successfully!');
});
