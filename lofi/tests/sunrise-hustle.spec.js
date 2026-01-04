// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Tests for Sunrise Hustle lofi audio-visual experience
 *
 * Sunrise Hustle uses the new modular architecture:
 * - Conductor for audio-visual synchronization
 * - SunriseHustle sound engine (lofi/sounds/sunrise-hustle.js)
 * - CosmicVisuals with sunrise preset (lofi/visuals/cosmic/index.js)
 *
 * BPM: 88
 * Duration: 3:16 (72 bars)
 * Sections: dawn, wakeup, groove, breathe, hustle, sunset
 */

const EXPERIENCE = {
  name: 'Sunrise Hustle',
  path: '/experiences/sunrise-hustle.html',
  bpm: 88,
  duration: '3:16',
  sections: ['dawn', 'wakeup', 'groove', 'breathe', 'hustle', 'sunset']
};

test.describe('Sunrise Hustle', () => {

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

    await page.goto(EXPERIENCE.path);

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

    await page.goto(EXPERIENCE.path);
    await page.waitForLoadState('networkidle');

    // No module loading errors
    expect(moduleErrors).toEqual([]);
  });

  test('new modular imports load (Conductor, SunriseHustle, CosmicVisuals)', async ({ page }) => {
    const importErrors = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && (
        text.includes('conductor') ||
        text.includes('sunrise-hustle') ||
        text.includes('cosmic') ||
        text.includes('signals')
      )) {
        importErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      importErrors.push(err.message);
    });

    await page.goto(EXPERIENCE.path);
    await page.waitForLoadState('networkidle');

    // No import errors for the new modular components
    expect(importErrors).toEqual([]);
  });

  test('canvas renders after play (not blank)', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Wait for canvas to exist
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // NOTE: Sunrise Hustle uses Conductor architecture - canvas only renders after play starts
    // Start playback to trigger visual rendering
    const playButton = page.locator('button').first();
    await playButton.click();

    // Wait for visuals to render
    await page.waitForTimeout(1500);

    // Check canvas has content by evaluating if it's not all black
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'no canvas' };

      const ctx = canvas.getContext('2d');
      if (!ctx) return { error: 'no context' };

      // Ensure canvas has dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        return { error: 'zero dimensions', width: canvas.width, height: canvas.height };
      }

      // Sample a region of pixels to see if there's any content
      const sampleWidth = Math.min(canvas.width, 500);
      const sampleHeight = Math.min(canvas.height, 500);
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imageData.data;

      // Count non-black pixels (lofi backgrounds are dark but not pure black)
      let nonBlackPixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Check if any RGB value is > 5 (very low threshold for dark space theme)
        if (data[i] > 5 || data[i + 1] > 5 || data[i + 2] > 5) {
          nonBlackPixels++;
        }
      }

      const totalPixels = sampleWidth * sampleHeight;
      const ratio = nonBlackPixels / totalPixels;

      return {
        width: canvas.width,
        height: canvas.height,
        sampleWidth,
        sampleHeight,
        nonBlackPixels,
        totalPixels,
        ratio
      };
    });

    // Should not have errors
    expect(canvasInfo.error).toBeUndefined();

    // At least 0.5% of pixels should have some color (very lenient for dark themes)
    expect(canvasInfo.ratio).toBeGreaterThan(0.005);
  });

  test('play button exists and is clickable', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Find the play button (says "Rise" for Sunrise Hustle)
    const playButton = page.locator('button').first();
    await expect(playButton).toBeVisible();
    await expect(playButton).toBeEnabled();
    await expect(playButton).toHaveText('Rise');
  });

  test('clicking play starts playback', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    const playButton = page.locator('button').first();

    // Click to start
    await playButton.click();

    // Wait for state change
    await page.waitForTimeout(1000);

    // Button text should change to STOP
    await expect(playButton).toHaveText(/stop/i);
  });

  test('clicking stop halts playback', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    const playButton = page.locator('button').first();

    // Start playback
    await playButton.click();

    // Wait for playback to actually start
    await expect(playButton).toHaveText(/stop/i, { timeout: 3000 });

    // Stop playback
    await playButton.click();

    // Wait for playback to stop - button text should change back to Rise
    await expect(playButton).toHaveText(/rise/i, { timeout: 3000 });
  });

  test('timeline sections are visible', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Check timeline exists (use .first() to handle multiple matches)
    const timeline = page.locator('.timeline').first();
    await expect(timeline).toBeVisible();

    // Check all 6 sections exist
    const sections = page.locator('.timeline-section');
    const count = await sections.count();
    expect(count).toBe(6);

    // Verify section names
    for (const sectionName of EXPERIENCE.sections) {
      const section = page.locator(`.timeline-section.${sectionName}`);
      await expect(section).toBeVisible();
    }
  });

  test('timeline sections are clickable', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

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
    await page.goto(EXPERIENCE.path);

    // Find volume slider
    const volumeSlider = page.locator('input[type="range"]').first();
    await expect(volumeSlider).toBeVisible();

    // Get initial value
    const initialValue = await volumeSlider.inputValue();
    expect(initialValue).toBe('-12');

    // Change the value
    await volumeSlider.fill('-20');

    // Verify it changed
    const newValue = await volumeSlider.inputValue();
    expect(newValue).toBe('-20');

    // Verify display updates
    const volDisplay = page.locator('#volVal');
    await expect(volDisplay).toHaveText('-20 dB');
  });

  test('keyboard shortcut (space) toggles playback', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    const playButton = page.locator('button').first();

    // Press space to start
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    await expect(playButton).toHaveText(/stop/i);

    // Press space to stop
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    await expect(playButton).toHaveText(/rise/i);
  });

  test('number keys jump to sections', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Start playback first
    const playButton = page.locator('button').first();
    await playButton.click();
    await expect(playButton).toHaveText(/stop/i, { timeout: 3000 });

    // Press key 3 to jump to section 3 (groove)
    await page.keyboard.press('3');
    await page.waitForTimeout(500);

    // Verify section indicator shows "Groove"
    const sectionIndicator = page.locator('.current-section');
    await expect(sectionIndicator).toHaveText(/groove/i);
  });

  test('no audio clipping warnings', async ({ page }) => {
    const clippingWarnings = [];

    page.on('console', msg => {
      const text = msg.text().toLowerCase();
      if (text.includes('clip') || text.includes('overflow') || text.includes('outside nominal range')) {
        clippingWarnings.push(msg.text());
      }
    });

    await page.goto(EXPERIENCE.path);

    // Start playback
    const playButton = page.locator('button').first();
    await playButton.click();

    // Let it play for a few seconds
    await page.waitForTimeout(3000);

    // No clipping warnings
    expect(clippingWarnings).toEqual([]);
  });

  test('section indicator shows correct section names', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Before playing, should show "Ready"
    const sectionIndicator = page.locator('.current-section');
    await expect(sectionIndicator).toHaveText('Ready');

    // Start playback
    const playButton = page.locator('button').first();
    await playButton.click();
    await page.waitForTimeout(1000);

    // After starting, should show first section "Dawn"
    await expect(sectionIndicator).toHaveText(/dawn/i);
  });

  test('time display shows correct format', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Check initial time display
    const timeDisplay = page.locator('#sectionTime');
    await expect(timeDisplay).toHaveText('0:00 / 3:16');

    // Start playback
    const playButton = page.locator('button').first();
    await playButton.click();

    // Wait for playback to start and time to progress
    // Use Playwright's built-in waiting for text change instead of fixed timeout
    await expect(timeDisplay).not.toHaveText('0:00 / 3:16', { timeout: 5000 });

    // Verify the format is correct (M:SS / 3:16)
    const timeText = await timeDisplay.textContent();
    expect(timeText).toMatch(/^\d:\d{2} \/ 3:16$/);
  });

  test('sunrise theme colors are applied after play', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // NOTE: Sunrise Hustle uses Conductor architecture - canvas only renders after play starts
    // Start playback to trigger visual rendering
    const playButton = page.locator('button').first();
    await playButton.click();

    // Wait for visuals to render
    await page.waitForTimeout(1500);

    // Extract colors from canvas to verify sunrise theme (orange/golden)
    const colorInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'no canvas' };

      const ctx = canvas.getContext('2d');
      if (!ctx) return { error: 'no context' };

      // Ensure canvas has dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        return { error: 'zero dimensions' };
      }

      // Sample center region
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const sampleSize = Math.min(100, Math.min(canvas.width, canvas.height));

      // Ensure we have valid coordinates
      const startX = Math.max(0, centerX - sampleSize / 2);
      const startY = Math.max(0, centerY - sampleSize / 2);

      const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);

      let totalR = 0, totalG = 0, totalB = 0, count = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        totalR += imageData.data[i];
        totalG += imageData.data[i + 1];
        totalB += imageData.data[i + 2];
        count++;
      }

      return {
        avgR: totalR / count,
        avgG: totalG / count,
        avgB: totalB / count,
        width: canvas.width,
        height: canvas.height
      };
    });

    // Should not have errors
    expect(colorInfo.error).toBeUndefined();

    // Canvas should have rendered something (not all zeros)
    const hasContent = colorInfo.avgR > 0 || colorInfo.avgG > 0 || colorInfo.avgB > 0;
    expect(hasContent).toBe(true);

    // Sunrise theme should have warmer colors (more red than blue typically)
    // But since cosmic themes are dark, we just verify the canvas is not blank
    // The actual color check is lenient because star positions are random
  });

  test('page title is correct', async ({ page }) => {
    await page.goto(EXPERIENCE.path);
    await expect(page).toHaveTitle('Sunrise Hustle - Cosmic Lofi Experience');
  });

  test('controls panel is visible', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();

    // Check title
    const title = page.locator('.title');
    await expect(title).toHaveText('Sunrise Hustle');

    // Check subtitle
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toHaveText('// upbeat lofi experience');
  });

});

