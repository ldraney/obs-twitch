#!/usr/bin/env node
require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const OBSMetrics = require('./lib/metrics');
const { colorizeValue, getStatusIcon, getBitrateBar, formatWarnings, getOverallStatus } = require('./lib/alerts');

const obs = new OBSMetrics();

program
  .name('obs')
  .description('OBS Stream Control & Monitoring CLI')
  .version('2.0.0');

// Start streaming
program
  .command('start')
  .description('Start streaming')
  .action(async () => {
    try {
      await obs.startStream();
      console.log(chalk.green('Stream started!'));
    } catch (error) {
      if (error.message.includes('already active')) {
        console.log(chalk.yellow('Stream is already running'));
      } else {
        console.error(chalk.red('Failed:'), error.message);
      }
    } finally {
      await obs.disconnect();
    }
  });

// Stop streaming
program
  .command('stop')
  .description('Stop streaming')
  .action(async () => {
    try {
      await obs.stopStream();
      console.log(chalk.green('Stream stopped'));
    } catch (error) {
      if (error.message.includes('not active')) {
        console.log(chalk.yellow('Stream is not running'));
      } else {
        console.error(chalk.red('Failed:'), error.message);
      }
    } finally {
      await obs.disconnect();
    }
  });

// Status
program
  .command('status')
  .description('Get current stream status')
  .action(async () => {
    try {
      const metrics = await obs.getFullMetrics();

      console.log('\n' + chalk.bold('=== OBS Status ==='));
      console.log(`Stream: ${metrics.stream.active ? chalk.green('LIVE') : chalk.gray('OFFLINE')}`);

      if (metrics.stream.active) {
        console.log(`Duration: ${obs.formatDuration(metrics.stream.duration)}`);
        console.log(`Bitrate: ${colorizeValue('bitrate', metrics.stream.bitrate)} kbps`);
        console.log(`Dropped: ${colorizeValue('droppedPercent', metrics.stream.droppedPercent)}%`);
      }

      console.log(`\nScene: ${metrics.scene}`);
      console.log(`Video: ${metrics.video.outputWidth}x${metrics.video.outputHeight} @ ${metrics.video.fps}fps`);
      console.log(`CPU: ${colorizeValue('cpu', metrics.system.cpuUsage)}%`);
      console.log(`Memory: ${metrics.system.memoryUsage} MB`);
      console.log(`FPS: ${colorizeValue('fps', metrics.system.fps)}`);

    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Diagnose
program
  .command('diagnose')
  .alias('diag')
  .description('Full diagnostic with warnings')
  .action(async () => {
    try {
      const metrics = await obs.getFullMetrics();
      const sources = await obs.getSources();
      const audio = await obs.getAudioSources();
      const status = getOverallStatus(metrics);

      console.log('\n' + chalk.bold('=== OBS Diagnostic ==='));
      console.log(`Status: ${getStatusIcon(status.level)} ${chalk[status.level === 'red' ? 'red' : status.level === 'yellow' ? 'yellow' : 'green'](status.label)}`);

      console.log('\n' + chalk.bold('--- Stream ---'));
      console.log(`Active: ${metrics.stream.active ? chalk.green('YES') : chalk.red('NO')}`);
      if (metrics.stream.active) {
        console.log(`Duration: ${obs.formatDuration(metrics.stream.duration)}`);
        console.log(`Bitrate: ${colorizeValue('bitrate', metrics.stream.bitrate)} kbps  ${getBitrateBar(metrics.stream.bitrate)}`);
        console.log(`Dropped: ${colorizeValue('droppedPercent', metrics.stream.droppedPercent)}% (${metrics.stream.skippedFrames}/${metrics.stream.totalFrames})`);
      }

      console.log('\n' + chalk.bold('--- System ---'));
      console.log(`CPU: ${colorizeValue('cpu', metrics.system.cpuUsage)}%`);
      console.log(`Memory: ${metrics.system.memoryUsage} MB`);
      console.log(`FPS: ${colorizeValue('fps', metrics.system.fps)}`);

      console.log('\n' + chalk.bold('--- Sources ---'));
      for (const source of sources.sources) {
        const icon = source.enabled ? chalk.green('✓') : chalk.red('✗');
        console.log(`${icon} ${source.name} (${source.kind})`);
        if (source.window) {
          console.log(`  └─ Window: ${source.window}`);
        }
      }

      console.log('\n' + chalk.bold('--- Audio ---'));
      for (const src of audio) {
        const icon = src.muted ? chalk.red('🔇') : chalk.green('🔊');
        const extra = src.captureAudio ? ' (capture audio)' : '';
        console.log(`${icon} ${src.name}${extra}: ${src.volumeDb} dB`);
      }

      console.log('\n' + chalk.bold('--- Warnings ---'));
      console.log(formatWarnings(status.warnings));

      console.log('\n' + chalk.bold('--- Video ---'));
      console.log(`Base: ${metrics.video.baseWidth}x${metrics.video.baseHeight}`);
      console.log(`Output: ${metrics.video.outputWidth}x${metrics.video.outputHeight}`);
      console.log(`FPS: ${metrics.video.fps}`);

    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Sources
program
  .command('sources')
  .description('List video sources')
  .action(async () => {
    try {
      const { scene, sources } = await obs.getSources();
      console.log(`\n${chalk.bold('=== Sources in "')}${scene}${chalk.bold('" ===')}`);

      for (const source of sources) {
        const icon = source.enabled ? chalk.green('✓') : chalk.red('✗');
        console.log(`${icon} ${source.name} (${source.kind})`);
        if (source.window) {
          console.log(`  └─ Window: ${source.window}`);
        }
      }
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Audio
program
  .command('audio')
  .description('List audio sources')
  .action(async () => {
    try {
      const sources = await obs.getAudioSources();
      console.log('\n' + chalk.bold('=== Audio Sources ==='));

      for (const src of sources) {
        const icon = src.muted ? chalk.red('🔇 MUTED') : chalk.green('🔊');
        const extra = src.captureAudio ? chalk.cyan(' [capture audio]') : '';
        const global = src.isGlobal ? chalk.gray(' (global)') : '';
        console.log(`${icon} ${src.name}${extra}${global}`);
        console.log(`   Volume: ${src.volumeDb} dB`);
      }
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Enable source
program
  .command('enable <source>')
  .description('Enable a source')
  .action(async (source) => {
    try {
      const name = await obs.setSourceEnabled(source, true);
      console.log(chalk.green(`${name} ENABLED`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Disable source
program
  .command('disable <source>')
  .description('Disable a source')
  .action(async (source) => {
    try {
      const name = await obs.setSourceEnabled(source, false);
      console.log(chalk.yellow(`${name} DISABLED`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Refresh source
program
  .command('refresh <source>')
  .description('Toggle source off/on to fix capture')
  .action(async (source) => {
    try {
      const name = await obs.refreshSource(source);
      console.log(chalk.green(`${name} refreshed`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Mute
program
  .command('mute <source>')
  .description('Mute an audio source')
  .action(async (source) => {
    try {
      const name = await obs.setMute(source, true);
      console.log(chalk.yellow(`${name} MUTED`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Unmute
program
  .command('unmute <source>')
  .description('Unmute an audio source')
  .action(async (source) => {
    try {
      const name = await obs.setMute(source, false);
      console.log(chalk.green(`${name} UNMUTED`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Capture audio
program
  .command('capture-audio <source>')
  .description('Enable audio capture on window/game source')
  .action(async (source) => {
    try {
      const name = await obs.setCaptureAudio(source, true);
      console.log(chalk.green(`${name}: Capture Audio ENABLED`));
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Scene
program
  .command('scene [name]')
  .description('Switch scene or list available scenes')
  .action(async (name) => {
    try {
      if (name) {
        await obs.switchScene(name);
        console.log(chalk.green(`Switched to scene: ${name}`));
      } else {
        const { current, scenes } = await obs.getScenes();
        console.log('\n' + chalk.bold('=== Scenes ==='));
        for (const scene of scenes) {
          const marker = scene === current ? chalk.green(' ← current') : '';
          console.log(`  ${scene}${marker}`);
        }
      }
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Overlay
program
  .command('overlay <action>')
  .description('Control terminal overlay (show/hide/create/0.0-1.0)')
  .action(async (action) => {
    try {
      const result = await obs.controlOverlay(action);

      if (result.created) {
        console.log(chalk.green(`Created "${result.name}"`));
        console.log(`Scaled to ${result.width}x${result.height}`);
        console.log(chalk.yellow('\nNote: In OBS, you may need to select the correct window'));
      } else if (result.action === 'show') {
        console.log(chalk.green(`${result.name} SHOWN`));
      } else if (result.action === 'hide') {
        console.log(chalk.yellow(`${result.name} HIDDEN`));
      } else if (result.action === 'opacity') {
        console.log(chalk.green(`${result.name} opacity set to ${(result.opacity * 100).toFixed(0)}%`));
      }
    } catch (error) {
      console.error(chalk.red('Failed:'), error.message);
    } finally {
      await obs.disconnect();
    }
  });

// Monitor (live dashboard)
program
  .command('monitor')
  .description('Live stream monitoring dashboard')
  .option('-i, --interval <seconds>', 'Update interval', '2')
  .action(async (options) => {
    const monitor = require('./commands/monitor');
    await monitor(parseInt(options.interval) * 1000);
  });

// Report
program
  .command('report')
  .description('Show post-stream report')
  .option('-s, --session <id>', 'Session ID (defaults to latest)')
  .action(async (options) => {
    const report = require('./commands/report');
    await report(options.session);
  });

// Affiliate progress
program
  .command('affiliate')
  .description('Show Twitch Affiliate progress')
  .option('-d, --detailed', 'Show detailed stream breakdown')
  .action(async (options) => {
    const affiliate = require('./commands/affiliate');
    await affiliate(options);
  });

program.parse();
