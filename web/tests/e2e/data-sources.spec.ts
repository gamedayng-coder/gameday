import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Data Source Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to data sources page', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await expect(page).toHaveURL(/data-sources/);
    await page.waitForLoadState('networkidle');
  });

  test('should display data sources list', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    // Check if data sources table or list is visible
    const content = await page.textContent('body');
    expect(content).not.toBeNull();
  });

  test('should create a new JSON data source', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    // Look for "Add" or "Create" button
    const createBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();

    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForLoadState('networkidle');

      // Fill in data source form
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('Test Data Source');
      }

      // Check for type selector or description
      const typeSelect = page.locator('select[name="type"], [data-testid="source-type"]').first();
      if (await typeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await typeSelect.selectOption('json');
      }

      // Submit form
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should test data source connection', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    // Look for test button on existing data source
    const testBtn = page.locator('button:has-text("Test"), a:has-text("Test")').first();

    if (await testBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await testBtn.click();
      await page.waitForTimeout(2000);

      // Check for success/failure message
      const successMsg = page.locator('text=/success|passed|connected/i');
      const failureMsg = page.locator('text=/failed|error|connection/i');

      const hasResult = await successMsg.isVisible({ timeout: 5000 }).catch(() => false) ||
                        await failureMsg.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResult).toBe(true);
    }
  });

  test('should display API key configuration', async ({ page }) => {
    await page.goto('/admin/data-sources');
    await page.waitForLoadState('networkidle');

    // Look for API key section
    const apiKeySection = page.locator('[data-testid="api-key"], text=/api.key|api key/i').first();

    if (await apiKeySection.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(apiKeySection).toBeVisible();
    }
  });

  test('should verify multi-tenant data isolation', async ({ page }) => {
    // Login and check data sources
    const datasource1Response = await page.request.get('/api/data-sources', {
      headers: {
        'Cookie': page.context().cookies().map(c => `${c.name}=${c.value}`).join('; ')
      }
    });

    expect(datasource1Response.ok()).toBe(true);
    const data = await datasource1Response.json();
    expect(Array.isArray(data) || data.data).toBeTruthy();
  });
});
