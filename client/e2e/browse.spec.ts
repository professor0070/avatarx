import { test, expect } from '@playwright/test';

test.describe('Browse Marketplace', () => {
  test('should load browse page and toggle filters', async ({ page }) => {
    await page.goto('/browse');
    
    // Check page title & main heading
    await expect(page).toHaveTitle(/Browse Gigs \| AvatarX/);
    await expect(page.locator('h1', { hasText: 'Browse Gigs' })).toBeVisible();
    
    // Toggle Filters Sidebar
    const filtersButton = page.getByRole('button', { name: 'Filters' });
    await expect(filtersButton).toBeVisible();
    await filtersButton.click();
    
    // Verify Filter sidebar appeared
    await expect(page.getByRole('button', { name: 'Hide Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear All' })).toBeVisible();
    
    // Verify specific filter sections are present
    await expect(page.locator('label', { hasText: 'Gig Type' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Price Range (₹)' })).toBeVisible();
    
    // If no data is present, it should show the empty state fallback after loading
    // The loading state has a 'Loading...' text, then it either shows gigs or "No gigs found"
    // Wait for the empty state or gig grid (we'll look for the clear filters button of empty state)
    await expect(page.getByRole('button', { name: 'Clear filters' }).or(page.locator('.grid-cols-1.md\\:grid-cols-2'))).toBeVisible({ timeout: 10000 });
  });

  test('should update URL params when sorting', async ({ page }) => {
    await page.goto('/browse');
    
    // Find the sort dropdown. It's next to "Sort by:"
    const sortSelect = page.locator('select').filter({ has: page.locator('option[value="createdAt-desc"]') });
    await sortSelect.selectOption('price-asc');
    
    // Verify the URL was updated to include the sort parameter
    await expect(page).toHaveURL(/.*sort=price.*/);
  });
});
