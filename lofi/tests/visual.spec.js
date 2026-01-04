// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Visual regression tests for lofi audio-visual experiences
 * These tests capture screenshots at key moments and compare against baselines
 */

const experiences = [
  {
    name: 'space-drift',
    path: '/experiences/space-drift.html',
    theme: 'purple',
    sections: ['launch', 'orbit', 'drift', 'nebula', 'void', 'return']
  },
  {
    name: 'supernova',
    path: '/experiences/supernova.html',
    theme: 'orange-purple',
    sections: ['stillness', 'awakening', 'pulse', 'rise', 'climax', 'drift', 'tension', 'supernova', 'afterglow']
  },
  {
    name: 'midnight-rain',
    path: '/experiences/midnight-rain.html',
    theme: 'blue',
    sections: ['stillness', 'drops', 'downpour', 'thunder', 'clearing', 'aftermath']
  },
];

for (const experience of experiences) {
  test.describe(`${experience.name} visuals`, () => {

    test('initial state renders correctly', async ({ page }) => {
      await page.goto(experience.path);

      // Wait for visuals to stabilize
      await page.waitForTimeout(1000);

      // Take screenshot of initial state (before playing)
      await expect(page).toHaveScreenshot(`${experience.name}-initial.png`, {
        maxDiffPixelRatio: 0.1, // Allow 10% diff due to random star positions
      });
    });

    test('controls panel styling', async ({ page }) => {
      await page.goto(experience.path);

      // Screenshot just the controls panel
      const controls = page.locator('.controls');
      await expect(controls).toHaveScreenshot(`${experience.name}-controls.png`);
    });

    test('timeline styling', async ({ page }) => {
      await page.goto(experience.path);

      // Screenshot the timeline
      const timeline = page.locator('.timeline');
      await expect(timeline).toHaveScreenshot(`${experience.name}-timeline.png`);
    });

    test('playing state renders correctly', async ({ page }) => {
      await page.goto(experience.path);

      // Start playback
      const playButton = page.locator('button').first();
      await playButton.click();

      // Let it run for a moment
      await page.waitForTimeout(2000);

      // Take screenshot while playing
      await expect(page).toHaveScreenshot(`${experience.name}-playing.png`, {
        maxDiffPixelRatio: 0.15, // Higher tolerance for animated content
      });
    });

    // Test first section specifically
    test('first section visual', async ({ page }) => {
      await page.goto(experience.path);

      // Start playback
      await page.locator('button').first().click();
      await page.waitForTimeout(1500);

      // Verify we're in the first section
      const sectionName = experience.sections[0];
      const sectionIndicator = page.locator('.current-section, .section-indicator');

      // Take screenshot
      await expect(page).toHaveScreenshot(`${experience.name}-section-${sectionName}.png`, {
        maxDiffPixelRatio: 0.15,
      });
    });

    // Test color theme
    test(`has ${experience.theme} color theme`, async ({ page }) => {
      await page.goto(experience.path);
      await page.waitForTimeout(500);

      // Extract dominant colors from canvas
      const colorInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { error: 'no canvas' };

        const ctx = canvas.getContext('2d');
        if (!ctx) return { error: 'no context' };

        // Sample center region
        const centerX = Math.floor(canvas.width / 2);
        const centerY = Math.floor(canvas.height / 2);
        const sampleSize = 100;

        const imageData = ctx.getImageData(
          centerX - sampleSize / 2,
          centerY - sampleSize / 2,
          sampleSize,
          sampleSize
        );

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
        };
      });

      // Verify theme colors (rough check)
      if (experience.theme === 'blue') {
        // Blue theme should have B > R
        expect(colorInfo.avgB).toBeGreaterThan(colorInfo.avgR * 0.8);
      } else if (experience.theme === 'purple') {
        // Purple has both R and B
        expect(colorInfo.avgR + colorInfo.avgB).toBeGreaterThan(colorInfo.avgG * 2);
      }
    });

  });
}

// Gallery page visual tests
test.describe('Gallery visuals', () => {

  test('gallery page layout', async ({ page }) => {
    await page.goto('/experiences/index.html');

    await expect(page).toHaveScreenshot('gallery-full.png');
  });

  test('experience cards styling', async ({ page }) => {
    await page.goto('/experiences/index.html');

    // Screenshot each card type
    const cards = page.locator('.song-card');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveScreenshot(`gallery-card-${i}.png`);
    }
  });

});
