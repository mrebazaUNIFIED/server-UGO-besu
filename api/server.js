const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { readLoadBalancer, writeLoadBalancer } = require('./config/blockchain');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Logger visual para consola
app.use((req, res, next) => {
  console.log(`\n🔵 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Diagnóstico y Health ---

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/rpc-status', (req, res) => {
  try {
    const readStats = readLoadBalancer.getStats();
    const writeStats = writeLoadBalancer.getStats(); // Ahora usa el método de la nueva clase
    
    const readHealthy = readStats.filter(s => s.healthy).length;
    const writeHealthy = writeStats.filter(s => s.healthy).length;
    
    const readRequests = readStats.reduce((sum, s) => sum + s.requestCount, 0);
    const writeRequests = writeStats.reduce((sum, s) => sum + s.requestCount, 0);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      read: {
        type: 'RPC Nodes (Round Robin)',
        totalNodes: readStats.length,
        healthyNodes: readHealthy,
        nodes: readStats.map(s => ({
          ...s,
          load: readRequests > 0 ? ((s.requestCount / readRequests) * 100).toFixed(1) + '%' : '0%'
        }))
      },
      write: {
        type: 'Validator Nodes (Sticky Failover)',
        activeNode: writeLoadBalancer.activeNodeUrl, // Ahora funciona por el getter en la clase
        totalNodes: writeStats.length,
        healthyNodes: writeHealthy,
        nodes: writeStats.map(s => ({
          ...s,
          status: s.isActive ? 'ACTIVE' : 'STANDBY'
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error in /rpc-status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/test-write', (req, res) => {
  try {
    const provider = writeLoadBalancer.getProvider();
    // En Ethers v6 el acceso a la URL es provider.provider.url o vía _getConnection()
    const url = provider.provider ? provider.provider.url : 'Unknown';
    
    res.json({ 
      success: true,
      activeWriteNode: url,
      message: 'Write Failover is ready'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Rutas de Aplicación ---
app.use('/auth', require('./routes/auth.routes'));
app.use('/loans', require('./routes/loan.routes'));
app.use('/users', require('./routes/user.routes'));
app.use('/usfci', require('./routes/usfci.routes'));
app.use('/share', require('./routes/share.routes'));
app.use('/portfolio', require('./routes/portfolio.routes'));
app.use('/marketplace', require('./routes/marketplace.routes'));
app.use('/migrate', require('./routes/migration.routes'));

// --- Manejo de Errores ---
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

const PORT = process.env.PORT || 8070;
const server = app.listen(PORT, () => {
  console.log(`\n${'=' .repeat(50)}`);
  console.log(`🚀 BESU API GATEWAY RUNNING`);
  console.log(`${'=' .repeat(50)}`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`📖 Read Nodes:  ${readLoadBalancer.rpcUrls.length}`);
  console.log(`✍️ Write Nodes: ${writeLoadBalancer.rpcUrls.length}`);
  console.log(`📊 Status: http://localhost:${PORT}/rpc-status`);
  console.log(`${'=' .repeat(50)}\n`);
  
  readLoadBalancer.startHealthChecks();
});

// --- Apagado Elegante ---
const shutdown = () => {
  console.log('\n🛑 Shutting down...');
  readLoadBalancer.stop();
  writeLoadBalancer.stop();
  server.close(() => {
    console.log('✅ Services stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);