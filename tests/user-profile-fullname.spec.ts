import { test, expect } from '@playwright/test';

test.describe('User avatar dropdown shows full name', () => {
  test('displays full_name instead of username', async ({ page, context }) => {
    // Seed tokens before any script runs to trigger session restore
    await context.addInitScript(() => {
      localStorage.setItem('access_token', 'debug-token');
      localStorage.setItem('refresh_token', 'debug-refresh');
      localStorage.setItem('token_expires_at', String(Date.now() + 24 * 60 * 60 * 1000));
    });

    // Mock backend profile response with full_name
    await page.route('**/users/me', async (route) => {
      // Respond with a backend user that includes full_name
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'u_123',
            username: 'alexl',
            full_name: 'Alex Li',
            email: 'alex@example.com',
            avatar: '',
            settings: { timezone: 'UTC', currency: 'USD', notifications: true },
            info: { oauth_provider: 'google', last_login: new Date().toISOString() },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })
      });
    });

    await page.goto('/');

    // Wait for user profile to appear (auth restored)
    const profile = page.locator('[data-testid="user-profile"]');
    await expect(profile).toBeVisible({ timeout: 10000 });

    // Open dropdown
    await profile.getByRole('button').click();

    // Assert full name is shown
    await expect(page.getByText('Alex Li')).toBeVisible();
  });
});

