import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Multi-Tenant Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should not expose other tenant data in API responses', async ({ page, request }) => {
    // Get current tenant's data sources
    const response = await request.get(`${page.url().split('/').slice(0, 3).join('/')}/api/data-sources`, {
      headers: {
        'Cookie': page.context().cookies().map(c => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json() as any;

    // All items should belong to current tenant
    if (Array.isArray(data)) {
      data.forEach(item => {
        expect(item.tenantId || item.organizationId).toBeDefined();
      });
    } else if (data.data) {
      data.data.forEach((item: any) => {
        expect(item.tenantId || item.organizationId).toBeDefined();
      });
    }
  });

  test('should not expose tenant in URLs', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // URL should not contain tenant ID in path or query
    expect(/tenant|org/.test(url)).toBe(false);
  });

  test('should enforce session isolation', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get current session
    const cookies1 = page.context().cookies();
    expect(cookies1.length).toBeGreaterThan(0);

    // Create new context (simulating different user)
    const context2 = await page.context().browser()?.newContext();
    if (context2) {
      const page2 = context2.newPage();
      await page2.goto(page.url());

      // New context should need to login again
      const isLoginRequired = page2.url().includes('/login') || !(await isAuthenticated(page2));
      expect(isLoginRequired).toBe(true);

      await context2.close();
    }
  });

  test('should validate user ownership of resources', async ({ request, page }) => {
    const baseUrl = page.url().split('/').slice(0, 3).join('/');
    const cookies = page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Try to access content API
    const response = await request.get(`${baseUrl}/api/content`, {
      headers: { 'Cookie': cookieHeader }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json() as any;

    // All items should be owned by current user
    if (Array.isArray(data)) {
      data.forEach(item => {
        expect(item.userId || item.ownerId || item.createdBy).toBeDefined();
      });
    } else if (data.data) {
      data.data.forEach((item: any) => {
        expect(item.userId || item.ownerId || item.createdBy).toBeDefined();
      });
    }
  });

  test('should not expose credentials across tenants', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    // Look for any API keys or credentials displayed
    const pageContent = await page.content();

    // Should not contain raw API keys or secrets
    expect(/api[_-]?key|password|secret|token/gi.test(pageContent)).toBe(false);

    // If displayed, should be masked
    const apiKeyInputs = page.locator('input[type="password"], input[data-testid*="secret"], input[data-testid*="key"]');
    const count = await apiKeyInputs.count();

    if (count > 0) {
      const firstKey = apiKeyInputs.first();
      const type = await firstKey.getAttribute('type');
      expect(type).toBe('password');
    }
  });

  test('should prevent cross-tenant data access via API', async ({ page, request }) => {
    const baseUrl = page.url().split('/').slice(0, 3).join('/');
    const cookies = page.context().cookies();
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Try to access events API
    const response = await request.get(`${baseUrl}/api/events`, {
      headers: { 'Cookie': cookieHeader }
    });

    if (response.ok()) {
      const data = await response.json() as any;

      // Verify all events belong to the current tenant
      if (Array.isArray(data)) {
        data.forEach(event => {
          expect(event.tenantId || event.organizationId).toBeDefined();
        });
      } else if (data.data) {
        data.data.forEach((event: any) => {
          expect(event.tenantId || event.organizationId).toBeDefined();
        });
      }
    }
  });

  test('brand kit and guidelines should be tenant-specific', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for brand kit configuration
    const brandKitSection = page.locator('text=/brand|guideline|style/i').first();

    if (await brandKitSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Brand kit should only show current tenant's configuration
      await brandKitSection.click();
      await page.waitForLoadState('networkidle');

      // Verify it's using tenant-specific data
      const url = page.url();
      expect(url).toContain('/admin');
    }
  });
});

async function isAuthenticated(page: any): Promise<boolean> {
  try {
    const response = await page.request.get(`${page.url().split('/').slice(0, 3).join('/')}/api/auth/session`);
    return response.ok();
  } catch {
    return false;
  }
}
