# Lofi Audio-Visual Architecture

> Design doc for decoupled, signal-based audio-visual system

## Overview

This architecture enables **any sound to drive any visual theme** through a standardized signal interface. Sounds and visuals are independent modules connected by a conductor/bridge.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     SOUNDS      │────▶│   CONDUCTOR     │────▶│     VISUALS     │
│                 │     │                 │     │                 │
│ Emits signals   │     │ Routes signals  │     │ Reacts to       │
│ every frame     │     │ Manages blend   │     │ signals         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Directory Structure

```
lofi/
  lib/
    utils.js              # Shared utilities (lerp, clamp, easing)
    audio-analysis.js     # Frequency analysis helpers
    conductor.js          # Bridge between sound and visuals
    signals.js            # AudioSignals type definitions

  visuals/                # Standalone visual themes
    base.js               # VisualTheme base class/interface
    cosmic/
      index.js            # CosmicVisuals implementation
      presets.js          # Configuration presets
    ocean/                # Future: waves, fish, coral
    city/                 # Future: rain, neon, traffic
    forest/               # Future: trees, fireflies, rain

  sounds/                 # Standalone audio engines
    base.js               # SoundEngine base class/interface
    space-drift.js        # Calm ambient sound
    supernova.js          # Dynamic climactic sound

  experiences/            # Combined audio + visuals + mapping
    space-drift.html
    supernova.html
    index.html            # Gallery/selector

  demos/                  # Learning demos (unchanged)
```

---

## Interfaces

### AudioSignals

Emitted by sound engines every frame. Visuals consume these without knowing the source.

```javascript
/**
 * @typedef {Object} AudioSignals
 * @property {boolean} beat      - True on drum hit this frame
 * @property {number} bass       - Low frequency energy (0-1)
 * @property {number} mids       - Mid frequency energy (0-1)
 * @property {number} highs      - High frequency energy (0-1)
 * @property {number} intensity  - Overall energy/loudness (0-1)
 * @property {string} section    - Current section name ('intro', 'verse', 'chorus', 'outro')
 * @property {number} tempo      - BPM
 * @property {number} bar        - Current bar number
 * @property {number} beat16th   - Position within bar (0-15)
 */
```

### SoundEngine

Base interface for all sound modules.

```javascript
/**
 * @interface SoundEngine
 */
class SoundEngine {
  /**
   * Initialize audio (call after user gesture)
   * @returns {Promise<void>}
   */
  async start() {}

  /**
   * Stop all audio
   */
  stop() {}

  /**
   * Pause playback
   */
  pause() {}

  /**
   * Resume playback
   */
  resume() {}

  /**
   * Get current signals for this frame
   * @returns {AudioSignals}
   */
  getSignals() {}

  /**
   * Set master volume
   * @param {number} volume - 0-1
   */
  setVolume(volume) {}

  /**
   * Get song metadata
   * @returns {{ name: string, bpm: number, duration: number, sections: string[] }}
   */
  getMetadata() {}
}
```

### VisualTheme

Base interface for all visual themes.

```javascript
/**
 * @interface VisualTheme
 */
class VisualTheme {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} config - Theme-specific configuration
   */
  constructor(canvas, config = {}) {}

  /**
   * Update visual state based on audio signals
   * @param {AudioSignals} signals
   * @param {number} deltaTime - ms since last frame
   */
  update(signals, deltaTime) {}

  /**
   * Render current state to canvas
   */
  render() {}

  /**
   * Clean up resources
   */
  dispose() {}

  /**
   * Get particles for morphing to another theme
   * @returns {Particle[]}
   */
  getParticles() {}

  /**
   * Set blend weight for crossfade transitions
   * @param {number} weight - 0 (invisible) to 1 (fully visible)
   */
  setBlendWeight(weight) {}

  /**
   * Apply a preset configuration
   * @param {string} presetName
   */
  applyPreset(presetName) {}
}
```

### Particle (shared format for morphing)

```javascript
/**
 * @typedef {Object} Particle
 * @property {number} x          - X position (0-1, normalized)
 * @property {number} y          - Y position (0-1, normalized)
 * @property {number} size       - Particle size
 * @property {number} opacity    - 0-1
 * @property {string} color      - CSS color string
 * @property {string} type       - 'star', 'drop', 'firefly', etc.
 * @property {Object} velocity   - { x, y } movement vector
 */
```

---

## Conductor

The conductor connects sounds to visuals and manages transitions.

