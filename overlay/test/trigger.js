/**
 * Trigger Test Events
 *
 * Usage:
 *   node overlay/test/trigger.js follow "Username"
 *   node overlay/test/trigger.js raid "RaidLeader" 50
 *   node overlay/test/trigger.js subscribe "NewSub" 3
 *   node overlay/test/trigger.js --loop follow    # Every 5 seconds
 */

import { WebSocket } from 'ws';

const EVENTS = {
  follow: (username) => ({
    type: 'follow',
    username: username || 'TestFollower_' + Math.floor(Math.random() * 1000),
  }),

  raid: (username, viewers) => ({
    type: 'raid',
    username: username || 'RaidLeader',
    viewers: parseInt(viewers) || Math.floor(Math.random() * 100) + 10,
  }),

  subscribe: (username, months) => ({
    type: 'subscribe',
    username: username || 'NewSubscriber',
    months: parseInt(months) || 1,
    tier: '1000',
  }),

  bits: (username, amount) => ({
    type: 'bits',
    username: username || 'BitsCheerer',
    amount: parseInt(amount) || 100,
  }),
};

async function sendEvent(eventType, ...args) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.on('open', () => {
      const eventFn = EVENTS[eventType];
      if (!eventFn) {
        console.error(`❌ Unknown event type: ${eventType}`);
        console.log('   Available: ' + Object.keys(EVENTS).join(', '));
        ws.close();
        reject(new Error('Unknown event type'));
        return;
      }

      const event = eventFn(...args);
      console.log(`🎉 Sending ${eventType}:`, event.username);

      ws.send(JSON.stringify(event));

      setTimeout(() => {
        ws.close();
        resolve();
      }, 100);
    });

    ws.on('error', (err) => {
      console.error('❌ Could not connect to overlay server');
      console.error('   Make sure server is running: node overlay/server.js');
      reject(err);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log('');
    console.log('🧪 Overlay Event Trigger');
    console.log('');
    console.log('Usage:');
    console.log('  node overlay/test/trigger.js <event> [username] [extra]');
    console.log('');
    console.log('Events:');
    console.log('  follow "Username"           Trigger follow celebration');
    console.log('  raid "Username" 50          Trigger raid alert with viewer count');
    console.log('  subscribe "Username" 3      Trigger sub alert with month count');
    console.log('  bits "Username" 500         Trigger bits alert with amount');
    console.log('');
    console.log('Options:');
    console.log('  --loop <event>              Send event every 5 seconds');
    console.log('');
    return;
  }

  // Loop mode
  if (args[0] === '--loop') {
    const eventType = args[1] || 'follow';
    console.log(`🔄 Loop mode: sending ${eventType} every 5 seconds`);
    console.log('   Press Ctrl+C to stop\n');

    while (true) {
      try {
        await sendEvent(eventType, args[2], args[3]);
      } catch (e) {
        // Server not running, wait and retry
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Single event
  try {
    await sendEvent(args[0], args[1], args[2]);
    console.log('✅ Event sent!');
  } catch (e) {
    process.exit(1);
  }
}

main();
