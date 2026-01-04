/**
 * CosmicVisuals Presets
 *
 * Named configurations for different moods and experiences.
 * Each preset overrides specific DEFAULT_CONFIG values.
 */

/**
 * Calm preset - Space Drift style
 * Slow, ambient, purple tones
 */
export const calm = {
  // Star field
  starSpeeds: [0.05, 0.15, 0.3],

  // Aurora
  enableAurora: true,
  auroraSpeed: 0.003,

  // Colors
  baseHue: 260,  // Purple
  hueShiftSpeed: 0.0001,
  hueShiftRange: 20,

  // Nebula
  nebulaHueRange: [240, 60],

  // No intensity scaling (static mood)
  intensityScalesSpeed: false,
  intensityScalesSize: false,
  intensityScalesColors: false
};

/**
 * Dynamic preset - Supernova style
 * Reactive, shifts from purple to orange with intensity
 */
export const dynamic = {
  // Star field (faster)
  starSpeeds: [0.1, 0.3, 0.6],

  // Aurora
  enableAurora: true,
  auroraSpeed: 0.005,

  // Colors (purple to orange)
  baseHue: 260,
  intensityHue: 30,
  hueShiftSpeed: 0.0002,
  hueShiftRange: 30,

  // Nebula (wider range)
  nebulaCount: 35,
  nebulaHueRange: [240, 80],

  // More shooting stars
  maxShootingStars: 8,

  // Enable intensity-based dynamics
  intensityScalesSpeed: true,
  intensityScalesSize: true,
  intensityScalesColors: true
};

/**
 * Intense preset - Climax moments
 * Maximum visual energy
 */
export const intense = {
  // Fast stars
  starSpeeds: [0.2, 0.5, 1.0],

  // Fast aurora
  enableAurora: true,
  auroraSpeed: 0.01,

  // Hot colors
  baseHue: 30,
  intensityHue: 15,
  hueShiftRange: 40,

  // Many shooting stars
  maxShootingStars: 10,

  // Full intensity scaling
  intensityScalesSpeed: true,
  intensityScalesSize: true,
  intensityScalesColors: true
};

/**
 * Sunrise preset - Sunrise Hustle style
 * Warm, upbeat, orange/golden tones
 */
export const sunrise = {
  // Star field (medium speed, upbeat)
  starSpeeds: [0.08, 0.2, 0.45],

  // Aurora (warm, gentle)
  enableAurora: true,
  auroraSpeed: 0.004,

  // Sunrise colors
  baseHue: 30,           // Orange base
  intensityHue: 45,      // Golden for intensity
  hueShiftSpeed: 0.00015,
  hueShiftRange: 25,

  // Warm nebula colors
  nebulaCount: 25,
  nebulaHueRange: [20, 50],  // Orange to yellow-orange range

  // Moderate shooting stars
  maxShootingStars: 3,

  // Central glow positioned higher (rising sun)
  enableCentralGlow: true,
  centralGlowY: 0.35,

  // Moderate intensity scaling (upbeat but not overwhelming)
  intensityScalesSpeed: true,
  intensityScalesSize: false,
  intensityScalesColors: true
};

/**
 * All presets exported as a single object
 */
export const presets = {
  calm,
  dynamic,
  intense,
  sunrise
};

export default presets;
