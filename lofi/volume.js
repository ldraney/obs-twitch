#!/usr/bin/env node
/**
 * Lofi Volume Controller
 *
 * Controls system volume (for now - per-app coming later)
 * Usage: node volume.js [0-100]
 */

const loudness = require('loudness');

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    const vol = await loudness.getVolume();
    console.log(`Current system volume: ${vol}%`);
    console.log('Usage: node volume.js <0-100>');
    return;
  }

  const level = parseInt(arg, 10);
  if (isNaN(level) || level < 0 || level > 100) {
    console.error('Volume must be 0-100');
    process.exit(1);
  }

  await loudness.setVolume(level);
  console.log(`Volume set to ${level}%`);
}

main().catch(console.error);
