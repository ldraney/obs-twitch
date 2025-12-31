const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class StreamDatabase {
  constructor(dbPath) {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = dbPath || path.join(dataDir, 'streams.db');
    this.db = new Database(this.dbPath);
    this.init();
  }

  init() {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_ms INTEGER,
        avg_bitrate REAL,
        total_frames INTEGER,
        dropped_frames INTEGER,
        dropped_percent REAL,
        peak_cpu REAL,
        peak_memory REAL,
        errors INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        timestamp TEXT NOT NULL,
        bitrate INTEGER,
        cpu_usage REAL,
        memory_mb REAL,
        fps REAL,
        dropped_frames INTEGER,
        total_frames INTEGER,
        dropped_percent REAL,
        congestion REAL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        timestamp TEXT NOT NULL,
        type TEXT,
        message TEXT,
        count INTEGER DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics(session_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_errors_session ON errors(session_id);
    `);
  }

  startSession() {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (started_at) VALUES (?)
    `);
    const result = stmt.run(new Date().toISOString());
    return result.lastInsertRowid;
  }

  endSession(sessionId, summary) {
    const stmt = this.db.prepare(`
      UPDATE sessions SET
        ended_at = ?,
        duration_ms = ?,
        avg_bitrate = ?,
        total_frames = ?,
        dropped_frames = ?,
        dropped_percent = ?,
        peak_cpu = ?,
        peak_memory = ?,
        errors = ?
      WHERE id = ?
    `);
    stmt.run(
      new Date().toISOString(),
      summary.duration,
      summary.avgBitrate,
      summary.totalFrames,
      summary.droppedFrames,
      summary.droppedPercent,
      summary.peakCpu,
      summary.peakMemory,
      summary.errors,
      sessionId
    );
  }

  recordMetric(sessionId, metric) {
    const stmt = this.db.prepare(`
      INSERT INTO metrics (
        session_id, timestamp, bitrate, cpu_usage, memory_mb,
        fps, dropped_frames, total_frames, dropped_percent, congestion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      sessionId,
      new Date().toISOString(),
      metric.bitrate,
      metric.cpuUsage,
      metric.memoryMb,
      metric.fps,
      metric.droppedFrames,
      metric.totalFrames,
      metric.droppedPercent,
      metric.congestion || 0
    );
  }

  recordError(sessionId, type, message) {
    // Check if same error exists recently, increment count if so
    const existing = this.db.prepare(`
      SELECT id, count FROM errors
      WHERE session_id = ? AND type = ? AND message = ?
      AND timestamp > datetime('now', '-5 minutes')
      ORDER BY timestamp DESC LIMIT 1
    `).get(sessionId, type, message);

    if (existing) {
      this.db.prepare(`UPDATE errors SET count = count + 1 WHERE id = ?`)
        .run(existing.id);
    } else {
      this.db.prepare(`
        INSERT INTO errors (session_id, timestamp, type, message)
        VALUES (?, ?, ?, ?)
      `).run(sessionId, new Date().toISOString(), type, message);
    }
  }

  getSession(sessionId) {
    return this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
  }

  getSessionMetrics(sessionId) {
    return this.db.prepare(`
      SELECT * FROM metrics WHERE session_id = ? ORDER BY timestamp
    `).all(sessionId);
  }

  getSessionErrors(sessionId) {
    return this.db.prepare(`
      SELECT * FROM errors WHERE session_id = ? ORDER BY timestamp
    `).all(sessionId);
  }

  getRecentSessions(limit = 10) {
    return this.db.prepare(`
      SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?
    `).all(limit);
  }

  getLatestSession() {
    return this.db.prepare(`
      SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1
    `).get();
  }

  getActiveSession() {
    return this.db.prepare(`
      SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1
    `).get();
  }

  getSessionSummary(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const metrics = this.getSessionMetrics(sessionId);
    const errors = this.getSessionErrors(sessionId);

    if (metrics.length === 0) {
      return { session, metrics: [], errors, summary: null };
    }

    const bitrates = metrics.map(m => m.bitrate).filter(b => b > 0);
    const cpus = metrics.map(m => m.cpu_usage);
    const memories = metrics.map(m => m.memory_mb);
    const dropped = metrics.map(m => m.dropped_percent);

    return {
      session,
      metrics,
      errors,
      summary: {
        avgBitrate: bitrates.length > 0 ? Math.round(bitrates.reduce((a, b) => a + b, 0) / bitrates.length) : 0,
        minBitrate: bitrates.length > 0 ? Math.min(...bitrates) : 0,
        maxBitrate: bitrates.length > 0 ? Math.max(...bitrates) : 0,
        avgCpu: cpus.length > 0 ? (cpus.reduce((a, b) => a + b, 0) / cpus.length).toFixed(1) : 0,
        peakCpu: cpus.length > 0 ? Math.max(...cpus).toFixed(1) : 0,
        peakMemory: memories.length > 0 ? Math.max(...memories).toFixed(0) : 0,
        avgDropped: dropped.length > 0 ? (dropped.reduce((a, b) => a + b, 0) / dropped.length).toFixed(2) : 0,
        peakDropped: dropped.length > 0 ? Math.max(...dropped).toFixed(2) : 0,
        totalErrors: errors.reduce((sum, e) => sum + e.count, 0),
        errorTypes: [...new Set(errors.map(e => e.type))]
      }
    };
  }

  calculateHealthScore(summary) {
    if (!summary) return 0;

    let score = 100;

    // Bitrate (target 6000)
    const avgBitrate = summary.avgBitrate || 0;
    if (avgBitrate < 4000) score -= 30;
    else if (avgBitrate < 5500) score -= 15;

    // Dropped frames
    const peakDropped = parseFloat(summary.peakDropped) || 0;
    if (peakDropped > 5) score -= 30;
    else if (peakDropped > 1) score -= 10;

    // CPU usage
    const peakCpu = parseFloat(summary.peakCpu) || 0;
    if (peakCpu > 90) score -= 20;
    else if (peakCpu > 70) score -= 5;

    // Errors
    const totalErrors = summary.totalErrors || 0;
    if (totalErrors > 10) score -= 15;
    else if (totalErrors > 0) score -= 5;

    return Math.max(0, score);
  }

  close() {
    this.db.close();
  }
}

module.exports = StreamDatabase;
