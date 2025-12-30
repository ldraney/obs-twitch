# OBS Twitch Control

CLI tool to remotely control OBS Studio for Twitch streaming.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with your OBS WebSocket credentials:
   ```
   OBS_WEBSOCKET_PASSWORD=your_password_here
   OBS_WEBSOCKET_PORT=4455
   ```

3. Enable WebSocket in OBS:
   - Tools → WebSocket Server Settings → Enable WebSocket Server

## Usage

```bash
# Start streaming
node obs-control.js start

# Stop streaming
node obs-control.js stop

# Check status
node obs-control.js status

# Switch scene
node obs-control.js scene "Scene Name"
```

## Stream Settings

Optimized for Twitch (non-partner):
- 1080p @ 60fps
- 6000 kbps CBR
- NVENC encoder (p7 preset)

## Requirements

- Node.js 18+
- OBS Studio 28+ (has built-in WebSocket)
- NVIDIA GPU (for NVENC encoding)