```javascript
class Conductor {
  constructor(canvas) {
    this.canvas = canvas;
    this.sound = null;
    this.visual = null;
    this.transitionVisual = null;  // For crossfades
    this.blendWeight = 1;
  }

  /**
   * Set the active sound engine
   */
  setSound(sound) {}

  /**
   * Set the active visual theme
   */
  setVisual(visual) {}

  /**
   * Crossfade to a new visual theme
   * @param {VisualTheme} newVisual
   * @param {number} duration - ms
   */
  async crossfadeTo(newVisual, duration = 2000) {}

  /**
   * Main loop - call every frame
   */
  tick(deltaTime) {
    const signals = this.sound?.getSignals() ?? DEFAULT_SIGNALS;

    // Update and render active visual(s)
    if (this.transitionVisual) {
      this.visual.setBlendWeight(1 - this.blendWeight);
      this.transitionVisual.setBlendWeight(this.blendWeight);

      this.visual.update(signals, deltaTime);
      this.transitionVisual.update(signals, deltaTime);

      this.visual.render();
      this.transitionVisual.render();
    } else {
      this.visual.update(signals, deltaTime);
      this.visual.render();
    }
  }
}
```

---

## Signal Mapping (Optional Layer)

For custom signal→reaction mappings per experience:

```javascript
const mapping = {
  // Signal triggers these reactions
  beat: ['pulse', 'shootingStar'],
  bass: ['centralGlow', 'colorWarm'],
  highs: ['starTwinkle', 'auroraIntensity'],

  // Section changes trigger preset switches
  sections: {
    intro: 'calm',
    chorus: 'intense',
    outro: 'fadeOut'
  }
};

// Conductor applies mapping
conductor.setMapping(mapping);
```

---

## Visual Theme Presets

Each theme has presets for different moods:

```javascript
// visuals/cosmic/presets.js
export const presets = {
  calm: {
    starSpeeds: [0.05, 0.15, 0.3],
    enableAurora: true,
    auroraSpeed: 0.003,
    baseHue: 260,  // Purple
    intensityScalesSpeed: false
  },

  dynamic: {
    starSpeeds: [0.1, 0.3, 0.6],
    enableAurora: true,
    auroraSpeed: 0.005,
    baseHue: 260,
    intensityHue: 30,  // Shifts toward orange
    intensityScalesSpeed: true,
    intensityScalesColors: true
  },

  intense: {
    starSpeeds: [0.2, 0.5, 1.0],
    maxShootingStars: 10,
    enableAurora: true,
    auroraSpeed: 0.01,
    intensityScalesSpeed: true,
    intensityScalesSize: true,
    intensityScalesColors: true
  }
};
```

---

## Transitions Between Themes

### Crossfade
Two canvases (or one with alpha blending), blend weight animates from 0→1.

### Morph
Particles from theme A transform into particles for theme B:
1. Get particles from both themes
2. Match particles by proximity
3. Animate position, size, color over duration
4. Stars become raindrops, fireflies become stars, etc.

### Section-Based
Same theme, different preset. On section change, smoothly interpolate config values.

---

## Experience File Structure

```html
<!-- experiences/space-drift.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Space Drift</title>
  <script src="https://unpkg.com/tone@14"></script>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { Conductor } from '../lib/conductor.js';
    import { SpaceDriftSound } from '../sounds/space-drift.js';
    import { CosmicVisuals } from '../visuals/cosmic/index.js';

    const canvas = document.getElementById('canvas');
    const conductor = new Conductor(canvas);

    // Wire up sound and visuals
    conductor.setSound(new SpaceDriftSound());
    conductor.setVisual(new CosmicVisuals(canvas, { preset: 'calm' }));

    // Optional: custom signal mapping
    conductor.setMapping({
      beat: ['shootingStar'],
      sections: { chorus: 'dynamic', outro: 'calm' }
    });

    // Start on click
    canvas.onclick = () => conductor.start();
  </script>
</body>
</html>
```

---

## Migration Path

1. **Keep existing songs working** - Don't break space-drift.html or supernova.html
2. **Extract incrementally** - Move one piece at a time
3. **Test each step** - Verify audio-visual sync after each change

### Steps
1. Create `lib/signals.js` with AudioSignals type
2. Create `visuals/base.js` with VisualTheme interface
3. Refactor `CosmicVisuals` to implement interface (keep in lib/ for now)
4. Create `sounds/base.js` with SoundEngine interface
5. Extract `space-drift.js` sound module
6. Create `lib/conductor.js`
7. Update one experience to use new architecture
8. Move visuals to `visuals/cosmic/`
9. Repeat for supernova
10. Test crossfade between themes

---

## Future Visual Themes

| Theme | Elements | Mood |
|-------|----------|------|
| **ocean** | Waves, fish, bubbles, coral, light rays | Peaceful, deep |
| **city** | Rain, neon signs, traffic lights, reflections | Urban, melancholy |
| **forest** | Trees, fireflies, falling leaves, mist | Natural, mystical |
| **abstract** | Geometric shapes, color fields, patterns | Modern, minimal |

Each theme implements the same `VisualTheme` interface, making them interchangeable.
