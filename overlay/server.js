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
import { resolve, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { WebSocketServer, WebSocket } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load secrets
config({ path: resolve(homedir(), 'twitch-secrets', '.env') });

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
const USERNAME = process.env.TWITCH_USERNAME || 'devopsphilosopher';

// Bot account for sending messages
const BOT_USERNAME = process.env.BOT_USERNAME || 'butlerbotphilo';
const BOT_ACCESS_TOKEN = process.env.BOT_ACCESS_TOKEN;

const TWITCH_EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';
const WS_PORT = 8080;
const HTTP_PORT = 3001;

const overlayClients = new Set();
let broadcasterId = null;
let twitchConnected = false;
let chatConnected = false;
let chatSocket = null; // Main account - for reading chat
let botSocket = null;  // Bot account - for sending messages
let botConnected = false;

// Reconnection state with exponential backoff
const reconnectState = {
  twitch: { attempts: 0, timeout: null },
  chat: { attempts: 0, timeout: null },
  bot: { attempts: 0, timeout: null },
};

const MAX_RECONNECT_DELAY = 60000; // 1 minute max
const BASE_RECONNECT_DELAY = 1000; // 1 second base

function getReconnectDelay(attempts) {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), MAX_RECONNECT_DELAY);
  // Add jitter (0-25% of delay) to prevent thundering herd
  return delay + Math.random() * delay * 0.25;
}

function scheduleReconnect(name, connectFn) {
  const state = reconnectState[name];
  if (state.timeout) {
    clearTimeout(state.timeout);
  }

  const delay = getReconnectDelay(state.attempts);
  state.attempts++;

  console.log(`🔄 ${name}: reconnecting in ${Math.round(delay / 1000)}s (attempt ${state.attempts})`);

  state.timeout = setTimeout(() => {
    connectFn();
  }, delay);
}

function resetReconnectState(name) {
  const state = reconnectState[name];
  state.attempts = 0;
  if (state.timeout) {
    clearTimeout(state.timeout);
    state.timeout = null;
  }
}

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
  let ws;
  try {
    ws = new WebSocket(TWITCH_EVENTSUB_URL);
  } catch (err) {
    console.error('❌ Failed to create Twitch WebSocket:', err.message);
    scheduleReconnect('twitch', connectToTwitch);
    return;
  }

  ws.on('open', () => {
    console.log('✅ Connected to Twitch');
    resetReconnectState('twitch');
  });

  ws.on('message', async (data) => {
    try {
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
          console.log('🔄 Twitch requested reconnect to new endpoint...');
          ws.close();
          // Immediate reconnect for server-requested reconnect
          setTimeout(connectToTwitch, 1000);
          break;

        case 'revocation':
          console.log('⚠️ Subscription revoked:', message.payload.subscription.type);
          break;
      }
    } catch (err) {
      console.error('❌ Error processing Twitch message:', err.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`❌ Twitch disconnected (code: ${code})`);
    twitchConnected = false;
    scheduleReconnect('twitch', connectToTwitch);
  });

  ws.on('error', (err) => {
    console.error('Twitch error:', err.message);
    // Note: 'close' event will fire after 'error', which triggers reconnect
  });
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
// TWITCH IRC (CHAT) CONNECTION
// ============================================

function connectToChat() {
  console.log('💬 Connecting to Twitch Chat...');
  let ws;
  try {
    ws = new WebSocket(TWITCH_IRC_URL);
  } catch (err) {
    console.error('❌ Failed to create Chat WebSocket:', err.message);
    scheduleReconnect('chat', connectToChat);
    return;
  }
  chatSocket = ws; // Store for sending messages

  ws.on('open', () => {
    console.log('✅ Connected to Twitch IRC');
    resetReconnectState('chat');

    // Authenticate
    ws.send(`PASS oauth:${ACCESS_TOKEN}`);
    ws.send(`NICK ${USERNAME.toLowerCase()}`);

    // Request capabilities for badges, colors, etc.
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');

    // Join channel
    ws.send(`JOIN #${USERNAME.toLowerCase()}`);

    chatConnected = true;
  });

  ws.on('message', (data) => {
    try {
      const message = data.toString();

      // Handle PING to stay connected
      if (message.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        return;
      }

      // Parse PRIVMSG (chat messages)
      if (message.includes('PRIVMSG')) {
        const chatEvent = parseIRCMessage(message);
        if (chatEvent) {
          console.log(`💬 ${chatEvent.username}: ${chatEvent.message}`);
          broadcastToOverlays(chatEvent);
        }
      }
    } catch (err) {
      console.error('❌ Error processing chat message:', err.message);
    }
  });

  ws.on('close', (code) => {
    console.log(`❌ Chat disconnected (code: ${code})`);
    chatConnected = false;
    chatSocket = null;
    scheduleReconnect('chat', connectToChat);
  });

  ws.on('error', (err) => console.error('Chat error:', err.message));
}

