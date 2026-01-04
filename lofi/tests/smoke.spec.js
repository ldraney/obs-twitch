// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Smoke tests for lofi audio-visual experiences
 * These tests verify basic functionality works without errors
 */

const experiences = [
  { name: 'Space Drift', path: '/experiences/space-drift.html', bpm: 68 },
  { name: 'Supernova', path: '/experiences/supernova.html', bpm: 75 },
  { name: 'Midnight Rain', path: '/experiences/midnight-rain.html', bpm: 70 },
];

for (const experience of experiences) {
  test.describe(`${experience.name}`, () => {

    test('page loads without critical errors', async ({ page }) => {
      const errors = [];

      // Collect console errors (ignore warnings and AudioContext which is expected)
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore common non-critical errors
          const ignoredPatterns = [
            'favicon',
            'AudioContext',
            'Failed to load resource',  // 404s for optional resources
            'net::ERR',
          ];
          const isIgnored = ignoredPatterns.some(p => text.includes(p));
          if (!isIgnored) {
            errors.push(text);
          }
        }
      });

      // Collect page errors (actual JavaScript errors)
      page.on('pageerror', err => {
        errors.push(err.message);
      });

      await page.goto(experience.path);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Only fail on actual code errors, not resource loading issues
      const criticalErrors = errors.filter(e =>
        e.includes('SyntaxError') ||
        e.includes('ReferenceError') ||
        e.includes('TypeError') ||
        e.includes('.js') ||
        e.includes('.css')
      );

      expect(criticalErrors).toEqual([]);
    });

    test('ES modules load successfully', async ({ page }) => {
      const moduleErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('module')) {
          moduleErrors.push(msg.text());
        }
      });

      await page.goto(experience.path);
      await page.waitForLoadState('networkidle');

      // No module loading errors
      expect(moduleErrors).toEqual([]);
    });

    test('canvas renders (not blank)', async ({ page }) => {
      await page.goto(experience.path);

      // Wait for canvas to exist
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // Wait a bit for visuals to render
      await page.waitForTimeout(500);

      // Check canvas has content by evaluating if it's not all black
      const hasContent = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return false;

        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        // Sample a few pixels to see if there's any content
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Count non-black pixels
        let nonBlackPixels = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Check if any RGB value is > 10 (allowing for dark backgrounds)
          if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            nonBlackPixels++;
          }
        }

        // At least 1% of pixels should have some color (stars, nebulas, etc.)
        const totalPixels = canvas.width * canvas.height;
        return nonBlackPixels / totalPixels > 0.01;
      });

      expect(hasContent).toBe(true);
    });

    test('play button exists and is clickable', async ({ page }) => {
      await page.goto(experience.path);

      // Find the play button (may say BEGIN, Launch, etc.)
      const playButton = page.locator('button').first();
      await expect(playButton).toBeVisible();
      await expect(playButton).toBeEnabled();
    });

    test('clicking play starts playback', async ({ page }) => {
      await page.goto(experience.path);

      const playButton = page.locator('button').first();
      const initialText = await playButton.textContent();

      // Click to start
      await playButton.click();

      // Wait for state change
      await page.waitForTimeout(1000);

      // Button text should change to STOP
      await expect(playButton).toHaveText(/stop/i);
    });

    test('clicking stop halts playback', async ({ page }) => {
      await page.goto(experience.path);

      const playButton = page.locator('button').first();

      // Start playback
      await playButton.click();

      // Wait for playback to actually start
      await expect(playButton).toHaveText(/stop/i, { timeout: 3000 });

      // Stop playback
      await playButton.click();

      // Wait for playback to stop - button text should change
      await expect(playButton).not.toHaveText(/stop/i, { timeout: 3000 });
    });

    test('timeline sections are visible', async ({ page }) => {
      await page.goto(experience.path);

      // Check timeline exists (use .first() to handle multiple matches)
      const timeline = page.locator('.timeline').first();
      await expect(timeline).toBeVisible();

      // Check at least one section exists
      const sections = page.locator('.timeline-section');
      const count = await sections.count();
      expect(count).toBeGreaterThan(0);
    });

    test('timeline sections are clickable', async ({ page }) => {
      await page.goto(experience.path);

      // Start playback first (required for timeline to work)
      const playButton = page.locator('button').first();
      await playButton.click();
      await page.waitForTimeout(1000);

      // Click on a timeline section (not the first one to verify jumping)
      const sections = page.locator('.timeline-section');
      const count = await sections.count();

      if (count > 2) {
        // Click on a middle section to ensure visible jump
        const middleIndex = Math.floor(count / 2);
        await sections.nth(middleIndex).click();
        await page.waitForTimeout(1000);

        // Verify the section indicator changed (more reliable than playhead position)
        const sectionIndicator = page.locator('.current-section');
        const sectionText = await sectionIndicator.textContent();

        // Should not be empty and should not be "Ready"
        expect(sectionText).toBeTruthy();
        expect(sectionText?.toLowerCase()).not.toBe('ready');
      }
    });

    test('volume slider works', async ({ page }) => {
      await page.goto(experience.path);

      // Find volume slider
      const volumeSlider = page.locator('input[type="range"]').first();
      await expect(volumeSlider).toBeVisible();

      // Get initial value
      const initialValue = await volumeSlider.inputValue();

      // Change the value
      await volumeSlider.fill('-20');

      // Verify it changed
      const newValue = await volumeSlider.inputValue();
      expect(newValue).toBe('-20');
    });

    test('BPM slider works', async ({ page }) => {
      await page.goto(experience.path);

      // Find BPM slider (second range input typically)
      const sliders = page.locator('input[type="range"]');
      const bpmSlider = sliders.nth(1);

      await expect(bpmSlider).toBeVisible();

      // Change BPM
      const newBpm = String(experience.bpm + 5);
      await bpmSlider.fill(newBpm);

      // Verify display updates
      const bpmDisplay = page.locator('text=' + newBpm);
      await expect(bpmDisplay).toBeVisible();
    });

    test('keyboard shortcut (space) toggles playback', async ({ page }) => {
      await page.goto(experience.path);

      const playButton = page.locator('button').first();

      // Press space to start
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      await expect(playButton).toHaveText(/stop/i);

      // Press space to stop
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);

      await expect(playButton).not.toHaveText(/stop/i);
    });

    test('no audio clipping warnings', async ({ page }) => {
      const clippingWarnings = [];

      page.on('console', msg => {
        const text = msg.text().toLowerCase();
        if (text.includes('clip') || text.includes('overflow') || text.includes('outside nominal range')) {
          clippingWarnings.push(msg.text());
        }
      });

      await page.goto(experience.path);

      // Start playback
      const playButton = page.locator('button').first();
      await playButton.click();

      // Let it play for a few seconds
      await page.waitForTimeout(3000);

      // No clipping warnings
      expect(clippingWarnings).toEqual([]);
    });

  });
}

// Index page tests
test.describe('Experience Gallery', () => {

  test('index page loads', async ({ page }) => {
    await page.goto('/experiences/index.html');
    await expect(page).toHaveTitle(/cosmic lofi/i);
  });

  test('all experience cards are present', async ({ page }) => {
    await page.goto('/experiences/index.html');

    for (const exp of experiences) {
      const card = page.locator(`text=${exp.name}`);
      await expect(card).toBeVisible();
    }
  });

  test('experience links work', async ({ page }) => {
    await page.goto('/experiences/index.html');

    // Click first experience card
    await page.locator('.song-card').first().click();

    // Should navigate to experience page
    await expect(page).toHaveURL(/experiences\/.+\.html/);
  });

});
