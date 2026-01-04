/**
 * Conductor - Bridge between sound engines and visual themes
 *
 * The conductor connects sounds to visuals and manages:
 * - Animation loop (requestAnimationFrame)
 * - Signal routing from sound to visual
 * - Crossfade transitions between visual themes
 * - Optional signal-to-reaction mapping
 */

import { DEFAULT_SIGNALS } from './signals.js';

/**
 * @typedef {Object} SignalMapping
 * @property {string[]} [beat] - Reactions to trigger on beat
 * @property {string[]} [bass] - Reactions to trigger on bass
 * @property {string[]} [highs] - Reactions to trigger on highs
 * @property {Object.<string, string>} [sections] - Section name to preset mapping
 */

/**
 * Conductor class - connects sound engines to visual themes
 */
export class Conductor {
  /**
   * Create a new Conductor
   * @param {HTMLCanvasElement} canvas - Canvas element for visuals
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {Object|null} Sound engine (implements SoundEngine interface) */
    this.sound = null;

    /** @type {Object|null} Active visual theme (implements VisualTheme interface) */
    this.visual = null;

    /** @type {Object|null} Visual being transitioned to during crossfade */
    this.transitionVisual = null;

    /** @type {number} Blend weight for crossfade (0 = old visual, 1 = new visual) */
    this.blendWeight = 1;

    /** @type {SignalMapping|null} Optional signal-to-reaction mapping */
    this.mapping = null;

    /** @type {number|null} Animation frame ID */
    this._animationId = null;

    /** @type {number} Last frame timestamp */
    this._lastTime = 0;

    /** @type {boolean} Whether the conductor is running */
    this._running = false;

    /** @type {boolean} Whether the conductor is paused */
    this._paused = false;

    /** @type {string} Last section name (for detecting section changes) */
    this._lastSection = '';

    /** @type {function|null} Resolve function for crossfade promise */
    this._crossfadeResolve = null;

    /** @type {number} Crossfade start time */
    this._crossfadeStartTime = 0;

