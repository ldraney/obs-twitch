/**
 * Unified Overlay Server
 *
 * Single WebSocket hub for all stream events:
 * - Connects to Twitch EventSub for real-time events
 * - Runs local WebSocket server for OBS overlays
 * - Supports multiple event types: follow, raid, subscribe, bits, etc.
 *
 * Usage:
 *   node overlay/server.js              # Start server
 *   node overlay/server.js --test       # Start + send test follow
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { homedir } from 'os';
import { WebSocketServer, WebSocket } from 'ws';

// Load secrets
config({ path: resolve(homedir(), 'twitch-secrets', '.env') });

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const USERNAME = process.env.TWITCH_USERNAME || 'devopsphilosopher';

const TWITCH_EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const LOCAL_PORT = 8080;

const overlayClients = new Set();
let broadcasterId = null;
let twitchConnected = false;

// ============================================
// TWITCH API HELPERS
// ============================================

async function getBroadcasterId() {
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${USERNAME}`, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Client-Id': CLIENT_ID,
    },
  });
  const data = await response.json();
  if (data.data?.length > 0) return data.data[0].id;
  throw new Error(`Could not find user: ${USERNAME}`);
}

async function subscribeToEvent(sessionId, type, version, condition) {
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Client-Id': CLIENT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      version,
      condition,
      transport: { method: 'websocket', session_id: sessionId },
    }),
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`  ✅ ${type}`);
    return true;
  } else {
    console.log(`  ❌ ${type}: ${data.message || data.error}`);
    return false;
  }
}

async function subscribeToAllEvents(sessionId) {
  console.log('📝 Subscribing to Twitch events...');

  const results = await Promise.all([
    // Follow events
    subscribeToEvent(sessionId, 'channel.follow', '2', {
      broadcaster_user_id: broadcasterId,
      moderator_user_id: broadcasterId,
    }),

    // Future: Add more subscriptions here
    // subscribeToEvent(sessionId, 'channel.raid', '1', {
    //   to_broadcaster_user_id: broadcasterId,
    // }),
    // subscribeToEvent(sessionId, 'channel.subscribe', '1', {
    //   broadcaster_user_id: broadcasterId,
    // }),
  ]);

  const success = results.filter(r => r).length;
  const total = results.length;

  if (success === 0) {
    console.log('');
    console.log('⚠️  No Twitch subscriptions active - but local testing works!');
    console.log('   To fix auth: cd ~/twitch-client && node auth.js user');
    console.log('');
  } else {
    console.log(`\n✅ Subscribed to ${success}/${total} event types`);
    twitchConnected = true;
  }
}

// ============================================
// TWITCH EVENTSUB WEBSOCKET
// ============================================

function connectToTwitch() {
  console.log('🔌 Connecting to Twitch EventSub...');
  const ws = new WebSocket(TWITCH_EVENTSUB_URL);

  ws.on('open', () => console.log('✅ Connected to Twitch'));

  ws.on('message', async (data) => {
    const message = JSON.parse(data.toString());
    const messageType = message.metadata?.message_type;

    switch (messageType) {
      case 'session_welcome':
        const sessionId = message.payload.session.id;
        console.log(`📨 Session: ${sessionId.substring(0, 20)}...`);
        await subscribeToAllEvents(sessionId);
        break;

      case 'session_keepalive':
        break; // Silent keepalive

      case 'notification':
        handleTwitchEvent(message.payload);
        break;

      case 'session_reconnect':
        console.log('🔄 Reconnecting to new Twitch endpoint...');
        ws.close();
        setTimeout(connectToTwitch, 1000);
        break;

      case 'revocation':
        console.log('⚠️ Subscription revoked:', message.payload.subscription.type);
        break;
    }
  });

  ws.on('close', () => {
    console.log('❌ Twitch disconnected, reconnecting in 5s...');
    twitchConnected = false;
    setTimeout(connectToTwitch, 5000);
  });

  ws.on('error', (err) => console.error('Twitch error:', err.message));
}

function handleTwitchEvent(payload) {
  const type = payload.subscription.type;
  const event = payload.event;

  let overlayEvent = null;

  switch (type) {
    case 'channel.follow':
      overlayEvent = {
        type: 'follow',
        username: event.user_name,
        userId: event.user_id,
        timestamp: event.followed_at,
      };
      console.log(`\n🎉 FOLLOW: ${event.user_name}`);
      break;

    case 'channel.raid':
      overlayEvent = {
        type: 'raid',
        username: event.from_broadcaster_user_name,
        viewers: event.viewers,
        timestamp: new Date().toISOString(),
      };
      console.log(`\n⚔️ RAID: ${event.from_broadcaster_user_name} with ${event.viewers} viewers!`);
      break;

    case 'channel.subscribe':
      overlayEvent = {
        type: 'subscribe',
        username: event.user_name,
        tier: event.tier,
        isGift: event.is_gift,
        timestamp: new Date().toISOString(),
      };
      console.log(`\n💜 SUB: ${event.user_name} (Tier ${event.tier})`);
      break;

    default:
      console.log(`\n📬 Event: ${type}`, event);
  }

  if (overlayEvent) {
    broadcastToOverlays(overlayEvent);
  }
}

// ============================================
// LOCAL WEBSOCKET SERVER
// ============================================

function broadcastToOverlays(event) {
  const payload = JSON.stringify(event);
  let sent = 0;
  for (const client of overlayClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  }
  if (sent > 0) console.log(`📢 Sent to ${sent} overlay(s)`);
}

function startLocalServer() {
  const wss = new WebSocketServer({ port: LOCAL_PORT });

  wss.on('connection', (ws) => {
    console.log('🖥️  Overlay connected');
    overlayClients.add(ws);

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Welcome to overlay server',
      twitchConnected,
    }));

    // Handle test events from CLI
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type && message.type !== 'connected') {
          console.log(`\n🧪 TEST: ${message.type} - ${message.username || 'unknown'}`);
          broadcastToOverlays(message);
        }
      } catch (e) { /* ignore */ }
    });

    ws.on('close', () => {
      console.log('🖥️  Overlay disconnected');
      overlayClients.delete(ws);
    });
  });

  console.log(`🚀 Overlay server: ws://localhost:${LOCAL_PORT}`);
  return wss;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('');
  console.log('🎬 OBS Overlay Server');
  console.log('═'.repeat(40));
  console.log('');

  if (!CLIENT_ID || !ACCESS_TOKEN) {
    console.error('❌ Missing credentials in ~/twitch-secrets/.env');
    process.exit(1);
  }

  // Get broadcaster ID
  console.log(`👤 User: ${USERNAME}`);
  try {
    broadcasterId = await getBroadcasterId();
    console.log(`🆔 ID: ${broadcasterId}`);
  } catch (e) {
    console.error('❌ Could not find Twitch user:', e.message);
    process.exit(1);
  }
  console.log('');

  // Start local server
  startLocalServer();

  // Connect to Twitch
  connectToTwitch();

  console.log('');
  console.log('📺 OBS Browser Source:');
  console.log(`   file://${resolve(process.cwd(), 'overlay', 'index.html')}`);
  console.log('');
  console.log('🧪 Test: node overlay/test/trigger.js follow "TestUser"');
  console.log('');
  console.log('⏳ Waiting for events...');
  console.log('');

  // Handle test flag
  if (process.argv.includes('--test')) {
    setTimeout(() => {
      console.log('\n🧪 Sending test follow...');
      broadcastToOverlays({ type: 'follow', username: 'TestFollower_' + Date.now() });
    }, 2000);
  }
}

main().catch(console.error);
