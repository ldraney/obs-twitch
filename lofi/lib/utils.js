/**
 * Utility functions for lofi visualizations
 */

/**
 * Linear interpolation between two values
 * @param {number} current - Current value
 * @param {number} target - Target value
 * @param {number} factor - Interpolation factor (0-1)
 * @returns {number}
 */
export function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

/**
 * Map a value from one range to another
 * @param {number} value - Input value
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number}
 */
export function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum bound
 * @param {number} max - Maximum bound
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Create a smoother function for gradual value transitions
 * @param {number} factor - Smoothing factor (lower = slower, 0.1 is typical)
 * @returns {function(number): number}
 */
export function createSmoother(factor = 0.1) {
  let value = null;
  return function smooth(target) {
    if (value === null) value = target;
    else value = lerp(value, target, factor);
    return value;
  };
}

/**
 * Create a set of smoothers for audio band analysis
 * @param {number} bandCount - Number of frequency bands
 * @param {Object} factors - Smoothing factors for each feature type
 * @returns {Object} Smoothers object
 */
export function createAudioSmoothers(bandCount = 8, factors = {}) {
  const defaults = {
    rms: 0.12,
    bass: 0.15,
    mid: 0.1,
    high: 0.2,
    bands: 0.15
  };
  const f = { ...defaults, ...factors };

  return {
    rms: createSmoother(f.rms),
    bass: createSmoother(f.bass),
    mid: createSmoother(f.mid),
    high: createSmoother(f.high),
    bands: Array.from({ length: bandCount }, () => createSmoother(f.bands))
  };
}
