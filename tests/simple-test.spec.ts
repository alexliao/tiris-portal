import { test, expect } from '@playwright/test';

test('basic functionality test', async ({ page }) => {
  // Navigate using baseURL (will resolve to http://localhost:5173/)
  await page.goto('/');
  
  // Check that the page loads with correct title
  await expect(page).toHaveTitle('tiris - Profitable Crypto Trading Bot');
  
  // Check that TIRIS header is visible
  await expect(page.locator('h1:has-text("TIRIS")')).toBeVisible({ timeout: 10000 });
  
  // Check that subtitle is present
  await expect(page.locator('text=Profitable Crypto Trading Bot')).toBeVisible();
  
  console.log('✅ Basic navigation test passed!');
});