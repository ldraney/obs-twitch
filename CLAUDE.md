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
- `obs-control.js` - CLI to control OBS via WebSocket
- `.env` - Contains OBS WebSocket password (gitignored)

## Commands
```bash
# Stream control
node obs-control.js start              # Start streaming
node obs-control.js stop               # Stop streaming
node obs-control.js status             # Get stream status

# Diagnostics
node obs-control.js diagnose           # Full diagnostic (sources, audio, warnings)
node obs-control.js sources            # List video sources + their status
node obs-control.js audio              # List audio sources + capture settings

# Video sources
node obs-control.js scene <name>       # Switch scene
node obs-control.js enable <source>    # Enable a source
node obs-control.js disable <source>   # Disable a source
node obs-control.js refresh <source>   # Toggle off/on to fix capture

# Audio control
node obs-control.js capture-audio <src>  # Enable audio capture on window/game source
node obs-control.js mute <source>        # Mute an audio source
node obs-control.js unmute <source>      # Unmute an audio source

# Terminal overlay (coding while gaming)
node obs-control.js overlay show         # Show terminal overlay
node obs-control.js overlay hide         # Hide terminal overlay
node obs-control.js overlay 0.7          # Set overlay opacity (0.0-1.0)
```

## OBS Config Location
`%APPDATA%\obs-studio\basic\profiles\Palworld\`

## Troubleshooting Black Screen

**ALWAYS run `diagnose` first** when stream shows black:
```bash
node obs-control.js diagnose
```

### Common causes:
1. **Source disabled** - Check `--- SOURCES ---` output for `✗ DISABLED`
   - Fix: `node obs-control.js enable "Source Name"`
2. **Wrong source active** - Display Capture enabled but game capture disabled
   - Fix: Enable game capture, optionally disable display capture
3. **Window not found** - Game closed/minimized after OBS started
   - Fix: `node obs-control.js refresh "Palworld Window"`
4. **Game in wrong mode** - Fullscreen exclusive can break capture
   - Fix: Use Borderless Windowed in game settings

### Source priority (top = best quality):
1. `Palworld Game` - Game Capture (may fail with anti-cheat)
2. `Palworld Window` - Window Capture (reliable fallback)
3. `Display Capture` - Last resort (captures everything including taskbar)

## Troubleshooting No Audio

**Run `audio` command first:**
```bash
node obs-control.js audio
```

### Common causes:
1. **Capture Audio disabled** - Window/Game capture not capturing game sound
   - Fix: `node obs-control.js capture-audio "Palworld Window"`
2. **Source muted** - Audio source shows 🔇 MUTED
   - Fix: `node obs-control.js unmute "Source Name"`
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

### One-time OBS setup:
1. In OBS, add a new **Window Capture** source named "Terminal Overlay"
2. Select your Windows Terminal window
3. Position it on the right ~35% of the screen
4. Ensure it's **above** the game source in the source list (renders on top)

### Windows Terminal transparency:
- Open Windows Terminal Settings > Appearance
- Set Background opacity to ~70%
- The game will show through the terminal background

### CLI commands:
```bash
node obs-control.js overlay show    # When you're coding
node obs-control.js overlay hide    # When you're just gaming
node obs-control.js overlay 0.5     # Adjust OBS-level opacity if needed
```

## Notes
- OBS must have WebSocket Server enabled (Tools > WebSocket Server Settings)
- Game capture may not work with anti-cheat; use Window Capture instead
- Window Capture source at 1:1 scale (OBS handles downscale to 936p)
