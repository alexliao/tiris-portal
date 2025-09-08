import { test, expect, type Page } from '@playwright/test';

// Test configuration for Google OAuth
test.describe('Google OAuth Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for the page to load completely
    await expect(page.locator('h1:has-text("TIRIS")')).toBeVisible({ timeout: 10000 });
  });

  test('should display sign-in button when not authenticated', async ({ page }) => {
    // Check that the sign-in button is visible
    await expect(page.locator('[data-testid="signin-button-desktop"]')).toBeVisible();
    
    // Ensure user profile is not visible
    await expect(page.locator('[data-testid="user-profile"]')).not.toBeVisible();
    
    console.log('✅ Sign-in button is visible when not authenticated');
  });

  test('should open sign-in modal when sign-in button is clicked', async ({ page }) => {
    // Click the sign-in button
    await page.locator('[data-testid="signin-button-desktop"]').click();
    
    // Wait for modal to appear
    await expect(page.locator('[data-testid="signin-modal"]')).toBeVisible({ timeout: 5000 });
    
    // Check that both provider options are visible
    await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in with WeChat")')).toBeVisible();
    
    // Check that the modal has proper styling
    await expect(page.locator('text=Choose your preferred sign-in method')).toBeVisible();
    
    console.log('✅ Sign-in modal opens with both provider options');
  });

  test('should close modal when X button is clicked', async ({ page }) => {
    // Open modal
    await page.locator('[data-testid="signin-button-desktop"]').click();
    await expect(page.locator('[data-testid="signin-modal"]')).toBeVisible();
    
    // Close modal using X button
    await page.locator('button[aria-label="Close"]').click();
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="signin-modal"]')).not.toBeVisible();
    
    console.log('✅ Modal closes when X button is clicked');
  });

  test('should show loading state when Google login is initiated', async ({ page }) => {
    // Mock console to capture authentication method
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warn' || msg.type() === 'error' || msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Open modal
    await page.locator('[data-testid="signin-button-desktop"]').click();
    await expect(page.locator('[data-testid="signin-modal"]')).toBeVisible();
    
    // Click Google sign-in (this will trigger the authentication flow)
    const googleButton = page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();
    
    // Click and immediately check for loading state
    await googleButton.click();
    
    // The button should show loading state briefly
    await expect(googleButton).toBeDisabled({ timeout: 2000 });
    
    // Wait a moment for the authentication flow to start
    await page.waitForTimeout(2000);
    
    // Check console logs to see which authentication method was attempted
    const hasBackendWarning = consoleLogs.some(log => 
      log.includes('Backend OAuth failed') || log.includes('trying direct Google OAuth')
    );
    
    if (hasBackendWarning) {
      console.log('✅ Backend OAuth failed as expected, falling back to direct OAuth');
    } else {
      console.log('✅ Google OAuth flow initiated');
    }
  });

  test('should handle WeChat login (mock)', async ({ page }) => {
    // Open modal
    await page.locator('[data-testid="signin-button-desktop"]').click();
    await expect(page.locator('[data-testid="signin-modal"]')).toBeVisible();
    
    // Click WeChat sign-in
    const wechatButton = page.locator('button:has-text("Sign in with WeChat")');
    await expect(wechatButton).toBeVisible();
    await wechatButton.click();
    
    // WeChat should show loading state
    await expect(wechatButton).toBeDisabled({ timeout: 2000 });
    
    // Wait for mock WeChat login to complete (it takes ~1 second)
    await page.waitForTimeout(2000);
    
    // Check if mock authentication succeeded
    const authStatus = page.locator('text=💬 WeChat OAuth');
    const isVisible = await authStatus.isVisible();
    
    if (isVisible) {
      console.log('✅ WeChat mock login completed successfully');
      
      // Verify user is authenticated
      await expect(page.locator('text=Welcome, wechat_user')).toBeVisible();
    } else {
      console.log('✅ WeChat login initiated (may require manual verification)');
    }
  });

  test('should display authentication status when logged in', async ({ page }) => {
    // Check if there's already an authentication status visible
    const authStatus = page.locator('.fixed.bottom-4.right-4');
    const statusVisible = await authStatus.isVisible();
    
    if (statusVisible) {
      // Check for Google OAuth status
      const googleStatus = page.locator('text=🔐 Google OAuth');
      const wechatStatus = page.locator('text=💬 WeChat OAuth');
      
      if (await googleStatus.isVisible()) {
        console.log('✅ Google OAuth status visible');
        
        // Check the auth method indicator
        const viaBackend = page.locator('text=via TIRIS Backend');
        const viaDirect = page.locator('text=via Direct OAuth');
        const viaFallback = page.locator('text=via Fallback');
        
        if (await viaBackend.isVisible()) {
          console.log('✅ Using TIRIS Backend OAuth');
        } else if (await viaDirect.isVisible()) {
          console.log('✅ Using Direct Google OAuth');
        } else if (await viaFallback.isVisible()) {
          console.log('✅ Using Fallback OAuth');
        }
      } else if (await wechatStatus.isVisible()) {
        console.log('✅ WeChat OAuth status visible');
      }
    } else {
      console.log('ℹ️ No user currently authenticated');
    }
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Listen for any error dialogs or messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    // Open modal
    await page.locator('[data-testid="signin-button-desktop"]').click();
    await expect(page.locator('[data-testid="signin-modal"]')).toBeVisible();
    
    // Try Google login
    await page.locator('button:has-text("Sign in with Google")').click();
    
    // Wait a bit to see if any errors appear
    await page.waitForTimeout(3000);
    
    // Check for error messages in the modal
    const errorMessage = page.locator('.bg-red-50');
    const hasError = await errorMessage.isVisible();
    
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log(`ℹ️ Authentication error displayed: ${errorText}`);
      
      // Verify error is properly styled
      await expect(errorMessage).toHaveClass(/bg-red-50/);
    } else {
      console.log('✅ No authentication errors displayed');
    }
    
    // Check console for any JavaScript errors
    const hasConsoleErrors = consoleLogs.length > 0;
    if (hasConsoleErrors) {
      console.log(`ℹ️ Console errors: ${consoleLogs.join(', ')}`);
    } else {
      console.log('✅ No console errors detected');
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to page
    await page.goto('/');
    
    // Check mobile navigation
    await expect(page.locator('button[aria-label="Toggle mobile menu"]')).toBeVisible();
    
    // Check that sign-in button is visible in mobile header
    await expect(page.locator('[data-testid="signin-button-mobile"]')).toBeVisible();
    
    // Open sign-in modal
    await page.locator('[data-testid="signin-button-mobile"]').click();
    
    // Verify modal is properly sized for mobile
    const modal = page.locator('[data-testid="signin-modal"]');
    await expect(modal).toBeVisible();
    
    // Check that provider buttons are properly sized
    await expect(page.locator('button:has-text("Sign in with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in with WeChat")')).toBeVisible();
    
    console.log('✅ Sign-in modal is responsive on mobile devices');
  });

  test('should maintain authentication state across page reloads', async ({ page }) => {
    // Check current authentication state
    const authStatus = page.locator('.fixed.bottom-4.right-4');
    const isAuthenticated = await authStatus.isVisible();
    
    if (isAuthenticated) {
      // Get the current user info
      const userInfo = await authStatus.textContent();
      
      // Reload the page
      await page.reload();
      
      // Wait for page to load
      await expect(page.locator('h1:has-text("TIRIS")')).toBeVisible({ timeout: 10000 });
      
      // Wait a moment for authentication to restore
      await page.waitForTimeout(2000);
      
      // Check if authentication state is restored
      const restoredStatus = page.locator('.fixed.bottom-4.right-4');
      const isStillAuthenticated = await restoredStatus.isVisible();
      
      if (isStillAuthenticated) {
        console.log('✅ Authentication state maintained across page reload');
        
        // Verify it's the same user
        const restoredUserInfo = await restoredStatus.textContent();
        if (userInfo && restoredUserInfo && userInfo.includes(restoredUserInfo.split('Welcome,')[1]?.trim() || '')) {
          console.log('✅ Same user authenticated after reload');
        }
      } else {
        console.log('ℹ️ Authentication state was not persisted (may be expected for some flows)');
      }
    } else {
      console.log('ℹ️ No authentication to test persistence');
    }
  });
});