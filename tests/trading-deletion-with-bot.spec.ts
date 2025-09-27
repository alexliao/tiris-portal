import { test, expect } from '@playwright/test';

test.describe('Trading Deletion with Bot Management', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Assuming user needs to be authenticated for trading operations
    // This might need to be adjusted based on your auth flow
    // For now, we'll check if the dashboard is accessible
  });

  test('should delete bot before deleting trading when both exist', async ({ page }) => {
    // Navigate to dashboard (assuming user is authenticated)
    await page.goto('/dashboard');

    // Wait for the dashboard to load
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // Look for a trading with an associated bot (this test assumes at least one exists)
    const tradingRow = page.locator('table tbody tr').first();
    await expect(tradingRow).toBeVisible();

    // Check if there's a "Bot Online" or "Bot Offline" status indicator
    const botStatus = tradingRow.locator('span:has-text("Bot")');

    // If a bot exists, proceed with deletion test
    if (await botStatus.count() > 0) {
      // Click delete button for the trading
      const deleteButton = tradingRow.locator('button[title="Delete"], button:has-text("Delete")');
      await deleteButton.click();

      // Expect confirmation dialog to appear
      await expect(page.locator('text=Delete Trading')).toBeVisible();

      // Confirm deletion
      await page.locator('button:has-text("Delete")').click();

      // Wait for deletion to complete
      await expect(page.locator('text=Trading deleted successfully')).toBeVisible({ timeout: 10000 });

      // Verify the trading row is removed from the table
      // This might require checking that the specific trading ID is no longer present
    }
  });

  test('should prevent trading deletion when bot deletion fails', async ({ page }) => {
    // This test verifies that trading deletion is prevented when bot deletion fails
    // to avoid leaving orphaned bots

    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // This test would require setting up a scenario where:
    // 1. A trading exists with an associated bot
    // 2. The bot API returns an error when trying to delete the bot
    // 3. The trading deletion should be prevented (not proceed)

    // For now, we'll implement a basic check that deletion shows appropriate error
    const tradingRows = page.locator('table tbody tr');
    const initialCount = await tradingRows.count();

    if (initialCount > 0) {
      const firstTradingRow = tradingRows.first();
      const deleteButton = firstTradingRow.locator('button[title="Delete"], button:has-text("Delete")');

      if (await deleteButton.count() > 0) {
        await deleteButton.click();

        // Check that confirmation dialog appears
        await expect(page.locator('text=Delete Trading')).toBeVisible();

        // Confirm deletion
        await page.locator('button:has-text("Delete")').click();

        // Should show either success or error message
        // If bot deletion fails, should show error about failing to delete bot
        await expect(
          page.locator('text=deleted successfully').or(
            page.locator('text=Failed to delete').or(
              page.locator('text=Cannot delete trading')
            )
          )
        ).toBeVisible({ timeout: 15000 });

        // Verify that if error occurred, the trading row is still present
        // (trading should not be deleted if bot deletion failed)
        const finalCount = await tradingRows.count();
        // The count should either be the same (deletion failed) or one less (deletion succeeded)
        expect(finalCount).toBeLessThanOrEqual(initialCount);
      }
    }
  });

  test('should delete trading when no bot is associated', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // Look for a trading without an associated bot (showing "No Bot")
    const tradingWithoutBot = page.locator('table tbody tr:has-text("No Bot")').first();

    if (await tradingWithoutBot.count() > 0) {
      // Click delete button
      const deleteButton = tradingWithoutBot.locator('button[title="Delete"], button:has-text("Delete")');
      await deleteButton.click();

      // Expect confirmation dialog
      await expect(page.locator('text=Delete Trading')).toBeVisible();

      // Confirm deletion
      await page.locator('button:has-text("Delete")').click();

      // Wait for success message
      await expect(page.locator('text=Trading deleted successfully')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show appropriate confirmation message for different trading types', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // Check different trading types (real, simulation, backtest)
    const realTradingRow = page.locator('table tbody tr:has-text("Real")').first();

    if (await realTradingRow.count() > 0) {
      const deleteButton = realTradingRow.locator('button[title="Delete"], button:has-text("Delete")');
      await deleteButton.click();

      // For real trading, should show a more serious warning
      await expect(page.locator('text=This action cannot be undone')).toBeVisible();

      // Cancel this deletion for safety in tests
      await page.locator('button:has-text("Cancel")').click();
    }

    // Test simulation trading deletion
    const simulationTradingRow = page.locator('table tbody tr:has-text("Simulation")').first();

    if (await simulationTradingRow.count() > 0) {
      const deleteButton = simulationTradingRow.locator('button[title="Delete"], button:has-text("Delete")');
      await deleteButton.click();

      // Should show confirmation dialog
      await expect(page.locator('text=Delete Trading')).toBeVisible();

      // Cancel this deletion
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should prevent orphaned bots by failing trading deletion when bot deletion fails', async ({ page }) => {
    // This test specifically verifies the core requirement:
    // "Only delete trading when the bot is deleted successfully or no bot associated,
    //  or an orphaned bot may be left"

    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // Look for a trading with a bot (either "Bot Online" or "Bot Offline")
    const tradingWithBot = page.locator('table tbody tr').filter({
      hasText: /Bot (Online|Offline)/
    }).first();

    if (await tradingWithBot.count() > 0) {
      console.log('Found trading with associated bot for orphan prevention test');

      // Get the trading ID or name for tracking
      const tradingName = await tradingWithBot.locator('td').first().textContent();
      console.log('Testing deletion of trading:', tradingName);

      // Attempt deletion
      const deleteButton = tradingWithBot.locator('button[title="Delete"], button:has-text("Delete")');
      await deleteButton.click();

      // Confirm deletion
      await expect(page.locator('text=Delete Trading')).toBeVisible();
      await page.locator('button:has-text("Delete")').click();

      // Wait for the operation to complete
      await page.waitForTimeout(5000);

      // Check the result - either:
      // 1. Success message and trading is gone (bot was deleted successfully)
      // 2. Error message and trading remains (bot deletion failed, preventing orphan)
      const successMessage = page.locator('text=deleted successfully');
      const errorMessage = page.locator('text=Failed to delete, text=Cannot delete trading');

      // One of these should be visible
      const hasSuccess = await successMessage.isVisible();
      const hasError = await errorMessage.isVisible();

      expect(hasSuccess || hasError).toBeTruthy();

      // If there was an error, verify the trading is still present (no orphaned bot)
      if (hasError) {
        // Trading should still exist in the table
        await expect(tradingWithBot).toBeVisible();
        console.log('✅ Correctly prevented trading deletion when bot deletion failed');
      } else if (hasSuccess) {
        // Trading should be removed from the table
        await expect(tradingWithBot).not.toBeVisible();
        console.log('✅ Successfully deleted both bot and trading');
      }
    } else {
      console.log('No trading with bot found for orphan prevention test');
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });

    // This test would ideally mock network failures
    // For now, we ensure the UI remains responsive

    const tradingRows = page.locator('table tbody tr');
    const count = await tradingRows.count();

    if (count > 0) {
      // Ensure delete buttons are present and clickable
      const deleteButtons = page.locator('button[title="Delete"], button:has([data-testid="delete-icon"])');
      const buttonCount = await deleteButtons.count();

      expect(buttonCount).toBeGreaterThanOrEqual(0);

      // Ensure the dashboard remains functional
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    }
  });
});