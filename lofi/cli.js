#!/usr/bin/env node
/**
 * Lofi CLI - Control the lofi generator
 *
 * Usage:
 *   node lofi/cli.js start [volume]   # Start lofi, set Chrome to volume (default 0.05)
 *   node lofi/cli.js stop             # Stop lofi, restore Chrome volume
 *   node lofi/cli.js volume <0-1>     # Set Chrome volume (0.05 = 5%)
 *   node lofi/cli.js status           # Check if running
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const http = require('http');

const NIRCMD = path.join(__dirname, 'nircmd.exe');
const DEFAULT_VOLUME = 0.05;
const RESTORE_VOLUME = 0.5;  // Restore to 50% when stopping

function setAppVolume(app, volume) {
  try {
    execSync(`"${NIRCMD}" setappvolume ${app} ${volume}`, { stdio: 'pipe' });
    console.log(`🔊 Set ${app} volume to ${Math.round(volume * 100)}%`);
    return true;
  } catch (e) {
    console.error(`❌ Failed to set volume: ${e.message}`);
    return false;
  }
}

function sendToOverlay(type, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ type, ...data });
    const req = http.request({
      hostname: 'localhost',
      port: 8888,
      path: '/trigger',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
}

async function startServer() {
  return new Promise((resolve) => {
    const server = spawn('npx', ['http-server', '-p', '8888', '-c-1'], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true,
      detached: true
    });
    server.unref();

    // Give it a moment to start
    setTimeout(() => resolve(server), 2000);
  });
}

async function openBrowser() {
  try {
    execSync('start http://localhost:8888', { shell: true, stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  const [,, command, arg] = process.argv;

  switch (command) {
    case 'start': {
      const volume = arg ? parseFloat(arg) : DEFAULT_VOLUME;
      if (isNaN(volume) || volume < 0 || volume > 1) {
        console.error('Volume must be 0-1 (e.g., 0.05 for 5%)');
        process.exit(1);
      }

      console.log('🎵 Starting lofi generator...');

      // Start HTTP server
      console.log('📡 Starting server...');
      await startServer();

      // Open browser
      console.log('🌐 Opening browser...');
      await openBrowser();

      // Wait for page to load then set volume
      console.log('⏳ Waiting for audio to initialize...');
      await new Promise(r => setTimeout(r, 3000));

      // Set Chrome volume
      setAppVolume('chrome.exe', volume);

      console.log('');
      console.log('✅ Lofi running!');
      console.log('   Click "Start Lofi" in browser if not auto-started');
      console.log(`   Chrome volume: ${Math.round(volume * 100)}%`);
      console.log('');
      console.log('Commands:');
      console.log('   node lofi/cli.js volume 0.03  # Lower volume');
      console.log('   node lofi/cli.js stop         # Stop lofi');
      break;
    }

    case 'stop': {
      console.log('🛑 Stopping lofi...');
      setAppVolume('chrome.exe', RESTORE_VOLUME);
      console.log('✅ Chrome volume restored to 50%');
      console.log('   Close the browser tab manually to stop audio');
      break;
    }

    case 'volume':
    case 'vol':
    case 'v': {
      if (!arg) {
        console.error('Usage: node lofi/cli.js volume <0-1>');
        console.error('Example: node lofi/cli.js volume 0.03  # 3%');
        process.exit(1);
      }
      const volume = parseFloat(arg);
      if (isNaN(volume) || volume < 0 || volume > 1) {
        console.error('Volume must be 0-1 (e.g., 0.05 for 5%)');
        process.exit(1);
      }
      setAppVolume('chrome.exe', volume);
      break;
    }

    case 'status': {
      try {
        const response = await fetch('http://localhost:8888');
        console.log('✅ Lofi server running at http://localhost:8888');
      } catch {
        console.log('❌ Lofi server not running');
        console.log('   Run: node lofi/cli.js start');
      }
      break;
    }

    default:
      console.log('🎵 Lofi Generator CLI');
      console.log('');
      console.log('Usage:');
      console.log('  node lofi/cli.js start [volume]  Start lofi (volume 0-1, default 0.05)');
      console.log('  node lofi/cli.js stop            Stop and restore volume');
      console.log('  node lofi/cli.js volume <0-1>    Set Chrome volume');
      console.log('  node lofi/cli.js status          Check if running');
      console.log('');
      console.log('Examples:');
      console.log('  node lofi/cli.js start           # Start at 5% volume');
      console.log('  node lofi/cli.js start 0.02      # Start at 2% volume');
      console.log('  node lofi/cli.js volume 0.03     # Change to 3%');
      break;
  }
}

main().catch(console.error);
