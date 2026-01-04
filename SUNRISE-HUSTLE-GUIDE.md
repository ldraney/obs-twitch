# Sunrise Hustle Implementation Guide

## Concept

A **fun, upbeat lofi track** that breaks from the melancholy vibe of existing songs. Morning energy, optimistic, groovy.

> "A journey you want to take again."

---

## Step-by-Step Implementation

### Step 1: Copy Space Drift as Template
```bash
cp lofi/experiences/space-drift.html lofi/experiences/sunrise-hustle.html
```

### Step 2: Update Core Settings

**Transport:**
```javascript
Tone.Transport.bpm.value = 88;  // was 68
Tone.Transport.swing = 0.25;     // was 0.08  (J Dilla pocket)
Tone.Transport.swingSubdivision = '16n';
```

**Color Theme - Change purple to sunrise orange:**
- Background: `#100805` (warm dark)
- Accent: `#ff8a40` (sunrise orange)
- Secondary: `#ffb060` (golden)
- Replace all `#8a64ff` with `#ff8a40`

### Step 3: Song Structure (72 bars @ 88 BPM = ~3:15)

```javascript
const songStructure = [
  { name: 'dawn', startBar: 0, bars: 8, label: 'Dawn', color: '#ff6030' },
  { name: 'wakeup', startBar: 8, bars: 16, label: 'Wake Up', color: '#ff8040' },
  { name: 'groove', startBar: 24, bars: 16, label: 'Groove', color: '#ffa050' },
  { name: 'breathe', startBar: 40, bars: 8, label: 'Breathe', color: '#ff7030' },
  { name: 'hustle', startBar: 48, bars: 16, label: 'Hustle', color: '#ffb060' },
  { name: 'sunset', startBar: 64, bars: 8, label: 'Sunset', color: '#ff5020' }
];
```

### Step 4: Section Configs

```javascript
const sectionConfigs = {
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
```

### Step 5: Neo Soul Chord Progression (from lofi-recipes.md)

```javascript
const chords = [
  { notes: ['F3', 'A3', 'C4', 'E4', 'G4'], name: 'Fmaj9' },
  { notes: ['E3', 'G3', 'B3', 'D4', 'F#4'], name: 'Em9' },
  { notes: ['A3', 'C4', 'E4', 'G4', 'B4'], name: 'Am9' },
  { notes: ['D3', 'F3', 'A3', 'C4', 'E4'], name: 'Dm9' }
];

// Bass follows roots
const bassNotes = ['F2', 'E2', 'A2', 'D2'];
```

### Step 6: Humanizer Class (from humanization.md)

Add before createPatterns():
```javascript
class Humanizer {
  constructor(options = {}) {
    this.timingMs = options.timingMs || 18;
    this.velocityPct = options.velocityPct || 18;
  }

  time(t) {
    return t + ((Math.random() - 0.5) * 2 * this.timingMs) / 1000;
  }

  velocity(v) {
    const offset = (Math.random() - 0.5) * 2 * (this.velocityPct / 100);
    return Math.max(0.1, Math.min(1.0, v + offset));
  }
}

const humanizer = new Humanizer({ timingMs: 18, velocityPct: 18 });
```

### Step 7: Drum Pattern with Ghost Notes (from lofi-recipes.md)

```javascript
const drumPattern = {
  kick:  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  hihat: [1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3, 1, 0.3, 0.5, 0.3]
};

drumLoop = new Tone.Sequence((time, step) => {
  if (drumPattern.kick[step]) {
    kick.triggerAttackRelease('C1', '8n', humanizer.time(time), humanizer.velocity(0.9));
  }
  if (drumPattern.snare[step]) {
    snare.triggerAttackRelease('16n', humanizer.time(time), humanizer.velocity(0.8));
  }
  if (drumPattern.hihat[step]) {
    const vel = drumPattern.hihat[step];
    hihat.triggerAttackRelease('32n', humanizer.time(time), humanizer.velocity(vel * 0.6));
  }
}, [...Array(16).keys()], '16n');
```

### Step 8: Lead Melody

```javascript
melody = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 }
}).connect(delay).connect(reverb);
melody.volume.value = -Infinity;

const melodyNotes = [
  { time: '0:0:0', note: 'A4', dur: '4n' },
  { time: '0:2:0', note: 'G4', dur: '8n' },
  { time: '1:0:0', note: 'F4', dur: '4n.' },
  { time: '2:0:0', note: 'E4', dur: '4n' },
  { time: '2:2:0', note: 'D4', dur: '4n' },
  { time: '3:0:0', note: 'C4', dur: '2n' }
];

melodyLoop = new Tone.Part((time, note) => {
  melody.triggerAttackRelease(note.note, note.dur, humanizer.time(time), humanizer.velocity(0.6));
}, melodyNotes);
melodyLoop.loop = true;
melodyLoop.loopEnd = '4m';
```

### Step 9: Build and Drop (from builds-and-drops.md)

```javascript
// Build into Hustle (bar 45-48)
Tone.Transport.schedule((time) => {
  masterFilter.frequency.exponentialRampTo(3500, 3, time);
  reverb.wet.rampTo(0.6, 2, time);
}, '45:0:0');

// Drum fill before drop
Tone.Transport.schedule((time) => {
  for (let i = 0; i < 8; i++) {
    snare.triggerAttackRelease('16n', time + i * 0.08, 0.3 + i * 0.08);
  }
  kick.triggerAttackRelease('C1', '4n', time + 0.64, 1);
}, '47:3:0');

// The drop
Tone.Transport.schedule((time) => {
  masterFilter.frequency.setValueAtTime(3500, time);
  kick.triggerAttackRelease('C1', '4n', time, 1);
  bass.triggerAttackRelease('F2', '2n', time, 0.9);
}, '48:0:0');
```

### Step 10: Tape Warmth Effects (from lofi-recipes.md)

```javascript
const chebyshev = new Tone.Chebyshev(2);
const tapeChorus = new Tone.Chorus({
  frequency: 0.3,
  delayTime: 3.5,
  depth: 0.15,
  wet: 0.3
});
await tapeChorus.start();
```

### Step 11: Volume Staging (from lofi-recipes.md)

```javascript
kick.volume.value = -4;
snare.volume.value = -8;
bass.volume.value = -6;
chords.volume.value = -10;
hihat.volume.value = -14;
melody.volume.value = -10;
```

### Step 12: Visuals

```javascript
visuals = new CosmicVisuals(canvas, {
  baseHue: 30,  // Orange/sunrise
  nebulaCount: 25,
  maxShootingStars: 3
});
```

### Step 13: Update Gallery

Add to `lofi/experiences/index.html`.

---

## Documentation References

- `~/lofi-development-docs/07-projects/05-epic-song.md`
- `~/lofi-development-docs/06-arrangement/builds-and-drops.md`
- `~/lofi-development-docs/05-dynamics/humanization.md`
- `~/lofi-development-docs/reference/lofi-recipes.md`
- `~/lofi-development-docs/04-harmony/chord-progressions.md`

## Checklist

- [ ] BPM 88, swing 0.25
- [ ] Neo Soul chords (Fmaj9 → Em9 → Am9 → Dm9)
- [ ] Ghost notes on hihats
- [ ] Humanizer class (18ms/18%)
- [ ] Drum fill before Hustle
- [ ] Filter sweep build
- [ ] Tape warmth effects
- [ ] Volume staging
- [ ] Sunrise colors
- [ ] Gallery entry
- [ ] Tests pass
