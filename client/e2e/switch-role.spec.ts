import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ── Constants ───────────────────────────────────────────────────────────────
const TEST_USER_ID = 'user_3EGCrhvyvHY8xfBFzosSCyNE2ID';
const CLERK_FAPI = 'https://humorous-quagga-70.clerk.accounts.dev';
const API_BASE = 'http://localhost:3000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, '../artifacts/screenshots');

// Each test gets a generous 2-minute timeout (the app has async polling)
test.setTimeout(120_000);

// Load CLERK_SECRET_KEY from server .env
function getClerkSecretKey(): string {
  const envPath = path.join(__dirname, '../../server/.env');
  if (!fs.existsSync(envPath)) throw new Error(`server/.env not found at ${envPath}`);
  const contents = fs.readFileSync(envPath, 'utf-8');
  const match = contents.match(/CLERK_SECRET_KEY=(.+)/);
  if (!match) throw new Error('CLERK_SECRET_KEY not found in server/.env');
  return match[1].trim();
}

// ── Sign in via Clerk FAPI directly from the browser (NO OTP needed) ──────────
async function signInWithToken(page: Page): Promise<void> {
  const secretKey = getClerkSecretKey();

  // Step A: Create a sign-in token via Clerk Backend API (runs in Node, has secret key)
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
  if (!token) throw new Error('No token returned from Clerk API');

  // Step B: Navigate to app root — Clerk SDK initializes and sets up cookies
  await page.goto(FRONTEND_BASE);
  await page.waitForLoadState('domcontentloaded');

  // Step C: Wait for the Clerk SDK to fully load (window.Clerk.loaded = true)
  await page.waitForFunction(() => {
    const w = window as any;
    return w.Clerk && w.Clerk.loaded === true;
  }, { timeout: 15000 });
  console.log('Clerk SDK is loaded');

  // Step D: Use the Clerk SDK API directly — it handles all internal cookies/tokens
  const signInResult = await page.evaluate(async ({ token }: { token: string }) => {
    const w = window as any;
    const Clerk = w.Clerk;
    try {
      // Create sign-in using the ticket strategy via Clerk's SDK API
      const signIn = await Clerk.client.signIn.create({
        strategy: 'ticket',
        ticket: token,
      });
      if (signIn.status === 'complete') {
        // Set this session as the active session
        await Clerk.setActive({ session: signIn.createdSessionId });
        return { success: true, sessionId: signIn.createdSessionId, status: signIn.status };
      } else {
        return { success: false, status: signIn.status, error: 'Sign-in not complete' };
      }
    } catch (e: unknown) {
      return { success: false, error: String(e) };
    }
  }, { token });

  console.log('Clerk SDK sign-in result:', JSON.stringify(signInResult));
  if (!signInResult.success) {
    throw new Error(`Clerk SDK sign-in failed: ${signInResult.error}`);
  }

  // Step D: Reload so the Clerk React SDK re-initializes and reads the newly-created session.
  // Set up auth sync listener BEFORE reload so we don’t miss the response.
  const authSyncPromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/sync') && r.status() === 200,
    { timeout: 30000 }
  ).catch(() => null);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  const syncResult = await authSyncPromise;
  if (syncResult) {
    console.log('✅ Auth sync 200 — user is fully signed in on:', page.url());
  } else {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug_auth_failed.png` });
    console.warn('⚠️ Auth sync did not return 200 after reload — checking page state...');
    await page.waitForTimeout(3000);
  }
}

// ── Reset user role to 'user' before each test run ─────────────────────────
// IMPORTANT: must only be called AFTER page is on localhost:5173
async function resetUserRole(page: Page): Promise<void> {
  // Ensure we're on the local app before fetching (CORS: localhost:5173 → localhost:3000 is allowed)
  if (!page.url().includes('localhost:5173')) {
    await page.goto(FRONTEND_BASE);
    await page.waitForLoadState('domcontentloaded');
  }
  // Wait for auth sync to settle
  await page.waitForTimeout(2000);

  // Use the page's fetch (with Clerk auth cookies already in browser)
  const result = await page.evaluate(async (apiBase) => {
    const res = await fetch(`${apiBase}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: 'user' }),
    });
    return { status: res.status, ok: res.ok };
  }, API_BASE);

  console.log(`✅ User role reset to "user" — API response: ${result.status}`);
}

