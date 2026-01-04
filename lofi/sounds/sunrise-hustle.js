/**
 * Sunrise Hustle - Upbeat morning lofi sound engine
 *
 * A fun, groovy track with neo-soul chords and J Dilla swing.
 * BPM: 88, Swing: 0.25
 *
 * Structure (72 bars @ 88 BPM = ~3:16):
 *   dawn(8) -> wakeup(16) -> groove(16) -> breathe(8) -> hustle(16) -> sunset(8)
 */

import { SoundEngine } from './base.js';
import { createSignals } from '../lib/signals.js';

// ============================================================================
// Humanizer - adds timing and velocity variation for organic feel
// ============================================================================

class Humanizer {
  /**
   * @param {Object} options
   * @param {number} options.timingMs - Max timing variation in ms (default 18)
   * @param {number} options.velocityPct - Max velocity variation as percentage (default 18)
   */
  constructor(options = {}) {
    this.timingMs = options.timingMs || 18;
    this.velocityPct = options.velocityPct || 18;
  }

  /**
   * Add timing variation to a time value
   * @param {number} t - Time in seconds
   * @returns {number}
   */
  time(t) {
    return t + ((Math.random() - 0.5) * 2 * this.timingMs) / 1000;
  }

  /**
   * Add velocity variation
   * @param {number} v - Velocity (0-1)
   * @returns {number}
   */
  velocity(v) {
    const offset = (Math.random() - 0.5) * 2 * (this.velocityPct / 100);
    return Math.max(0.1, Math.min(1.0, v + offset));
  }
}

// ============================================================================
// Song Constants
// ============================================================================

const BPM = 88;
const SWING = 0.25;
const TOTAL_BARS = 72;

// Song structure: 72 bars total
const SONG_STRUCTURE = [
  { name: 'dawn', startBar: 0, bars: 8, label: 'Dawn' },
  { name: 'wakeup', startBar: 8, bars: 16, label: 'Wake Up' },
  { name: 'groove', startBar: 24, bars: 16, label: 'Groove' },
  { name: 'breathe', startBar: 40, bars: 8, label: 'Breathe' },
  { name: 'hustle', startBar: 48, bars: 16, label: 'Hustle' },
  { name: 'sunset', startBar: 64, bars: 8, label: 'Sunset' }
];

// Section configurations
const SECTION_CONFIGS = {
  dawn: {
    drums: false, bass: false, chords: true, melody: false,
    filterFreq: 800, reverbWet: 0.5, chordsVol: -15
  },
  wakeup: {
    drums: true, bass: true, chords: true, melody: false,
    filterFreq: 1800, reverbWet: 0.35, chordsVol: -10
  },
  groove: {
    drums: true, bass: true, chords: true, melody: true,
    filterFreq: 2200, reverbWet: 0.4, chordsVol: -10
  },
  breathe: {
    drums: false, bass: false, chords: true, melody: false,
    filterFreq: 600, reverbWet: 0.6, chordsVol: -18
  },
  hustle: {
    drums: true, bass: true, chords: true, melody: true,
    filterFreq: 3500, reverbWet: 0.45, chordsVol: -6
  },
  sunset: {
    drums: false, bass: false, chords: true, melody: false,
    filterFreq: 700, reverbWet: 0.55, chordsVol: -20
  }
};

// Neo-soul chord progression (Fmaj9 -> Em9 -> Am9 -> Dm9)
const CHORDS = [
  { notes: ['F3', 'A3', 'C4', 'E4', 'G4'], name: 'Fmaj9' },
  { notes: ['E3', 'G3', 'B3', 'D4', 'F#4'], name: 'Em9' },
  { notes: ['A3', 'C4', 'E4', 'G4', 'B4'], name: 'Am9' },
  { notes: ['D3', 'F3', 'A3', 'C4', 'E4'], name: 'Dm9' }
];

// Bass follows chord roots
const BASS_NOTES = ['F2', 'E2', 'A2', 'D2'];

// Drum pattern with ghost notes (velocity values: 0 = off, 0.3 = ghost, 1 = full)
const DRUM_PATTERN = {
  kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  hihat: [1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3]
};