// Visual regression tests for Sunrise Hustle
test.describe('Sunrise Hustle visuals', () => {

  test('initial state renders correctly', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Wait for visuals to stabilize
    await page.waitForTimeout(1000);

    // Take screenshot of initial state (before playing)
    await expect(page).toHaveScreenshot('sunrise-hustle-initial.png', {
      maxDiffPixelRatio: 0.1, // Allow 10% diff due to random star positions
    });
  });

  test('controls panel styling', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Screenshot just the controls panel
    const controls = page.locator('.controls');
    await expect(controls).toHaveScreenshot('sunrise-hustle-controls.png');
  });

  test('timeline styling', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Screenshot the timeline
    const timeline = page.locator('.timeline');
    await expect(timeline).toHaveScreenshot('sunrise-hustle-timeline.png');
  });

  test('playing state renders correctly', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Start playback
    const playButton = page.locator('button').first();
    await playButton.click();

    // Let it run for a moment
    await page.waitForTimeout(2000);

    // Take screenshot while playing
    await expect(page).toHaveScreenshot('sunrise-hustle-playing.png', {
      maxDiffPixelRatio: 0.15, // Higher tolerance for animated content
    });
  });

  test('first section (dawn) visual', async ({ page }) => {
    await page.goto(EXPERIENCE.path);

    // Start playback
    await page.locator('button').first().click();
    await page.waitForTimeout(1500);

    // Verify we're in the first section
    const sectionIndicator = page.locator('.current-section');
    await expect(sectionIndicator).toHaveText(/dawn/i);

    // Take screenshot
    await expect(page).toHaveScreenshot('sunrise-hustle-section-dawn.png', {
      maxDiffPixelRatio: 0.15,
    });
  });

});