function connectBot() {
  if (!BOT_ACCESS_TOKEN) {
    console.log('⚠️  No bot token - messages will send as main account');
    return;
  }

  console.log(`🤖 Connecting bot (${BOT_USERNAME})...`);
  let ws;
  try {
    ws = new WebSocket(TWITCH_IRC_URL);
  } catch (err) {
    console.error('❌ Failed to create Bot WebSocket:', err.message);
    scheduleReconnect('bot', connectBot);
    return;
  }
  botSocket = ws;

  ws.on('open', () => {
    // Authenticate as bot
    ws.send(`PASS oauth:${BOT_ACCESS_TOKEN}`);
    ws.send(`NICK ${BOT_USERNAME.toLowerCase()}`);

    // Join the channel
    ws.send(`JOIN #${USERNAME.toLowerCase()}`);

    botConnected = true;
    resetReconnectState('bot');
    console.log(`✅ Bot connected as ${BOT_USERNAME}`);
  });

  ws.on('message', (data) => {
    try {
      const message = data.toString();
      if (message.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
      }
      // Check for authentication failure
      if (message.includes('Login authentication failed')) {
        console.error('❌ Bot auth failed - token may be expired');
        console.log('   Run: cd ~/twitch-client && node auth.js refresh');
      }
    } catch (err) {
      console.error('❌ Error processing bot message:', err.message);
    }
  });

  ws.on('close', (code) => {
    console.log(`❌ Bot disconnected (code: ${code})`);
    botConnected = false;
    botSocket = null;
    scheduleReconnect('bot', connectBot);
  });

  ws.on('error', (err) => console.error('Bot error:', err.message));
}

function parseIRCMessage(raw) {
  try {
    // Debug: log raw IRC (truncated)
    if (raw.includes('PRIVMSG')) {
      console.log('📥 RAW IRC:', raw.substring(0, 200) + (raw.length > 200 ? '...' : ''));
    }

    // Parse IRC tags (badges, color, display-name, etc.)
    const tagMatch = raw.match(/^@([^ ]+)/);
    const tags = {};
    if (tagMatch) {
      tagMatch[1].split(';').forEach(tag => {
        const [key, value] = tag.split('=');
        tags[key] = value;
      });
      // Debug: log if message has emotes tag
      if (tags['emotes']) {
        console.log('🎭 MESSAGE HAS EMOTES TAG');
      }
    }

    // Parse the PRIVMSG content
    const msgMatch = raw.match(/:([^!]+)![^@]+@[^ ]+ PRIVMSG #[^ ]+ :(.+)/);
    if (!msgMatch) return null;

    const username = tags['display-name'] || msgMatch[1];
    const message = msgMatch[2].trim();
    const color = tags['color'] || null;

    // Parse badges
    const badges = [];
    if (tags['badges']) {
      const badgeList = tags['badges'].split(',');
      badgeList.forEach(badge => {
        if (badge.startsWith('broadcaster')) badges.push('broadcaster');
        else if (badge.startsWith('moderator')) badges.push('moderator');
        else if (badge.startsWith('vip')) badges.push('vip');
        else if (badge.startsWith('subscriber')) badges.push('subscriber');
      });
    }

    // Parse emotes (format: "emote_id:start-end,start-end/emote_id:start-end")
    const emotes = [];
    if (tags['emotes']) {
      console.log('🎭 Raw emotes tag:', tags['emotes']);
      const emoteGroups = tags['emotes'].split('/');
      emoteGroups.forEach(group => {
        const [id, positions] = group.split(':');
        if (id && positions) {
          positions.split(',').forEach(pos => {
            const [start, end] = pos.split('-').map(Number);
            emotes.push({ id, start, end });
          });
        }
      });
      // Sort by start position descending (so we can replace from end to start)
      emotes.sort((a, b) => b.start - a.start);
      console.log('🎭 Parsed emotes:', JSON.stringify(emotes));
    }

    return {
      type: 'chat',
      username,
      message,
      color,
      badges,
      emotes,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.error('Failed to parse IRC message:', e.message);
    return null;
  }
}

// ============================================
// SEND TO TWITCH CHAT
// ============================================

function sendToTwitchChat(message) {
  // Prefer bot, fall back to main account
  const socket = botSocket?.readyState === WebSocket.OPEN ? botSocket : chatSocket;
  const sender = botSocket?.readyState === WebSocket.OPEN ? BOT_USERNAME : USERNAME;

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log('⚠️  Cannot send to Twitch chat - not connected');
    return false;
  }

  socket.send(`PRIVMSG #${USERNAME.toLowerCase()} :${message}`);
  console.log(`📤 ${sender}: ${message}`);
  return true;
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

function startHttpServer() {
  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  };

  const server = createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = resolve(__dirname, '.' + filePath);

    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error');
    }
  });

  server.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTP server: http://localhost:${HTTP_PORT}`);
  });
}

