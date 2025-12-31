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
- `.env` - Contains OBS WebSocket password (gitignored)
- `~/twitch-secrets/.env` - Twitch API credentials (separate private repo)
- `data/streams.db` - SQLite database (gitignored)

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
