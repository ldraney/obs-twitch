/**
 * CosmicVisuals - Reusable cosmic visual system for lofi songs
 *
 * Features:
 * - Star field with parallax layers
 * - Nebula particles (drifting clouds)
 * - Aurora waves (frequency-reactive)
 * - Central glow (bass-reactive)
 * - Shooting stars (triggered on demand)
 * - Background gradient with color shifting
 */

import { lerp } from './utils.js';

/**
 * Default configuration for cosmic visuals
 */
const DEFAULT_CONFIG = {
  // Star field
  starLayers: 3,
  starsPerLayer: [200, 150, 100],
  starSpeeds: [0.1, 0.3, 0.6],
  starSizes: [1, 1.5, 2.5],

  // Nebula
  nebulaCount: 30,
  nebulaHueRange: [240, 60], // [baseHue, range]

  // Aurora
  enableAurora: true,
  auroraSpeed: 0.005,

  // Central glow
  enableCentralGlow: true,
  centralGlowY: 0.4, // Position as fraction of height

  // Shooting stars
  maxShootingStars: 5,

  // Colors
  baseHue: 260, // Purple base (calm)
  intensityHue: 30, // Orange/red (climax) - used when intensity > 0
  hueShiftSpeed: 0.0001, // How fast hue drifts
  hueShiftRange: 30, // How far hue can drift from base

  // Intensity scaling (for dynamic songs like Supernova)
  intensityScalesSpeed: false, // Scale star/nebula speed by intensity
  intensityScalesSize: false, // Scale star/glow sizes by intensity
  intensityScalesColors: false // Shift colors from baseHue to intensityHue
};

/**
 * CosmicVisuals class for rendering reactive space backgrounds
 */
export class CosmicVisuals {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas element to draw on
   * @param {Object} config - Configuration options (merged with defaults)
   */
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Visual state
    this.starLayers = [];
    this.shootingStars = [];
    this.nebulaParticles = [];
    this.auroraPhase = 0;
    this.cosmicHue = this.config.baseHue;
    this.pulseIntensity = 0;

    // Time tracking
    this.lastTime = performance.now();

    // Initialize
    this.initStarField();
    this.initNebulaParticles();

