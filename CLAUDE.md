# OBS Twitch Streaming Setup

## Project Goal
Achieve Twitch Affiliate status by streaming consistently with high-quality settings.

## Affiliate Requirements (30-day window)
- [ ] 7+ different stream days
- [ ] 8+ hours total streamed
- [ ] 3+ average concurrent viewers
- [ ] 50+ followers

## Current Stream Settings
- **Base Resolution:** 2560x1440 (native monitor)
- **Output Resolution:** 1664x936 (936p - optimal for 6000kbps)
- **FPS:** 60
- **Bitrate:** 6000 kbps (Twitch max for non-partners)
- **Encoder:** NVENC p7 preset (max quality)
- **B-frames:** 4 (smoother motion)
- **Multipass:** fullres (better quality analysis)
- **Capture:** Window Capture (Palworld)

## Why 936p instead of 1080p?
At 6000kbps, 936p provides more bits per pixel than 1080p, resulting in sharper
image quality especially during fast motion. The downscale from 1440p also adds
slight sharpening.

## Key Files
- `src/cli.js` - Main CLI entry point (Commander.js)
- `src/lib/metrics.js` - OBS WebSocket metrics collection
- `src/lib/db.js` - SQLite database for stream history
- `src/lib/alerts.js` - Threshold-based alerting
- `src/lib/twitch.js` - Twitch API client for affiliate tracking
- `src/commands/monitor.js` - Live terminal UI (Ink/React)
- `src/commands/report.js` - Post-stream report generator
- `src/commands/affiliate.js` - Affiliate progress tracker
- `overlay/index.html` - OBS Browser Source overlay (celebrations + chat)
- `overlay/server.js` - WebSocket server (Twitch EventSub + IRC chat)
- `overlay/modules/chat.js` - Chat display module
- `.env` - Contains OBS WebSocket password (gitignored)
- `~/twitch-secrets/.env` - Twitch API credentials (separate private repo)
- `data/streams.db` - SQLite database (gitignored)

## Development Workflow

Use git worktrees to work on issues. Each issue gets its own directory.

### Structure
```
~/obs-twitch/              # main repo (master) - production code
~/worktrees/twitch-<N>/    # worktree for issue #N
```

### Commands
```bash
# Create worktree for new issue
cd ~/obs-twitch
git worktree add -b issue-<N>-description ~/worktrees/twitch-<N>

# List all worktrees
git worktree list

# Work on an issue
cd ~/worktrees/twitch-<N>
# ... make changes, commit ...
git push -u origin issue-<N>-description

# Create PR from branch
gh pr create --base master

# After PR merged, cleanup
git worktree remove ~/worktrees/twitch-<N>
git branch -d issue-<N>-description
```

### Rules
1. **Always create an issue first** before modifying the repo
2. **One worktree per issue** - keeps work isolated
3. **PRs to master** - no direct commits to master
4. **Delete worktree after merge** - keep things clean

## Commands
```bash
# Stream control
npm run obs go                 # Pre-flight WiFi check + start streaming (RECOMMENDED)
npm run obs start              # Start streaming (no WiFi check)
npm run obs stop               # Stop streaming
npm run obs status             # Get stream status with color-coded metrics

# WiFi (fixes dropped frames from 2.4GHz)
npm run obs wifi               # Force reconnect to 5GHz band
npm run obs wifi -- -c         # Check current band without reconnecting

# Monitoring
npm run obs monitor            # Live terminal dashboard (updates every 2s)
npm run obs report             # Post-stream health report with recommendations

# Affiliate tracking
npm run obs affiliate          # Show progress toward Twitch Affiliate
npm run obs affiliate -d       # Detailed breakdown with recent streams

# Diagnostics
npm run obs diagnose           # Full diagnostic (sources, audio, warnings)
npm run obs sources            # List video sources + their status
npm run obs audio              # List audio sources + capture settings

# Video sources
npm run obs enable <source>    # Enable a source
npm run obs disable <source>   # Disable a source
npm run obs refresh <source>   # Toggle off/on to fix capture

# Audio control
npm run obs capture-audio <src>  # Enable audio capture on window/game source
npm run obs mute <source>        # Mute an audio source
npm run obs unmute <source>      # Unmute an audio source

# Chat overlay (test messages to overlay only)
npm run obs chat "Hello world!"  # Send test message to overlay
npm run obs chat "Hi" -u Viewer  # Send as specific user
npm run obs chat "Hi" -c "#FF0000" -b broadcaster  # Custom color + badge

# Butler bot (sends to real Twitch chat as butlerbotphilo)
npm run obs say "Hello chat!"    # Bot posts to Twitch chat
```

