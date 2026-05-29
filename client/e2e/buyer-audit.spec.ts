import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_USER_ID = 'user_3EGCrhvyvHY8xfBFzosSCyNE2ID';
const API_BASE = 'http://localhost:3000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../artifacts/screenshots');

test.setTimeout(60_000);

// Load CLERK_SECRET_KEY from server .env
function getClerkSecretKey(): string {
  const envPath = path.join(__dirname, '../../server/.env');
  if (!fs.existsSync(envPath)) throw new Error(`server/.env not found at ${envPath}`);
  const contents = fs.readFileSync(envPath, 'utf-8');
  const match = contents.match(/CLERK_SECRET_KEY=(.+)/);
  if (!match) throw new Error('CLERK_SECRET_KEY not found in server/.env');
  return match[1].trim();
}

async function signInAsBuyer(page: Page): Promise<void> {
  const secretKey = getClerkSecretKey();

  // Get Clerk sign-in token
  const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: TEST_USER_ID, expires_in_seconds: 300 }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Clerk Backend API failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const { token } = await tokenRes.json();

  // Navigate to frontend
  await page.goto(FRONTEND_BASE);
  await page.waitForLoadState('domcontentloaded');

  // Wait for Clerk SDK
  await page.waitForFunction(() => {
    const w = window as any;
    return w.Clerk && w.Clerk.loaded === true;
  }, { timeout: 15000 });

  // Authenticate
  await page.evaluate(async ({ token }: { token: string }) => {
    const w = window as any;
    const Clerk = w.Clerk;
    const signIn = await Clerk.client.signIn.create({
      strategy: 'ticket',
      ticket: token,
    });
    await Clerk.setActive({ session: signIn.createdSessionId });
  }, { token });

  // Sync session
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
}

async function setRoleToBuyer(page: Page): Promise<void> {
  // Clear client auth cache to force a fresh backend sync
  await page.evaluate(() => {
    window.localStorage.removeItem('avatarx-auth-v1');
  });
  console.log('✅ Cleared client auth cache');

  // Reload the page and wait for the auth sync response to ensure role is updated in store
  const authSyncPromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/sync') && r.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await authSyncPromise;
  await page.waitForTimeout(2000);

  const localStorageUser = await page.evaluate(() => {
    const data = window.localStorage.getItem('avatarx-auth-v1');
    return data ? JSON.parse(data) : null;
  });
  console.log('[AUDIT] User role in localStorage:', localStorageUser?.state?.user?.role);
}

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test('buyer role audit - gig and asset creation visibility and access', async ({ page }) => {
  // 1. Sign in and set role to buyer
  await signInAsBuyer(page);
  await setRoleToBuyer(page);

  // 2. Capture homepage state
  await page.goto(FRONTEND_BASE);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/buyer_home_page.png` });

  // Assert "Create Gig" or "Create First Gig" button is NOT visible on Home page
  const createGigBtn = page.locator('button:has-text("Create First Gig"), button:has-text("Create Gig"), button:has-text("Create Listing")');
  const isButtonVisible = await createGigBtn.isVisible().catch(() => false);
  console.log(`[AUDIT] Is "Create First Gig" button visible to buyer on homepage? ${isButtonVisible ? 'YES ❌' : 'NO  (PASSED)'}`);
  expect(isButtonVisible).toBe(false);

  // Assert there is no "Switch to Creator Mode" button in the desktop/mobile navbar
  const switchModeBtn = page.locator('div:has-text("Switch to Creator Mode"), button:has-text("Switch to Creator Mode")');
  const isSwitchVisible = await switchModeBtn.isVisible().catch(() => false);
  console.log(`[AUDIT] Is "Switch to Creator Mode" button visible to buyer? ${isSwitchVisible ? 'YES ❌' : 'NO  (PASSED)'}`);
  expect(isSwitchVisible).toBe(false);

  // 3. Try direct navigation to protected routes
  console.log('[AUDIT] Attempting direct navigation to /create-gig...');
  await page.goto(`${FRONTEND_BASE}/create-gig`);
  await page.waitForTimeout(3000);
  console.log(`[AUDIT] After /create-gig direct access, final URL is: ${page.url()}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/buyer_after_create_gig_access.png` });
  
  // Direct access to /create-gig should redirect buyer (e.g. to /dashboard/user or /)
  expect(page.url()).not.toContain('/create-gig');

  console.log('[AUDIT] Attempting direct navigation to /asset-upload...');
  await page.goto(`${FRONTEND_BASE}/asset-upload`);
  await page.waitForTimeout(3000);
  console.log(`[AUDIT] After /asset-upload direct access, final URL is: ${page.url()}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/buyer_after_asset_upload_access.png` });
  
  // Direct access to /asset-upload should redirect buyer or show access denied
  expect(page.url()).not.toContain('/asset-upload');

  console.log('[AUDIT] Attempting direct navigation to /edit-gig/randomId123...');
  await page.goto(`${FRONTEND_BASE}/edit-gig/randomId123`);
  await page.waitForTimeout(3000);
  console.log(`[AUDIT] After /edit-gig direct access, final URL is: ${page.url()}`);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/buyer_after_edit_gig_access.png` });
  
  // Direct access to /edit-gig should redirect buyer
  expect(page.url()).not.toContain('/edit-gig');

  console.log('[AUDIT] Audit test completed successfully.');
});