function startLocalServer() {
  // Start HTTP server first (serves overlay files)
  startHttpServer();

  // Start WebSocket server
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws) => {
    console.log('🖥️  Overlay connected');
    overlayClients.add(ws);

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Welcome to overlay server',
      twitchConnected,
    }));

    // Handle messages from CLI
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Send message to actual Twitch chat
        if (message.type === 'send') {
          console.log(`\n📤 SEND TO TWITCH: ${message.message}`);
          sendToTwitchChat(message.message);
          return;
        }

        // Test overlay events
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

  console.log(`🚀 WebSocket server: ws://localhost:${WS_PORT}`);
  return wss;
}

// ============================================
// MAIN
// ============================================

async function getBroadcasterIdWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getBroadcasterId();
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      const delay = 1000 * attempt;
      console.log(`⚠️  API failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  // Clear all reconnect timeouts
  Object.keys(reconnectState).forEach(name => {
    if (reconnectState[name].timeout) {
      clearTimeout(reconnectState[name].timeout);
    }
  });

  // Close all overlay clients
  for (const client of overlayClients) {
    try {
      client.close(1000, 'Server shutting down');
    } catch (e) { /* ignore */ }
  }
  overlayClients.clear();

  // Close WebSocket connections
  if (chatSocket?.readyState === WebSocket.OPEN) {
    chatSocket.close();
  }
  if (botSocket?.readyState === WebSocket.OPEN) {
    botSocket.close();
  }

  console.log('👋 Goodbye!');
  process.exit(0);
}

async function main() {
  console.log('');
  console.log('🎬 OBS Overlay Server');
  console.log('═'.repeat(40));
  console.log('');

  // Handle graceful shutdown
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle uncaught errors (don't crash)
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err.message);
    console.error(err.stack);
    // Don't exit - try to keep running
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled rejection:', reason);
    // Don't exit - try to keep running
  });

  if (!CLIENT_ID || !ACCESS_TOKEN) {
    console.error('❌ Missing credentials in ~/twitch-secrets/.env');
    process.exit(1);
  }

  // Get broadcaster ID with retry
  console.log(`👤 User: ${USERNAME}`);
  try {
    broadcasterId = await getBroadcasterIdWithRetry(3);
    console.log(`🆔 ID: ${broadcasterId}`);
  } catch (e) {
    console.error('❌ Could not find Twitch user after 3 attempts:', e.message);
    console.error('   Check your network connection and credentials');
    process.exit(1);
  }
  console.log('');

  // Start local server
  startLocalServer();

  // Connect to Twitch EventSub (follows, raids, subs)
  connectToTwitch();

  // Connect to Twitch Chat (IRC) - reads chat
  connectToChat();

  // Connect bot account - sends messages
  connectBot();

  console.log('');
  console.log('📺 OBS Browser Source:');
  console.log(`   file://${resolve(process.cwd(), 'overlay', 'index.html')}`);
  console.log('');
  console.log('🧪 Test: node overlay/test/trigger.js follow "TestUser"');
  console.log('');
  console.log('⏳ Waiting for events... (Ctrl+C to quit)');
  console.log('');

  // Handle test flag
  if (process.argv.includes('--test')) {
    setTimeout(() => {
      console.log('\n🧪 Sending test follow...');
      broadcastToOverlays({ type: 'follow', username: 'TestFollower_' + Date.now() });
    }, 2000);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
