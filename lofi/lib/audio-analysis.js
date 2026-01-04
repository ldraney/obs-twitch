/**
 * Audio analysis utilities for reactive visuals
 * Requires Tone.js to be loaded
 */

import { clamp, map, createAudioSmoothers } from './utils.js';

/**
 * AudioAnalyzer - Wraps Tone.js FFT and Meter for reactive visuals
 */
export class AudioAnalyzer {
  /**
   * @param {Object} options
   * @param {number} options.fftSize - FFT size (default 256)
   * @param {number} options.bandCount - Number of frequency bands (default 8)
   * @param {Object} options.smoothingFactors - Custom smoothing factors
   */
  constructor(options = {}) {
    const { fftSize = 256, bandCount = 8, smoothingFactors = {} } = options;

    this.fft = null;
    this.meter = null;
    this.bandCount = bandCount;
    this.smoothers = createAudioSmoothers(bandCount, smoothingFactors);
    this.fftSize = fftSize;

    // For beat detection
    this.prevRms = 0;
    this.pulseIntensity = 0;
  }

  /**
   * Initialize analyzers and connect to Tone.Destination
   * Call this after Tone.start()
   */
  init() {
    this.fft = new Tone.FFT(this.fftSize);
    this.meter = new Tone.Meter();
    Tone.Destination.connect(this.fft);
    Tone.Destination.connect(this.meter);
  }

  /**
   * Get raw audio features from FFT and meter
   * @returns {Object} Raw audio features
   */
  getRawFeatures() {
    if (!this.fft || !this.meter) {
      return {
        bands: new Array(this.bandCount).fill(0),
        rms: 0,
        bass: 0,
        mid: 0,
        high: 0
      };
    }

    const fftValues = this.fft.getValue();
    const rmsDb = this.meter.getValue();
    const rms = clamp(map(rmsDb, -60, -6, 0, 1), 0, 1);

    const numBins = fftValues.length;
    const bandsPerGroup = Math.floor(numBins / this.bandCount);
    const bands = [];

    for (let i = 0; i < this.bandCount; i++) {
      const start = i * bandsPerGroup;
      const end = Math.min(start + bandsPerGroup, numBins);
      let sum = 0;
      for (let j = start; j < end; j++) {
        const linear = clamp(map(fftValues[j], -100, -20, 0, 1), 0, 1);
        sum += linear;
      }
      bands.push(sum / (end - start));
    }

    const bass = (bands[0] + bands[1]) / 2;
    const mid = (bands[2] + bands[3] + bands[4]) / 3;
    const high = (bands[5] + bands[6] + bands[7]) / 3;

    return { bands, rms, bass, mid, high };
  }

  /**
   * Get smoothed audio features for reactive visuals
   * @returns {Object} Smoothed audio features
   */
  getSmoothedFeatures() {
    const raw = this.getRawFeatures();

    return {
      rms: this.smoothers.rms(raw.rms),
      bass: this.smoothers.bass(raw.bass),
      mid: this.smoothers.mid(raw.mid),
      high: this.smoothers.high(raw.high),
      bands: raw.bands.map((b, i) => this.smoothers.bands[i](b))
    };
  }

  /**
   * Update pulse intensity for beat detection
   * @param {number} smoothedRms - Current smoothed RMS value
   * @param {number} threshold - Beat detection threshold (default 0.03)
   * @param {number} decay - Pulse decay rate (default 0.94)
   * @returns {number} Current pulse intensity
   */
  updatePulse(smoothedRms, threshold = 0.03, decay = 0.94) {
    const rmsDelta = smoothedRms - this.prevRms;
    if (rmsDelta > threshold) {
      this.pulseIntensity = Math.max(this.pulseIntensity, rmsDelta * 8);
    }
    this.pulseIntensity *= decay;
    this.prevRms = smoothedRms;
    return this.pulseIntensity;
  }

  /**
   * Get all features including pulse (convenience method)
   * @returns {Object} All audio features with pulse
   */
  analyze() {
    const features = this.getSmoothedFeatures();
    const pulse = this.updatePulse(features.rms);
    return { ...features, pulse };
  }

  /**
   * Disconnect and clean up
   */
  dispose() {
    if (this.fft) {
      this.fft.dispose();
      this.fft = null;
    }
    if (this.meter) {
      this.meter.dispose();
      this.meter = null;
    }
  }
}
