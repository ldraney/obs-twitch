# OBS Twitch CLI Roadmap

## Vision
A complete CLI toolkit for Twitch streamers - control OBS, track affiliate progress, automate stream workflows, and integrate with Twitch API.

---

## Phase 1: Affiliate Progress Tracking
**Goal:** Know exactly where you stand on Twitch Affiliate requirements.

- [ ] `affiliate` - Show progress toward all 4 requirements
  - Stream days this month (need 7)
  - Total hours streamed (need 8)
  - Average concurrent viewers (need 3)
  - Follower count (need 50)
- [ ] `affiliate --detailed` - Show day-by-day breakdown
- [ ] Twitch API integration for follower/viewer data
- [ ] Local tracking of stream sessions from SQLite db

---

## Phase 2: Stream Automation
**Goal:** One-command stream workflows.

- [ ] `go-live` - Full stream startup sequence
  - Switch to "Starting Soon" scene
  - Start streaming
  - Auto-switch to game scene after countdown
- [ ] `brb` - Switch to BRB scene
- [ ] `end` - Graceful stream ending
  - Switch to "Ending" scene
  - Stop stream after delay
- [ ] `scene <name>` - Quick scene switching (already have basic version)
- [ ] Scene presets in config file

---

## Phase 3: Twitch Integration
**Goal:** Interact with Twitch from the terminal.

- [ ] `viewers` - Current viewer count
- [ ] `chat` - Show recent chat messages in terminal
- [ ] `chat send <message>` - Send chat message
- [ ] `marker <label>` - Add stream marker for VOD highlights
- [ ] `clip` - Create clip of last 30 seconds
- [ ] `title <new title>` - Update stream title
- [ ] `game <game name>` - Update stream category
- [ ] OAuth token management for Twitch API

---

## Phase 4: Quality of Life
**Goal:** Useful utilities for day-to-day streaming.

- [ ] `screenshot` - Save current frame as PNG (for thumbnails)
- [ ] `record start/stop` - Control local recording
- [ ] `alert` - Desktop notification when stream health degrades
- [ ] `test` - Pre-stream checklist (sources, audio, bitrate test)
- [ ] `backup` - Export OBS scene collection
- [ ] `stats today` - Summary of today's stream(s)

---

## Phase 5: Overlay Enhancements
**Goal:** Better terminal overlay for coding streams.

- [ ] `overlay bigger` / `overlay smaller` - Quick resize (10% increments)
- [ ] `overlay left` / `overlay right` / `overlay full` - Position presets
- [ ] `overlay 80% top-left` - Size + position in one command
- [ ] `overlay save <name>` - Save current position as preset
- [ ] `overlay load <name>` - Load saved preset
- [ ] Remember last overlay position between sessions

---

## Phase 6: Advanced Features
**Goal:** Power user features.

- [ ] `schedule` - Set up recurring stream reminders
- [ ] `raid <channel>` - Raid another channel
- [ ] `shoutout <user>` - Shoutout a viewer
- [ ] `poll create <question>` - Create Twitch poll
- [ ] `prediction create <question>` - Create prediction
- [ ] Webhook support for external integrations
- [ ] Stream deck integration (HTTP API)

---

## Completed Features (v2.0)

### Stream Control
- [x] `start` / `stop` - Start/stop streaming
- [x] `status` - Stream status with metrics

### Monitoring
- [x] `monitor` - Live terminal dashboard
- [x] `diagnose` - Full diagnostic with warnings
- [x] `report` - Post-stream health report
- [x] SQLite metrics logging
- [x] Alert thresholds (bitrate, CPU, FPS, dropped frames)

### Source Management
- [x] `sources` - List video sources
- [x] `audio` - List audio sources
- [x] `enable` / `disable` - Toggle sources
- [x] `refresh` - Fix stuck captures
- [x] `mute` / `unmute` - Audio control
- [x] `capture-audio` - Enable app audio capture

### Terminal Overlay
- [x] `overlay create` - Auto-create overlay source
- [x] `overlay show` / `hide` - Toggle visibility
- [x] `overlay <opacity>` - Set transparency

---

## Tech Stack
- **CLI:** Commander.js
- **OBS Control:** obs-websocket-js (WebSocket v5)
- **UI:** Ink/React (terminal UI)
- **Database:** SQLite (better-sqlite3)
- **Twitch API:** TBD (helix API + OAuth)

## Contributing
Pick a feature, implement it, submit a PR!
