import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the homepage and display the main hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/AvatarX/);
    
    // Check for a known element, like a hero heading or navigation
    // Let's check that the Navbar is visible (assuming it has some recognizable text or role)
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();

    // Verify main content loaded (e.g. some text from hero section)
    await expect(page.locator('text=Popular Services')).toBeVisible({ timeout: 25000 });
  });
});

