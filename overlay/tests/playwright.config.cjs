// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

// Get absolute path to overlay directory
const overlayDir = path.resolve(__dirname, '..');

/**
 * Playwright configuration for overlay tests
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: '.',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3002',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Match OBS Browser Source typical size
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // Run local dev server before starting the tests
  // Note: This serves static files only - no WebSocket server
  // Tests use keyboard shortcuts to trigger events without needing the full server
  webServer: {
    command: `npx http-server "${overlayDir}" -p 3002 -c-1`,
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: 'pipe',
  },

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Output directories
  outputDir: './test-results',
});
