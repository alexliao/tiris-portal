import { test, expect } from '@playwright/test';

test.describe('Performance Page', () => {
  test('should display performance metrics correctly', async ({ page }) => {
    await page.goto('/performance');
    
    // Check main heading
    await expect(page.locator('text=LIVE PERFORMANCE DEMONSTRATION')).toBeVisible();
    
    // Check that metrics cards are displayed
    await expect(page.locator('text=Total ROI')).toBeVisible();
    await expect(page.locator('text=Win Rate')).toBeVisible();
    await expect(page.locator('text=Sharpe Ratio')).toBeVisible();
    await expect(page.locator('text=Max Drawdown')).toBeVisible();
    await expect(page.locator('text=Total Trades')).toBeVisible();
    
    // Check that percentage values are displayed (should have % symbol)
    await expect(page.locator('text=/%/')).toBeVisible();
  });

  test('should display chart section', async ({ page }) => {
    await page.goto('/performance');
    
    // Check chart section exists
    await expect(page.locator('text=NET ASSET VALUE GROWTH')).toBeVisible();
    await expect(page.locator('text=Starting Capital: $10,000')).toBeVisible();
    
    // Check chart legend is present
    await expect(page.locator('text=Portfolio Value')).toBeVisible();
    await expect(page.locator('text=Buy Signals')).toBeVisible();
    await expect(page.locator('text=Sell Signals')).toBeVisible();
  });

  test('should display performance highlights', async ({ page }) => {
    await page.goto('/performance');
    
    // Check highlights section
    await expect(page.locator('text=KEY PERFORMANCE HIGHLIGHTS')).toBeVisible();
    await expect(page.locator('text=Consistent Growth')).toBeVisible();
    await expect(page.locator('text=Risk Management')).toBeVisible();
    await expect(page.locator('text=Adaptive Strategy')).toBeVisible();
  });

  test('should have working chart interactions', async ({ page }) => {
    await page.goto('/performance');
    
    // Wait for chart to load (look for chart container)
    const chartContainer = page.locator('.recharts-responsive-container').first();
    await expect(chartContainer).toBeVisible();
    
    // Check that chart elements are present
    const chartLine = page.locator('.recharts-line-curve').first();
    await expect(chartLine).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/performance');
    
    // Check that content is still accessible on mobile
    await expect(page.locator('text=LIVE PERFORMANCE DEMONSTRATION')).toBeVisible();
    await expect(page.locator('text=Total ROI')).toBeVisible();
    await expect(page.locator('text=NET ASSET VALUE GROWTH')).toBeVisible();
    
    // Metrics should stack vertically on mobile
    const metricsCards = page.locator('[class*="grid-cols-2"]').first();
    await expect(metricsCards).toBeVisible();
  });

  test('should load page within performance budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/performance');
    
    // Wait for main content to be visible
    await expect(page.locator('text=LIVE PERFORMANCE DEMONSTRATION')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Performance should be reasonable (under 5 seconds for full load)
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle chart tooltips', async ({ page }) => {
    await page.goto('/performance');
    
    // Wait for chart to be visible
    const chartContainer = page.locator('.recharts-responsive-container').first();
    await expect(chartContainer).toBeVisible();
    
    // Try to hover over chart area to trigger tooltip
    await chartContainer.hover();
    
    // Note: Tooltip testing might be tricky as it depends on exact mouse position
    // This test mainly ensures the chart container is interactive
  });

  test('should display currency formatting correctly', async ({ page }) => {
    await page.goto('/performance');
    
    // Should have at least the starting capital displayed
    await expect(page.locator('text=/Starting Capital: \\$10,000/')).toBeVisible();
  });
});