## Stream Monitoring

### Live Dashboard (`npm run obs monitor`)
Real-time terminal UI showing:
- Stream status (LIVE/OFFLINE) with duration
- Bitrate with visual bar (color-coded: green/yellow/red)
- CPU, Memory, FPS metrics
- Dropped frames percentage
- Active warnings and alerts

Keyboard shortcuts: `q` quit, `r` refresh

Metrics are automatically logged to SQLite every 30 seconds.

### Post-Stream Report (`npm run obs report`)
After streaming, view health analysis:
- Health score (0-100)
- Average/peak bitrate, CPU, dropped frames
- Error summary with counts
- Recommendations for improvement
- Recent session history comparison

### Alert Thresholds
| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Bitrate | >5500 | 4000-5500 | <4000 |
| Dropped % | <1% | 1-5% | >5% |
| CPU | <70% | 70-90% | >90% |
| FPS | 60 | 55-59 | <55 |

## OBS Config Location
`%APPDATA%\obs-studio\basic\profiles\Palworld\`

## Troubleshooting Black Screen

**ALWAYS run `diagnose` first** when stream shows black:
```bash
node src/cli.js diagnose
```

### Common causes:
1. **Source disabled** - Check `--- SOURCES ---` output for `✗ DISABLED`
   - Fix: `node src/cli.js enable "Source Name"`
2. **Wrong source active** - Display Capture enabled but game capture disabled
   - Fix: Enable game capture, optionally disable display capture
3. **Window not found** - Game closed/minimized after OBS started
   - Fix: `node src/cli.js refresh "Palworld Window"`
4. **Game in wrong mode** - Fullscreen exclusive can break capture
   - Fix: Use Borderless Windowed in game settings

### Source priority (top = best quality):
1. `Palworld Game` - Game Capture (may fail with anti-cheat)
2. `Palworld Window` - Window Capture (reliable fallback)
3. `Display Capture` - Last resort (captures everything including taskbar)

## Troubleshooting No Audio

**Run `audio` command first:**
```bash
node src/cli.js audio
```

### Common causes:
1. **Capture Audio disabled** - Window/Game capture not capturing game sound
   - Fix: `node src/cli.js capture-audio "Palworld Window"`
2. **Source muted** - Audio source shows 🔇 MUTED
   - Fix: `node src/cli.js unmute "Source Name"`
3. **No global audio** - No Desktop Audio or Mic configured
   - Fix: In OBS > Settings > Audio > Global Audio Devices
   - Select speakers for Desktop Audio, mic for Mic/Aux
4. **Volume too low** - Source at -inf or very negative dB
   - Fix: Adjust in OBS Audio Mixer

### Audio source types:
- **Window/Game Capture Audio** - Captures audio from specific app (preferred)
- **Desktop Audio** - Captures ALL system audio (includes Discord, notifications)
- **Mic/Aux** - Your microphone for commentary

## Terminal Overlay Setup

Show Windows Terminal as a transparent overlay while gaming, so viewers can watch you code.

### Setup:
```bash
node src/cli.js overlay create  # Creates Window Capture source for Windows Terminal
```

This auto-creates "Terminal Overlay" source, captures Windows Terminal, and scales it to fill the base canvas (2560x1440).

### Windows Terminal transparency:
- Open Windows Terminal Settings > Appearance
- Set Background opacity to ~70%
- The game will show through the terminal background

### CLI commands:
```bash
node src/cli.js overlay create  # One-time setup
node src/cli.js overlay show    # Show overlay (when coding)
node src/cli.js overlay hide    # Hide overlay (when just gaming)
node src/cli.js overlay 0.7     # Set OBS-level opacity (0.0-1.0)
```

### Positioning notes:
- Source is scaled to BASE resolution (2560x1440), not output (1664x936)
- OBS downscales the whole canvas to output resolution
- To resize/reposition, modify transform in src/cli.js `controlOverlay()` function

## Celebration Overlay Setup

Show confetti and animations when you get new followers, raids, or subscribers.

### One-time setup:
```bash
npm run obs celebration create   # Adds Browser Source to OBS
```

This creates "Celebration Overlay" as a Browser Source pointing to `overlay/index.html`, scaled to fill your canvas (2560x1440), and positioned on top of other sources.

### Usage:
```bash
# Terminal 1: Start the overlay server (connects to Twitch EventSub)
npm run alerts

