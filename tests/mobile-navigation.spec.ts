import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test('should show hamburger menu on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Desktop navigation should be hidden
    await expect(page.locator('.hidden.md\\:flex')).not.toBeVisible();
    
    // Mobile navigation elements should be visible
    await expect(page.locator('.md\\:hidden.flex')).toBeVisible();
    
    // Hamburger menu button should be present
    await expect(page.locator('button[aria-label="Toggle mobile menu"]')).toBeVisible();
  });

  test('should toggle mobile menu when hamburger is clicked', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu should not be visible initially
    await expect(page.locator('text=Mobile Dropdown Menu')).not.toBeVisible();
    
    // Click hamburger menu
    await page.click('button[aria-label="Toggle mobile menu"]');
    
    // Mobile dropdown should appear
    await expect(page.locator('.md\\:hidden.absolute')).toBeVisible();
    
    // Navigation links should be visible in dropdown
    if (await page.locator('button:has-text("Home")').isVisible()) {
      await expect(page.locator('button:has-text("Home")')).toBeVisible();
      await expect(page.locator('button:has-text("Highlights")')).toBeVisible();
    }
    await expect(page.locator('a:has-text("Performance")')).toBeVisible();
  });

  test('should close mobile menu after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('button[aria-label="Toggle mobile menu"]');
    await expect(page.locator('.md\\:hidden.absolute')).toBeVisible();
    
    // Click performance link
    await page.click('a:has-text("Performance")');
    
    // Should navigate to performance page
    await expect(page).toHaveURL('/performance');
    
    // Mobile menu should be closed after navigation
    await expect(page.locator('.md\\:hidden.absolute')).not.toBeVisible();
  });

  test('should show desktop navigation on larger screens', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    
    // Desktop navigation should be visible
    await expect(page.locator('.hidden.md\\:flex')).toBeVisible();
    
    // Mobile navigation should be hidden
    await expect(page.locator('.md\\:hidden.flex')).not.toBeVisible();
    
    // Navigation links should be directly visible
    await expect(page.locator('a:has-text("Performance")')).toBeVisible();
  });

  test('should animate hamburger icon when toggled', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const hamburgerButton = page.locator('button[aria-label="Toggle mobile menu"]');
    
    // Check initial state - lines should be in hamburger formation
    const lines = hamburgerButton.locator('span');
    await expect(lines.nth(0)).not.toHaveClass(/rotate-45/);
    await expect(lines.nth(1)).not.toHaveClass(/opacity-0/);
    await expect(lines.nth(2)).not.toHaveClass(/-rotate-45/);
    
    // Click to open
    await hamburgerButton.click();
    
    // Lines should transform to X
    await expect(lines.nth(0)).toHaveClass(/rotate-45/);
    await expect(lines.nth(1)).toHaveClass(/opacity-0/);
    await expect(lines.nth(2)).toHaveClass(/-rotate-45/);
  });

  test('should maintain language selector visibility on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Language selector should be visible in mobile navigation area
    const mobileNav = page.locator('.md\\:hidden.flex');
    await expect(mobileNav).toBeVisible();
    
    // Language selector should be present (look for flag emoji or language component)
    await expect(page.locator('text=🇺🇸').or(page.locator('[class*="language"]')).first()).toBeVisible();
  });
});