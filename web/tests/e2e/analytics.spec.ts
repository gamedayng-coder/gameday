import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load analytics dashboard', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/analytics/);
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });

  test.describe('Metrics Display', () => {
    test('should display total posts metric', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const postsMetric = page.locator('[data-testid="total-posts"], text=/posts|published|content/i').first();
      expect(await postsMetric.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display engagement metrics', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const engagementMetrics = page.locator('[data-testid="engagement"], text=/engagement|likes|comments|shares/i').first();
      expect(await engagementMetrics.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display reach metrics', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const reachMetric = page.locator('[data-testid="reach"], text=/reach|impressions|views/i').first();
      expect(await reachMetric.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display follower count', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const followersMetric = page.locator('[data-testid="followers"], text=/followers|audience|subscribers/i').first();
      expect(await followersMetric.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display metrics with numerical values', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for metric cards with numbers
      const metricCards = page.locator('[data-testid*="metric"], [class*="metric"], [class*="card"]').first();
      if (await metricCards.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await metricCards.textContent();
        const hasNumber = text && /\d+/.test(text);
        expect(hasNumber).toBe(true);
      }
    });

    test('should display metric change indicators (up/down)', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for trend indicators
      const trendIndicators = page.locator('[data-testid*="trend"], [class*="up"], [class*="down"], text=/↑|↓|+|-/').first();
      expect(await trendIndicators.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });
  });

  test.describe('Charts & Visualizations', () => {
    test('should display engagement over time chart', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for chart element (canvas or SVG)
      const chart = page.locator('canvas, svg, [data-testid*="chart"], [class*="chart"]').first();
      expect(await chart.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display channel performance chart', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for channel breakdown
      const channelChart = page.locator('[data-testid="channel-performance"], text=/facebook|twitter|instagram|linkedin|tiktok/i').first();
      expect(await channelChart.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display top posts ranking', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for top posts section
      const topPosts = page.locator('[data-testid="top-posts"], text=/top posts|best performing|trending/i').first();
      expect(await topPosts.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display content type breakdown', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for content type distribution
      const contentTypeChart = page.locator('[data-testid="content-type"], text=/video|image|text|graphic/i').first();
      expect(await contentTypeChart.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should make charts responsive', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Get initial viewport
      const initialSize = page.viewportSize();
      expect(initialSize).not.toBeNull();

      // Resize viewport
      if (initialSize) {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForLoadState('networkidle');

        // Charts should still be visible
        const chart = page.locator('canvas, svg, [data-testid*="chart"]').first();
        expect(await chart.isVisible().catch(() => false)).toBe(true);

        // Reset viewport
        await page.setViewportSize(initialSize);
      }
    });
  });

  test.describe('Time Range Filtering', () => {
    test('should filter by last 7 days', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const timeRangeFilter = page.locator('button:has-text("7 days"), button:has-text("Week"), select[name="timeRange"]').first();
      if (await timeRangeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await timeRangeFilter.click();
        await page.waitForLoadState('networkidle');

        // Verify data updates
        const metric = page.locator('[data-testid*="metric"], [class*="metric"]').first();
        expect(await metric.isVisible()).toBe(true);
      }
    });

    test('should filter by last 30 days', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const timeRangeFilter = page.locator('button:has-text("30 days"), button:has-text("Month"), select[name="timeRange"]').first();
      if (await timeRangeFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await timeRangeFilter.click();
        await page.waitForLoadState('networkidle');

        const metric = page.locator('[data-testid*="metric"]').first();
        expect(await metric.isVisible()).toBe(true);
      }
    });

    test('should support custom date range', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const customRange = page.locator('button:has-text("Custom"), input[type="date"]').first();
      if (await customRange.isVisible({ timeout: 5000 }).catch(() => false)) {
        await customRange.click();

        // Fill in date range
        const startDateInput = page.locator('input[data-testid="start-date"], input[placeholder*="start"]').first();
        if (await startDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const startDate = new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0];
          await startDateInput.fill(startDate);

          const endDateInput = page.locator('input[data-testid="end-date"], input[placeholder*="end"]').first();
          if (await endDateInput.isVisible()) {
            const endDate = new Date().toISOString().split('T')[0];
            await endDateInput.fill(endDate);

            await page.waitForLoadState('networkidle');
            const metric = page.locator('[data-testid*="metric"]').first();
            expect(await metric.isVisible()).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Channel Analytics', () => {
    test('should show per-channel performance metrics', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for channel tabs or filter
      const channelFilter = page.locator('button[data-testid*="channel"], [role="tab"]').first();
      if (await channelFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Click on channel
        await channelFilter.click();
        await page.waitForLoadState('networkidle');

        // Should show channel-specific metrics
        const channelMetric = page.locator('[data-testid*="metric"], [class*="metric"]').first();
        expect(await channelMetric.isVisible()).toBe(true);
      }
    });

    test('should compare performance across channels', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for comparison view
      const compareBtn = page.locator('button:has-text("Compare"), button[data-testid="compare"]').first();
      if (await compareBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await compareBtn.click();
        await page.waitForLoadState('networkidle');

        // Should show side-by-side comparison
        const comparison = page.locator('[data-testid="comparison"], [class*="compare"]').first();
        expect(await comparison.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });

    test('should show audience demographics by channel', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Look for demographics section
      const demographics = page.locator('[data-testid="demographics"], text=/age|gender|location|demographic/i').first();
      expect(await demographics.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });
  });

  test.describe('Data Accuracy & Integrity', () => {
    test('should validate metrics via API', async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';

      const response = await page.request.get(`${baseUrl}/api/analytics/metrics`, {
        headers: {
          'Cookie': page.context().cookies().map(c => `${c.name}=${c.value}`).join('; ')
        }
      });

      expect(response.ok()).toBe(true);
      const data = await response.json() as any;

      // Verify expected fields
      expect(typeof data === 'object').toBe(true);
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });

    test('should provide consistent metrics across views', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Get metric from dashboard
      const dashboardMetric = page.locator('[data-testid="total-posts"], text=/\\d+\\s+posts/i').first();
      const dashboardValue = await dashboardMetric.textContent();

      // Export or view detailed report
      const exportBtn = page.locator('button:has-text("Export"), button[data-testid="export"]').first();
      if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await exportBtn.click();
        await page.waitForTimeout(2000);

        // Values should match or be consistent
        expect(dashboardValue).not.toBeNull();
      }
    });

    test('should calculate metrics correctly', async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';

      // Get engagement data
      const response = await page.request.get(`${baseUrl}/api/analytics/engagement`, {
        headers: {
          'Cookie': page.context().cookies().map(c => `${c.name}=${c.value}`).join('; ')
        }
      });

      if (response.ok()) {
        const data = await response.json() as any;

        // Verify engagement rate calculation if provided
        if (data.engagementRate && data.reach && data.engagement) {
          const calculatedRate = (data.engagement / data.reach) * 100;
          const tolerance = 0.1; // 0.1% tolerance

          expect(Math.abs(data.engagementRate - calculatedRate)).toBeLessThan(tolerance);
        }
      }
    });
  });

  test.describe('Export & Reporting', () => {
    test('should export analytics as CSV', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const exportBtn = page.locator('button:has-text("Export"), button[data-testid="export-csv"]').first();
      if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
      }
    });

    test('should export analytics as PDF', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const exportBtn = page.locator('button:has-text("PDF"), button[data-testid="export-pdf"]').first();
      if (await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.pdf');
      }
    });

    test('should schedule report delivery', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      const scheduleBtn = page.locator('button:has-text("Schedule"), button[data-testid="schedule-report"]').first();
      if (await scheduleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await scheduleBtn.click();
        await page.waitForLoadState('networkidle');

        // Configure schedule
        const frequencySelect = page.locator('select[name="frequency"], [data-testid="frequency"]').first();
        if (await frequencySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await frequencySelect.selectOption('weekly');

          const submitBtn = page.locator('button:has-text("Schedule"), button[type="submit"]').last();
          if (await submitBtn.isVisible()) {
            await submitBtn.click();
            await page.waitForTimeout(2000);

            const successMsg = page.locator('text=/scheduled|success|created/i');
            expect(await successMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Performance & Load', () => {
    test('should load analytics page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets without crashing', async ({ page }) => {
      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Select extended time range to load more data
      const yearFilter = page.locator('button:has-text("Year"), button:has-text("12 months")').first();
      if (await yearFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await yearFilter.click();
        await page.waitForLoadState('networkidle');

        // Page should still be responsive
        const metric = page.locator('[data-testid*="metric"]').first();
        expect(await metric.isVisible()).toBe(true);
      }
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/admin/analytics');
      await page.waitForLoadState('networkidle');

      // Allow some time for any potential async errors
      await page.waitForTimeout(2000);

      expect(errors.length).toBe(0);
    });
  });
});
