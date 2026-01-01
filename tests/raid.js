#!/usr/bin/env node
/**
 * Quick raid test - run during stream!
 * Usage: node tests/raid.js [username] [viewers]
 */
import { WebSocket } from 'ws';

const username = process.argv[2] || 'RaidLeader';
const viewers = parseInt(process.argv[3]) || Math.floor(Math.random() * 100) + 20;

const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => {
  console.log(`⚔️ Triggering raid: ${username} with ${viewers} viewers`);
  ws.send(JSON.stringify({ type: 'raid', username, viewers }));
  setTimeout(() => ws.close(), 100);
});
ws.on('error', () => console.error('❌ Server not running! Start with: npm run alerts'));
