import { test, expect } from '@playwright/test';

test.describe('Gig Details Page', () => {
  test('should render gig details using mock data', async ({ page }) => {
    // Intercept the API call to return a mocked gig
    await page.route('**/api/gigs/test-gig-123', async (route) => {
      const mockGig = {
        id: 'test-gig-123',
        title: 'I will create a custom 3D IMVU Room',
        description: 'Detailed description of the 3D room...',
        category: 'Custom Services',
        isAdultContent: false,
        tags: ['3D', 'Room', 'Custom'],
        sellerDisplayName: 'MasterCreator',
        sellerAvatar: '',
        sellerLevel: 'pro',
        sellerRating: 4.8,
        sellerTotalOrders: 15,
        totalReviews: 12,
        averageRating: 4.8,
        gallery: [
          { url: 'https://via.placeholder.com/800x400', type: 'image', order: 1 }
        ],
        thumbnail: 'https://via.placeholder.com/800x400',
        tiers: [
          {
            name: 'Basic Room',
            price: 500,
            currency: 'INR',
            deliveryTimeDays: 3,
            description: 'A basic 3D room',
            revisions: 1
          }
        ],
        extras: [],
        faqs: [],
        requestToOrder: false,
      };
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ gig: mockGig })
      });
    });

    // Navigate to the gig page
    await page.goto('/gig/test-gig-123');

    // Verify Title
    await expect(page.locator('h1', { hasText: 'I will create a custom 3D IMVU Room' })).toBeVisible();

    // Verify Seller Name
    await expect(page.locator('h3', { hasText: 'MasterCreator' })).toBeVisible();

    // Verify Pricing Tier
    await expect(page.locator('h3', { hasText: 'Basic Room' })).toBeVisible();
    await expect(page.locator('text=₹500').first()).toBeVisible();

    // Verify CTA Button
    const continueBtn = page.getByRole('button', { name: /Continue/i });
    await expect(continueBtn).toBeVisible();
  });
});
