# OBS Twitch Streaming Setup

## Project Goal
Achieve Twitch Affiliate status by streaming consistently with high-quality settings.

## Affiliate Requirements (30-day window)
- [ ] 7+ different stream days
- [ ] 8+ hours total streamed
- [ ] 3+ average concurrent viewers
- [ ] 50+ followers

## Current Stream Settings
- **Resolution:** 1920x1080 (1080p)
- **FPS:** 60
- **Bitrate:** 6000 kbps (Twitch max for non-partners)
- **Encoder:** NVENC p7 preset (max quality)
- **Capture:** Window Capture (Palworld)

## Key Files
- `obs-control.js` - CLI to control OBS via WebSocket
- `.env` - Contains OBS WebSocket password (gitignored)

## Commands
```bash
node obs-control.js start    # Start streaming
node obs-control.js stop     # Stop streaming
node obs-control.js status   # Get stream status
node obs-control.js scene <name>  # Switch scene
```

## OBS Config Location
`%APPDATA%\obs-studio\basic\profiles\Palworld\`

## Notes
- OBS must have WebSocket Server enabled (Tools > WebSocket Server Settings)
- Game capture may not work with anti-cheat; use Window Capture instead
- Window Capture source needs to be scaled to fit 1080p canvas
