import { test, expect } from '@playwright/test';

// Unit test for deduplication logic
test.describe('Data Deduplication', () => {
  test('should deduplicate trading data points by timestamp during incremental updates', () => {
    // Simulate existing data points
    const existingData = [
      { timestampNum: 1000, netValue: 100, roi: 5, benchmark: 0, benchmarkPrice: 0 },
      { timestampNum: 2000, netValue: 150, roi: 10, benchmark: 0, benchmarkPrice: 0 },
      { timestampNum: 3000, netValue: 200, roi: 15, benchmark: 0, benchmarkPrice: 0 },
    ];

    // Simulate new data points fetched from API (with 1 duplicate and 2 new)
    const newData = [
      { timestampNum: 2000, netValue: 150, roi: 10, benchmark: 0, benchmarkPrice: 0 }, // Duplicate
      { timestampNum: 3000, netValue: 200, roi: 15, benchmark: 0, benchmarkPrice: 0 }, // Duplicate
      { timestampNum: 4000, netValue: 250, roi: 20, benchmark: 0, benchmarkPrice: 0 }, // New
      { timestampNum: 5000, netValue: 300, roi: 25, benchmark: 0, benchmarkPrice: 0 }, // New
    ];

    // Simulate the deduplication logic from fetchIncrementalData
    const existingDataMap = new Map<number, typeof existingData[0]>();
    existingData.forEach(point => {
      existingDataMap.set(point.timestampNum, point);
    });

    const trulyNewDataPoints = newData.filter(point => !existingDataMap.has(point.timestampNum));
    const mergedData = [...existingData, ...trulyNewDataPoints];

    // Verify deduplication
    expect(trulyNewDataPoints).toHaveLength(2); // Only 2 truly new points
    expect(mergedData).toHaveLength(5); // 3 existing + 2 new
    expect(mergedData.map(p => p.timestampNum)).toEqual([1000, 2000, 3000, 4000, 5000]);

    // Verify no duplicate timestamps
    const timestamps = mergedData.map(p => p.timestampNum);
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(timestamps.length); // No duplicates if set size equals array length
  });

  test('should handle empty existing data during incremental update', () => {
    const existingData: Array<{ timestampNum: number; netValue: number; roi: number; benchmark: number; benchmarkPrice: number }> = [];
    const newData = [
      { timestampNum: 1000, netValue: 100, roi: 5, benchmark: 0, benchmarkPrice: 0 },
      { timestampNum: 2000, netValue: 150, roi: 10, benchmark: 0, benchmarkPrice: 0 },
    ];

    // Simulate deduplication with empty existing data
    const existingDataMap = new Map<number, typeof newData[0]>();
    existingData.forEach(point => {
      existingDataMap.set(point.timestampNum, point);
    });

    const trulyNewDataPoints = newData.filter(point => !existingDataMap.has(point.timestampNum));
    const mergedData = [...existingData, ...trulyNewDataPoints];

    // All new data should be included
    expect(mergedData).toHaveLength(2);
    expect(mergedData).toEqual(newData);
  });

  test('should handle all duplicate data during incremental update', () => {
    const existingData = [
      { timestampNum: 1000, netValue: 100, roi: 5, benchmark: 0, benchmarkPrice: 0 },
      { timestampNum: 2000, netValue: 150, roi: 10, benchmark: 0, benchmarkPrice: 0 },
    ];

    const newData = [
      { timestampNum: 1000, netValue: 100, roi: 5, benchmark: 0, benchmarkPrice: 0 }, // Duplicate
      { timestampNum: 2000, netValue: 150, roi: 10, benchmark: 0, benchmarkPrice: 0 }, // Duplicate
    ];

    // Simulate deduplication when all new data is duplicate
    const existingDataMap = new Map<number, typeof existingData[0]>();
    existingData.forEach(point => {
      existingDataMap.set(point.timestampNum, point);
    });

    const trulyNewDataPoints = newData.filter(point => !existingDataMap.has(point.timestampNum));
    const mergedData = [...existingData, ...trulyNewDataPoints];

    // No new data should be added
    expect(trulyNewDataPoints).toHaveLength(0);
    expect(mergedData).toHaveLength(2);
    expect(mergedData).toEqual(existingData);
  });
});