# Terminal 2 (optional): Test it works
npm run obs celebrate follow "TestUser"
npm run obs celebrate raid "RaidLeader" -v 100
npm run obs celebrate sub "NewSub" -m 3
```

### CLI commands:
```bash
npm run obs celebration create   # One-time setup (adds Browser Source to OBS)
npm run obs celebration show     # Show the overlay
npm run obs celebration hide     # Hide the overlay
npm run obs celebration refresh  # Refresh browser (reconnect WebSocket)
```

### Files:
- `overlay/index.html` - The overlay page (loaded by OBS Browser Source)
- `overlay/server.js` - WebSocket server connecting Twitch EventSub to overlay
- `overlay/modules/follow.js` - Confetti animation for follows
- `overlay/modules/raid.js` - Viking animation for raids
- `overlay/modules/subscribe.js` - Celebration for subs

### Keyboard shortcuts (in browser):
Press these keys when viewing `overlay/index.html` directly in a browser:
- `F` - Test follow animation
- `R` - Test raid animation
- `S` - Test subscribe animation
- `C` - Test chat message

## Chat Overlay Setup

Display Twitch chat messages on your stream overlay in a persistent chatbox.

### How it works:
1. The overlay server connects to Twitch IRC (reads chat)
2. Butler bot (butlerbotphilo) connects separately to send messages
3. Real chat messages displayed on overlay
4. CLI commands for testing and bot messages

### Usage:
```bash
# Terminal 1: Start the overlay server
npm run alerts

