const chalk = require('chalk');
const StreamDatabase = require('../lib/db');

const db = new StreamDatabase();

function formatDuration(ms) {
  if (!ms) return '0m';
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getHealthBar(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  let color = 'green';
  if (score < 70) color = 'red';
  else if (score < 85) color = 'yellow';

  return chalk[color]('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = async function report(sessionId) {
  try {
    let session;

    if (sessionId) {
      session = db.getSession(parseInt(sessionId));
      if (!session) {
        console.log(chalk.red(`Session ${sessionId} not found`));
        return;
      }
    } else {
      session = db.getLatestSession();
      if (!session) {
        console.log(chalk.yellow('No stream sessions recorded yet.'));
        console.log(chalk.gray('Run `npm run monitor` during a stream to record metrics.'));
        return;
      }
    }

    const data = db.getSessionSummary(session.id);

    if (!data.summary && data.metrics.length === 0) {
      console.log(chalk.yellow('\nNo metrics recorded for this session.'));
      console.log(chalk.gray('The monitor must be running during the stream to collect data.'));
      return;
    }

    const healthScore = db.calculateHealthScore(data.summary);

    // Header
    console.log('\n' + chalk.bold.cyan('═'.repeat(50)));
    console.log(chalk.bold.cyan('  STREAM REPORT'));
    console.log(chalk.bold.cyan('═'.repeat(50)));

    // Session info
    console.log(`\n${chalk.gray('Date:')} ${formatDate(session.started_at)}`);
    console.log(`${chalk.gray('Duration:')} ${formatDuration(session.duration_ms)}`);
    if (!session.ended_at) {
      console.log(chalk.yellow('⚠ Session still active or ended unexpectedly'));
    }

    // Health score
    console.log(`\n${chalk.bold('Health Score:')} ${healthScore}/100 ${getHealthBar(healthScore)}`);

    // Performance metrics
    console.log('\n' + chalk.bold('─── Performance ───'));

    if (data.summary) {
      const bitrateColor = data.summary.avgBitrate >= 5500 ? 'green' :
                          data.summary.avgBitrate >= 4000 ? 'yellow' : 'red';
      console.log(`${chalk.gray('Avg Bitrate:')} ${chalk[bitrateColor](data.summary.avgBitrate + ' kbps')}`);
      console.log(`${chalk.gray('Bitrate Range:')} ${data.summary.minBitrate} - ${data.summary.maxBitrate} kbps`);

      const droppedColor = parseFloat(data.summary.avgDropped) < 1 ? 'green' :
                          parseFloat(data.summary.avgDropped) < 5 ? 'yellow' : 'red';
      console.log(`${chalk.gray('Avg Dropped:')} ${chalk[droppedColor](data.summary.avgDropped + '%')}`);
      console.log(`${chalk.gray('Peak Dropped:')} ${data.summary.peakDropped}%`);

      const cpuColor = parseFloat(data.summary.peakCpu) < 70 ? 'green' :
                      parseFloat(data.summary.peakCpu) < 90 ? 'yellow' : 'red';
      console.log(`${chalk.gray('Avg CPU:')} ${data.summary.avgCpu}%`);
      console.log(`${chalk.gray('Peak CPU:')} ${chalk[cpuColor](data.summary.peakCpu + '%')}`);
      console.log(`${chalk.gray('Peak Memory:')} ${data.summary.peakMemory} MB`);
    }

    // Errors
    if (data.errors.length > 0) {
      console.log('\n' + chalk.bold('─── Errors ───'));
      console.log(`${chalk.gray('Total:')} ${chalk.red(data.summary.totalErrors)}`);

      const errorGroups = {};
      for (const err of data.errors) {
        if (!errorGroups[err.type]) {
          errorGroups[err.type] = { count: 0, messages: [] };
        }
        errorGroups[err.type].count += err.count;
        if (!errorGroups[err.type].messages.includes(err.message)) {
          errorGroups[err.type].messages.push(err.message);
        }
      }

      for (const [type, info] of Object.entries(errorGroups)) {
        console.log(`  ${chalk.red('•')} ${type}: ${info.count}x`);
        for (const msg of info.messages.slice(0, 3)) {
          console.log(chalk.gray(`    "${msg}"`));
        }
      }
    } else {
      console.log('\n' + chalk.bold('─── Errors ───'));
      console.log(chalk.green('  ✓ No errors recorded'));
    }

    // Recommendations
    console.log('\n' + chalk.bold('─── Recommendations ───'));

    const recommendations = [];

    if (data.summary) {
      if (data.summary.avgBitrate < 5500) {
        recommendations.push('Consider checking network stability - average bitrate was below target');
      }
      if (parseFloat(data.summary.peakDropped) > 5) {
        recommendations.push('High dropped frames detected - may indicate network or encoding issues');
      }
      if (parseFloat(data.summary.peakCpu) > 90) {
        recommendations.push('CPU peaked above 90% - consider lowering encoding preset or resolution');
      }
    }

    if (data.errors.some(e => e.message.includes('decode'))) {
      recommendations.push('Video decode errors detected - check iOS camera connection stability');
    }

    if (recommendations.length === 0) {
      console.log(chalk.green('  ✓ Stream was healthy, no recommendations'));
    } else {
      for (const rec of recommendations) {
        console.log(`  ${chalk.yellow('•')} ${rec}`);
      }
    }

    // Recent sessions summary
    const recentSessions = db.getRecentSessions(5);
    if (recentSessions.length > 1) {
      console.log('\n' + chalk.bold('─── Recent Sessions ───'));
      for (const s of recentSessions) {
        const score = db.calculateHealthScore(db.getSessionSummary(s.id)?.summary);
        const scoreColor = score >= 85 ? 'green' : score >= 70 ? 'yellow' : 'red';
        const current = s.id === session.id ? chalk.cyan(' ← current') : '';
        console.log(`  ${formatDate(s.started_at).padEnd(30)} ${formatDuration(s.duration_ms).padEnd(8)} Score: ${chalk[scoreColor](score)}${current}`);
      }
    }

    console.log('\n' + chalk.gray('─'.repeat(50)));
    console.log(chalk.gray(`Session ID: ${session.id}`));
    console.log(chalk.gray(`Data points: ${data.metrics.length}`));
    console.log();

  } catch (error) {
    console.error(chalk.red('Failed to generate report:'), error.message);
  } finally {
    db.close();
  }
};
