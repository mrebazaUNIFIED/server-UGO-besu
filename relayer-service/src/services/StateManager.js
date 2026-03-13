import logger from '../utils/logger.js';

/**
 * Manage relayer state in memory
 */
class StateManager {
  constructor() {
    this.syncState = {
      besu: {
        lastBlock: 0,
        lastSync: null
      },
      avalanche: {
        lastBlock: 0,
        lastSync: null
      }
    };

    // loanId → { tokenId: string, status: 'active' | 'burned' }
    this.loanMappings = new Map();

    this.pendingTransactions = new Map(); // txHash -> data
    this.nonces = new Map(); // loanId -> nonce counter

    // ⭐ Para deduplicación de eventos (polling + WS)
    this.processedEvents = new Set();

    this.metrics = {
      eventsProcessed: 0,
      errors: 0,
      nftsMinted: 0,
      nftsBurned: 0,
      salesRecorded: 0,
      paymentsDistributed: 0
    };
  }

  // ──────────────────────────────────────────────
  // Sync state
  // ──────────────────────────────────────────────
  updateSyncState(chain, blockNumber) {
    if (this.syncState[chain]) {
      this.syncState[chain].lastBlock = blockNumber;
      this.syncState[chain].lastSync = new Date();
      logger.debug(`Sync state updated`, { chain, blockNumber });
    }
  }

  getSyncState() {
    return this.syncState;
  }

  // ──────────────────────────────────────────────
  // Loan ↔ NFT mappings (mint + burn)
  // ──────────────────────────────────────────────
  mapLoanToNFT(loanId, tokenId) {
    this.loanMappings.set(loanId, {
      tokenId: tokenId.toString(),
      status: 'active'
    });
    logger.info(`Loan mapped to NFT`, { loanId, tokenId });
  }

  getNFTForLoan(loanId) {
    const entry = this.loanMappings.get(loanId);
    return entry && entry.status === 'active' ? entry.tokenId : null;
  }

  isLoanNFTActive(loanId) {
    const entry = this.loanMappings.get(loanId);
    return entry && entry.status === 'active';
  }

  markLoanAsBurned(loanId, reason = 'burn-requested') {
    const entry = this.loanMappings.get(loanId);
    if (!entry) {
      logger.warn('Intento de quemar mapping que no existe', { loanId });
      return;
    }
    if (entry.status === 'burned') {
      logger.debug('El mapping ya estaba marcado como burned', { loanId });
      return;
    }
    entry.status = 'burned';
    logger.info(`NFT marcado como quemado`, { loanId, tokenId: entry.tokenId, reason });
    this.incrementMetric('nftsBurned');
  }

  removeNFTMapping(loanId) {
    if (this.loanMappings.delete(loanId)) {
      logger.info(`Mapping de NFT eliminado`, { loanId });
    }
  }

  // ──────────────────────────────────────────────
  // Nonces
  // ──────────────────────────────────────────────
  getNonce(loanId) {
    const currentNonce = this.nonces.get(loanId) || 0;
    const nextNonce = currentNonce + 1;
    this.nonces.set(loanId, nextNonce);
    logger.debug(`Nonce generated for loan`, { loanId, nonce: nextNonce });
    return nextNonce;
  }

  getCurrentNonce(loanId) {
    return this.nonces.get(loanId) || 0;
  }

  resetNonce(loanId) {
    this.nonces.set(loanId, 0);
    logger.warn(`Nonce reset for loan`, { loanId });
  }

  // ──────────────────────────────────────────────
  // Pending transactions
  // ──────────────────────────────────────────────
  addPendingTx(txHash, data) {
    this.pendingTransactions.set(txHash, {
      ...data,
      addedAt: Date.now()
    });
  }

  removePendingTx(txHash) {
    this.pendingTransactions.delete(txHash);
  }

  getPendingTx(txHash) {
    return this.pendingTransactions.get(txHash);
  }

  // ──────────────────────────────────────────────
  // ⭐ Deduplicación de eventos
  // Evita procesar el mismo evento dos veces cuando
  // WS y polling HTTP coinciden en el mismo bloque
  // ──────────────────────────────────────────────
  isEventProcessed(eventId) {
    return this.processedEvents.has(eventId);
  }

  markEventProcessed(eventId) {
    this.processedEvents.add(eventId);

    // Limpiar cache cuando crece demasiado — mantener últimos 5,000
    if (this.processedEvents.size > 10000) {
      const arr = [...this.processedEvents];
      this.processedEvents = new Set(arr.slice(arr.length - 5000));
      logger.info('processedEvents cache limpiado', {
        remaining: this.processedEvents.size
      });
    }
  }

  // ──────────────────────────────────────────────
  // Metrics
  // ──────────────────────────────────────────────
  incrementMetric(metric) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      loanMappings: this.loanMappings.size,
      activeMappings: Array.from(this.loanMappings.values())
        .filter(v => v.status === 'active').length,
      burnedMappings: Array.from(this.loanMappings.values())
        .filter(v => v.status === 'burned').length,
      pendingTxs: this.pendingTransactions.size,
      nonces: this.nonces.size,
      processedEventsCache: this.processedEvents.size  // ⭐ nuevo
    };
  }

  // ──────────────────────────────────────────────
  // Limpieza de pending txs
  // ──────────────────────────────────────────────
  cleanupPendingTxs(maxAge = 3600000) { // 1 hora por defecto
    const now = Date.now();
    let cleaned = 0;

    for (const [txHash, data] of this.pendingTransactions.entries()) {
      if (now - data.addedAt > maxAge) {
        this.pendingTransactions.delete(txHash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up old pending transactions`, { count: cleaned });
    }
  }

  // ──────────────────────────────────────────────
  // Estado completo para debugging
  // ──────────────────────────────────────────────
  getFullState() {
    return {
      syncState: this.syncState,
      loanMappings: Array.from(this.loanMappings.entries()),
      pendingTxs: Array.from(this.pendingTransactions.entries()),
      nonces: Array.from(this.nonces.entries()),
      metrics: this.getMetrics()
    };
  }
}

// Singleton instance
export default new StateManager();