const React = require('react');
const { render, Box, Text, useInput, useApp } = require('ink');
const OBSMetrics = require('../lib/metrics');
const StreamDatabase = require('../lib/db');
const { getLevel, getBitrateBar, analyzeMetrics } = require('../lib/alerts');

const obs = new OBSMetrics();
const db = new StreamDatabase();

// Color helper
const levelColor = (level) => {
  switch (level) {
    case 'green': return 'green';
    case 'yellow': return 'yellow';
    case 'red': return 'red';
    default: return 'white';
  }
};

// Status indicator component
const StatusBadge = ({ active, reconnecting }) => {
  if (reconnecting) {
    return React.createElement(Text, { color: 'yellow', bold: true }, '⟳ RECONNECTING');
  }
  if (active) {
    return React.createElement(Text, { color: 'green', bold: true }, '● LIVE');
  }
  return React.createElement(Text, { color: 'gray' }, '○ OFFLINE');
};

// Metric row component
const MetricRow = ({ label, value, unit, metric }) => {
  const level = metric ? getLevel(metric, value) : 'white';
  return React.createElement(Box, null,
    React.createElement(Text, { color: 'gray' }, `${label}: `),
    React.createElement(Text, { color: levelColor(level), bold: level !== 'green' }, value),
    unit && React.createElement(Text, { color: 'gray' }, ` ${unit}`)
  );
};

// Progress bar for bitrate
const BitrateBar = ({ bitrate, target = 6000 }) => {
  const percent = Math.min(100, (bitrate / target) * 100);
  const filled = Math.round(percent / 5);
  const empty = 20 - filled;
  const level = getLevel('bitrate', bitrate);

  return React.createElement(Box, null,
    React.createElement(Text, { color: levelColor(level) }, '█'.repeat(filled)),
    React.createElement(Text, { color: 'gray' }, '░'.repeat(empty)),
    React.createElement(Text, { color: 'gray' }, ` ${Math.round(percent)}%`)
  );
};

// Warnings component
const Warnings = ({ warnings }) => {
  if (warnings.length === 0) {
    return React.createElement(Text, { color: 'green' }, '✓ No issues detected');
  }

  return React.createElement(Box, { flexDirection: 'column' },
    warnings.map((w, i) =>
      React.createElement(Text, {
        key: i,
        color: w.level === 'critical' ? 'red' : 'yellow'
      }, `${w.level === 'critical' ? '!' : '⚠'} ${w.message}`)
    )
  );
};