    /** @type {number} Crossfade duration in ms */
    this._crossfadeDuration = 0;
  }

  /**
   * Set the active sound engine
   * @param {Object} sound - Sound engine implementing SoundEngine interface
   */
  setSound(sound) {
    this.sound = sound;
  }

  /**
   * Set the active visual theme
   * @param {Object} visual - Visual theme implementing VisualTheme interface
   */
  setVisual(visual) {
    // Dispose old visual if it exists and has dispose method
    if (this.visual && typeof this.visual.dispose === 'function') {
      this.visual.dispose();
    }
    this.visual = visual;
  }

  /**
   * Set optional signal-to-reaction mapping
   * @param {SignalMapping} mapping - Mapping configuration
   */
  setMapping(mapping) {
    this.mapping = mapping;
  }

  /**
   * Start the conductor (sound + animation loop)
   * @returns {Promise<void>}
   */
  async start() {
    if (this._running) return;

    // Start sound if available
    if (this.sound && typeof this.sound.start === 'function') {
      await this.sound.start();
    }

    this._running = true;
    this._paused = false;
    this._lastTime = performance.now();
    this._tick();
  }

  /**
   * Stop the conductor (sound + animation)
   */
  stop() {
    this._running = false;
    this._paused = false;

    // Cancel animation frame
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    // Stop sound if available
    if (this.sound && typeof this.sound.stop === 'function') {
      this.sound.stop();
    }

    // Reset state
    this._lastSection = '';
    this._crossfadeResolve = null;
  }

  /**
   * Pause the conductor (sound + animation)
   */
  pause() {
    if (!this._running || this._paused) return;

    this._paused = true;

    // Pause sound if available
    if (this.sound && typeof this.sound.pause === 'function') {
      this.sound.pause();
    }
  }

  /**
   * Resume the conductor after pause
   */
  resume() {
    if (!this._running || !this._paused) return;

    this._paused = false;
    this._lastTime = performance.now();

    // Resume sound if available
    if (this.sound && typeof this.sound.resume === 'function') {
      this.sound.resume();
    }

    // Restart animation loop
    this._tick();
  }

  /**
   * Crossfade to a new visual theme
   * @param {Object} newVisual - New visual theme to transition to
   * @param {number} [duration=2000] - Transition duration in milliseconds
   * @returns {Promise<void>} Resolves when crossfade completes
   */
  async crossfadeTo(newVisual, duration = 2000) {
    return new Promise((resolve) => {
      this.transitionVisual = newVisual;
      this.blendWeight = 0;
      this._crossfadeStartTime = performance.now();
      this._crossfadeDuration = duration;
      this._crossfadeResolve = resolve;
    });
  }

  /**
   * Main animation tick - called every frame
   * @private
   */
  _tick() {
    if (!this._running || this._paused) return;

    const now = performance.now();
    const deltaTime = Math.min(now - this._lastTime, 50); // Cap at 50ms (20fps min)
    this._lastTime = now;

    // Process the frame
    this.tick(deltaTime);

    // Schedule next frame
    this._animationId = requestAnimationFrame(() => this._tick());
  }

  /**
   * Process a single frame - can be called externally for testing
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  tick(deltaTime) {
    // Get signals from sound engine, or use defaults
    const signals = this.sound && typeof this.sound.getSignals === 'function'
      ? this.sound.getSignals()
      : { ...DEFAULT_SIGNALS };

    // Apply mapping if configured
    this._applyMapping(signals);

    // Update crossfade if in progress
    if (this.transitionVisual) {
      this._updateCrossfade();
    }

    // Update and render visuals
    if (this.transitionVisual) {
      // During crossfade: update and render both visuals
      this._renderCrossfade(signals, deltaTime);
    } else if (this.visual) {
      // Normal: update and render single visual
      this._updateVisual(this.visual, signals, deltaTime);
      this._renderVisual(this.visual);
    }
  }

  /**
   * Apply signal mapping to trigger reactions
   * @private
   * @param {Object} signals - Current audio signals
   */
  _applyMapping(signals) {
    if (!this.mapping || !this.visual) return;

    // Handle beat reactions
    if (signals.beat && this.mapping.beat) {
      this.mapping.beat.forEach((reaction) => {
        this._triggerReaction(reaction, signals);
      });
    }

    // Handle section changes
    if (signals.section !== this._lastSection && this.mapping.sections) {
      const preset = this.mapping.sections[signals.section];
      if (preset && typeof this.visual.applyPreset === 'function') {
        this.visual.applyPreset(preset);
      }
      this._lastSection = signals.section;
    }
  }

  /**
   * Trigger a named reaction on the visual
   * @private
   * @param {string} reaction - Reaction name
   * @param {Object} signals - Current audio signals
   */
  _triggerReaction(reaction, signals) {
    if (!this.visual) return;

    // Map common reaction names to visual methods
    switch (reaction) {
      case 'shootingStar':
        if (typeof this.visual.spawnShootingStar === 'function') {
          this.visual.spawnShootingStar();
        }
        break;
      case 'pulse':
        if (typeof this.visual.setPulse === 'function') {
          this.visual.setPulse(signals.bass || 0.5);
        }
        break;
      // Add more reaction mappings as needed
      default:
        // Try calling the method directly if it exists
        if (typeof this.visual[reaction] === 'function') {
          this.visual[reaction](signals);
        }
    }
  }

  /**
   * Update crossfade progress
   * @private
   */
  _updateCrossfade() {
    const elapsed = performance.now() - this._crossfadeStartTime;
    this.blendWeight = Math.min(elapsed / this._crossfadeDuration, 1);

    // Complete crossfade
    if (this.blendWeight >= 1) {
      // Dispose old visual
      if (this.visual && typeof this.visual.dispose === 'function') {
        this.visual.dispose();
      }

      // New visual becomes current
      this.visual = this.transitionVisual;
      this.transitionVisual = null;
      this.blendWeight = 1;

      // Resolve promise
      if (this._crossfadeResolve) {
        this._crossfadeResolve();
        this._crossfadeResolve = null;
      }
    }
  }

  /**
   * Render during crossfade - both visuals with blend weights
   * @private
   * @param {Object} signals - Current audio signals
   * @param {number} deltaTime - Time since last frame
   */
  _renderCrossfade(signals, deltaTime) {
    // Set blend weights
    if (typeof this.visual.setBlendWeight === 'function') {
      this.visual.setBlendWeight(1 - this.blendWeight);
    }
    if (typeof this.transitionVisual.setBlendWeight === 'function') {
      this.transitionVisual.setBlendWeight(this.blendWeight);
    }

    // Update both visuals
    this._updateVisual(this.visual, signals, deltaTime);
    this._updateVisual(this.transitionVisual, signals, deltaTime);

    // Render both (order matters - new visual on top)
    this._renderVisual(this.visual);
    this._renderVisual(this.transitionVisual);
  }

  /**
   * Update a visual theme with signals
   * @private
   * @param {Object} visual - Visual theme to update
   * @param {Object} signals - Current audio signals
   * @param {number} deltaTime - Time since last frame
   */
  _updateVisual(visual, signals, deltaTime) {
    if (!visual) return;

    if (typeof visual.update === 'function') {
      // Check if visual uses old interface (audioFeatures, intensity) or new (signals, deltaTime)
      // CosmicVisuals uses (audioFeatures, intensity) format
      if (visual.constructor.name === 'CosmicVisuals') {
        // Adapt signals to CosmicVisuals format
        const audioFeatures = {
          rms: signals.intensity,
          bass: signals.bass,
          mid: signals.mids,
          high: signals.highs,
          bands: [
            signals.bass,
            signals.bass * 0.8,
            signals.mids,
            signals.mids * 0.8,
            signals.highs * 0.8,
            signals.highs,
            signals.highs * 0.6,
            signals.highs * 0.4
          ],
          pulse: signals.beat ? 1 : 0
        };
        visual.update(audioFeatures, signals.intensity);
      } else {
        // Standard interface: (signals, deltaTime)
        visual.update(signals, deltaTime);
      }
    }
  }

  /**
   * Render a visual theme
   * @private
   * @param {Object} visual - Visual theme to render
   */
  _renderVisual(visual) {
    if (!visual) return;

    // CosmicVisuals uses draw() instead of render()
    if (typeof visual.render === 'function') {
      visual.render();
    } else if (typeof visual.draw === 'function') {
      visual.draw();
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    // Dispose visuals
    if (this.visual && typeof this.visual.dispose === 'function') {
      this.visual.dispose();
    }
    if (this.transitionVisual && typeof this.transitionVisual.dispose === 'function') {
      this.transitionVisual.dispose();
    }

    this.sound = null;
    this.visual = null;
    this.transitionVisual = null;
    this.mapping = null;
    this.canvas = null;
  }
}

export default Conductor;