# Terminal 2: Send messages
npm run obs say "Hello chat!"        # Butler posts to REAL Twitch chat
npm run obs chat "Test" -u TestUser  # Test message to overlay only
```

### Butler Bot (butlerbotphilo)
The butler is an AI assistant bot that posts to real Twitch chat:
- Account: butlerbotphilo (must follow channel + be modded)
- Credentials: ~/twitch-secrets/.env (BOT_ACCESS_TOKEN, BOT_REFRESH_TOKEN)
- Character guide: ~/butlerbotphilo/CLAUDE.md
- Command: `npm run obs say "message"`

### Chat CLI options:
```bash
npm run obs say "<message>"         # Butler posts to Twitch chat
npm run obs chat "<message>"        # Test message to overlay only
npm run obs chat "Hi" -u <name>     # Test as specific username
npm run obs chat "Hi" -c "#FF0000"  # Set username color (hex)
npm run obs chat "Hi" -b moderator  # Add badge
```

### Chat display features:
- Persistent chatbox (bottom-right, messages stay visible)
- Username colors from Twitch
- Badges: broadcaster, moderator, VIP, subscriber
- Max 50 messages before oldest removed
- Auto-scrolls to newest

### Files:
- `overlay/modules/chat.js` - Chat display module
- `overlay/server.js` - Twitch IRC + bot connections
- `~/butlerbotphilo/CLAUDE.md` - Butler personality guide

## Troubleshooting WiFi/Network Issues

High dropped frames (>5%) with low bitrate often indicates WiFi problems.

**Automated fix:**
```bash
npm run obs wifi               # Force reconnect to 5 GHz
npm run obs go                 # WiFi check + start stream (recommended startup)
```

**Manual diagnosis:**
```bash
npm run obs wifi -- -c         # Check current band
ping -n 5 10.0.0.1             # Test latency (should be <5ms)
```

**Common cause:** Connected to 2.4 GHz instead of 5 GHz
- 2.4 GHz: congested, high latency, packet loss
- 5 GHz: faster, less interference, lower latency

**Full guide:** See `docs/wifi-troubleshooting.md`

## Notes
- OBS must have WebSocket Server enabled (Tools > WebSocket Server Settings)
- Game capture may not work with anti-cheat; use Window Capture instead
- Window Capture source at 1:1 scale (OBS handles downscale to 936p)

---

## Lofi Music Development (Issue #15)

Learning system for creating lofi beats with Tone.js. Obsidian vault + interactive demos.

### Locations
- **Docs**: `~/lofi-development-docs/` (Obsidian vault)
- **Demos**: `lofi/demos/*.html` (interactive HTML)
- **Original generator**: `lofi/index.html`

### Progress Tracker
- [x] Phase 1: Foundations (what-makes-lofi, tone-js-basics, audio-signal-flow, glossary)
- [x] Phase 2: Sound Sources (oscillators, synthesis-types, samplers)
- [x] Phase 3: Effects (reverb, delay, filters, distortion, effects-chain)
- [x] Phase 4: Rhythm (tempo-and-time, drum-patterns, swing, ghost-notes)
- [x] Phase 5: Harmony (chord-theory, chord-progressions, bass-lines)
- [x] Phase 6: Dynamics (lfos, automation, humanization)
- [x] Phase 7: Arrangement (song-structure, builds-and-drops, transitions)
- [x] Phase 8: Projects (simple-beat, dusty-chords, groove-master, living-sound, epic-song)
- [x] Phase 9: Cheatsheets (tone-js-cheatsheet, lofi-recipes)

### Audio Initialization Pattern (IMPORTANT)
Synths MUST be created AFTER `Tone.start()` is called. The working pattern:
```javascript
async function startAudio() {
  await Tone.start();           // 1. Start audio context FIRST
  synth = new Tone.Synth()...   // 2. THEN create synths
  loop = new Tone.Loop...       // 3. Create loops
  Tone.Transport.start();       // 4. Start playback
}
```

### Known Bug: Tone.Sequence Timing Errors (Issue #16)
**Status:** `03-groove-master.html` throws timing errors on play.
**Error:** "The time must be greater than or equal to the last scheduled time"
**Workaround:** Use `Tone.Loop` instead of `Tone.Sequence` (see `lofi/index.html`)

### Doc Template (Obsidian with full features)
```yaml
---
tags: [lofi, tone-js, <topic>]
demo: ../../obs-twitch/lofi/demos/<name>.html
related: [[other-doc]]
---
```

### Demo Template
- Dark theme matching vault aesthetic
- Interactive controls (sliders, buttons)
- Real-time audio with Tone.js
- Status feedback

### Key Concepts ("Gauges" to tweak)
| Category | Parameters |
|----------|------------|
| Sound Sources | oscillator type, ADSR envelope |
| Effects | reverb decay/wet, delay time/feedback, filter cutoff/resonance |
| Rhythm | BPM (60-90), swing (0-0.5), velocity variation |
| Dynamics | LFO rate/depth, automation curves |

### What Makes Epic Lofi
1. Vibe - consistent mood
2. Groove - drums that make you nod
3. Space - reverb/delay depth
4. Texture - vinyl noise, warmth
5. Movement - subtle changes over time
6. Structure - journey from start to finish
7. Ear candy - surprises that reward listening

### Audio-Visual Architecture

Decoupled system where any sound can drive any visual theme. See `lofi/ARCHITECTURE.md`.

**Directory Structure:**
```
lofi/
  lib/              # Shared utilities
  visuals/          # Standalone visual themes
    cosmic/         # Stars, nebulas, aurora
  sounds/           # Standalone audio engines (WIP)
  experiences/      # Combined audio + visuals
    space-drift.html
    supernova.html
    index.html      # Gallery
```

**Experiences:**
| Experience | BPM | Duration | Vibe |
|------------|-----|----------|------|
| Space Drift | 68 | 4:14 | Calm, ambient, floating |
| Supernova | 75 | 3:50 | Dynamic, dual climaxes |
| Midnight Rain | 70 | 3:26 | Melancholy, introspective, sparse piano |

**Visual Themes:**
- `cosmic` - Star field, nebulas, aurora, shooting stars, color shifting

**Signal Interface (connects sounds to visuals):**
- `beat` - Drum hit trigger
- `bass/mids/highs` - Frequency energy (0-1)
- `intensity` - Overall loudness (0-1)
- `section` - Current song section

**Open Issues:**
- #21: Refine canvas smoothness/FPS
- #24: Decouple audio and visual systems (in progress)
