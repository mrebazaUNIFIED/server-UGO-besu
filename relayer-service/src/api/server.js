import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { API_CONFIG } from '../config/chains.js';
import logger from '../utils/logger.js';

// Import routes
import loansRouter from './routes/loans.js';
import marketplaceRouter from './routes/marketplace.js';
import relayerRouter from './routes/relayer.js';
import eventsRouter from './routes/events.js';  // ✅ NUEVO

/**
 * Create Express API server
 */
export function createAPIServer(eventQueue) {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 mins
    max: 100,  // 100 requests por IP
    message: 'Too many requests, please try again later.'
  });
  app.use(limiter);

  // Request logging
  app.use((req, res, next) => {
    logger.debug(`API Request: ${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Mount routers
  app.use('/api/loans', loansRouter);
  app.use('/api/marketplace', marketplaceRouter);
  app.use('/api/relayer', relayerRouter);
  app.use('/api/events', eventsRouter);  // ✅ NUEVO

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('API Error', { error: err.message, path: req.path });
    res.status(500).json({ error: 'Internal server error' });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

/**
 * Start API server
 */
export async function startAPIServer(eventQueue) {
  if (!API_CONFIG.enabled) {
    logger.info('API server disabled');
    return null;
  }

  const app = createAPIServer(eventQueue);

  return new Promise((resolve, reject) => {
    const server = app.listen(API_CONFIG.port, () => {
      logger.info(`🚀 API server started on port ${API_CONFIG.port}`);
      logger.info(`📍 Endpoints available:`);
      logger.info(``);
      logger.info(`   🏥 Health Check:`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/health`);
      logger.info(``);
      logger.info(`   🔧 Relayer:`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/relayer/status`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/relayer/sync-state`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/relayer/metrics`);
      logger.info(``);
      logger.info(`   📋 Loans:`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/:loanId`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/:loanId/nft`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/user/:userId`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/wallet/:address`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/approved`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/tokenized`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/loans/stats`);
      logger.info(``);
      logger.info(`   🏪 Marketplace:`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/listings`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/listings/featured`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/nft/:tokenId/listing`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/loan/:loanId/listing`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/stats`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/sales/recent`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/seller/:address`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/marketplace/validate/:tokenId`);
      logger.info(``);
      logger.info(`   📊 Events:`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/events/besu/recent`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/events/avalanche/recent`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/events/loan/:loanId/history`);
      logger.info(`      GET  http://localhost:${API_CONFIG.port}/api/events/sync/status`);
      logger.info(``);
      
      resolve(server);
    });

    server.on('error', reject);
  });
}