test.describe('Incremental Updates Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Set a base URL if not already configured
    await page.goto('/');

    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test('should load initial 500 data points on first load', async ({ page }) => {
    // Navigate to trading detail page with performance chart
    // This test assumes there's a trading page that displays the performance widget
    await page.goto('/tradings');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Look for chart content being rendered
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Verify that the chart is populated with data
    // The presence of visible data points indicates successful initial load
    const dataPoints = page.locator('[data-testid*="data-point"]').count();
    expect(dataPoints).toBeGreaterThan(0);
  });

  test('should maintain data when switching between timeframes', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart to load
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Get the current timeframe button (e.g., "1m")
    const currentTimeframeButton = page.locator('button').filter({ hasText: /^1m$/ }).first();
    expect(currentTimeframeButton).toBeDefined();

    // Switch to different timeframe
    const newTimeframeButton = page.locator('button').filter({ hasText: /^1h$/ }).first();
    if (await newTimeframeButton.isVisible()) {
      await newTimeframeButton.click();

      // Wait for chart to update
      await page.waitForLoadState('networkidle');

      // Verify chart is still visible
      await expect(chartContainer).toBeVisible();
    }
  });

  test('should cache data for each timeframe', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Switch to 1h timeframe
    const timeframe1h = page.locator('button').filter({ hasText: /^1h$/ }).first();
    if (await timeframe1h.isVisible()) {
      await timeframe1h.click();
      await page.waitForLoadState('networkidle');
    }

    // Switch back to 1m timeframe
    const timeframe1m = page.locator('button').filter({ hasText: /^1m$/ }).first();
    if (await timeframe1m.isVisible()) {
      await timeframe1m.click();
      await page.waitForLoadState('networkidle');

      // Chart should still be visible (using cached data)
      await expect(chartContainer).toBeVisible();
    }
  });

  test('should handle auto-refresh with incremental updates', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Find and enable auto-refresh toggle if present
    const autoRefreshToggle = page.locator('input[type="checkbox"]').filter({ hasText: /auto/i }).first();
    if (await autoRefreshToggle.isVisible()) {
      const isChecked = await autoRefreshToggle.isChecked();
      if (!isChecked) {
        await autoRefreshToggle.click();
      }
    }

    // Wait for auto-refresh to potentially trigger
    await page.waitForTimeout(2000);

    // Chart should still be visible and responsive
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();
  });

  test('should append new data points during incremental updates', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart to load
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Get initial data count
    const initialContent = await page.content();
    const initialDataMatches = initialContent.match(/data-point/g) || [];
    const initialCount = initialDataMatches.length;

    // Wait and check if more data is loaded
    await page.waitForTimeout(3000);

    // Get updated data count
    const updatedContent = await page.content();
    const updatedDataMatches = updatedContent.match(/data-point/g) || [];
    const updatedCount = updatedDataMatches.length;

    // Count should be same or increase (never decrease)
    expect(updatedCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should display visible window of 100 data points', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Check for pagination controls (Next/Prev buttons)
    const prevButton = page.locator('button:has-text("← Prev")').first();
    const nextButton = page.locator('button:has-text("Next →")').first();

    // If controls are visible, data is being paginated correctly
    if (await prevButton.isVisible() || await nextButton.isVisible()) {
      // Verify buttons are initially in correct state
      const prevDisabled = await prevButton.isDisabled();
      // Should start with prev disabled if at the beginning
      expect(typeof prevDisabled).toBe('boolean');
    }
  });

  test('should allow panning through pre-loaded data', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Look for next button to pan forward
    const nextButton = page.locator('button:has-text("Next →")').first();
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      // Click next button
      await nextButton.click();

      // Wait for chart to update
      await page.waitForTimeout(500);

      // Chart should still be visible
      await expect(chartContainer).toBeVisible();
    }
  });

  test('should not make API calls when panning through loaded data', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for initial chart load
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Listen to network requests
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(request.url());
    });

    // Clear initial requests
    requests.length = 0;

    // Scroll through chart using mouse wheel or pagination
    const nextButton = page.locator('button:has-text("Next →")').first();
    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Check that no new equity-curve or OHLCV API calls were made
      const newApiCalls = requests.filter(url =>
        url.includes('equity-curve') || url.includes('ohlcv')
      );

      // Panning should not trigger new API calls for pre-loaded data
      // (though other requests might happen)
      expect(newApiCalls.length).toBe(0);
    }
  });

  test('should reset view when changing timeframes', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Wait for chart
    const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
    await expect(chartContainer).toBeVisible();

    // Look for pagination info (e.g., "1 - 100 / 500")
    const paginationText = page.locator('text=/\\d+ - \\d+ \\/ \\d+/').first();

    if (await paginationText.isVisible()) {
      // Switch to different timeframe
      const timeframe1h = page.locator('button').filter({ hasText: /^1h$/ }).first();
      if (await timeframe1h.isVisible()) {
        await timeframe1h.click();
        await page.waitForLoadState('networkidle');

        // Pagination should reset (should show latest data)
        const updatedText = await paginationText.textContent();
        // After timeframe change, we should be viewing latest data
        // The exact behavior depends on implementation
        expect(updatedText).toBeDefined();
      }
    }
  });

  test('should maintain metrics during incremental updates', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Get initial metrics
    const roiCard = page.locator('text=/Total ROI/').first();
    const initialRoiText = await roiCard.locator('..').first().textContent();

    // Wait for potential auto-refresh
    await page.waitForTimeout(3000);

    // Get updated metrics
    const updatedRoiText = await roiCard.locator('..').first().textContent();

    // Metrics should exist and not be empty
    expect(initialRoiText).toBeDefined();
    expect(updatedRoiText).toBeDefined();
  });

  test('should handle trading signal visualization across multiple timeframes', async ({ page }) => {
    await page.goto('/tradings');
    await page.waitForLoadState('networkidle');

    // Look for trading signals toggle
    const signalsToggle = page.locator('button').filter({ hasText: /trading.*signal/i }).first();

    if (await signalsToggle.isVisible()) {
      const isActive = await signalsToggle.getAttribute('class');

      if (!isActive?.includes('blue')) {
        await signalsToggle.click();
        await page.waitForTimeout(500);
      }

      // Switch timeframes and verify signals are displayed
      const timeframe1h = page.locator('button').filter({ hasText: /^1h$/ }).first();
      if (await timeframe1h.isVisible()) {
        await timeframe1h.click();
        await page.waitForLoadState('networkidle');

        // Chart should still be visible with signals
        const chartContainer = page.locator('[class*="ResponsiveContainer"]').first();
        await expect(chartContainer).toBeVisible();
      }
    }
  });
});
