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
- Window Capture source at 1:1 scale (OBS handles downscale to 936p)
