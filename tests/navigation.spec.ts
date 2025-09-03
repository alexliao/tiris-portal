import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the hero section is visible
    await expect(page.locator('h1')).toContainText('TIRIS');
    await expect(page.locator('text=Profitable Crypto Trading Bot')).toBeVisible();
  });

  test('should navigate to performance page', async ({ page }) => {
    await page.goto('/');
    
    // Click performance link in navigation
    await page.click('text=Performance');
    
    // Should be on performance page
    await expect(page).toHaveURL('/performance');
    
    // Check performance page content
    await expect(page.locator('text=LIVE PERFORMANCE DEMONSTRATION')).toBeVisible();
    await expect(page.locator('text=NET ASSET VALUE GROWTH')).toBeVisible();
  });

  test('should navigate back to landing page from performance', async ({ page }) => {
    await page.goto('/performance');
    
    // Click logo to go home
    await page.click('text=TIRIS');
    
    // Should be back on landing page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Profitable Crypto Trading Bot')).toBeVisible();
  });

  test('should scroll to sections on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Click highlights navigation
    await page.click('text=Highlights');
    
    // Should scroll to highlights section
    await expect(page.locator('#highlights')).toBeInViewport();
  });

  test('should switch languages', async ({ page }) => {
    await page.goto('/');
    
    // Find and click language selector (look for flag emoji)
    const languageSelector = page.locator('text=🇺🇸').first();
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      
      // Check if Chinese option appears and click it
      const chineseOption = page.locator('text=中文');
      if (await chineseOption.isVisible()) {
        await chineseOption.click();
        
        // Check if content changed to Chinese
        await expect(page.locator('text=盈利的加密货币交易机器人')).toBeVisible();
      }
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content is still visible on mobile
    await expect(page.locator('h1')).toContainText('TIRIS');
    await expect(page.locator('text=Profitable Crypto Trading Bot')).toBeVisible();
    
    // Navigate to performance page on mobile
    await page.click('text=Performance');
    await expect(page).toHaveURL('/performance');
    await expect(page.locator('text=LIVE PERFORMANCE DEMONSTRATION')).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check that content is still visible on tablet
    await expect(page.locator('h1')).toContainText('TIRIS');
    await expect(page.locator('text=Profitable Crypto Trading Bot')).toBeVisible();
  });
});