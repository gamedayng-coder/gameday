import { test, expect } from '@playwright/test';
import { login, logout, isAuthenticated } from '../fixtures/auth';

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('BrandPost Inc.');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await login(page);
    await expect(page).not.toHaveURL(/login/);
  });

  test('should maintain session after login', async ({ page }) => {
    await login(page);
    const isAuth = await isAuthenticated(page);
    expect(isAuth).toBe(true);
  });

  test('should logout successfully', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(1000);
    await logout(page);
    await expect(page).toHaveURL('/');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error or remain on login page
    await page.waitForTimeout(2000);
    const isLoginPage = page.url().includes('/login');
    expect(isLoginPage).toBe(true);
  });

  test('should require email field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'somepassword');
    const submitBtn = page.locator('button[type="submit"]');

    // Check if button is disabled or form prevents submission
    const isDisabled = await submitBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should require password field', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    const submitBtn = page.locator('button[type="submit"]');

    // Check if button is disabled or form prevents submission
    const isDisabled = await submitBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });
});
