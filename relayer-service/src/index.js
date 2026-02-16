import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { EventQueue } from './utils/queue.js';
import besuService from './services/BesuService.js';
import avalancheService from './services/AvalancheService.js';
import stateManager from './services/StateManager.js';
import BesuListener from './listeners/BesuListener.js';
import AvalancheListener from './listeners/AvalancheListener.js';
import LoanApprovedHandler from './handlers/LoanApprovedHandler.js';
import LoanSoldHandler from './handlers/LoanSoldHandler.js';
import PaymentReceivedHandler from './handlers/PaymentReceivedHandler.js';
import LoanApprovalCancelledHandler from './handlers/LoanApprovalCancelledHandler.js';
import BurnRequestedHandler from './handlers/BurnRequestedHandler.js';

import { startAPIServer } from './api/server.js';

dotenv.config();

// Global state
let besuListener = null;
let avalancheListener = null;
let eventQueue = null;
let apiServer = null;
let isShuttingDown = false;

/**
 * Event processor function
 */
async function processEvent(event) {
    logger.info(`Processing event`, {
        type: event.type,
        chain: event.chain,
        txHash: event.transactionHash
    });

    try {
        let handler;

        switch (event.type) {
            case 'LoanApprovedForSale':
                handler = new LoanApprovedHandler();
                break;
            case 'LoanApprovalCancelled':
                handler = new LoanApprovalCancelledHandler();
                break;
            case 'NFTBurnRequired':  // ← NUEVO: Evento de quemado
                handler = new BurnRequestedHandler();
                break;
            case 'LoanSold':
                handler = new LoanSoldHandler();
                break;
            case 'PaymentRecorded':
                handler = new PaymentReceivedHandler();
                break;
            default:
                logger.warn(`Unknown event type: ${event.type}`);
                return;
        }

        await handler.process(event);

    } catch (error) {
        logger.error(`Event processing failed`, {
            type: event.type,
            error: error.message,
            stack: error.stack,
            // Para errores de ethers, loguear más detalles
            code: error.code,
            reason: error.reason,
            data: error.data
        });

        // NO relanzar el error - deja que la queue lo maneje con reintentos
        // throw error;
    }
}

/**
 * Initialize relayer
 */
async function initialize() {
    try {
        logger.info('🚀 Starting Loan Relayer Service...');
        logger.info('Environment check:', {
            NODE_ENV: process.env.NODE_ENV,
            BESU_RPC_URL: process.env.BESU_RPC_URL ? 'Set' : 'Missing',
            AVALANCHE_RPC_URL: process.env.AVALANCHE_RPC_URL ? 'Set' : 'Missing',
            VALIDATOR_KEYS: [
                process.env.VALIDATOR_PK1,
                process.env.VALIDATOR_PK2,
                process.env.VALIDATOR_PK3,
                process.env.VALIDATOR_PK4,
            ].filter(Boolean).length
        });

        // Initialize blockchain services
        logger.info('Initializing blockchain services...');
        await besuService.initialize();
        await avalancheService.initialize();
        logger.info('✅ Blockchain services initialized');

        // Create event queue
        logger.info('Creating event queue...');
        eventQueue = new EventQueue('main', processEvent, {
            processInterval: 5000,
            maxConcurrent: 3,
            maxRetries: 3,  // Asegúrate de que tenga reintentos configurados
            retryDelay: 10000
        });
        logger.info('✅ Event queue created');

        // Start event listeners
        logger.info('Starting event listeners...');
        besuListener = new BesuListener(eventQueue);
        await besuListener.start();

        avalancheListener = new AvalancheListener(eventQueue);
        await avalancheListener.start();
        logger.info('✅ Event listeners started');

        // Start event queue processing
        logger.info('Starting queue processing...');
        eventQueue.start();
        logger.info('✅ Queue processing started');

        // Start API server
        logger.info('Starting API server...');
        apiServer = await startAPIServer(eventQueue);
        logger.info('✅ API server started');

        // Setup periodic cleanup
        setInterval(() => {
            stateManager.cleanupPendingTxs();
        }, 3600000); // Every hour

        logger.info('✅ Relayer service started successfully');
        logger.info('📊 Relayer is now processing events...');

    } catch (error) {
        logger.error('Failed to initialize relayer', {
            error: error.message,
            stack: error.stack
        });
        // No cerrar inmediatamente, dar tiempo para debugging
        setTimeout(() => {
            if (!isShuttingDown) {
                shutdown();
            }
        }, 5000);
    }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
    if (isShuttingDown) return;

    isShuttingDown = true;
    logger.info('Shutting down relayer service...');

    try {
        // Stop listeners
        if (besuListener) {
            besuListener.stop();
        }
        if (avalancheListener) {
            avalancheListener.stop();
        }

        // Stop queue
        if (eventQueue) {
            eventQueue.stop();
        }

        // Close API server
        if (apiServer) {
            apiServer.close();
        }

        // Cleanup services
        await besuService.cleanup();
        await avalancheService.cleanup();

        logger.info('✅ Relayer service shut down successfully');

    } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
    } finally {
        process.exit(0);
    }
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors - NO cerrar inmediatamente
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
    });

    // Solo cerrar si es un error crítico
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('Invalid JSON RPC')) {
        logger.error('Critical network error - shutting down');
        setTimeout(shutdown, 1000);
    }
    // Para otros errores, continuar
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? {
            message: reason.message,
            stack: reason.stack,
            code: reason.code,
            name: reason.name,
            info: reason.info,
            error: reason.error
        } : reason,
        // promise: promise // No loguear la promesa completa
    });

    // NO cerrar por unhandled rejection - solo loguear
    // Muchos errores de transacciones blockchain son temporales
});

// Start the relayer
initialize().catch((error) => {
    logger.error('Fatal error during initialization', {
        error: error.message,
        stack: error.stack
    });

    // Esperar antes de cerrar para ver logs
    setTimeout(() => process.exit(1), 3000);
});