import { test, expect } from '@playwright/test';

test.describe('Trading Detail Page with New JWT Token', () => {
  const NEW_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjZhOWE5MmMtOWQ0NC00ZGUyLTg0MjItZTcyMGFkN2ViMGVjIiwidXNlcm5hbWUiOiJBbGV4TGlhbyIsImVtYWlsIjoiYWxleDE5NzQ0NUBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImlzcyI6InRpcmlzLWJhY2tlbmQiLCJzdWIiOiJiNmE5YTkyYy05ZDQ0LTRkZTItODQyMi1lNzIwYWQ3ZWIwZWMiLCJleHAiOjE3ODg5MDY2NjgsIm5iZiI6MTc1NzM3MDY2OCwiaWF0IjoxNzU3MzcwNjY4fQ.5sCJogRpVPp0FiUUPMtIbmJUWOVfcOzgiBIsPJ3-QB4';
  const REFRESH_TOKEN = 'dummy-refresh-token';
  const EXPIRES_AT = '1788906668000'; // Token expiry from the JWT payload (2026)

  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    // Enable error logging
    page.on('pageerror', error => {
      console.log(`[BROWSER ERROR]:`, error.message);
    });

    // Navigate to the app first
    await page.goto('http://localhost:5176/');
    
    // Inject the new JWT token into localStorage
    await page.addInitScript((token, refreshToken, expiresAt) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('token_expires_at', expiresAt);
    }, NEW_JWT_TOKEN, REFRESH_TOKEN, EXPIRES_AT);
  });

  test('should test dashboard access with new JWT token', async ({ page }) => {
    console.log('=== Testing Dashboard with New JWT Token ===');
    
    // Navigate to dashboard
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for authentication to process
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'new-jwt-dashboard.png', fullPage: true });
    
    // Check what we get
    const accessDenied = await page.locator('h1', { hasText: 'Access Denied' }).count();
    const dashboardTitle = await page.locator('h1', { hasText: 'Dashboard' }).count();
    const loadingSpinners = await page.locator('.animate-spin').count();
    
    console.log('Access denied messages:', accessDenied);
    console.log('Dashboard titles:', dashboardTitle);
    console.log('Loading spinners:', loadingSpinners);
    
    if (accessDenied > 0) {
      console.log('❌ Still getting access denied with new token');
      
      // Check for any error messages in the page
      const pageContent = await page.locator('body').textContent();
      console.log('Page content:', pageContent?.substring(0, 300));
      
    } else if (dashboardTitle > 0) {
      console.log('✅ SUCCESS! Dashboard accessible with new token!');
      
      // Look for trading data
      const tradingRows = await page.locator('tbody tr').count();
      const statsCards = await page.locator('.bg-white.rounded-lg.shadow.p-6').count();
      
      console.log('Trading rows found:', tradingRows);
      console.log('Stats cards found:', statsCards);
      
      if (tradingRows > 0) {
        console.log('✅ Found trading data! Getting first trading info...');
        
        const firstRowText = await page.locator('tbody tr').first().textContent();
        console.log('First trading row:', firstRowText?.substring(0, 200));
        
        // Extract trading ID if possible
        const tradingIdMatch = firstRowText?.match(/ID:\s*([a-f0-9-]{8})/);
        if (tradingIdMatch) {
          const shortId = tradingIdMatch[1];
          console.log('Found trading short ID:', shortId);
          
          // Try to get the full ID by looking at the onclick handler or data attributes
          const firstRow = page.locator('tbody tr').first();
          const rowHTML = await firstRow.innerHTML();
          
          // Look for full UUID pattern in HTML
          const fullIdMatch = rowHTML.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
          if (fullIdMatch) {
            console.log('✅ Found full trading ID:', fullIdMatch[1]);
            return fullIdMatch[1];
          }
        }
      } else {
        console.log('⚠️ Dashboard accessible but no trading data found');
      }
    } else if (loadingSpinners > 0) {
      console.log('⏳ Still loading, waiting more...');
      await page.waitForTimeout(5000);
      
      // Check again after waiting
      const finalAccessDenied = await page.locator('h1', { hasText: 'Access Denied' }).count();
      const finalDashboard = await page.locator('h1', { hasText: 'Dashboard' }).count();
      
      if (finalDashboard > 0) {
        console.log('✅ Dashboard loaded after waiting!');
      } else if (finalAccessDenied > 0) {
        console.log('❌ Still access denied after waiting');
      }
    } else {
      console.log('⚠️ Unexpected dashboard state');
      const bodyContent = await page.locator('body').innerHTML();
      console.log('Body content (first 500 chars):', bodyContent.substring(0, 500));
    }
    
    return null;
  });

  test('should test trading detail page with new JWT token', async ({ page }) => {
    console.log('=== Testing Trading Detail Page with New JWT Token ===');
    
    // First try to get a real trading ID from dashboard
    let realTradingId = null;
    
    try {
      await page.goto('http://localhost:5176/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      const dashboardTitle = await page.locator('h1', { hasText: 'Dashboard' }).count();
      
      if (dashboardTitle > 0) {
        console.log('✅ Dashboard accessible, looking for trading IDs...');
        
        const tradingRows = await page.locator('tbody tr').count();
        if (tradingRows > 0) {
          const firstRowHTML = await page.locator('tbody tr').first().innerHTML();
          const fullIdMatch = firstRowHTML.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
          
          if (fullIdMatch) {
            realTradingId = fullIdMatch[1];
            console.log('✅ Found real trading ID:', realTradingId);
          }
        }
      }
    } catch (error) {
      console.log('Could not get real trading ID, using test ID');
    }
    
    // Test with real ID or fallback to test ID
    const testTradingId = realTradingId || 'b5fb445f-c5f8-4f4a-b591-942935ea60e6';
    console.log('Testing trading detail page with ID:', testTradingId);
    
    await page.goto(`http://localhost:5176/trading/${testTradingId}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'new-jwt-trading-detail.png', fullPage: true });
    
    // Check what we get
    const accessDenied = await page.locator('h1', { hasText: 'Access Denied' }).count();
    const tradingNotFound = await page.locator('h1', { hasText: 'Trading Not Found' }).count();
    const loadingSpinners = await page.locator('.animate-spin').count();
    const performanceCards = await page.locator('.bg-white.p-4.rounded-lg.shadow-sm.border').count();
    const backButtons = await page.locator('button', { hasText: 'Back' }).count();
    const tradingHeaders = await page.locator('h1').count();
    
    console.log('Access denied:', accessDenied);
    console.log('Trading not found:', tradingNotFound);  
    console.log('Loading spinners:', loadingSpinners);
    console.log('Performance cards:', performanceCards);
    console.log('Back buttons:', backButtons);
    console.log('Total headers:', tradingHeaders);
    
    if (accessDenied > 0) {
      console.log('❌ Still getting access denied on trading detail page');
    } else if (tradingNotFound > 0) {
      console.log('✅ Authentication working! Trading not found (expected for test ID)');
    } else if (performanceCards > 0) {
      console.log('🎉 SUCCESS! Trading detail page loaded with performance data!');
      
      // Get details about the performance cards
      const cardContents = await page.locator('.bg-white.p-4.rounded-lg.shadow-sm.border').allTextContents();
      console.log('Performance cards found:', cardContents.length);
      cardContents.forEach((content, index) => {
        console.log(`Card ${index + 1}:`, content.substring(0, 50));
      });
      
      // Check for chart
      const chartContainer = await page.locator('.bg-white.p-6.rounded-lg.shadow-lg.border').count();
      console.log('Chart containers found:', chartContainer);
      
      if (chartContainer > 0) {
        console.log('✅ Chart container found!');
      }
      
    } else if (loadingSpinners > 0) {
      console.log('⏳ Still loading trading detail page...');
      
      // Wait longer for content
      await page.waitForTimeout(10000);
      
      // Check again
      const finalCards = await page.locator('.bg-white.p-4.rounded-lg.shadow-sm.border').count();
      const finalSpinners = await page.locator('.animate-spin').count();
      
      console.log('After extended wait - Performance cards:', finalCards);
      console.log('After extended wait - Loading spinners:', finalSpinners);
      
      if (finalCards > 0) {
        console.log('✅ Trading detail finally loaded!');
        await page.screenshot({ path: 'new-jwt-trading-detail-final.png', fullPage: true });
      } else if (finalSpinners > 0) {
        console.log('⚠️ Still loading after 15 seconds total');
      } else {
        console.log('⚠️ Unknown final state');
        const finalContent = await page.locator('body').innerHTML();
        console.log('Final content (first 500 chars):', finalContent.substring(0, 500));
      }
    } else {
      console.log('⚠️ Unexpected trading detail page state');
      const pageContent = await page.locator('body').innerHTML();
      console.log('Page content (first 1000 chars):', pageContent.substring(0, 1000));
    }
  });

  test('should test full navigation flow with new JWT', async ({ page }) => {
    console.log('=== Testing Complete Flow: Dashboard → Trading Detail ===');
    
    // Go to dashboard
    await page.goto('http://localhost:5176/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('1. Navigated to dashboard');
    
    const dashboardTitle = await page.locator('h1', { hasText: 'Dashboard' }).count();
    
    if (dashboardTitle > 0) {
      console.log('2. ✅ Dashboard accessible!');
      
      const tradingRows = await page.locator('tbody tr').count();
      
      if (tradingRows > 0) {
        console.log(`3. Found ${tradingRows} trading rows`);
        
        // Take screenshot before clicking
        await page.screenshot({ path: 'new-jwt-before-click.png', fullPage: true });
        
        console.log('4. Clicking on first trading row...');
        
        // Click on first trading row
        await page.locator('tbody tr').first().click();
        
        // Wait for navigation
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
        
        const currentUrl = page.url();
        console.log('5. Navigated to URL:', currentUrl);
        
        // Wait for trading detail page to load
        await page.waitForTimeout(5000);
        
        // Take screenshot after navigation
        await page.screenshot({ path: 'new-jwt-after-click.png', fullPage: true });
        
        // Check what we ended up with
        const performanceCards = await page.locator('.bg-white.p-4.rounded-lg.shadow-sm.border').count();
        const backButtons = await page.locator('button', { hasText: 'Back' }).count();
        const tradingNotFound = await page.locator('h1', { hasText: 'Trading Not Found' }).count();
        const accessDenied = await page.locator('h1', { hasText: 'Access Denied' }).count();
        
        console.log('6. Results after navigation:');
        console.log('   - Performance cards:', performanceCards);
        console.log('   - Back buttons:', backButtons);
        console.log('   - Trading not found:', tradingNotFound);
        console.log('   - Access denied:', accessDenied);
        
        if (performanceCards > 0 && backButtons > 0) {
          console.log('🎉 COMPLETE SUCCESS! Full navigation flow works perfectly!');
          console.log('✅ Dashboard → Trading Detail navigation successful!');
        } else if (tradingNotFound > 0) {
          console.log('✅ Navigation worked, but trading not found (data issue, not code issue)');
        } else if (accessDenied > 0) {
          console.log('❌ Navigation led to access denied');
        } else {
          console.log('⚠️ Unexpected navigation result');
        }
        
      } else {
        console.log('3. ⚠️ No trading rows found in dashboard');
      }
    } else {
      console.log('2. ❌ Dashboard not accessible');
    }
  });
});