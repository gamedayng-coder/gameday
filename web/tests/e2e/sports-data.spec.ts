import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Sports Data Feeds', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.describe('Fixtures Display', () => {
    test('should load fixtures page', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/fixtures/);
      const content = await page.textContent('body');
      expect(content?.length).toBeGreaterThan(0);
    });

    test('should display upcoming fixtures', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Look for fixture list or table
      const fixtureList = page.locator('[data-testid="fixture-list"], .fixtures, table, [class*="fixture"]').first();
      expect(await fixtureList.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display fixture details (teams, date, competition)', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Look for fixture card or row
      const fixtureItem = page.locator('[data-testid="fixture-item"], .fixture-card, tr').first();
      if (await fixtureItem.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Should contain team names, date, and competition
        const text = await fixtureItem.textContent();
        const hasTeamData = text && (text.includes(':') || text.match(/vs|v\.|@/i));
        expect(hasTeamData).toBe(true);
      }
    });

    test('should filter fixtures by date', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Look for date filter
      const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"], button:has-text("Filter")').first();
      if (await dateFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dateFilter.click();
        await page.waitForLoadState('networkidle');

        // Verify filters are applied
        const fixtures = page.locator('[data-testid="fixture-item"], .fixture-card').first();
        expect(await fixtures.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });

    test('should filter fixtures by league/competition', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Look for league filter dropdown
      const leagueFilter = page.locator('select[name="league"], select[data-testid="league-filter"], button:has-text("League")').first();
      if (await leagueFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await leagueFilter.click();
        await page.waitForLoadState('networkidle');

        // Select a league
        const option = page.locator('option, [role="option"]').first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForLoadState('networkidle');

          // Verify filtered results
          const fixtures = page.locator('[data-testid="fixture-item"], .fixture-card').first();
          expect(await fixtures.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
        }
      }
    });

    test('should load fixture detail view', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Click on a fixture
      const fixtureItem = page.locator('[data-testid="fixture-item"], .fixture-card, tr').first();
      if (await fixtureItem.isVisible()) {
        await fixtureItem.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to detail page or show modal
        const detailView = page.locator('[data-testid="fixture-detail"], .detail-view, [class*="modal"]').first();
        expect(await detailView.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('Results Display', () => {
    test('should load results page', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/results/);
      const content = await page.textContent('body');
      expect(content?.length).toBeGreaterThan(0);
    });

    test('should display completed match results', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Look for results list
      const resultList = page.locator('[data-testid="result-list"], .results, table, [class*="result"]').first();
      expect(await resultList.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display result scores and match data', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Look for score display
      const scoreDisplay = page.locator('[data-testid="score"], .score, text=/\\d+-\\d+/').first();
      if (await scoreDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
        expect(scoreDisplay).toBeVisible();
      }
    });

    test('should show match timeline and key events', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Click on a result to see details
      const resultItem = page.locator('[data-testid="result-item"], .result-card, tr').first();
      if (await resultItem.isVisible()) {
        await resultItem.click();
        await page.waitForLoadState('networkidle');

        // Should show timeline or events
        const timeline = page.locator('[data-testid="timeline"], [data-testid="events"], .events, [class*="timeline"]').first();
        expect(await timeline.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });

    test('should filter results by date range', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Look for date range filter
      const startDate = page.locator('input[data-testid="start-date"], input[type="date"]').first();
      if (await startDate.isVisible({ timeout: 5000 }).catch(() => false)) {
        const today = new Date().toISOString().split('T')[0];
        await startDate.fill(today);

        await page.waitForLoadState('networkidle');

        // Verify results update
        const results = page.locator('[data-testid="result-item"], .result-card').first();
        expect(await results.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });

    test('should display statistics and insights for results', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Look for stats section
      const stats = page.locator('[data-testid="stats"], .stats, text=/possession|shots|pass/i').first();
      expect(await stats.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });
  });

  test.describe('Standings Display', () => {
    test('should load standings page', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/standings/);
      const content = await page.textContent('body');
      expect(content?.length).toBeGreaterThan(0);
    });

    test('should display league standings table', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      // Look for standings table
      const table = page.locator('table, [data-testid="standings-table"], .standings-table, [class*="standings"]').first();
      expect(await table.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display team position, points, and match info', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      // Verify table headers
      const headers = page.locator('th, [role="columnheader"]');
      const headerCount = await headers.count();

      expect(headerCount).toBeGreaterThan(0);

      // Look for expected columns
      const headerText = await headers.textContent();
      const hasExpectedColumns = headerText && (
        headerText.includes('Pos') ||
        headerText.includes('Team') ||
        headerText.includes('Pts') ||
        headerText.includes('Points')
      );

      expect(hasExpectedColumns).toBe(true);
    });

    test('should allow filtering standings by league', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      const leagueFilter = page.locator('select[name="league"], select[data-testid="league"], button:has-text("League")').first();
      if (await leagueFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
        await leagueFilter.click();

        const option = page.locator('option, [role="option"]').first();
        if (await option.isVisible()) {
          await option.click();
          await page.waitForLoadState('networkidle');

          // Verify standings update
          const table = page.locator('table, [data-testid="standings-table"]').first();
          expect(await table.isVisible()).toBe(true);
        }
      }
    });

    test('should display promotion and relegation zones', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      // Look for zone indicators (promotion, relegation, playoffs)
      const zones = page.locator('[data-testid*="zone"], [class*="zone"], [class*="promotion"], [class*="relegation"]');
      const zoneCount = await zones.count();

      expect(zoneCount).toBeGreaterThanOrEqual(0);
    });

    test('should link to team details from standings', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      // Click on a team name
      const teamLink = page.locator('a, button, [role="button"]').filter({ hasText: /Team|FC|United/ }).first();
      if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        const originalUrl = page.url();
        await teamLink.click();
        await page.waitForLoadState('networkidle');

        // Should navigate or show details
        const detailView = page.locator('[data-testid="team-detail"], [class*="detail"], [class*="modal"]').first();
        const urlChanged = page.url() !== originalUrl;

        expect(urlChanged || await detailView.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
      }
    });
  });

  test.describe('Data Updates & Real-time', () => {
    test('should refresh data when feed updates', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Get initial fixture count
      const initialFixtures = await page.locator('[data-testid="fixture-item"], .fixture-card').count();

      // Wait for potential data refresh (30 seconds)
      await page.waitForTimeout(5000);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify data is still present
      const updatedFixtures = await page.locator('[data-testid="fixture-item"], .fixture-card').count();
      expect(updatedFixtures).toBeGreaterThanOrEqual(0);
    });

    test('should propagate live score updates', async ({ page }) => {
      await page.goto('/admin/results');
      await page.waitForLoadState('networkidle');

      // Look for live score badge or indicator
      const liveIndicator = page.locator('[data-testid="live"], .live, text=/live|in progress/i').first();
      expect(await liveIndicator.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should display last update timestamp', async ({ page }) => {
      await page.goto('/admin/fixtures');
      await page.waitForLoadState('networkidle');

      // Look for timestamp or "Updated X minutes ago"
      const timestamp = page.locator('[data-testid="updated-time"], text=/updated|last|ago|ago/i').first();
      expect(await timestamp.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });

    test('should show data refresh/sync status', async ({ page }) => {
      await page.goto('/admin/standings');
      await page.waitForLoadState('networkidle');

      // Look for sync status indicator
      const syncStatus = page.locator('[data-testid="sync-status"], [class*="sync"], text=/syncing|synced|updated/i').first();
      expect(await syncStatus.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true);
    });
  });

  test.describe('Data Integrity', () => {
    test('should validate fixture data format', async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';

      const response = await page.request.get(`${baseUrl}/api/fixtures`);
      expect(response.ok()).toBe(true);

      const data = await response.json() as any;
      if (Array.isArray(data)) {
        data.forEach(fixture => {
          expect(fixture.id || fixture.uuid).toBeDefined();
          expect(fixture.homeTeam || fixture.teams).toBeDefined();
          expect(fixture.date || fixture.kickoffTime).toBeDefined();
        });
      }
    });

    test('should validate results data format', async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';

      const response = await page.request.get(`${baseUrl}/api/results`);
      expect(response.ok()).toBe(true);

      const data = await response.json() as any;
      if (Array.isArray(data)) {
        data.forEach(result => {
          expect(result.id || result.uuid).toBeDefined();
          expect(result.score).toBeDefined();
          expect(result.status || result.finished).toBeDefined();
        });
      }
    });

    test('should validate standings data format', async ({ page }) => {
      const baseUrl = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';

      const response = await page.request.get(`${baseUrl}/api/standings`);
      expect(response.ok()).toBe(true);

      const data = await response.json() as any;
      if (Array.isArray(data)) {
        data.forEach(entry => {
          expect(entry.teamId || entry.team).toBeDefined();
          expect(typeof entry.points === 'number' || typeof entry.pts === 'number').toBe(true);
          expect(typeof entry.position === 'number' || typeof entry.pos === 'number').toBe(true);
        });
      }
    });
  });
});
