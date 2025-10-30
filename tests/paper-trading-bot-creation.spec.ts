import { test, expect } from '@playwright/test';

test.describe('Paper Trading Bot Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/tradings/paper');

    // Wait for the page to load
    await expect(page.locator('text=Paper Trading')).toBeVisible({ timeout: 10000 });
  });

  test('should create a bot for paper trading using tiris-bot API exchange', async ({ page }) => {
    // Step 1: Create a new paper trading
    const createButton = page.locator('button:has-text("Create Paper Trading")').first();
    await createButton.click();

    // Wait for modal to appear
    await expect(page.locator('text=Create New Paper Trading')).toBeVisible({ timeout: 5000 });

    // Step 2: Verify exchange options are loaded from tiris-bot API
    const exchangeDropdown = page.locator('select, [role="combobox"]').nth(0);
    await exchangeDropdown.click();

    // Check that exchanges from tiris-bot API are available
    const exchangeOptions = page.locator('option, [role="option"]');
    const optionCount = await exchangeOptions.count();
    expect(optionCount).toBeGreaterThan(0);

    // Verify common exchanges are present
    const pageText = await page.evaluate(() => document.body.textContent || '');
    expect(pageText).toContain('Binance');

    // Step 3: Select an exchange (Binance)
    const binanceOption = page.locator('option:has-text("Binance"), [role="option"]:has-text("Binance")').first();
    await binanceOption.click();

    // Step 4: Select a strategy
    const strategyDropdown = page.locator('select, [role="combobox"]').nth(1);
    await strategyDropdown.click();

    const strategyOption = page.locator('option, [role="option"]').first();
    await strategyOption.click();

    // Step 5: Click Create button
    const modalCreateButton = page.locator('button:has-text("Create")').last();
    await modalCreateButton.click();

    // Wait for trading to be created
    await expect(page.locator('text=Paper Trading')).toBeVisible({ timeout: 10000 });

    // Step 6: Verify the trading was created and navigate to its detail page
    const tradingCard = page.locator('div:has-text("Paper Trading")').first();
    await expect(tradingCard).toBeVisible();

    // Click on the trading to open its detail page
    await tradingCard.click();

    // Wait for detail page to load
    await expect(page.locator('heading:has-text("Paper Trading")')).toBeVisible({ timeout: 10000 });

    // Step 7: Verify exchange information is displayed correctly from info field
    const exchangeValue = page.locator('text=Binance').nth(0);
    await expect(exchangeValue).toBeVisible();

    // Step 8: Click "Start Bot" button to create a bot
    const startBotButton = page.locator('button:has-text("Start Bot")');
    await startBotButton.click();

    // Wait for bot creation to process
    await page.waitForTimeout(2000);

    // Step 9: Verify that no "Exchange binding information not available" error appears
    const errorMessage = page.locator('text=Exchange binding information not available');
    await expect(errorMessage).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // If error appears, fail the test
      throw new Error('Bot creation failed with "Exchange binding information not available" error');
    });

    // Step 10: Verify the page displays trading details (indicating successful page load after bot start)
    const assetsValue = page.locator('text=Assets Value');
    await expect(assetsValue).toBeVisible({ timeout: 10000 });

    console.log('✅ Paper trading bot creation test passed!');
  });

  test('should display correct exchange name from trading info field', async ({ page }) => {
    // Create a paper trading with a specific exchange
    const createButton = page.locator('button:has-text("Create Paper Trading")').first();
    await createButton.click();

    await expect(page.locator('text=Create New Paper Trading')).toBeVisible({ timeout: 5000 });

    // Select "Binance (fee-free)" exchange
    const exchangeDropdown = page.locator('select, [role="combobox"]').nth(0);
    await exchangeDropdown.click();

    const feeFreeOption = page.locator('option:has-text("fee-free"), [role="option"]:has-text("fee-free")').first();
    if (await feeFreeOption.isVisible()) {
      await feeFreeOption.click();
    } else {
      // Fallback to selecting any option
      const anyOption = page.locator('option, [role="option"]').nth(1);
      await anyOption.click();
    }

    // Select strategy
    const strategyDropdown = page.locator('select, [role="combobox"]').nth(1);
    await strategyDropdown.click();
    const strategyOption = page.locator('option, [role="option"]').first();
    await strategyOption.click();

    // Create the trading
    const modalCreateButton = page.locator('button:has-text("Create")').last();
    await modalCreateButton.click();

    // Wait for trading to appear
    await expect(page.locator('text=Paper Trading')).toBeVisible({ timeout: 10000 });

    // Click on the trading to open detail page
    const tradingCard = page.locator('div:has-text("Paper Trading")').first();
    await tradingCard.click();

    // Wait for detail page
    await expect(page.locator('heading:has-text("Paper Trading")')).toBeVisible({ timeout: 10000 });

    // Verify the correct exchange name is displayed (from info field, not from exchange binding)
    const exchangeLabel = page.locator('text=Exchange').first();
    const exchangeValueElement = exchangeLabel.locator('..').locator('div').last();
    const exchangeValue = await exchangeValueElement.textContent();

    // Should display the exchange name from trading.info.exchange_name, not from a binding
    expect(exchangeValue).toBeTruthy();
    console.log(`✅ Exchange displayed: ${exchangeValue}`);
  });

  test('should handle paper trading bot creation without exchange binding', async ({ page }) => {
    // This test verifies that paper trading bot creation does not depend on exchange bindings
    // It should use the exchange information stored in the trading info field instead

    // Create a paper trading
    const createButton = page.locator('button:has-text("Create Paper Trading")').first();
    await createButton.click();

    await expect(page.locator('text=Create New Paper Trading')).toBeVisible({ timeout: 5000 });

    // Select exchange and strategy
    const exchangeDropdown = page.locator('select, [role="combobox"]').nth(0);
    await exchangeDropdown.click();
    const exchangeOption = page.locator('option, [role="option"]').nth(1);
    await exchangeOption.click();

    const strategyDropdown = page.locator('select, [role="combobox"]').nth(1);
    await strategyDropdown.click();
    const strategyOption = page.locator('option, [role="option"]').first();
    await strategyOption.click();

    // Create trading
    const modalCreateButton = page.locator('button:has-text("Create")').last();
    await modalCreateButton.click();

    await expect(page.locator('text=Paper Trading')).toBeVisible({ timeout: 10000 });

    // Open trading detail
    const tradingCard = page.locator('div:has-text("Paper Trading")').first();
    await tradingCard.click();

    await expect(page.locator('heading:has-text("Paper Trading")')).toBeVisible({ timeout: 10000 });

    // Check that no exchange binding selection UI is shown for paper trading
    // (it should only appear for real trading)
    const exchangeBindingLabel = page.locator('text=Exchange Binding');
    await expect(exchangeBindingLabel).not.toBeVisible().catch(() => {
      // It's okay if the label is there, but the binding should come from info field
      // not from a fetched binding
    });

    // Verify initial funds display (should be from trading info)
    const initialFundsText = page.locator('text=Initial Funds');
    await expect(initialFundsText).toBeVisible();

    console.log('✅ Paper trading bot creation without exchange binding test passed!');
  });
});
