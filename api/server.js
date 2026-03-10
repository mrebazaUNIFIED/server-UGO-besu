const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { readLoadBalancer, writeLoadBalancer, writeNodes } = require('./config/blockchain');
const cache = require('./config/cache');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
      write: writeByDomain
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
  console.log(`📍 Port:    ${PORT}`);
  console.log(`📖 Read:    ${readLoadBalancer.rpcUrls.length} nodes`);
  console.log(`✍️  Write:   ${Object.keys(writeNodes).join(', ')}`);
  console.log(`❤️  Health:  http://localhost:${PORT}/health`);
  console.log(`📊 Status:  http://localhost:${PORT}/rpc-status`);
  console.log(`🗄️  Cache:   http://localhost:${PORT}/cache-status`);
  console.log(`${'='.repeat(50)}\n`);

  // ✅ Health checks para read y todos los write domains
  readLoadBalancer.startHealthChecks();
  Object.values(writeNodes).forEach(node => node.startHealthChecks());
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

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