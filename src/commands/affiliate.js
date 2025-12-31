/**
 * Twitch Affiliate Progress Command
 *
 * Shows progress toward Twitch Affiliate requirements:
 * - 7+ stream days (in 30-day window)
 * - 8+ hours streamed (in 30-day window)
 * - 3+ average concurrent viewers
 * - 50+ followers
 */

const chalk = require('chalk');
const StreamDatabase = require('../lib/db');
const TwitchClient = require('../lib/twitch');

// Affiliate requirements
const REQUIREMENTS = {
  streamDays: 7,
  streamHours: 8,
  avgViewers: 3,
  followers: 50,
};

function progressBar(current, target, width = 20) {
  const percent = Math.min(current / target, 1);
  const filled = Math.round(percent * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percentText = Math.round(percent * 100) + '%';

  return `[${bar}] ${percentText}`;
}

function formatRequirement(label, current, target, suffix = '') {
  const met = current >= target;
  const icon = met ? chalk.green('✓') : chalk.yellow('○');
  const value = met
    ? chalk.green(`${current}/${target}${suffix}`)
    : chalk.yellow(`${current}/${target}${suffix}`);

  const bar = progressBar(current, target);

  // Pad label to align
  const paddedLabel = label.padEnd(16);
  return `${icon} ${paddedLabel} ${value.padEnd(20)} ${bar}`;
}

async function affiliate(options = {}) {
  const db = new StreamDatabase();
  const twitch = new TwitchClient();

  console.log('');
  console.log(chalk.bold('Twitch Affiliate Progress'));
  console.log(chalk.gray('══════════════════════════════════════════════════════'));
  console.log('');

  // Get local stream data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sessions = db.getRecentSessions(100).filter(s => {
    const sessionDate = new Date(s.started_at);
    return sessionDate >= thirtyDaysAgo && s.ended_at;
  });

  // Calculate stream days (unique dates)
  const streamDates = new Set(
    sessions.map(s => new Date(s.started_at).toDateString())
  );
  const streamDays = streamDates.size;

  // Calculate total hours
  const totalMs = sessions.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
  const streamHours = totalMs / (1000 * 60 * 60);

  // Get Twitch data
  let followers = 0;
  let avgViewers = 0;
  let twitchError = null;

  if (twitch.isConfigured()) {
    try {
      const data = await twitch.getAffiliateData();
      followers = data.followers;

      // Show current stream status if live
      if (data.stream.live) {
        console.log(chalk.red.bold('🔴 LIVE NOW'));
        console.log(chalk.gray(`   ${data.stream.viewers} viewers | ${data.stream.game}`));
        console.log('');
      }
    } catch (error) {
      twitchError = error.message;
    }
  } else {
    twitchError = 'Twitch API not configured (check ~/twitch-secrets/.env)';
  }

  // Display requirements
  console.log(chalk.bold('30-Day Requirements:'));
  console.log('');
  console.log(formatRequirement('Stream Days', streamDays, REQUIREMENTS.streamDays));
  console.log(formatRequirement('Hours Streamed', streamHours.toFixed(1), REQUIREMENTS.streamHours, 'h'));
  console.log(formatRequirement('Avg Viewers', avgViewers, REQUIREMENTS.avgViewers));
  console.log(formatRequirement('Followers', followers, REQUIREMENTS.followers));
  console.log('');

  // Show what's needed
  const needed = [];
  if (streamDays < REQUIREMENTS.streamDays) {
    needed.push(`${REQUIREMENTS.streamDays - streamDays} more stream days`);
  }
  if (streamHours < REQUIREMENTS.streamHours) {
    needed.push(`${(REQUIREMENTS.streamHours - streamHours).toFixed(1)} more hours`);
  }
  if (avgViewers < REQUIREMENTS.avgViewers) {
    needed.push(`${REQUIREMENTS.avgViewers - avgViewers} more avg viewers`);
  }
  if (followers < REQUIREMENTS.followers) {
    needed.push(`${REQUIREMENTS.followers - followers} more followers`);
  }

  if (needed.length === 0) {
    console.log(chalk.green.bold('🎉 You meet all Affiliate requirements!'));
    console.log(chalk.gray('   Apply at: https://dashboard.twitch.tv/monetization'));
  } else {
    console.log(chalk.yellow('Still needed:'));
    needed.forEach(n => console.log(chalk.yellow(`   • ${n}`)));
  }

  // Show detailed breakdown if requested
  if (options.detailed && sessions.length > 0) {
    console.log('');
    console.log(chalk.gray('──────────────────────────────────────────────────────'));
    console.log(chalk.bold('Recent Streams:'));
    console.log('');

    sessions.slice(0, 7).forEach(s => {
      const date = new Date(s.started_at).toLocaleDateString();
      const duration = s.duration_ms ? (s.duration_ms / (1000 * 60 * 60)).toFixed(1) : '?';
      const health = s.dropped_percent !== null
        ? (s.dropped_percent < 1 ? chalk.green('●') : chalk.yellow('●'))
        : chalk.gray('○');

      console.log(`   ${health} ${date}  ${duration}h  ${chalk.gray(s.avg_bitrate ? Math.round(s.avg_bitrate) + ' kbps' : '')}`);
    });
  }

  // Show errors if any
  if (twitchError) {
    console.log('');
    console.log(chalk.red(`Twitch API: ${twitchError}`));
  }

  // Note about avg viewers
  console.log('');
  console.log(chalk.gray('Note: Avg viewers requires Twitch user auth (node auth.js user in ~/twitch-client)'));

  db.close();
}

module.exports = affiliate;
