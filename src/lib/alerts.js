const chalk = require('chalk');

// Alert thresholds
const THRESHOLDS = {
  bitrate: {
    green: 5500,   // > 5500 = good
    yellow: 4000,  // 4000-5500 = warning
    // < 4000 = critical
  },
  droppedPercent: {
    green: 1,      // < 1% = good
    yellow: 5,     // 1-5% = warning
    // > 5% = critical
  },
  cpu: {
    green: 70,     // < 70% = good
    yellow: 90,    // 70-90% = warning
    // > 90% = critical
  },
  fps: {
    green: 60,     // 60 = perfect
    yellow: 55,    // 55-59 = warning
    // < 55 = critical
  }
};

function getLevel(metric, value) {
  const threshold = THRESHOLDS[metric];
  if (!threshold) return 'unknown';

  const numValue = parseFloat(value);

  switch (metric) {
    case 'bitrate':
      if (numValue >= threshold.green) return 'green';
      if (numValue >= threshold.yellow) return 'yellow';
      return 'red';

    case 'droppedPercent':
      if (numValue < threshold.green) return 'green';
      if (numValue < threshold.yellow) return 'yellow';
      return 'red';

    case 'cpu':
      if (numValue < threshold.green) return 'green';
      if (numValue < threshold.yellow) return 'yellow';
      return 'red';

    case 'fps':
      if (numValue >= threshold.green) return 'green';
      if (numValue >= threshold.yellow) return 'yellow';
      return 'red';

    default:
      return 'unknown';
  }
}

function colorize(text, level) {
  switch (level) {
    case 'green':
      return chalk.green(text);
    case 'yellow':
      return chalk.yellow(text);
    case 'red':
      return chalk.red(text);
    default:
      return text;
  }
}

function colorizeValue(metric, value) {
  const level = getLevel(metric, value);
  return colorize(value, level);
}

function getStatusIcon(level) {
  switch (level) {
    case 'green':
      return chalk.green('●');
    case 'yellow':
      return chalk.yellow('●');
    case 'red':
      return chalk.red('●');
    default:
      return chalk.gray('●');
  }
}

function getBitrateBar(bitrate, targetBitrate = 6000) {
  const percent = Math.min(100, (bitrate / targetBitrate) * 100);
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  const level = getLevel('bitrate', bitrate);

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return colorize(bar, level);
}

function analyzeMetrics(metrics) {
  const warnings = [];

  // Check bitrate
  const bitrateLevel = getLevel('bitrate', metrics.stream.bitrate);
  if (bitrateLevel === 'red') {
    warnings.push({
      level: 'critical',
      message: `Bitrate critically low: ${metrics.stream.bitrate} kbps (target: 6000)`
    });
  } else if (bitrateLevel === 'yellow') {
    warnings.push({
      level: 'warning',
      message: `Bitrate below optimal: ${metrics.stream.bitrate} kbps`
    });
  }

  // Check dropped frames
  const droppedLevel = getLevel('droppedPercent', metrics.stream.droppedPercent);
  if (droppedLevel === 'red') {
    warnings.push({
      level: 'critical',
      message: `High dropped frames: ${metrics.stream.droppedPercent}%`
    });
  } else if (droppedLevel === 'yellow') {
    warnings.push({
      level: 'warning',
      message: `Elevated dropped frames: ${metrics.stream.droppedPercent}%`
    });
  }

  // Check CPU
  const cpuLevel = getLevel('cpu', metrics.system.cpuUsage);
  if (cpuLevel === 'red') {
    warnings.push({
      level: 'critical',
      message: `CPU usage critical: ${metrics.system.cpuUsage}%`
    });
  } else if (cpuLevel === 'yellow') {
    warnings.push({
      level: 'warning',
      message: `High CPU usage: ${metrics.system.cpuUsage}%`
    });
  }

  // Check FPS
  const fpsLevel = getLevel('fps', metrics.system.fps);
  if (fpsLevel === 'red') {
    warnings.push({
      level: 'critical',
      message: `FPS drop detected: ${metrics.system.fps} fps`
    });
  } else if (fpsLevel === 'yellow') {
    warnings.push({
      level: 'warning',
      message: `FPS slightly low: ${metrics.system.fps} fps`
    });
  }

  // Check reconnecting
  if (metrics.stream.reconnecting) {
    warnings.push({
      level: 'critical',
      message: 'Stream is reconnecting!'
    });
  }

  return warnings;
}

function formatWarnings(warnings) {
  if (warnings.length === 0) {
    return chalk.green('None');
  }

  return warnings.map(w => {
    const icon = w.level === 'critical' ? chalk.red('!') : chalk.yellow('!');
    const text = w.level === 'critical' ? chalk.red(w.message) : chalk.yellow(w.message);
    return `[${icon}] ${text}`;
  }).join('\n');
}

function getOverallStatus(metrics) {
  const warnings = analyzeMetrics(metrics);
  const criticalCount = warnings.filter(w => w.level === 'critical').length;
  const warningCount = warnings.filter(w => w.level === 'warning').length;

  if (criticalCount > 0) {
    return { level: 'red', label: 'CRITICAL', warnings };
  } else if (warningCount > 0) {
    return { level: 'yellow', label: 'WARNING', warnings };
  } else {
    return { level: 'green', label: 'HEALTHY', warnings };
  }
}

module.exports = {
  THRESHOLDS,
  getLevel,
  colorize,
  colorizeValue,
  getStatusIcon,
  getBitrateBar,
  analyzeMetrics,
  formatWarnings,
  getOverallStatus
};
