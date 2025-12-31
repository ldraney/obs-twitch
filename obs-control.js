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

async function getSources() {
  if (!await connect()) return;
  try {
    const sceneList = await obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;

    console.log(`\n=== Sources in "${currentScene}" ===`);

    const items = await obs.call('GetSceneItemList', { sceneName: currentScene });

    for (const item of items.sceneItems) {
      const enabled = item.sceneItemEnabled ? '✓' : '✗';
      console.log(`[${enabled}] ${item.sourceName} (${item.inputKind || 'group'})`);

      // Get source settings for capture sources
      if (item.inputKind && item.inputKind.includes('capture')) {
        try {
          const settings = await obs.call('GetInputSettings', { inputName: item.sourceName });
          if (settings.inputSettings.window) {
            console.log(`    Window: ${settings.inputSettings.window}`);
          }
          if (settings.inputSettings.capture_mode) {
            console.log(`    Mode: ${settings.inputSettings.capture_mode}`);
          }
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('Failed to get sources:', error.message);
  }
  await obs.disconnect();
}

async function refreshSource(sourceName) {
  if (!await connect()) return;
  try {
    const sceneList = await obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;

    // Find the source
    const items = await obs.call('GetSceneItemList', { sceneName: currentScene });
    const item = items.sceneItems.find(i => i.sourceName.toLowerCase().includes(sourceName.toLowerCase()));

    if (!item) {
      console.log(`Source "${sourceName}" not found. Available sources:`);
      items.sceneItems.forEach(i => console.log(`  - ${i.sourceName}`));
      await obs.disconnect();
      return;
    }

    console.log(`Refreshing "${item.sourceName}"...`);

    // Disable then re-enable the source
    await obs.call('SetSceneItemEnabled', {
      sceneName: currentScene,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: false
    });

    await new Promise(r => setTimeout(r, 500));

    await obs.call('SetSceneItemEnabled', {
      sceneName: currentScene,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: true
    });

    console.log(`Source "${item.sourceName}" refreshed!`);
  } catch (error) {
    console.error('Failed to refresh source:', error.message);
  }
  await obs.disconnect();
}

async function enableSource(sourceName, enable = true) {
  if (!await connect()) return;
  try {
    const sceneList = await obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;

    const items = await obs.call('GetSceneItemList', { sceneName: currentScene });
    const item = items.sceneItems.find(i => i.sourceName.toLowerCase().includes(sourceName.toLowerCase()));

    if (!item) {
      console.log(`Source "${sourceName}" not found. Available sources:`);
      items.sceneItems.forEach(i => console.log(`  - ${i.sourceName}`));
      await obs.disconnect();
      return;
    }

    await obs.call('SetSceneItemEnabled', {
      sceneName: currentScene,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: enable
    });

    console.log(`Source "${item.sourceName}" ${enable ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error('Failed:', error.message);
  }
  await obs.disconnect();
}

async function getAudio() {
  if (!await connect()) return;
  try {
    console.log('\n=== AUDIO SOURCES ===\n');

    const inputs = await obs.call('GetInputList');

    for (const input of inputs.inputs) {
      // Check if it's an audio source
      if (input.inputKind.includes('audio') ||
          input.inputKind.includes('wasapi') ||
          input.inputKind.includes('pulse') ||
          input.inputKind === 'game_capture' ||
          input.inputKind === 'window_capture') {

        try {
          const muted = await obs.call('GetInputMute', { inputName: input.inputName });
          const volume = await obs.call('GetInputVolume', { inputName: input.inputName });
          const muteStatus = muted.inputMuted ? '🔇 MUTED' : '🔊';
          const db = volume.inputVolumeDb.toFixed(1);
          console.log(`${muteStatus} ${input.inputName} (${input.inputKind})`);
          console.log(`   Volume: ${db} dB`);

          // Check capture audio settings
          if (input.inputKind === 'window_capture' || input.inputKind === 'game_capture') {
            const settings = await obs.call('GetInputSettings', { inputName: input.inputName });
            const captureAudio = settings.inputSettings.capture_audio;
            console.log(`   Capture Audio: ${captureAudio ? 'YES' : 'NO'}`);
          }
        } catch (e) {
          // Not an audio source
        }
      }
    }

    // Get special audio inputs (desktop/mic)
    console.log('\n--- GLOBAL AUDIO ---');
    const specialInputs = await obs.call('GetSpecialInputs');

    let hasGlobalAudio = false;
    for (const [key, name] of Object.entries(specialInputs)) {
      if (name) {
        hasGlobalAudio = true;
        try {
          const muted = await obs.call('GetInputMute', { inputName: name });
          const volume = await obs.call('GetInputVolume', { inputName: name });
          const muteStatus = muted.inputMuted ? '🔇 MUTED' : '🔊';
          const db = volume.inputVolumeDb.toFixed(1);
          console.log(`${muteStatus} ${name} [${key}]`);
          console.log(`   Volume: ${db} dB`);
        } catch (e) {}
      }
    }

    if (!hasGlobalAudio) {
      console.log('⚠️  NO GLOBAL AUDIO CONFIGURED');
      console.log('\nTo fix: OBS > Settings > Audio > Global Audio Devices');
      console.log('  - Desktop Audio: Select your speakers/headphones');
      console.log('  - Mic/Auxiliary: Select your microphone');
    }
  } catch (error) {
    console.error('Failed to get audio:', error.message);
  }
  await obs.disconnect();
}

async function enableCaptureAudio(sourceName, enable = true) {
  if (!await connect()) return;
  try {
    const inputs = await obs.call('GetInputList');
    const match = inputs.inputs.find(i =>
      i.inputName.toLowerCase().includes(sourceName.toLowerCase()) &&
      (i.inputKind === 'window_capture' || i.inputKind === 'game_capture')
    );

    if (!match) {
      console.log(`Capture source "${sourceName}" not found`);
      await obs.disconnect();
      return;
    }

    // Get current settings
    const current = await obs.call('GetInputSettings', { inputName: match.inputName });

    // Update with capture_audio enabled
    await obs.call('SetInputSettings', {
      inputName: match.inputName,
      inputSettings: { ...current.inputSettings, capture_audio: enable }
    });

    console.log(`${match.inputName}: Capture Audio ${enable ? 'ENABLED' : 'DISABLED'}`);
  } catch (error) {
    console.error('Failed:', error.message);
  }
  await obs.disconnect();
}

async function setMute(inputName, mute) {
  if (!await connect()) return;
  try {
    // Try to find matching input
    const inputs = await obs.call('GetInputList');
    const match = inputs.inputs.find(i =>
      i.inputName.toLowerCase().includes(inputName.toLowerCase())
    );

    // Also check special inputs
    const special = await obs.call('GetSpecialInputs');
    let targetName = match?.inputName;

    if (!targetName) {
      for (const [key, name] of Object.entries(special)) {
        if (name && name.toLowerCase().includes(inputName.toLowerCase())) {
          targetName = name;
          break;
        }
      }
    }

    if (!targetName) {
      console.log(`Audio input "${inputName}" not found`);
      await obs.disconnect();
      return;
    }

    await obs.call('SetInputMute', { inputName: targetName, inputMuted: mute });
    console.log(`${targetName}: ${mute ? 'MUTED' : 'UNMUTED'}`);
  } catch (error) {
    console.error('Failed:', error.message);
  }
  await obs.disconnect();
}

async function diagnose() {
  if (!await connect()) return;
  try {
    console.log('\n=== OBS DIAGNOSTIC ===\n');

    // Stream status
    const streamStatus = await obs.call('GetStreamStatus');
    console.log(`Stream Active: ${streamStatus.outputActive ? 'YES' : 'NO'}`);
    if (streamStatus.outputActive) {
      console.log(`Duration: ${formatDuration(streamStatus.outputDuration)}`);
      console.log(`Bitrate: ${(streamStatus.outputBytes / (streamStatus.outputDuration / 1000) * 8 / 1024).toFixed(0)} kbps`);
    }

    // Scene info
    const sceneList = await obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    console.log(`\nCurrent Scene: ${currentScene}`);

    // Sources check
    console.log('\n--- SOURCES ---');
    const items = await obs.call('GetSceneItemList', { sceneName: currentScene });

    let hasEnabledCapture = false;
    for (const item of items.sceneItems) {
      const enabled = item.sceneItemEnabled;
      const status = enabled ? '✓ ENABLED' : '✗ DISABLED';
      console.log(`${item.sourceName}: ${status}`);

      if (item.inputKind && item.inputKind.includes('capture') && enabled) {
        hasEnabledCapture = true;
        try {
          const settings = await obs.call('GetInputSettings', { inputName: item.sourceName });
          if (settings.inputSettings.window) {
            console.log(`  └─ Window: ${settings.inputSettings.window}`);
          }
        } catch (e) {}
      }
    }

    // Audio check
    console.log('\n--- AUDIO ---');
    const special = await obs.call('GetSpecialInputs');
    let hasUnmutedAudio = false;
    let hasCaptureAudio = false;

    // Check global audio
    for (const [key, name] of Object.entries(special)) {
      if (name) {
        try {
          const muted = await obs.call('GetInputMute', { inputName: name });
          const volume = await obs.call('GetInputVolume', { inputName: name });
          const muteStatus = muted.inputMuted ? '🔇 MUTED' : '🔊';
          if (!muted.inputMuted) hasUnmutedAudio = true;
          console.log(`${muteStatus} ${name}: ${volume.inputVolumeDb.toFixed(1)} dB`);
        } catch (e) {}
      }
    }

    // Check capture sources for audio
    const allInputs = await obs.call('GetInputList');
    for (const input of allInputs.inputs) {
      if (input.inputKind === 'window_capture' || input.inputKind === 'game_capture') {
        try {
          const settings = await obs.call('GetInputSettings', { inputName: input.inputName });
          if (settings.inputSettings.capture_audio) {
            const muted = await obs.call('GetInputMute', { inputName: input.inputName });
            if (!muted.inputMuted) {
              hasCaptureAudio = true;
              hasUnmutedAudio = true;
            }
            const muteStatus = muted.inputMuted ? '🔇 MUTED' : '🔊';
            console.log(`${muteStatus} ${input.inputName} (capture audio)`);
          }
        } catch (e) {}
      }
    }

    // Warnings
    console.log('\n--- WARNINGS ---');
    if (!hasEnabledCapture) {
      console.log('⚠️  NO ENABLED CAPTURE SOURCE - Stream will be black!');
    }
    if (!hasUnmutedAudio) {
      console.log('⚠️  ALL AUDIO MUTED - Stream will be silent!');
    }
    if (!streamStatus.outputActive) {
      console.log('⚠️  Stream is not active');
    }

    // Video settings
    const videoSettings = await obs.call('GetVideoSettings');
    console.log('\n--- VIDEO ---');
    console.log(`Base: ${videoSettings.baseWidth}x${videoSettings.baseHeight}`);
    console.log(`Output: ${videoSettings.outputWidth}x${videoSettings.outputHeight}`);
    console.log(`FPS: ${videoSettings.fpsNumerator}/${videoSettings.fpsDenominator}`);

  } catch (error) {
    console.error('Diagnostic failed:', error.message);
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

async function controlOverlay(action) {
  if (!await connect()) return;
  try {
    const sceneList = await obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    let items = await obs.call('GetSceneItemList', { sceneName: currentScene });

    // Find terminal overlay source (case-insensitive partial match)
    let overlay = items.sceneItems.find(i =>
      i.sourceName.toLowerCase().includes('terminal') ||
      i.sourceName.toLowerCase().includes('overlay')
    );

    // If no overlay exists and action is 'create', make one
    if (!overlay && action === 'create') {
      console.log('Creating Terminal Overlay source...');

      // Get video settings for positioning
      const video = await obs.call('GetVideoSettings');
      const outputWidth = video.outputWidth;
      const outputHeight = video.outputHeight;

      // Create the window capture source targeting Windows Terminal
      // Window format: "Title:Class:Executable"
      const result = await obs.call('CreateInput', {
        sceneName: currentScene,
        inputName: 'Terminal Overlay',
        inputKind: 'window_capture',
        inputSettings: {
          cursor: true,
          method: 2,  // Windows Graphics Capture
          window: ':CASCADIA_HOSTING_WINDOW_CLASS:WindowsTerminal.exe'
        }
      });

      // Position on right 35% of screen
      const overlayWidth = Math.floor(outputWidth * 0.35);
      const xPos = outputWidth - overlayWidth;

      await obs.call('SetSceneItemTransform', {
        sceneName: currentScene,
        sceneItemId: result.sceneItemId,
        sceneItemTransform: {
          positionX: xPos,
          positionY: 0,
          boundsType: 'OBS_BOUNDS_SCALE_INNER',
          boundsWidth: overlayWidth,
          boundsHeight: outputHeight,
          boundsAlignment: 0
        }
      });

      console.log('Terminal Overlay created!');
      console.log(`Positioned at right ${Math.floor(0.35 * 100)}% of screen (${overlayWidth}x${outputHeight})`);
      console.log('\nNOW: In OBS, right-click "Terminal Overlay" > Properties');
      console.log('     Select "Windows Terminal" from the Window dropdown');
      await obs.disconnect();
      return;
    }

    if (!overlay) {
      console.log('Terminal overlay source not found.');
      console.log('Run: node obs-control.js overlay create');
      await obs.disconnect();
      return;
    }

    if (action === 'show') {
      await obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: true
      });
      console.log(`Overlay "${overlay.sourceName}" SHOWN`);
    } else if (action === 'hide') {
      await obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: false
      });
      console.log(`Overlay "${overlay.sourceName}" HIDDEN`);
    } else {
      // Assume it's an opacity value
      const opacity = parseFloat(action);
      if (isNaN(opacity) || opacity < 0 || opacity > 1) {
        console.log('Invalid opacity. Use a value between 0.0 and 1.0');
        await obs.disconnect();
        return;
      }

      // Check if Color Correction filter exists, create if not
      const filterName = 'Opacity';
      try {
        await obs.call('GetSourceFilter', {
          sourceName: overlay.sourceName,
          filterName: filterName
        });
      } catch (e) {
        // Filter doesn't exist, create it
        await obs.call('CreateSourceFilter', {
          sourceName: overlay.sourceName,
          filterName: filterName,
          filterKind: 'color_filter_v2',
          filterSettings: { opacity: opacity }
        });
        console.log(`Created opacity filter on "${overlay.sourceName}"`);
      }

      // Set the opacity
      await obs.call('SetSourceFilterSettings', {
        sourceName: overlay.sourceName,
        filterName: filterName,
        filterSettings: { opacity: opacity }
      });
      console.log(`Overlay opacity set to ${(opacity * 100).toFixed(0)}%`);
    }
  } catch (error) {
    console.error('Failed:', error.message);
  }
  await obs.disconnect();
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
  case 'sources':
    getSources();
    break;
  case 'refresh':
    if (!arg) {
      console.log('Usage: node obs-control.js refresh <source-name>');
    } else {
      refreshSource(arg);
    }
    break;
  case 'diagnose':
  case 'diag':
    diagnose();
    break;
  case 'enable':
    if (!arg) {
      console.log('Usage: node obs-control.js enable <source-name>');
    } else {
      enableSource(arg, true);
    }
    break;
  case 'disable':
    if (!arg) {
      console.log('Usage: node obs-control.js disable <source-name>');
    } else {
      enableSource(arg, false);
    }
    break;
  case 'audio':
    getAudio();
    break;
  case 'mute':
    if (!arg) {
      console.log('Usage: node obs-control.js mute <audio-source>');
    } else {
      setMute(arg, true);
    }
    break;
  case 'unmute':
    if (!arg) {
      console.log('Usage: node obs-control.js unmute <audio-source>');
    } else {
      setMute(arg, false);
    }
    break;
  case 'capture-audio':
    if (!arg) {
      console.log('Usage: node obs-control.js capture-audio <source-name>');
    } else {
      enableCaptureAudio(arg, true);
    }
    break;
  case 'overlay':
    if (!arg) {
      console.log('Usage: node obs-control.js overlay <show|hide|0.0-1.0>');
      console.log('Examples:');
      console.log('  overlay show    - Show terminal overlay');
      console.log('  overlay hide    - Hide terminal overlay');
      console.log('  overlay 0.7     - Set overlay opacity to 70%');
    } else {
      controlOverlay(arg);
    }
    break;
  default:
    console.log('OBS Control - Remote control for OBS Studio\n');
    console.log('Commands:');
    console.log('  start              Start streaming');
    console.log('  stop               Stop streaming');
    console.log('  status             Get current status');
    console.log('  scene <name>       Switch to scene');
    console.log('  sources            List all sources in current scene');
    console.log('  refresh <source>   Toggle source off/on to fix capture');
    console.log('  diagnose           Full diagnostic (sources, settings, warnings)');
    console.log('  overlay <action>   Control terminal overlay (show/hide/0.0-1.0)');
}