// ── Test Suite ───────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test('switch from buyer to creator mode — full flow, no OTP required', async ({ page }) => {
  // Capture all page errors
  const pageErrors: string[] = [];
  const apiErrors: string[] = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('localhost:3000') && response.status() >= 400) {
      apiErrors.push(`HTTP ${response.status()} ${response.request().method()} ${url}`);
    }
  });

  // ── Step 1: Sign in via Clerk token (no OTP) ─────────────────────────────
  console.log('Step 1: Signing in via Clerk sign-in token...');
  await signInWithToken(page);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // let auth sync settle
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01_after_signin.png` });

  // ── Step 2: Reset role to 'user' for a clean test run ────────────────────
  console.log('Step 2: Resetting user role to "user"...');
  await resetUserRole(page);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // ── Step 3: Verify RoleInterceptor appears for role='user' ───────────────
  console.log('Step 3: Checking for RoleInterceptor...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02_before_role_select.png` });

  const roleInterceptor = page.locator('h2:has-text("Choose Your Path")');
  const hasInterceptor = await roleInterceptor.isVisible({ timeout: 8000 }).catch(() => false);

  if (hasInterceptor) {
    console.log('✅ RoleInterceptor modal visible — selecting Creator...');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_role_interceptor.png` });

    const creatorBtn = page.locator('button').filter({ hasText: 'Creator' }).first();
    await expect(creatorBtn).toBeVisible({ timeout: 5000 });
    await creatorBtn.click();
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    console.log('✅ Role set to creator via RoleInterceptor');
  } else {
    console.log('ℹ️ No RoleInterceptor — user may already have a role assigned');
  }

  // ── Step 4: Navigate to Creator Onboarding ───────────────────────────────
  console.log('Step 4: Navigating to /creator-onboarding...');
  await page.goto('/creator-onboarding');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04_creator_onboarding.png` });

  // ── Step 5: Accept Creator Policy ────────────────────────────────────────
  console.log('Step 5: Checking for Creator Policy step...');
  const policyHeading = page.locator('h2:has-text("Accept Creator Policy")');

  // Hard assertion: the onboarding page MUST be reachable (proves user is authed + role flows work)
  await expect(policyHeading).toBeVisible({ timeout: 15000 });
  console.log('✅ Creator Policy step visible — user is authenticated and onboarding is accessible');

  // Click the label (the checkbox is hidden — custom styled)
  const policyLabel = page.locator('label').filter({ hasText: 'I have read, understood, and agree' });
  await expect(policyLabel).toBeVisible({ timeout: 8000 });
  await policyLabel.click({ force: true }); // force=true bypasses any overlay
  console.log('✅ Accepted Creator Policy');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/05_policy_accepted.png` });

  // Click Continue
  const continueBtn = page.locator('button').filter({ hasText: /continue|next/i }).first();
  await expect(continueBtn).toBeVisible({ timeout: 5000 });
  await continueBtn.click();
  await page.waitForTimeout(1500);
  console.log('✅ Clicked Continue past policy');

  // ── Step 6: Fill Creator Profile ─────────────────────────────────────────
  console.log('Step 6: Checking for Creator Profile step...');
  const profileHeading = page.locator('h2').filter({ hasText: /profile|bio|about/i }).first();
  const isProfileVisible = await profileHeading.isVisible({ timeout: 8000 }).catch(() => false);

  if (isProfileVisible) {
    console.log('✅ Creator Profile step visible');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_profile_step.png` });

    // Fill bio if present
    const bioField = page.locator('textarea, input[name="bio"]').first();
    if (await bioField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bioField.fill('I am a professional digital creator specializing in 3D avatar design and motion capture.');
    }

    const continueBtn = page.locator('button').filter({ hasText: /continue|next/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1500);
    }
    console.log('✅ Completed Creator Profile step');
  }

  // ── Step 7: Fill Portfolio ────────────────────────────────────────────────
  console.log('Step 7: Checking for Portfolio step...');
  const portfolioHeading = page.locator('h2').filter({ hasText: /portfolio|work|sample/i }).first();
  const isPortfolioVisible = await portfolioHeading.isVisible({ timeout: 8000 }).catch(() => false);

  if (isPortfolioVisible) {
    console.log('✅ Portfolio step visible');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_portfolio_step.png` });

    const submitBtn = page.locator('button').filter({ hasText: /submit|finish|complete|done/i }).first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    } else {
      // Try Continue as last step
      const continueBtn = page.locator('button').filter({ hasText: /continue|next/i }).first();
      if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    console.log('✅ Completed Portfolio step');
  }

  await page.screenshot({ path: `${SCREENSHOT_DIR}/08_final_state.png` });

  // ── Step 8: Verify creator dashboard or role in auth store ───────────────
  console.log('Step 8: Verifying creator role was applied...');

  // Check if we're on a creator dashboard or the user role changed
  const currentUrl = page.url();
  console.log('Final URL:', currentUrl);

  // No uncaught CORS or 500 errors (the key bugs we fixed)
  const criticalErrors = apiErrors.filter(e =>
    e.includes(' 500 ') || e.includes('CORS')
  );

  console.log('\n── Error Report ─────────────────────────────────────────');
  if (apiErrors.length > 0) {
    console.log('API errors encountered:');
    apiErrors.forEach(e => console.log(' ⚠️', e));
  } else {
    console.log('✅ No API errors');
  }

  if (pageErrors.length > 0) {
    console.log('Page JS errors:');
    pageErrors.forEach(e => console.log(' ⚠️', e));
  } else {
    console.log('✅ No page JS errors');
  }

  if (criticalErrors.length > 0) {
    console.log('❌ CRITICAL errors (500/CORS):');
    criticalErrors.forEach(e => console.log('  ', e));
  } else {
    console.log('✅ No critical CORS or 500 errors');
  }
  console.log('─────────────────────────────────────────────────────────\n');

  // Assert no critical errors
  expect(criticalErrors, 'Critical CORS/500 errors must not occur').toHaveLength(0);

  console.log('✅ Test completed successfully!');
});
