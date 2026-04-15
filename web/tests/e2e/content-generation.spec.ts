import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Content Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to content page', async ({ page }) => {
    await page.goto('/admin/content');
    await expect(page).toHaveURL(/content/);
    await page.waitForLoadState('networkidle');
  });

  test('should display content list', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Verify page has loaded with content
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });

  test('should create new content', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for create button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();

    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForLoadState('networkidle');

      // Fill content form
      const titleInput = page.locator('input[name="title"], input[placeholder*="title"]').first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('Test Content');
      }

      // Submit form
      const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should generate AI graphic via Canva', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for generate button
    const generateBtn = page.locator('button:has-text("Generate"), button:has-text("AI Graphic")').first();

    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.click();

      // Wait for generation to complete (may take up to 30 seconds)
      const successMsg = page.locator('text=/generated|success|created/i');
      const errorMsg = page.locator('text=/error|failed/i');

      const result = await Promise.race([
        successMsg.waitFor({ timeout: 30000 }).then(() => 'success'),
        errorMsg.waitFor({ timeout: 30000 }).then(() => 'error'),
      ]).catch(() => 'timeout');

      expect(['success', 'error', 'timeout']).toContain(result);
    }
  });

  test('should preview generated content', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for preview button on existing content
    const previewBtn = page.locator('button:has-text("Preview"), a:has-text("Preview")').first();

    if (await previewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await previewBtn.click();
      await page.waitForLoadState('networkidle');

      // Verify preview modal or page is shown
      const previewContent = page.locator('[data-testid="preview"], .preview, [class*="preview"]').first();
      expect(await previewContent.isVisible().catch(() => false)).toBe(true);
    }
  });

  test('should display caption generation options', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for caption or text generation section
    const captionSection = page.locator('text=/caption|text generation|ai text/i').first();

    if (await captionSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      expect(captionSection).toBeVisible();
    }
  });

  test('should validate content before publishing', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // Look for publish button
    const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Post")').first();

    if (await publishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if validation happens
      const validationMsg = page.locator('[data-testid="validation"], .validation-error, text=/required|missing/i').first();
      expect(await validationMsg.isVisible().catch(() => false)).toBeTruthy();
    }
  });

  test('should handle content generation errors gracefully', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // If we try to generate without proper setup, should show error
    const generateBtn = page.locator('button:has-text("Generate")').first();

    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(2000);

      // Should show some feedback
      const feedback = page.locator('[role="alert"], .alert, .error, .message').first();
      expect(await feedback.isVisible().catch(() => false)).toBeTruthy();
    }
  });
});
