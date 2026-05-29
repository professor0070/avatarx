import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  });

  test('should navigate to login page from auth page', async ({ page }) => {
    await page.goto('/sign-in');
    const clerkContainer = page.locator('.cl-signIn-root, .cl-rootBox');
    await expect(clerkContainer).toBeVisible({ timeout: 15000 });
  });

  test('should open sign in modal when clicking navbar button', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign In")');
    const clerkContainer = page.locator('.cl-signIn-root, .cl-rootBox');
    await expect(clerkContainer).toBeVisible({ timeout: 15000 });
  });

  test('should verify Clerk authentication is mounted on signup', async ({ page }) => {
    await page.goto('/sign-up');
    const clerkContainer = page.locator('.cl-signUp-root, .cl-rootBox');
    await expect(clerkContainer).toBeVisible({ timeout: 15000 });
  });
});