// Lead melody (simple, memorable)
const MELODY_NOTES = [
  { time: '0:0:0', note: 'A4', dur: '4n' },
  { time: '0:2:0', note: 'G4', dur: '8n' },
  { time: '1:0:0', note: 'F4', dur: '4n.' },
  { time: '2:0:0', note: 'E4', dur: '4n' },
  { time: '2:2:0', note: 'D4', dur: '4n' },
  { time: '3:0:0', note: 'C4', dur: '2n' }
];

// ============================================================================
// SunriseHustle Sound Engine
// ============================================================================

export class SunriseHustle extends SoundEngine {
  constructor() {
    super();

    this.humanizer = new Humanizer({ timingMs: 18, velocityPct: 18 });

    // Audio nodes (initialized in _initAudio)
    this.masterFilter = null;
    this.reverb = null;
    this.delay = null;
    this.compressor = null;
    this.chebyshev = null;
    this.tapeChorus = null;

    // Synths
    this.kick = null;
    this.snare = null;
    this.hihat = null;
    this.chords = null;
    this.bass = null;
    this.melody = null;

    // Loops
    this.drumLoop = null;
    this.chordsLoop = null;
    this.bassLoop = null;
    this.melodyLoop = null;

    // State
    this.chordIndex = 0;
    this.bassIndex = 0;
    this.currentStep = 0;

    // Signal tracking
    this._lastKickTime = 0;
    this._lastSnareTime = 0;
    this._bassEnergy = 0;
    this._midsEnergy = 0;
    this._highsEnergy = 0;
  }

  /**
   * Get song metadata
   * @returns {import('./base.js').SoundMetadata}
   */
  getMetadata() {
    const secondsPerBar = (60 / BPM) * 4;
    return {
      name: 'Sunrise Hustle',
      bpm: BPM,
      duration: TOTAL_BARS * secondsPerBar,
      sections: SONG_STRUCTURE.map(s => s.name)
    };
  }

  /**
   * Get song structure
   * @returns {Array}
   * @protected
   */
  _getSongStructure() {
    return SONG_STRUCTURE;
  }

