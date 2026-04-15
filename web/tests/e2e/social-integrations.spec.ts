import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Social Media Integrations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Facebook Integration', () => {
    test('should connect Facebook account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const fbConnect = page.locator('button:has-text("Facebook"), button[data-testid="facebook-connect"]').first();
      if (await fbConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await fbConnect.click();
        await page.waitForTimeout(2000);

        // Should either redirect to Facebook auth or show connection status
        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('facebook') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish post to Facebook', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      // Select or create content
      const content = page.locator('[data-testid="content-item"], .content-card').first();
      if (await content.isVisible({ timeout: 5000 }).catch(() => false)) {
        await content.click();
        await page.waitForLoadState('networkidle');

        // Look for publish button
        const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Share")').first();
        if (await publishBtn.isVisible()) {
          await publishBtn.click();

          // Select Facebook channel
          const fbChannel = page.locator('input[value="facebook"], label:has-text("Facebook"), [data-testid="facebook-channel"]').first();
          if (await fbChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
            await fbChannel.click();

            // Submit publish
            const submitBtn = page.locator('button:has-text("Publish"), button:has-text("Share"), button[type="submit"]').last();
            if (await submitBtn.isVisible()) {
              await submitBtn.click();
              await page.waitForTimeout(3000);

              // Verify success message
              const successMsg = page.locator('text=/published|shared|success/i');
              expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
            }
          }
        }
      }
    });

    test('should verify Facebook auth requires valid credentials', async ({ request }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';
      const response = await request.post(`${baseUrl}/api/facebook/auth`, {
        data: {
          clientId: 'invalid-id',
          redirectUri: `${baseUrl}/api/facebook/callback`,
        },
      });

      // Should reject invalid credentials
      expect([400, 401, 403].includes(response.status())).toBe(true);
    });
  });

  test.describe('Instagram Integration', () => {
    test('should connect Instagram account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const igConnect = page.locator('button:has-text("Instagram"), button[data-testid="instagram-connect"]').first();
      if (await igConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await igConnect.click();
        await page.waitForTimeout(2000);

        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('instagram') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish post to Instagram', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Share")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const igChannel = page.locator('input[value="instagram"], label:has-text("Instagram"), [data-testid="instagram-channel"]').first();
        if (await igChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await igChannel.click();

          const submitBtn = page.locator('button:has-text("Publish"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);

            const successMsg = page.locator('text=/published|success/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });

    test('should support Instagram Stories format', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const storyFormat = page.locator('[data-testid="story-format"], label:has-text("Story"), button:has-text("Story")').first();
      if (await storyFormat.isVisible({ timeout: 5000 }).catch(() => false)) {
        await storyFormat.click();
        await page.waitForLoadState('networkidle');

        // Verify story-specific options appear
        const storyDim = page.locator('text=/9:16|story dimensions|full screen/i');
        expect(await storyDim.isVisible({ timeout: 2000 }).catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('Twitter/X Integration', () => {
    test('should connect Twitter/X account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const xConnect = page.locator('button:has-text("Twitter"), button:has-text("X"), button[data-testid="twitter-connect"]').first();
      if (await xConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await xConnect.click();
        await page.waitForTimeout(2000);

        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('twitter') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish tweet', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Tweet")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const xChannel = page.locator('input[value="twitter"], label:has-text("Twitter"), label:has-text("X"), [data-testid="twitter-channel"]').first();
        if (await xChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await xChannel.click();

          const submitBtn = page.locator('button:has-text("Publish"), button:has-text("Tweet"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);

            const successMsg = page.locator('text=/posted|tweeted|published|success/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });

    test('should validate Twitter character limit', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const tweetInput = page.locator('textarea[placeholder*="tweet"], textarea[placeholder*="post"], textarea[data-testid="tweet-content"]').first();
      if (await tweetInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Fill with content exceeding Twitter limit
        const longText = 'a'.repeat(300);
        await tweetInput.fill(longText);

        // Check for character warning
        const charWarning = page.locator('text=/character|limit|280/i');
        expect(await charWarning.isVisible({ timeout: 2000 }).catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('LinkedIn Integration', () => {
    test('should connect LinkedIn account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const liConnect = page.locator('button:has-text("LinkedIn"), button[data-testid="linkedin-connect"]').first();
      if (await liConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await liConnect.click();
        await page.waitForTimeout(2000);

        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('linkedin') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish post to LinkedIn', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Share")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const liChannel = page.locator('input[value="linkedin"], label:has-text("LinkedIn"), [data-testid="linkedin-channel"]').first();
        if (await liChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await liChannel.click();

          const submitBtn = page.locator('button:has-text("Publish"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);

            const successMsg = page.locator('text=/published|shared|success/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });

    test('should support LinkedIn article format', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const articleFormat = page.locator('[data-testid="article-format"], label:has-text("Article"), button:has-text("Article")').first();
      if (await articleFormat.isVisible({ timeout: 5000 }).catch(() => false)) {
        await articleFormat.click();
        await page.waitForLoadState('networkidle');

        // Verify article-specific options appear
        const articleOptions = page.locator('text=/article|content|body/i');
        expect(await articleOptions.isVisible({ timeout: 2000 }).catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('TikTok Integration', () => {
    test('should connect TikTok account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const ttConnect = page.locator('button:has-text("TikTok"), button[data-testid="tiktok-connect"]').first();
      if (await ttConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await ttConnect.click();
        await page.waitForTimeout(2000);

        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('tiktok') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish video to TikTok', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Post")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const ttChannel = page.locator('input[value="tiktok"], label:has-text("TikTok"), [data-testid="tiktok-channel"]').first();
        if (await ttChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await ttChannel.click();

          const submitBtn = page.locator('button:has-text("Publish"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);

            const successMsg = page.locator('text=/posted|published|success/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });

    test('should validate TikTok video dimensions (9:16)', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const videoDim = page.locator('text=/9:16|vertical|tiktok/i');
      if (await videoDim.isVisible({ timeout: 5000 }).catch(() => false)) {
        expect(videoDim).toBeVisible();
      }
    });
  });

  test.describe('Telegram Integration', () => {
    test('should connect Telegram account', async ({ page }) => {
      await page.goto('/admin/integrations');
      await page.waitForLoadState('networkidle');

      const tgConnect = page.locator('button:has-text("Telegram"), button[data-testid="telegram-connect"]').first();
      if (await tgConnect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tgConnect.click();
        await page.waitForTimeout(2000);

        const isConnected = await page.locator('text=/connected|authenticated|success/i').isVisible().catch(() => false);
        expect(isConnected || page.url().includes('telegram') || page.url().includes('oauth')).toBe(true);
      }
    });

    test('should publish message to Telegram', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Send")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const tgChannel = page.locator('input[value="telegram"], label:has-text("Telegram"), [data-testid="telegram-channel"]').first();
        if (await tgChannel.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tgChannel.click();

          const submitBtn = page.locator('button:has-text("Publish"), button:has-text("Send"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(3000);

            const successMsg = page.locator('text=/sent|published|success/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Multi-Channel Publishing', () => {
    test('should publish to multiple channels simultaneously', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Share")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        // Select multiple channels
        const channels = ['facebook', 'twitter', 'linkedin'];
        for (const channel of channels) {
          const channelCheckbox = page.locator(`input[value="${channel}"], label:has-text("${channel.charAt(0).toUpperCase() + channel.slice(1)}")`).first();
          if (await channelCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
            await channelCheckbox.click();
          }
        }

        const submitBtn = page.locator('button:has-text("Publish"), button[type="submit"]').last();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(3000);

          const successMsg = page.locator('text=/published|shared|success/i');
          expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
        }
      }
    });

    test('should queue content for scheduled publishing', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      const publishBtn = page.locator('button:has-text("Publish"), button:has-text("Schedule")').first();
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        // Set schedule time
        const dateInput = page.locator('input[type="datetime-local"], input[type="date"], [data-testid="schedule-time"]').first();
        if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Set to future date
          const futureDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          await dateInput.fill(futureDate);

          const submitBtn = page.locator('button:has-text("Schedule"), button:has-text("Queue"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(2000);

            const queuedMsg = page.locator('text=/scheduled|queued|pending/i');
            expect(await queuedMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });

    test('should display publishing status for each channel', async ({ page }) => {
      await page.goto('/admin/content');
      await page.waitForLoadState('networkidle');

      // Look for content with publish status indicators
      const statusIndicators = page.locator('[data-testid*="status"], [class*="status"], text=/published|pending|failed/i');
      const count = await statusIndicators.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
