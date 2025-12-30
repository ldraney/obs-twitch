require('dotenv').config();
const OBSWebSocket = require('obs-websocket-js').default;

const obs = new OBSWebSocket();

const config = {
  url: `ws://localhost:${process.env.OBS_WEBSOCKET_PORT || 4455}`,
  password: process.env.OBS_WEBSOCKET_PASSWORD
};

async function connect() {
  try {
    await obs.connect(config.url, config.password);
    console.log('Connected to OBS');
    return true;
  } catch (error) {
    console.error('Failed to connect:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\nMake sure:');
      console.log('1. OBS is running');
      console.log('2. WebSocket Server is enabled (Tools > WebSocket Server Settings)');
    }
    return false;
  }
}

async function startStream() {
  if (!await connect()) return;
  try {
    await obs.call('StartStream');
    console.log('Stream started!');
  } catch (error) {
    if (error.message.includes('already active')) {
      console.log('Stream is already running');
    } else {
      console.error('Failed to start stream:', error.message);
    }
  }
  await obs.disconnect();
}

async function stopStream() {
  if (!await connect()) return;
  try {
    await obs.call('StopStream');
    console.log('Stream stopped');
  } catch (error) {
    if (error.message.includes('not active')) {
      console.log('Stream is not running');
    } else {
      console.error('Failed to stop stream:', error.message);
    }
  }
  await obs.disconnect();
}

async function getStatus() {
  if (!await connect()) return;
  try {
    const streamStatus = await obs.call('GetStreamStatus');
    const sceneList = await obs.call('GetSceneList');

    console.log('\n=== OBS Status ===');
    console.log(`Streaming: ${streamStatus.outputActive ? 'YES' : 'NO'}`);
    if (streamStatus.outputActive) {
      console.log(`Duration: ${formatDuration(streamStatus.outputDuration)}`);
      console.log(`Bytes sent: ${(streamStatus.outputBytes / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log(`\nCurrent Scene: ${sceneList.currentProgramSceneName}`);
    console.log(`Available Scenes: ${sceneList.scenes.map(s => s.sceneName).join(', ')}`);
  } catch (error) {
    console.error('Failed to get status:', error.message);
  }
  await obs.disconnect();
}

async function switchScene(sceneName) {
  if (!await connect()) return;
  try {
    await obs.call('SetCurrentProgramScene', { sceneName });
    console.log(`Switched to scene: ${sceneName}`);
  } catch (error) {
    console.error('Failed to switch scene:', error.message);
  }
  await obs.disconnect();
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'start':
    startStream();
    break;
  case 'stop':
    stopStream();
    break;
  case 'status':
    getStatus();
    break;
  case 'scene':
    if (!arg) {
      console.log('Usage: node obs-control.js scene <scene-name>');
    } else {
      switchScene(arg);
    }
    break;
  default:
    console.log('OBS Control - Remote control for OBS Studio\n');
    console.log('Commands:');
    console.log('  start           Start streaming');
    console.log('  stop            Stop streaming');
    console.log('  status          Get current status');
    console.log('  scene <name>    Switch to scene');
}