  /**
   * Initialize all audio nodes
   * @protected
   */
  async _initAudio() {
    // Transport settings
    Tone.Transport.bpm.value = BPM;
    Tone.Transport.swing = SWING;
    Tone.Transport.swingSubdivision = '16n';

    // Compressor (final stage)
    this.compressor = new Tone.Compressor({
      threshold: -20,
      ratio: 4,
      attack: 0.005,
      release: 0.2
    }).toDestination();

    // Master filter (lofi warmth)
    this.masterFilter = new Tone.Filter({
      frequency: 1200,
      type: 'lowpass',
      rolloff: -24,
      Q: 0.7
    }).connect(this.compressor);

    // Tape warmth: Chebyshev waveshaper
    this.chebyshev = new Tone.Chebyshev(2).connect(this.masterFilter);

    // Tape chorus (subtle wow/flutter)
    this.tapeChorus = new Tone.Chorus({
      frequency: 0.3,
      delayTime: 3.5,
      depth: 0.15,
      wet: 0.3
    }).connect(this.chebyshev);
    await this.tapeChorus.start();

    // Reverb (medium room)
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.4 });
    await this.reverb.generate();
    this.reverb.connect(this.tapeChorus);

    // Delay (slapback for groove)
    this.delay = new Tone.FeedbackDelay('8n.', 0.3);
    this.delay.wet.value = 0.2;
    this.delay.connect(this.tapeChorus);

    // ========== DRUMS ==========

    // Kick - punchy but warm
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 }
    }).connect(this.masterFilter);
    this.kick.volume.value = -Infinity;

    // Snare - crispy with some body
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 }
    }).connect(this.reverb);
    this.snare.volume.value = -Infinity;

    // Hi-hat - tight and bright
    this.hihat = new Tone.MetalSynth({
      frequency: 400,
      envelope: { attack: 0.001, decay: 0.06, release: 0.01 },
      harmonicity: 5,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1
    }).connect(this.tapeChorus);
    this.hihat.volume.value = -Infinity;

    // ========== MELODIC ==========

    // Chords - electric piano style
    this.chords = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.5, release: 1 }
    }).connect(this.reverb);
    this.chords.volume.value = -15;

    // Bass - smooth sub
    this.bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.4 }
    }).connect(this.masterFilter);
    this.bass.volume.value = -Infinity;

    // Melody - triangle lead
    this.melody = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 }
    }).connect(this.delay).connect(this.reverb);
    this.melody.volume.value = -Infinity;

    // Create patterns
    this._createPatterns();
  }

  /**
   * Create all loop patterns
   * @private
   */
  _createPatterns() {
    // Drum loop - plays every 16th note
    this.drumLoop = new Tone.Loop((time) => {
      const step = this.currentStep % 16;
      this.currentStep++;

      // Kick
      if (DRUM_PATTERN.kick[step]) {
        const vel = this.humanizer.velocity(0.9);
        this.kick.triggerAttackRelease('C1', '8n', this.humanizer.time(time), vel);
        this._lastKickTime = Tone.now();
        this._triggerBeat();
        this._bassEnergy = 1;
      }

      // Snare
      if (DRUM_PATTERN.snare[step]) {
        const vel = this.humanizer.velocity(0.8);
        this.snare.triggerAttackRelease('16n', this.humanizer.time(time), vel);
        this._lastSnareTime = Tone.now();
        this._midsEnergy = Math.max(this._midsEnergy, 0.8);
      }

      // Hi-hat (with ghost notes)
      if (DRUM_PATTERN.hihat[step]) {
        const baseVel = DRUM_PATTERN.hihat[step];
        const vel = this.humanizer.velocity(baseVel * 0.6);
        this.hihat.triggerAttackRelease('32n', this.humanizer.time(time), vel);
        this._highsEnergy = Math.max(this._highsEnergy, baseVel);
      }
    }, '16n');

    // Chord loop - plays every bar
    this.chordsLoop = new Tone.Loop((time) => {
      const chord = CHORDS[this.chordIndex % 4];
      const vel = this.humanizer.velocity(0.5);
      this.chords.triggerAttackRelease(
        chord.notes,
        '2n.',
        this.humanizer.time(time),
        vel
      );
      this.chordIndex++;
      this._midsEnergy = Math.max(this._midsEnergy, 0.6);
    }, '1m');

    // Bass loop - plays every bar
    this.bassLoop = new Tone.Loop((time) => {
      const note = BASS_NOTES[this.bassIndex % 4];
      const vel = this.humanizer.velocity(0.7);
      this.bass.triggerAttackRelease(
        note,
        '2n',
        this.humanizer.time(time),
        vel
      );
      this.bassIndex++;
    }, '1m');

    // Melody loop using Part (for specific timing)
    this.melodyLoop = new Tone.Part((time, value) => {
      const vel = this.humanizer.velocity(0.6);
      this.melody.triggerAttackRelease(
        value.note,
        value.dur,
        this.humanizer.time(time),
        vel
      );
      this._highsEnergy = Math.max(this._highsEnergy, 0.7);
    }, MELODY_NOTES);
    this.melodyLoop.loop = true;
    this.melodyLoop.loopEnd = '4m';
  }

  /**
   * Schedule song structure and automations
   * @protected
   */
  _scheduleStructure() {
    Tone.Transport.cancel();

    // Schedule section changes
    SONG_STRUCTURE.forEach((section, index) => {
      Tone.Transport.schedule((time) => {
        this.currentSection = section.name;
        this._applySection(section.name, time);
      }, `${section.startBar}:0:0`);
    });

    // Build into Hustle (bar 45-48): filter sweep
    Tone.Transport.schedule((time) => {
      this.masterFilter.frequency.exponentialRampTo(3500, 3, time);
      this.reverb.wet.rampTo(0.6, 2, time);
    }, '45:0:0');

    // Drum fill before the drop (bar 47, beat 4)
    Tone.Transport.schedule((time) => {
      for (let i = 0; i < 8; i++) {
        const vel = 0.3 + i * 0.08;
        this.snare.triggerAttackRelease('16n', time + i * 0.08, vel);
      }
      // Big kick at the end
      this.kick.triggerAttackRelease('C1', '4n', time + 0.64, 1);
    }, '47:3:0');

    // The drop at bar 48
    Tone.Transport.schedule((time) => {
      this.masterFilter.frequency.setValueAtTime(3500, time);
      this.kick.triggerAttackRelease('C1', '4n', time, 1);
      this.bass.triggerAttackRelease('F2', '2n', time, 0.9);
      this._triggerBeat();
      this._bassEnergy = 1;
    }, '48:0:0');

    // Fade out at sunset
    Tone.Transport.schedule((time) => {
      this.masterFilter.frequency.exponentialRampTo(500, 6, time);
      this.chords.volume.rampTo(-30, 8, time);
    }, '66:0:0');

    // Enable looping
    Tone.Transport.loop = true;
    Tone.Transport.loopStart = 0;
    Tone.Transport.loopEnd = `${TOTAL_BARS}:0:0`;
  }

  /**
   * Apply section configuration
   * @param {string} sectionName
   * @param {number} time
   * @protected
   */
  _applySection(sectionName, time) {
    const config = SECTION_CONFIGS[sectionName];
    if (!config) return;

    const rampTime = 0.5;

    // Filter and reverb
    this.masterFilter.frequency.rampTo(config.filterFreq, rampTime, time);
    this.reverb.wet.rampTo(config.reverbWet, rampTime, time);

    // Volume staging per section (from lofi-recipes.md)
    // drums: kick -4, snare -8, hihat -14
    // bass: -6
    // chords: varies per section
    // melody: -10

    this.kick.volume.rampTo(config.drums ? -4 : -Infinity, 0.3, time);
    this.snare.volume.rampTo(config.drums ? -8 : -Infinity, 0.3, time);
    this.hihat.volume.rampTo(config.drums ? -14 : -Infinity, 0.3, time);
    this.bass.volume.rampTo(config.bass ? -6 : -Infinity, 0.3, time);
    this.chords.volume.rampTo(config.chordsVol, 0.3, time);
    this.melody.volume.rampTo(config.melody ? -10 : -Infinity, 0.3, time);
  }

  /**
   * Start all loops
   * @protected
   */
  _startLoops() {
    this.drumLoop.start(0);
    this.chordsLoop.start(0);
    this.bassLoop.start(0);
    this.melodyLoop.start(0);

    // Reset indices
    this.chordIndex = 0;
    this.bassIndex = 0;
    this.currentStep = 0;
  }

  /**
   * Stop all loops
   * @protected
   */
  _stopLoops() {
    this.drumLoop.stop();
    this.chordsLoop.stop();
    this.bassLoop.stop();
    this.melodyLoop.stop();
  }

  /**
   * Update signal values for visual reactivity
   * @protected
   */
  _updateSignals() {
    // Decay energy values
    this._bassEnergy *= 0.92;
    this._midsEnergy *= 0.94;
    this._highsEnergy *= 0.95;

    // Calculate intensity based on section
    const config = SECTION_CONFIGS[this.currentSection];
    let intensity = 0.3;
    if (config) {
      intensity = config.drums ? 0.7 : 0.4;
      if (this.currentSection === 'hustle') intensity = 1.0;
      if (this.currentSection === 'groove') intensity = 0.8;
    }

    // Update signals
    this._signals.bass = Math.min(1, this._bassEnergy);
    this._signals.mids = Math.min(1, this._midsEnergy);
    this._signals.highs = Math.min(1, this._highsEnergy);
    this._signals.intensity = intensity;

    // Beat is set by _triggerBeat() and reset in getSignals()
  }

  /**
   * Clean up all audio resources
   */
  dispose() {
    // Stop everything
    this.stop();

    // Dispose loops
    if (this.drumLoop) this.drumLoop.dispose();
    if (this.chordsLoop) this.chordsLoop.dispose();
    if (this.bassLoop) this.bassLoop.dispose();
    if (this.melodyLoop) this.melodyLoop.dispose();

    // Dispose synths
    if (this.kick) this.kick.dispose();
    if (this.snare) this.snare.dispose();
    if (this.hihat) this.hihat.dispose();
    if (this.chords) this.chords.dispose();
    if (this.bass) this.bass.dispose();
    if (this.melody) this.melody.dispose();

    // Dispose effects
    if (this.reverb) this.reverb.dispose();
    if (this.delay) this.delay.dispose();
    if (this.masterFilter) this.masterFilter.dispose();
    if (this.compressor) this.compressor.dispose();
    if (this.chebyshev) this.chebyshev.dispose();
    if (this.tapeChorus) this.tapeChorus.dispose();

    this.isInitialized = false;
  }
}

export default SunriseHustle;
