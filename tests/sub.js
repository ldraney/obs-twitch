#!/usr/bin/env node
/**
 * Quick subscribe test - run during stream!
 * Usage: node tests/sub.js [username] [months]
 */
import { WebSocket } from 'ws';

const username = process.argv[2] || 'NewSubscriber';
const months = parseInt(process.argv[3]) || 1;

const ws = new WebSocket('ws://localhost:8080');
ws.on('open', () => {
  console.log(`💜 Triggering sub: ${username} (${months} month${months > 1 ? 's' : ''})`);
  ws.send(JSON.stringify({ type: 'subscribe', username, months }));
  setTimeout(() => ws.close(), 100);
});
ws.on('error', () => console.error('❌ Server not running! Start with: npm run alerts'));
