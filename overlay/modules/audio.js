/**
 * Audio Module
 *
 * Generates celebration sounds using Web Audio API.
 * No external files needed!
 */

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a celebration fanfare for new followers
 */
export function playFollowSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Create a cheerful ascending arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);

    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.3, now + i * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.5);
  });

  // Add a sparkle effect
  setTimeout(() => playSparkle(), 400);
}

/**
 * Play a sparkle/twinkle effect
 */
export function playSparkle() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 5; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = 2000 + Math.random() * 2000;
    osc.frequency.setValueAtTime(freq, now + i * 0.05);

    gain.gain.setValueAtTime(0, now + i * 0.05);
    gain.gain.linearRampToValueAtTime(0.1, now + i * 0.05 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.2);
  }
}

/**
 * Play a raid horn/fanfare
 */
export function playRaidSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Epic horn fanfare
  const notes = [
    { freq: 261.63, start: 0, dur: 0.3 },     // C4
    { freq: 329.63, start: 0.25, dur: 0.3 },  // E4
    { freq: 392.00, start: 0.5, dur: 0.5 },   // G4
    { freq: 523.25, start: 0.75, dur: 0.8 },  // C5 (held)
  ];

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    gain.gain.setValueAtTime(0, now + note.start);
    gain.gain.linearRampToValueAtTime(0.2, now + note.start + 0.05);
    gain.gain.setValueAtTime(0.2, now + note.start + note.dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + note.start + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.start);
    osc.stop(now + note.start + note.dur + 0.1);
  });

  // Add war drums
  playDrumHit(0);
  playDrumHit(0.5);
  playDrumHit(0.75);
}

/**
 * Play a drum hit
 */
function playDrumHit(delay = 0) {
  const ctx = getAudioContext();
  const now = ctx.currentTime + delay;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Play a subscribe celebration
 */
export function playSubSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Magical ascending scale
  const notes = [392, 440, 493.88, 523.25, 587.33, 659.25, 783.99, 880];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);

    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.4);
  });

  // Final chord
  setTimeout(() => {
    const chord = [523.25, 659.25, 783.99]; // C major
    chord.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.2);
    });
  }, 700);
}

/**
 * Play a pop sound (for confetti)
 */
export function playPop() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}
