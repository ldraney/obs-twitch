require('dotenv').config();
const OBSWebSocket = require('obs-websocket-js').default;

class OBSMetrics {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.config = {
      url: `ws://localhost:${process.env.OBS_WEBSOCKET_PORT || 4455}`,
      password: process.env.OBS_WEBSOCKET_PASSWORD
    };
  }

  async connect() {
    if (this.connected) return true;
    try {
      await this.obs.connect(this.config.url, this.config.password);
      this.connected = true;
      return true;
    } catch (error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('OBS not running or WebSocket not enabled');
      }
      throw error;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
    }
  }

  async getStats() {
    await this.connect();
    const stats = await this.obs.call('GetStats');
    return {
      cpuUsage: stats.cpuUsage,
      memoryUsage: stats.memoryUsage,
      availableDiskSpace: stats.availableDiskSpace,
      activeFps: stats.activeFps,
      averageFrameRenderTime: stats.averageFrameRenderTime,
      renderSkippedFrames: stats.renderSkippedFrames,
      renderTotalFrames: stats.renderTotalFrames,
      outputSkippedFrames: stats.outputSkippedFrames,
      outputTotalFrames: stats.outputTotalFrames
    };
  }

  async getStreamStatus() {
    await this.connect();
    const status = await this.obs.call('GetStreamStatus');
    return {
      active: status.outputActive,
      reconnecting: status.outputReconnecting,
      timecode: status.outputTimecode,
      duration: status.outputDuration,
      congestion: status.outputCongestion,
      bytes: status.outputBytes,
      skippedFrames: status.outputSkippedFrames,
      totalFrames: status.outputTotalFrames
    };
  }

  async getFullMetrics() {
    await this.connect();

    const [stats, streamStatus, videoSettings, sceneList] = await Promise.all([
      this.obs.call('GetStats'),
      this.obs.call('GetStreamStatus'),
      this.obs.call('GetVideoSettings'),
      this.obs.call('GetSceneList')
    ]);

    const bitrate = streamStatus.outputActive && streamStatus.outputDuration > 0
      ? (streamStatus.outputBytes / (streamStatus.outputDuration / 1000) * 8 / 1024)
      : 0;

    const droppedPercent = streamStatus.outputTotalFrames > 0
      ? (streamStatus.outputSkippedFrames / streamStatus.outputTotalFrames * 100)
      : 0;

    return {
      timestamp: Date.now(),
      stream: {
        active: streamStatus.outputActive,
        reconnecting: streamStatus.outputReconnecting,
        duration: streamStatus.outputDuration,
        timecode: streamStatus.outputTimecode,
        bytes: streamStatus.outputBytes,
        bitrate: Math.round(bitrate),
        skippedFrames: streamStatus.outputSkippedFrames,
        totalFrames: streamStatus.outputTotalFrames,
        droppedPercent: droppedPercent.toFixed(2)
      },
      system: {
        cpuUsage: stats.cpuUsage.toFixed(1),
        memoryUsage: stats.memoryUsage.toFixed(0),
        fps: stats.activeFps.toFixed(0),
        frameRenderTime: stats.averageFrameRenderTime.toFixed(2),
        renderSkipped: stats.renderSkippedFrames,
        renderTotal: stats.renderTotalFrames
      },
      video: {
        baseWidth: videoSettings.baseWidth,
        baseHeight: videoSettings.baseHeight,
        outputWidth: videoSettings.outputWidth,
        outputHeight: videoSettings.outputHeight,
        fps: videoSettings.fpsNumerator / videoSettings.fpsDenominator
      },
      scene: sceneList.currentProgramSceneName
    };
  }

  async getSources() {
    await this.connect();
    const sceneList = await this.obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    const items = await this.obs.call('GetSceneItemList', { sceneName: currentScene });

    const sources = [];
    for (const item of items.sceneItems) {
      const source = {
        name: item.sourceName,
        kind: item.inputKind || 'group',
        enabled: item.sceneItemEnabled,
        id: item.sceneItemId
      };

      if (item.inputKind && item.inputKind.includes('capture')) {
        try {
          const settings = await this.obs.call('GetInputSettings', { inputName: item.sourceName });
          source.window = settings.inputSettings.window;
          source.captureAudio = settings.inputSettings.capture_audio;
        } catch (e) {}
      }
      sources.push(source);
    }
    return { scene: currentScene, sources };
  }

  async getAudioSources() {
    await this.connect();
    const inputs = await this.obs.call('GetInputList');
    const special = await this.obs.call('GetSpecialInputs');

    const audioSources = [];

    for (const input of inputs.inputs) {
      if (input.inputKind.includes('audio') ||
          input.inputKind.includes('wasapi') ||
          input.inputKind === 'game_capture' ||
          input.inputKind === 'window_capture') {
        try {
          const muted = await this.obs.call('GetInputMute', { inputName: input.inputName });
          const volume = await this.obs.call('GetInputVolume', { inputName: input.inputName });

          const source = {
            name: input.inputName,
            kind: input.inputKind,
            muted: muted.inputMuted,
            volumeDb: volume.inputVolumeDb.toFixed(1)
          };

          if (input.inputKind === 'window_capture' || input.inputKind === 'game_capture') {
            const settings = await this.obs.call('GetInputSettings', { inputName: input.inputName });
            source.captureAudio = settings.inputSettings.capture_audio || false;
          }

          audioSources.push(source);
        } catch (e) {}
      }
    }

    // Add special inputs (desktop audio, mic)
    for (const [key, name] of Object.entries(special)) {
      if (name) {
        try {
          const muted = await this.obs.call('GetInputMute', { inputName: name });
          const volume = await this.obs.call('GetInputVolume', { inputName: name });
          audioSources.push({
            name: name,
            kind: key,
            muted: muted.inputMuted,
            volumeDb: volume.inputVolumeDb.toFixed(1),
            isGlobal: true
          });
        } catch (e) {}
      }
    }

    return audioSources;
  }

  async startStream() {
    await this.connect();
    await this.obs.call('StartStream');
  }

  async stopStream() {
    await this.connect();
    await this.obs.call('StopStream');
  }

  async setSourceEnabled(sourceName, enabled) {
    await this.connect();
    const sceneList = await this.obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    const items = await this.obs.call('GetSceneItemList', { sceneName: currentScene });

    const item = items.sceneItems.find(i =>
      i.sourceName.toLowerCase().includes(sourceName.toLowerCase())
    );

    if (!item) {
      throw new Error(`Source "${sourceName}" not found`);
    }

    await this.obs.call('SetSceneItemEnabled', {
      sceneName: currentScene,
      sceneItemId: item.sceneItemId,
      sceneItemEnabled: enabled
    });

    return item.sourceName;
  }

  async refreshSource(sourceName) {
    const name = await this.setSourceEnabled(sourceName, false);
    await new Promise(r => setTimeout(r, 500));
    await this.setSourceEnabled(sourceName, true);
    return name;
  }

  async setMute(inputName, mute) {
    await this.connect();
    const inputs = await this.obs.call('GetInputList');
    const special = await this.obs.call('GetSpecialInputs');

    let targetName = inputs.inputs.find(i =>
      i.inputName.toLowerCase().includes(inputName.toLowerCase())
    )?.inputName;

    if (!targetName) {
      for (const [key, name] of Object.entries(special)) {
        if (name && name.toLowerCase().includes(inputName.toLowerCase())) {
          targetName = name;
          break;
        }
      }
    }

    if (!targetName) {
      throw new Error(`Audio input "${inputName}" not found`);
    }

    await this.obs.call('SetInputMute', { inputName: targetName, inputMuted: mute });
    return targetName;
  }

  async setCaptureAudio(sourceName, enable) {
    await this.connect();
    const inputs = await this.obs.call('GetInputList');
    const match = inputs.inputs.find(i =>
      i.inputName.toLowerCase().includes(sourceName.toLowerCase()) &&
      (i.inputKind === 'window_capture' || i.inputKind === 'game_capture')
    );

    if (!match) {
      throw new Error(`Capture source "${sourceName}" not found`);
    }

    const current = await this.obs.call('GetInputSettings', { inputName: match.inputName });
    await this.obs.call('SetInputSettings', {
      inputName: match.inputName,
      inputSettings: { ...current.inputSettings, capture_audio: enable }
    });

    return match.inputName;
  }

  async switchScene(sceneName) {
    await this.connect();
    await this.obs.call('SetCurrentProgramScene', { sceneName });
    return sceneName;
  }

  async getScenes() {
    await this.connect();
    const sceneList = await this.obs.call('GetSceneList');
    return {
      current: sceneList.currentProgramSceneName,
      scenes: sceneList.scenes.map(s => s.sceneName)
    };
  }

  async controlOverlay(action) {
    await this.connect();
    const sceneList = await this.obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    const items = await this.obs.call('GetSceneItemList', { sceneName: currentScene });

    // Find terminal overlay source
    let overlay = items.sceneItems.find(i =>
      i.sourceName.toLowerCase().includes('terminal') ||
      i.sourceName.toLowerCase().includes('overlay')
    );

    // Create overlay if it doesn't exist
    if (!overlay && action === 'create') {
      const video = await this.obs.call('GetVideoSettings');
      const baseWidth = video.baseWidth;
      const baseHeight = video.baseHeight;

      const result = await this.obs.call('CreateInput', {
        sceneName: currentScene,
        inputName: 'Terminal Overlay',
        inputKind: 'window_capture',
        inputSettings: {
          cursor: true,
          method: 2,
          window: ':CASCADIA_HOSTING_WINDOW_CLASS:WindowsTerminal.exe'
        }
      });

      // Scale to fill the entire base canvas
      await this.obs.call('SetSceneItemTransform', {
        sceneName: currentScene,
        sceneItemId: result.sceneItemId,
        sceneItemTransform: {
          positionX: 0,
          positionY: 0,
          boundsType: 'OBS_BOUNDS_SCALE_INNER',
          boundsWidth: baseWidth,
          boundsHeight: baseHeight,
          boundsAlignment: 0
        }
      });

      return { created: true, name: 'Terminal Overlay', width: baseWidth, height: baseHeight };
    }

    if (!overlay) {
      throw new Error('Terminal overlay not found. Run: npm run obs overlay create');
    }

    if (action === 'show') {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: true
      });
      return { action: 'show', name: overlay.sourceName };
    }

    if (action === 'hide') {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: false
      });
      return { action: 'hide', name: overlay.sourceName };
    }

    // Opacity value
    const opacity = parseFloat(action);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      throw new Error('Invalid opacity. Use a value between 0.0 and 1.0');
    }

    const filterName = 'Opacity';
    try {
      await this.obs.call('GetSourceFilter', {
        sourceName: overlay.sourceName,
        filterName: filterName
      });
    } catch (e) {
      await this.obs.call('CreateSourceFilter', {
        sourceName: overlay.sourceName,
        filterName: filterName,
        filterKind: 'color_filter_v2',
        filterSettings: { opacity: opacity }
      });
    }

    await this.obs.call('SetSourceFilterSettings', {
      sourceName: overlay.sourceName,
      filterName: filterName,
      filterSettings: { opacity: opacity }
    });

    return { action: 'opacity', name: overlay.sourceName, opacity };
  }

  async controlCelebrationOverlay(action) {
    await this.connect();
    const sceneList = await this.obs.call('GetSceneList');
    const currentScene = sceneList.currentProgramSceneName;
    const items = await this.obs.call('GetSceneItemList', { sceneName: currentScene });

    // Find celebration overlay source
    let overlay = items.sceneItems.find(i =>
      i.sourceName.toLowerCase().includes('celebration') ||
      i.sourceName.toLowerCase().includes('follower')
    );

    // Create overlay if it doesn't exist
    if (!overlay && action === 'create') {
      const video = await this.obs.call('GetVideoSettings');
      const baseWidth = video.baseWidth;
      const baseHeight = video.baseHeight;

      // Build file:// URL for overlay
      const path = require('path');
      const overlayPath = path.resolve(__dirname, '..', '..', 'overlay', 'index.html');
      const fileUrl = `file:///${overlayPath.replace(/\\/g, '/')}`;

      const result = await this.obs.call('CreateInput', {
        sceneName: currentScene,
        inputName: 'Celebration Overlay',
        inputKind: 'browser_source',
        inputSettings: {
          url: fileUrl,
          width: baseWidth,
          height: baseHeight,
          css: '',
          shutdown: false,
          restart_when_active: false
        }
      });

      // Scale to fill the entire base canvas
      await this.obs.call('SetSceneItemTransform', {
        sceneName: currentScene,
        sceneItemId: result.sceneItemId,
        sceneItemTransform: {
          positionX: 0,
          positionY: 0,
          boundsType: 'OBS_BOUNDS_SCALE_INNER',
          boundsWidth: baseWidth,
          boundsHeight: baseHeight,
          boundsAlignment: 0
        }
      });

      // Move to top of source list (render on top)
      const updatedItems = await this.obs.call('GetSceneItemList', { sceneName: currentScene });
      const maxIndex = Math.max(...updatedItems.sceneItems.map(i => i.sceneItemIndex));
      await this.obs.call('SetSceneItemIndex', {
        sceneName: currentScene,
        sceneItemId: result.sceneItemId,
        sceneItemIndex: maxIndex
      });

      return { created: true, name: 'Celebration Overlay', width: baseWidth, height: baseHeight, url: fileUrl };
    }

    if (!overlay) {
      throw new Error('Celebration overlay not found. Run: npm run obs celebration create');
    }

    if (action === 'show') {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: true
      });
      return { action: 'show', name: overlay.sourceName };
    }

    if (action === 'hide') {
      await this.obs.call('SetSceneItemEnabled', {
        sceneName: currentScene,
        sceneItemId: overlay.sceneItemId,
        sceneItemEnabled: false
      });
      return { action: 'hide', name: overlay.sourceName };
    }

    if (action === 'refresh') {
      // Refresh browser source to reconnect WebSocket
      await this.obs.call('PressInputPropertiesButton', {
        inputName: overlay.sourceName,
        propertyName: 'refreshnocache'
      });
      return { action: 'refresh', name: overlay.sourceName };
    }

    throw new Error('Invalid action. Use: create, show, hide, refresh');
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

module.exports = OBSMetrics;
