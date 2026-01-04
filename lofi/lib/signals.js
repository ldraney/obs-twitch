/**
 * Audio Signals - Standard interface for sound-to-visual communication
 *
 * Sound engines emit these signals every frame.
 * Visual themes consume them without knowing the source.
 */

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

/**
 * Default signals when no audio is playing
 * @type {AudioSignals}
 */
export const DEFAULT_SIGNALS = {
  beat: false,
  bass: 0,
  mids: 0,
  highs: 0,
  intensity: 0,
  section: 'idle',
  tempo: 0,
  bar: 0,
  beat16th: 0
};

/**
 * Create a new signals object with default values
 * @returns {AudioSignals}
 */
export function createSignals() {
  return { ...DEFAULT_SIGNALS };
}

/**
 * Interpolate between two signal states (for smooth transitions)
 * @param {AudioSignals} from - Starting signals
 * @param {AudioSignals} to - Target signals
 * @param {number} t - Interpolation factor (0-1)
 * @returns {AudioSignals}
 */
export function lerpSignals(from, to, t) {
  return {
    beat: t > 0.5 ? to.beat : from.beat,
    bass: from.bass + (to.bass - from.bass) * t,
    mids: from.mids + (to.mids - from.mids) * t,
    highs: from.highs + (to.highs - from.highs) * t,
    intensity: from.intensity + (to.intensity - from.intensity) * t,
    section: t > 0.5 ? to.section : from.section,
    tempo: t > 0.5 ? to.tempo : from.tempo,
    bar: t > 0.5 ? to.bar : from.bar,
    beat16th: t > 0.5 ? to.beat16th : from.beat16th
  };
}
