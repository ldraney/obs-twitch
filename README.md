# OBS Twitch CLI

**For Lucas** - Your personal command center for Twitch streaming and affiliate progress tracking.

## Why This Exists

You want to hit Twitch Affiliate while streaming Palworld. This CLI lets you:
- Control OBS without leaving the terminal
- Monitor stream health in real-time
- Track your progress toward all 4 affiliate requirements
- Troubleshoot black screens and audio issues fast

## Quick Start

```bash
npm install
npm run affiliate    # See where you stand
npm run obs start    # Go live
npm run obs monitor  # Watch stream health
```

## Affiliate Progress

```bash
npm run affiliate
```

```
Twitch Affiliate Progress
══════════════════════════════════════════════════════

○ Stream Days      2/7   [████░░░░░░░░░░░░░░░░] 29%
○ Hours Streamed   3.5/8 [████████░░░░░░░░░░░░] 44%
○ Avg Viewers      1/3   [██████░░░░░░░░░░░░░░] 33%
○ Followers        2/50  [█░░░░░░░░░░░░░░░░░░░] 4%

Still needed:
   • 5 more stream days
   • 4.5 more hours
   • 2 more avg viewers
   • 48 more followers
```

## Stream Control

```bash
npm run obs start           # Start streaming
npm run obs stop            # Stop streaming
npm run obs status          # Quick health check
npm run obs monitor         # Live dashboard (updates every 2s)
npm run obs diagnose        # Full diagnostic when something's wrong
```

## Troubleshooting

Black screen? No audio? Run diagnose first:
```bash
npm run obs diagnose
```

Then fix with:
```bash
npm run obs enable "Palworld Window"    # Enable video source
npm run obs capture-audio "Palworld Window"  # Fix game audio
npm run obs refresh "Palworld Window"   # Unstick frozen capture
```

## Terminal Overlay

Show your terminal while gaming (for coding streams):
```bash
npm run obs overlay create   # One-time setup
npm run obs overlay show     # Show terminal overlay
npm run obs overlay hide     # Hide it
```

## Setup

1. **OBS WebSocket** - Enable in OBS: Tools → WebSocket Server Settings
2. **Create `.env`**:
   ```
   OBS_WEBSOCKET_PASSWORD=your_password
   OBS_WEBSOCKET_PORT=4455
   ```
3. **Twitch API** (for follower tracking) - See related repos below

## Related Repos

| Repo | Purpose |
|------|---------|
| [obs-twitch](.) | This CLI - OBS control + affiliate tracking |
| `~/twitch-client` | Twitch API test project (OAuth learning) |
| `~/twitch-secrets` | Private repo for API credentials |

## Stream Settings

Optimized for 6000kbps (Twitch max for non-partners):
- **Output:** 1664x936 @ 60fps (936p - more bits per pixel than 1080p)
- **Encoder:** NVENC p7 (max quality)
- **Bitrate:** 6000 kbps CBR

## Requirements

- Node.js 18+
- OBS Studio 28+ (built-in WebSocket)
- NVIDIA GPU (for NVENC)
- Windows (for terminal overlay)
