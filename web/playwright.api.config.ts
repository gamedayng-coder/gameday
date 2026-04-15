import { defineConfig } from '@playwright/test';

/**
 * API-only test configuration
 * Runs Playwright's HTTP request tests without browser automation
 * Use when browser launching is not available in the environment
 *
 * Run with: npx playwright test -c playwright.api.config.ts
 */

const BASE_URL = process.env.BASE_URL || 'https://gameday-wheat.vercel.app';
const AGENT_API_KEY = process.env.AGENT_API_KEY || 'test-bearer-token';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/agent-api.spec.ts', // Only run API tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { outputFolder: 'test-results/api-report' }],
    ['json', { outputFile: 'test-results/api-results.json' }],
    ['junit', { outputFile: 'test-results/api-junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    // API tests don't need browser context
    extraHTTPHeaders: {
      'Authorization': `Bearer ${AGENT_API_KEY}`,
    },
  },
  webServer: undefined, // Don't start server; test against live environment
  projects: [
    {
      name: 'api',
      use: {},
    },
  ],
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