// Main monitor component
const Monitor = ({ interval }) => {
  const { exit } = useApp();
  const [metrics, setMetrics] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [sessionId, setSessionId] = React.useState(null);
  const [lastUpdate, setLastUpdate] = React.useState(new Date());

  // Handle keyboard input
  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      cleanup();
      exit();
    }
    if (input === 'r') {
      fetchMetrics();
    }
  });

  const cleanup = async () => {
    try {
      if (sessionId) {
        const sessionMetrics = db.getSessionMetrics(sessionId);
        if (sessionMetrics.length > 0) {
          const lastMetric = sessionMetrics[sessionMetrics.length - 1];
          db.endSession(sessionId, {
            duration: metrics?.stream?.duration || 0,
            avgBitrate: sessionMetrics.reduce((a, m) => a + m.bitrate, 0) / sessionMetrics.length,
            totalFrames: lastMetric.total_frames,
            droppedFrames: lastMetric.dropped_frames,
            droppedPercent: lastMetric.dropped_percent,
            peakCpu: Math.max(...sessionMetrics.map(m => m.cpu_usage)),
            peakMemory: Math.max(...sessionMetrics.map(m => m.memory_mb)),
            errors: 0
          });
        }
      }
      await obs.disconnect();
    } catch (e) {}
  };

  const fetchMetrics = async () => {
    try {
      const data = await obs.getFullMetrics();
      setMetrics(data);
      setError(null);
      setLastUpdate(new Date());

      // Start session if streaming and no session exists
      if (data.stream.active && !sessionId) {
        const id = db.startSession();
        setSessionId(id);
      }

      // End session if stopped streaming
      if (!data.stream.active && sessionId) {
        cleanup();
        setSessionId(null);
      }

      // Record metrics if streaming
      if (data.stream.active && sessionId) {
        db.recordMetric(sessionId, {
          bitrate: data.stream.bitrate,
          cpuUsage: parseFloat(data.system.cpuUsage),
          memoryMb: parseFloat(data.system.memoryUsage),
          fps: parseFloat(data.system.fps),
          droppedFrames: data.stream.skippedFrames,
          totalFrames: data.stream.totalFrames,
          droppedPercent: parseFloat(data.stream.droppedPercent)
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Initial fetch and interval
  React.useEffect(() => {
    fetchMetrics();
    const timer = setInterval(fetchMetrics, interval);
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);

  // Error state
  if (error) {
    return React.createElement(Box, { flexDirection: 'column', padding: 1 },
      React.createElement(Text, { color: 'red', bold: true }, 'Connection Error'),
      React.createElement(Text, { color: 'red' }, error),
      React.createElement(Text, { color: 'gray' }, '\nPress q to quit, r to retry')
    );
  }

  // Loading state
  if (!metrics) {
    return React.createElement(Box, { padding: 1 },
      React.createElement(Text, { color: 'yellow' }, 'Connecting to OBS...')
    );
  }

  const warnings = analyzeMetrics(metrics);

  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    // Header
    React.createElement(Box, { borderStyle: 'round', borderColor: 'cyan', paddingX: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, ' OBS Stream Monitor ')
    ),

    React.createElement(Text, null, ''),

    // Stream status row
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(StatusBadge, {
        active: metrics.stream.active,
        reconnecting: metrics.stream.reconnecting
      }),
      metrics.stream.active && React.createElement(Text, { color: 'white' },
        `  ${obs.formatDuration(metrics.stream.duration)}`
      )
    ),

    // Bitrate section
    metrics.stream.active && React.createElement(Box, { flexDirection: 'column', marginBottom: 1 },
      React.createElement(Box, null,
        React.createElement(Text, { color: 'gray' }, 'Bitrate: '),
        React.createElement(Text, {
          color: levelColor(getLevel('bitrate', metrics.stream.bitrate)),
          bold: true
        }, `${metrics.stream.bitrate} kbps`)
      ),
      React.createElement(BitrateBar, { bitrate: metrics.stream.bitrate })
    ),

    // System metrics
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(MetricRow, {
        label: 'CPU',
        value: metrics.system.cpuUsage,
        unit: '%',
        metric: 'cpu'
      }),
      React.createElement(Text, null, '  '),
      React.createElement(MetricRow, {
        label: 'Memory',
        value: metrics.system.memoryUsage,
        unit: 'MB'
      }),
      React.createElement(Text, null, '  '),
      React.createElement(MetricRow, {
        label: 'FPS',
        value: metrics.system.fps,
        metric: 'fps'
      })
    ),

    // Dropped frames
    metrics.stream.active && React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { color: 'gray' }, 'Dropped: '),
      React.createElement(Text, {
        color: levelColor(getLevel('droppedPercent', metrics.stream.droppedPercent))
      }, `${metrics.stream.droppedPercent}%`),
      React.createElement(Text, { color: 'gray' },
        ` (${metrics.stream.skippedFrames}/${metrics.stream.totalFrames})`
      )
    ),

    // Scene
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { color: 'gray' }, 'Scene: '),
      React.createElement(Text, null, metrics.scene)
    ),

    // Warnings
    React.createElement(Box, { flexDirection: 'column', marginTop: 1 },
      React.createElement(Text, { bold: true, color: 'gray' }, 'Status:'),
      React.createElement(Warnings, { warnings })
    ),

    // Footer
    React.createElement(Box, { marginTop: 1 },
      React.createElement(Text, { color: 'gray', dimColor: true },
        `Updated: ${lastUpdate.toLocaleTimeString()}  |  q: quit  r: refresh`
      )
    )
  );
};

module.exports = async function monitor(interval = 2000) {
  const { waitUntilExit } = render(
    React.createElement(Monitor, { interval })
  );

  await waitUntilExit();
};
