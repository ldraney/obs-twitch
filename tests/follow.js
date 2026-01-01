#!/usr/bin/env node
/**
 * Quick follow test - run during stream!
 * Usage: node tests/follow.js [username]
 */
import { WebSocket } from 'ws';

const username = process.argv[2] || 'TestFollower_' + Math.floor(Math.random() * 1000);

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log(`🎉 Sending follow: ${username}`);
  ws.send(JSON.stringify({ type: 'follow', username }));

  // Wait a bit then close
  setTimeout(() => {
    console.log('✅ Sent! Check your overlay.');
    ws.close();
  }, 200);
});

ws.on('message', (data) => {
  // Server acknowledgment
  console.log('📨 Server responded');
});

ws.on('error', (err) => {
  console.error('❌ Could not connect to server!');
  console.error('   Make sure you ran: npm run alerts');
});

ws.on('close', () => {
  process.exit(0);
});
