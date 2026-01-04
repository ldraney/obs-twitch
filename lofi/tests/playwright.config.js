// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

// Get absolute path to lofi directory
const lofiDir = path.resolve(__dirname, '..');

/**
 * Playwright configuration for lofi audio-visual experience tests
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
    baseURL: 'http://localhost:3333',

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
        // Larger viewport for visual tests
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: `npx http-server "${lofiDir}" -p 3333 -c-1`,
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: 'pipe',
  },

  // Test timeout (longer for audio-visual tests)
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
    // Visual comparison settings
    toHaveScreenshot: {
      // Allow slight differences due to animation timing
      maxDiffPixelRatio: 0.05,
    },
  },

  // Snapshot configuration
  snapshotDir: './snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',

  // Output directories
  outputDir: './test-results',
});
