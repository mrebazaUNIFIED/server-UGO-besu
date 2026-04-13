const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { readLoadBalancer, writeLoadBalancer, writeNodes } = require('./config/blockchain');
const cache = require('./config/cache');
const loanService = require('./services/LoanRegistryService');
const { metricsMiddleware, generatePrometheusMetrics, getMetricsJSON } = require('./middleware/metrics');
require('dotenv').config();

const app = express();

// ─── File Logging Setup ──────────────────────────────────────────────────
const logFile = process.env.LOG_FILE;
if (logFile) {
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // Redirigir console.log, console.warn, console.error al archivo
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logStream.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: msg
    }) + '\n');
    originalLog.apply(console, args);
  };

  console.warn = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logStream.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message: msg
    }) + '\n');
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    logStream.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: msg,
      error: args.find(a => a instanceof Error)?.stack
    }) + '\n');
    originalError.apply(console, args);
  };

  console.log(`📝 Logs being written in JSON format to: ${logFile}`);
}


// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(metricsMiddleware); // ← Métricas de Prometheus

app.use((req, res, next) => {
  console.log(`\n🔵 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Health ---
app.get('/health', (req, res) => {
  const readStats = readLoadBalancer.getStats();
  const readHealthy = readStats.filter(s => s.healthy).length;

  const allWriteStats = Object.entries(writeNodes).map(([domain, node]) => ({
    domain,
    stats: node.getStats()
  }));
  const writeHealthy = allWriteStats.every(({ stats }) => stats.some(s => s.healthy));

  const ok = readHealthy > 0 && writeHealthy;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    nodes: {
      read: `${readHealthy}/${readStats.length}`,
      write: Object.fromEntries(
        allWriteStats.map(({ domain, stats }) => [
          domain,
          `${stats.filter(s => s.healthy).length}/${stats.length}`
        ])
      )
    }
  });
});

// --- RPC Status ---
app.get('/rpc-status', (req, res) => {
  try {
    const readStats = readLoadBalancer.getStats();
    const readTotal = readStats.reduce((sum, s) => sum + s.requestCount, 0);

    const writeByDomain = Object.entries(writeNodes).map(([domain, node]) => {
      const stats = node.getStats();
      return {
        domain,
        activeNode: node.activeNodeUrl,
        nodes: stats.map(s => ({
          ...s,
          status: s.isActive ? 'ACTIVE' : 'STANDBY',
        }))
      };
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      read: {
        type: 'RPC Nodes (Round Robin)',
        totalNodes: readStats.length,
        healthyNodes: readStats.filter(s => s.healthy).length,
        nodes: readStats.map(s => ({
          ...s,
          load: readTotal > 0 ? ((s.requestCount / readTotal) * 100).toFixed(1) + '%' : '0%'
        }))
      },
      write: writeByDomain,
      transactions: loanService.getTxSummary()
    });
  } catch (error) {
    console.error('❌ Error in /rpc-status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Cache Status ---
app.get('/cache-status', (req, res) => {
  try {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      loans: {
        keys: cache.loans.keys().length,
        stats: cache.loans.getStats()
      }
    });
  } catch (error) {
    console.error('❌ /cache-status:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Prometheus Metrics ──────────────────────────────────────────────────
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(generatePrometheusMetrics());
});

// --- Monitoring Dashboard (JSON para web UI) ─────────────────────────────
app.get('/monitoring', (req, res) => {
  try {
    res.json(getMetricsJSON());
  } catch (error) {
    console.error('❌ /monitoring:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Rutas ---
app.use('/auth', require('./routes/auth.routes'));
app.use('/loans', require('./routes/loan.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/usfci', require('./routes/usfci.routes'));
app.use('/share', require('./routes/share.routes'));
app.use('/portfolio', require('./routes/portfolio.routes'));
app.use('/marketplace', require('./routes/marketplace.routes'));
app.use('/migrate', require('./routes/migration.routes'));

// --- Errores ---
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// --- Arranque ---
const PORT = process.env.PORT || 8070;
const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 BESU API GATEWAY RUNNING`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📍 Port:        ${PORT}`);
  console.log(`📖 Read:        ${readLoadBalancer.rpcUrls.length} nodes`);
  console.log(`✍️  Write:       ${Object.keys(writeNodes).join(', ')}`);
  console.log(`❤️  Health:      http://localhost:${PORT}/health`);
  console.log(`📊 Status:      http://localhost:${PORT}/rpc-status`);
  console.log(`🗄️  Cache:       http://localhost:${PORT}/cache-status`);
  console.log(`📈 Metrics:     http://localhost:${PORT}/metrics`);
  console.log(`🖥️  Monitoring:  http://localhost:${PORT}/monitoring`);
  console.log(`📊 Grafana:     http://localhost:3000 (admin/admin)`);
  console.log(`${'='.repeat(50)}\n`);

  // ✅ Health checks para read y todos los write domains
  readLoadBalancer.startHealthChecks();
  Object.values(writeNodes).forEach(node => node.startHealthChecks());
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// --- Global Exception Handling (Prevents crashes on socket hang ups) ---
process.on('uncaughtException', (error) => {
  console.error('\n💀 FATAL: Uncaught Exception:');
  console.error(error);
  // No salimos del proceso para permitir que el auto-heal de PM2 
  // o la resiliencia de la API lo manejen si es posible.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️  Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// --- Apagado ---
const shutdown = () => {
  console.log('\n🛑 Shutting down...');
  readLoadBalancer.stop();
  Object.values(writeNodes).forEach(node => node.stop());
  server.close(() => {
    console.log('✅ Services stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);