    // Handle resize
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  /**
   * Resize canvas and reinitialize particles
   */
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initStarField();
    this.initNebulaParticles();
  }

  /**
   * Initialize star field layers
   */
  initStarField() {
    const { starLayers: layerCount, starsPerLayer } = this.config;
    this.starLayers = [];

    for (let layer = 0; layer < layerCount; layer++) {
      const stars = [];
      const count = starsPerLayer[layer] || 100;

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.03,
          baseAlpha: 0.3 + Math.random() * 0.7
        });
      }
      this.starLayers.push(stars);
    }
  }

  /**
   * Initialize nebula particles
   */
  initNebulaParticles() {
    const { nebulaCount, nebulaHueRange } = this.config;
    this.nebulaParticles = [];

    for (let i = 0; i < nebulaCount; i++) {
      this.nebulaParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: 50 + Math.random() * 150,
        hue: nebulaHueRange[0] + Math.random() * nebulaHueRange[1],
        alpha: 0.02 + Math.random() * 0.03,
        driftX: (Math.random() - 0.5) * 0.2,
        driftY: (Math.random() - 0.5) * 0.1
      });
    }
  }

  /**
   * Spawn a shooting star
   */
  spawnShootingStar() {
    if (this.shootingStars.length >= this.config.maxShootingStars) return;

    this.shootingStars.push({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height * 0.5,
      vx: 8 + Math.random() * 8,
      vy: 4 + Math.random() * 4,
      life: 1,
      length: 30 + Math.random() * 50
    });
  }

  /**
   * Set pulse intensity (for bass hits)
   * @param {number} intensity - Pulse intensity (0-1)
   */
  setPulse(intensity) {
    this.pulseIntensity = Math.max(this.pulseIntensity, intensity);
  }

  /**
   * Update visual state
   * @param {Object} audioFeatures - Audio analysis features
   * @param {number} audioFeatures.rms - Overall loudness (0-1)
   * @param {number} audioFeatures.bass - Bass level (0-1)
   * @param {number} audioFeatures.mid - Mid level (0-1)
   * @param {number} audioFeatures.high - High level (0-1)
   * @param {number[]} audioFeatures.bands - Frequency band levels
   * @param {number} audioFeatures.pulse - Beat pulse intensity
   * @param {number} intensity - Overall intensity multiplier (0-1)
   */
  update(audioFeatures = {}, intensity = 0.5) {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Default audio features if not provided
    const features = {
      rms: 0,
      bass: 0,
      mid: 0,
      high: 0,
      bands: new Array(8).fill(0),
      pulse: 0,
      ...audioFeatures
    };

    // Update cosmic hue - either static or intensity-based
    const { baseHue, intensityHue, hueShiftSpeed, hueShiftRange, intensityScalesColors } = this.config;
    if (intensityScalesColors) {
      // Shift from baseHue (calm) to intensityHue (climax) based on intensity
      this.cosmicHue = lerp(baseHue, intensityHue, intensity) + Math.sin(now * hueShiftSpeed) * (hueShiftRange * (1 - intensity * 0.5));
    } else {
      this.cosmicHue = baseHue + Math.sin(now * hueShiftSpeed) * hueShiftRange;
    }

    // Decay pulse - faster decay at high intensity
    const decayRate = this.config.intensityScalesSpeed ? 0.92 : 0.94;
    this.pulseIntensity *= decayRate;

    // Use audio pulse if provided (scale by intensity for dynamic songs)
    if (features.pulse > 0) {
      const scaledPulse = this.config.intensityScalesSize ? features.pulse * (1 + intensity) : features.pulse;
      this.setPulse(scaledPulse);
    }

    // Update aurora phase (faster at high intensity if enabled)
    if (this.config.enableAurora) {
      const auroraSpeed = this.config.intensityScalesSpeed
        ? this.config.auroraSpeed * (1 + intensity * 2)
        : this.config.auroraSpeed;
      this.auroraPhase += auroraSpeed;
    }

    // Store for drawing
    this._dt = dt;
    this._features = features;
    this._intensity = intensity;
    this._now = now;
  }

  /**
   * Draw all visual layers
   */
  draw() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const dt = this._dt || 0.016;
    const features = this._features || { rms: 0, bass: 0, mid: 0, high: 0, bands: new Array(8).fill(0) };
    const intensity = this._intensity || 0.5;

    // Scale features by intensity
    const scaledFeatures = {
      rms: features.rms * intensity,
      bass: features.bass * intensity,
      mid: features.mid * intensity,
      high: features.high * intensity,
      bands: features.bands.map(b => b * intensity)
    };

    // 1. Background gradient
    this._drawBackground(width, height, scaledFeatures.rms, scaledFeatures.bass);

    // 2. Nebula clouds
    this._drawNebulaParticles(width, height, scaledFeatures.mid);

    // 3. Aurora waves
    if (this.config.enableAurora) {
      this._drawAurora(width, height, scaledFeatures.bands);
    }

    // 4. Central glow
    if (this.config.enableCentralGlow) {
      this._drawCentralGlow(width, height, scaledFeatures.rms, scaledFeatures.bass);
    }

    // 5. Star field
    this._drawStarField(width, height, scaledFeatures.rms, dt);

    // 6. Shooting stars
    this._drawShootingStars(width, height, dt);

    // 7. Bass pulse overlay (also shown at high intensity for climax)
    const showPulse = this.pulseIntensity > 0.1 ||
      (this.config.intensityScalesColors && intensity > 0.5);
    if (showPulse) {
      this._drawPulseOverlay(width, height);
    }
  }

  /**
   * Draw deep space background gradient
   */
  _drawBackground(width, height, rms, bass) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesColors, intensityScalesSize } = this.config;

    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.8
    );

    // Intensity affects pulse amount and lightness
    const intensityBoost = intensityScalesSize ? (1 + intensity) : 1;
    const pulseAmount = bass * 0.15 * intensityBoost;
    const baseLightness = 3 + pulseAmount * 5 + (intensityScalesColors ? intensity * 5 : 0);

    // Intensity affects saturation
    const satBoost = intensityScalesColors ? intensity * 30 : 0;

    gradient.addColorStop(0, `hsl(${this.cosmicHue + 20}, ${40 + satBoost}%, ${baseLightness + 3}%)`);
    gradient.addColorStop(0.5, `hsl(${this.cosmicHue}, ${30 + satBoost * 0.7}%, ${baseLightness}%)`);
    gradient.addColorStop(1, `hsl(${this.cosmicHue - 20}, 25%, ${baseLightness - 1}%)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Draw nebula particles
   */
  _drawNebulaParticles(width, height, mid) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesSpeed, intensityScalesSize, intensityScalesColors } = this.config;

    this.nebulaParticles.forEach(particle => {
      // Drift slowly (faster at high intensity if enabled)
      const speedMult = intensityScalesSpeed ? (1 + intensity) : 1;
      particle.x += particle.driftX * speedMult;
      particle.y += particle.driftY * speedMult;

      // Wrap around
      if (particle.x < -particle.radius) particle.x = width + particle.radius;
      if (particle.x > width + particle.radius) particle.x = -particle.radius;
      if (particle.y < -particle.radius) particle.y = height + particle.radius;
      if (particle.y > height + particle.radius) particle.y = -particle.radius;

      // Calculate hue - shift toward cosmic hue at high intensity
      const hue = intensityScalesColors
        ? lerp(particle.hue, this.cosmicHue, intensity * 0.5)
        : particle.hue;

      // Calculate radius - grow at high intensity
      const radius = intensityScalesSize
        ? particle.radius * (1 + intensity * 0.3)
        : particle.radius;

      // Draw nebula cloud
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, radius
      );

      const alpha = particle.alpha * (0.8 + mid * 0.5 + (intensityScalesColors ? intensity * 0.5 : 0));
      const saturation = 60 + (intensityScalesColors ? intensity * 20 : 0);
      const lightness = 40 + (intensityScalesColors ? intensity * 15 : 0);

      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue + 20}, 50%, 30%, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Draw aurora waves
   */
  _drawAurora(width, height, bands) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesSize, intensityScalesColors } = this.config;

    const auroraY = height * 0.3;
    const amplitude = 50 + (bands[2] || 0) * 100 + (intensityScalesSize ? intensity * 80 : 0);

    ctx.globalAlpha = 0.15 + (bands[3] || 0) * 0.2 + (intensityScalesColors ? intensity * 0.15 : 0);

    for (let wave = 0; wave < 3; wave++) {
      // Hue shifts from green/cyan (calm) toward cosmic hue (climax)
      const baseWaveHue = this.cosmicHue + wave * 30 + 120;
      const waveHue = intensityScalesColors ? lerp(baseWaveHue, this.cosmicHue + wave * 30, intensity) : baseWaveHue;
      const waveOffset = wave * 0.5;

      ctx.beginPath();
      ctx.moveTo(0, auroraY);

      for (let x = 0; x <= width; x += 5) {
        const y = auroraY +
          Math.sin((x * 0.005) + this.auroraPhase + waveOffset) * amplitude +
          Math.sin((x * 0.01) + this.auroraPhase * 1.5) * amplitude * 0.5;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();

      const saturation = 70 + (intensityScalesColors ? intensity * 20 : 0);
      const lightness = 50 + (intensityScalesColors ? intensity * 20 : 0);
      const alpha = 0.3 + (intensityScalesColors ? intensity * 0.2 : 0);

      const gradient = ctx.createLinearGradient(0, auroraY - amplitude, 0, 0);
      gradient.addColorStop(0, `hsla(${waveHue}, ${saturation}%, ${lightness}%, ${alpha})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * Draw star field with parallax
   */
  _drawStarField(width, height, rms, dt) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { starSpeeds, starSizes, intensityScalesSpeed, intensityScalesSize, intensityScalesColors } = this.config;

    this.starLayers.forEach((stars, layerIndex) => {
      // Speed scales with intensity if enabled
      const baseSpeed = starSpeeds[layerIndex] || 0.3;
      const speed = intensityScalesSpeed ? baseSpeed * (1 + intensity * 2) : baseSpeed;

      // Size scales with intensity if enabled
      const baseSize = starSizes[layerIndex] || 1.5;
      const size = intensityScalesSize ? baseSize * (1 + intensity * 0.5) : baseSize;

      stars.forEach(star => {
        // Parallax movement (subtle drift)
        star.x -= speed * dt * 60 * (0.5 + rms * 0.5);
        if (star.x < 0) {
          star.x = width;
          star.y = Math.random() * height;
        }

        // Twinkle (faster at high intensity if enabled)
        const twinkleSpeed = intensityScalesSpeed ? star.twinkleSpeed * (1 + intensity) : star.twinkleSpeed;
        star.twinklePhase += twinkleSpeed;
        const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5;
        const alpha = star.baseAlpha * twinkle * (0.6 + rms * 0.4 + (intensityScalesColors ? intensity * 0.3 : 0));

        // Draw star with glow
        const starSize = size * (0.8 + rms * 0.4);

        // Star glow color - shifts with cosmic hue
        const glowHue = intensityScalesColors ? this.cosmicHue : 240;

        // Glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, starSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${glowHue}, 30%, 80%, ${alpha * 0.15})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(star.x, star.y, starSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });
    });
  }

  /**
   * Draw shooting stars
   */
  _drawShootingStars(width, height, dt) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesSize, intensityScalesColors } = this.config;

    this.shootingStars = this.shootingStars.filter(star => {
      star.x += star.vx * dt * 60;
      star.y += star.vy * dt * 60;
      star.life -= dt * 1.5;

      if (star.life <= 0 || star.x > width || star.y > height) {
        return false;
      }

      // Draw trail
      const gradient = ctx.createLinearGradient(
        star.x, star.y,
        star.x - star.length, star.y - star.length * 0.5
      );

      // Trail color shifts with intensity
      const trailHue = intensityScalesColors ? lerp(200, this.cosmicHue, intensity) : 200;
      gradient.addColorStop(0, `hsla(${trailHue}, 80%, 70%, ${star.life})`);
      gradient.addColorStop(1, 'transparent');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2 + (intensityScalesSize ? intensity * 2 : 0);
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(
        star.x - star.length * star.life,
        star.y - star.length * 0.5 * star.life
      );
      ctx.stroke();

      // Draw head
      const headSize = 2 + (intensityScalesSize ? intensity * 2 : 0);
      ctx.beginPath();
      ctx.arc(star.x, star.y, headSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.life})`;
      ctx.fill();

      return true;
    });
  }

  /**
   * Draw central glow
   */
  _drawCentralGlow(width, height, rms, bass) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesSize, intensityScalesColors } = this.config;

    const centerX = width / 2;
    const centerY = height * this.config.centralGlowY;

    // Radius grows with intensity
    const baseRadius = 100 + bass * 150 + (intensityScalesSize ? intensity * 200 : 0);
    const pulseRadius = baseRadius * (1 + this.pulseIntensity * 0.4);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseRadius
    );

    // Glow saturation and lightness increase with intensity
    const saturation = 50 + (intensityScalesColors ? intensity * 30 : 0);
    const lightness = 70 + (intensityScalesColors ? intensity * 20 : 0);
    const glowAlpha = 0.1 + rms * 0.15 + (intensityScalesColors ? intensity * 0.2 : 0);

    gradient.addColorStop(0, `hsla(${this.cosmicHue + 60}, ${saturation}%, ${lightness}%, ${glowAlpha})`);
    gradient.addColorStop(0.3, `hsla(${this.cosmicHue + 40}, 40%, 50%, ${glowAlpha * 0.5})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw bass pulse overlay
   */
  _drawPulseOverlay(width, height) {
    const ctx = this.ctx;
    const intensity = this._intensity || 0;
    const { intensityScalesColors } = this.config;

    const pulseGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height)
    );

    // Extra overlay at high intensity for climax effect
    const extraAlpha = (intensityScalesColors && intensity > 0.5) ? (intensity - 0.5) * 0.15 : 0;
    const totalAlpha = this.pulseIntensity * 0.1 + extraAlpha;

    // Pulse color follows cosmic hue
    const r = Math.round(138 + (intensityScalesColors ? (255 - 138) * intensity : 0));
    const g = Math.round(100 - (intensityScalesColors ? 50 * intensity : 0));
    const b = Math.round(255 - (intensityScalesColors ? 200 * intensity : 0));

    pulseGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${totalAlpha})`);
    pulseGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = pulseGradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Clean up event listeners
   */
  dispose() {
    window.removeEventListener('resize', this._resizeHandler);
  }
}
