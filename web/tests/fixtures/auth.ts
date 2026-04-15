import { Page } from '@playwright/test';

const TEST_USER = {
  email: 'demo@brandpostinc.com',
  password: 'GameDay2026!',
};

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard or admin page
  await page.waitForURL(/\/(admin|dashboard|profile)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function logout(page: Page) {
  // Click profile link in nav, then click Sign out button on profile page
  await page.click('a[href="/profile"]');
  await page.waitForURL('/profile');
  await page.click('button:has-text("Sign out")');
  // signOut redirects to home page
  await page.waitForURL('/');
}

export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/');
    // If we land on login, we're not authenticated
    return !page.url().includes('/login');
  } catch {
    return false;
  }
}
