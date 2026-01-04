/**
 * SoundEngine - Base class for all sound engine modules
 *
 * Sound engines produce audio and emit AudioSignals for visual reactivity.
 * They are independent of any visual system.
 *
 * Implementation notes:
 * - Synths MUST be created AFTER Tone.start() is called
 * - Use Tone.Loop instead of Tone.Sequence (known timing bug with Sequence)
 * - Emit signals via getSignals() every frame for visual synchronization
 */

import { createSignals, DEFAULT_SIGNALS } from '../lib/signals.js';

/**
 * @typedef {Object} SoundMetadata
 * @property {string} name - Display name of the song
 * @property {number} bpm - Beats per minute
 * @property {number} duration - Total duration in seconds
 * @property {string[]} sections - List of section names in order
 */

/**
 * Base class for sound engines
 * @abstract
 */
export class SoundEngine {
  constructor() {
    /** @type {boolean} */
    this.isInitialized = false;

    /** @type {boolean} */
    this.isPlaying = false;

    /** @type {boolean} */
    this.isPaused = false;

    /** @type {number} */
    this.masterVolume = 0.8;

    /** @type {string} */
    this.currentSection = 'idle';

    /** @type {number} */
    this.currentBar = 0;

    /** @type {number} */
    this.currentBeat16th = 0;

    /** @type {boolean} */
    this._beatThisFrame = false;

    /** @protected */
    this._signals = createSignals();
  }

  /**
   * Initialize audio (call after user gesture)
   * Subclasses should override _initAudio() instead of this method
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isInitialized) {
      if (!this.isPlaying) {
        this._startPlayback();
      }
      return;
    }

    // Tone.start() must be called from user gesture
    await Tone.start();

    // Initialize audio nodes (synths, effects, loops)
    await this._initAudio();

    // Schedule song structure
    this._scheduleStructure();

    this.isInitialized = true;
    this._startPlayback();
  }

  /**
   * Stop all audio and reset to beginning
   */
  stop() {
    if (!this.isInitialized) return;

    this._stopPlayback();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    this.currentSection = 'idle';
    this.currentBar = 0;
    this.currentBeat16th = 0;
    this._signals = createSignals();
  }

  /**
   * Pause playback (keeps position)
   */
  pause() {
    if (!this.isPlaying || this.isPaused) return;

    Tone.Transport.pause();
    this.isPaused = true;
    this.isPlaying = false;
  }

  /**
   * Resume playback from paused position
   */
  resume() {
    if (!this.isPaused) return;

    Tone.Transport.start();
    this.isPaused = false;
    this.isPlaying = true;
  }

  /**
   * Get current AudioSignals for this frame
   * Call this every animation frame to get reactive data
   * @returns {import('../lib/signals.js').AudioSignals}
   */
  getSignals() {
    if (!this.isPlaying) {
      return { ...DEFAULT_SIGNALS };
    }

    // Update position from Transport
    this._updatePosition();

    // Update frequency-based signals (subclass should implement)
    this._updateSignals();

    // Copy signals and reset per-frame flags
    const signals = { ...this._signals };
    this._beatThisFrame = false;

    return signals;
  }

  /**
   * Set master volume
   * @param {number} volume - 0 to 1
   */
  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    // Convert to dB: 0 = -Infinity, 1 = 0dB
    // Using -30dB as minimum
    const dB = volume <= 0 ? -Infinity : -30 + (volume * 30);
    Tone.Destination.volume.value = dB;
  }

  /**
   * Get song metadata
   * @returns {SoundMetadata}
   * @abstract
   */
  getMetadata() {
    throw new Error('Subclass must implement getMetadata()');
  }

  /**
   * Jump to a specific bar
   * @param {number} bar - Bar number to jump to
   */
  jumpToBar(bar) {
    if (!this.isInitialized) return;

    Tone.Transport.position = `${bar}:0:0`;
    this._updatePosition();

    // Find and apply the section for this bar
    const metadata = this.getMetadata();
    const structure = this._getSongStructure();

    for (let i = structure.length - 1; i >= 0; i--) {
      if (bar >= structure[i].startBar) {
        this.currentSection = structure[i].name;
        this._applySection(structure[i].name, Tone.now());
        break;
      }
    }
  }

  /**
   * Trigger a beat signal (call from drum patterns)
   * @protected
   */
  _triggerBeat() {
    this._beatThisFrame = true;
    this._signals.beat = true;
  }

  /**
   * Update bar/beat position from Transport
   * @protected
   */
  _updatePosition() {
    const position = Tone.Transport.position;
    const parts = position.split(':');
    this.currentBar = parseInt(parts[0]) || 0;
    const beat = parseInt(parts[1]) || 0;
    const sixteenth = Math.floor(parseFloat(parts[2]) / 0.25) || 0;
    this.currentBeat16th = beat * 4 + sixteenth;

    this._signals.bar = this.currentBar;
    this._signals.beat16th = this.currentBeat16th;
    this._signals.section = this.currentSection;
    this._signals.tempo = Tone.Transport.bpm.value;
  }

  /**
   * Start playback (called after initialization)
   * @protected
   */
  _startPlayback() {
    this._startLoops();
    Tone.Transport.start();
    this.isPlaying = true;
    this.isPaused = false;
  }

  /**
   * Stop playback
   * @protected
   */
  _stopPlayback() {
    this._stopLoops();
    this.isPlaying = false;
    this.isPaused = false;
  }

  // ============================================================================
  // Abstract methods - subclasses MUST implement these
  // ============================================================================

  /**
   * Initialize all audio nodes (synths, effects, loops)
   * Called after Tone.start()
   * @returns {Promise<void>}
   * @protected
   * @abstract
   */
  async _initAudio() {
    throw new Error('Subclass must implement _initAudio()');
  }

  /**
   * Schedule song structure (section changes, automations)
   * @protected
   * @abstract
   */
  _scheduleStructure() {
    throw new Error('Subclass must implement _scheduleStructure()');
  }

  /**
   * Get the song structure array
   * @returns {Array<{name: string, startBar: number, bars: number}>}
   * @protected
   * @abstract
   */
  _getSongStructure() {
    throw new Error('Subclass must implement _getSongStructure()');
  }

  /**
   * Apply a section's configuration
   * @param {string} sectionName
   * @param {number} time - Tone.js time
   * @protected
   * @abstract
   */
  _applySection(sectionName, time) {
    throw new Error('Subclass must implement _applySection()');
  }

  /**
   * Start all loops
   * @protected
   * @abstract
   */
  _startLoops() {
    throw new Error('Subclass must implement _startLoops()');
  }

  /**
   * Stop all loops
   * @protected
   * @abstract
   */
  _stopLoops() {
    throw new Error('Subclass must implement _stopLoops()');
  }

  /**
   * Update signal values based on current audio state
   * Called every frame from getSignals()
   * @protected
   * @abstract
   */
  _updateSignals() {
    throw new Error('Subclass must implement _updateSignals()');
  }

  /**
   * Clean up all audio resources
   * @abstract
   */
  dispose() {
    throw new Error('Subclass must implement dispose()');
  }
}

export default SoundEngine;
