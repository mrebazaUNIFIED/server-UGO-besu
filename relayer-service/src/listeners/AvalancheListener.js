import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';

/**
 * Listen to events from Avalanche contracts
 *
 * ESTRATEGIA DUAL:
 *   1. Intenta WebSocket primero
 *   2. Si WS falla → polling HTTP cada 15s (más estable en Fuji testnet)
 */
class AvalancheListener {
  constructor(eventQueue) {
    this.eventQueue = eventQueue;
    this.isListening = false;

    // Contratos HTTP (polling)
    this.nftContract = null;
    this.marketplaceContract = null;
    this.paymentDistributorContract = null;

    // Polling state
    this.pollingInterval = null;
    this.lastProcessedBlock = 0;
    this.usePolling = false;
    this.POLLING_INTERVAL_MS = 15000; // 15s — Avalanche ~2s por bloque
    this.BLOCKS_PER_POLL = 50;        // max bloques por ciclo
  }

  async start() {
    try {
      logger.info('Starting Avalanche event listener...');

      // Contratos HTTP para polling (siempre disponibles)
      this.nftContract = avalancheService.getContract('loanNFT');
      this.marketplaceContract = avalancheService.getContract('marketplace');
      this.paymentDistributorContract = avalancheService.getContract('paymentDistributor');

      // Punto de partida: bloque actual
      this.lastProcessedBlock = await avalancheService.getBlockNumber();
      logger.info('Starting from block', { block: this.lastProcessedBlock });

      // Intentar WebSocket primero
      const wsOk = await this._tryWebSocket();

      if (!wsOk) {
        logger.warn('WebSocket unavailable or unstable — using HTTP polling');
        this._startPolling();
      }

      this.isListening = true;
      logger.info('Avalanche event listener started', {
        mode: this.usePolling ? 'HTTP polling' : 'WebSocket',
        fromBlock: this.lastProcessedBlock
      });

      this._startSyncStateUpdater();

    } catch (error) {
      logger.error('Failed to start Avalanche listener', { error: error.message });
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════
  // WEBSOCKET
  // ═══════════════════════════════════════════════════════

  async _tryWebSocket() {
    try {
      const wsNFT = avalancheService.getWsContract('loanNFT');
      const wsMarketplace = avalancheService.getWsContract('marketplace');
      const wsDistributor = avalancheService.getWsContract('paymentDistributor');

      if (!wsNFT || !wsMarketplace) return false;

      // Test de conectividad con timeout de 5s
      await Promise.race([
        avalancheService.getBlockNumber(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('WS timeout')), 5000)
        )
      ]);

      // WS funciona — registrar listeners
      this._registerWsListeners(wsNFT, wsMarketplace, wsDistributor);
      this.usePolling = false;
      logger.info('WebSocket connected — listeners registered');
      return true;

    } catch (error) {
      logger.warn('WebSocket test failed', { error: error.message });
      return false;
    }
  }

  _registerWsListeners(wsNFT, wsMarketplace, wsDistributor) {

    // LoanNFTMinted — solo logging
    wsNFT.on('LoanNFTMinted', async (tokenId, loanId, lender, originalBalance, currentBalance, timestamp, eventObj) => {
      logger.info('WS: LoanNFTMinted', {
        tokenId: tokenId.toString(),
        loanId,
        lender,
        txHash: eventObj?.log?.transactionHash || 'unknown'
      });
    });

    // Transfer — skip mints
    wsNFT.on('Transfer', async (from, to, tokenId, eventObj) => {
      if (from === ethers.ZeroAddress) return;
      logger.info('WS: NFT Transfer', {
        from, to,
        tokenId: tokenId.toString(),
        txHash: eventObj?.log?.transactionHash || 'unknown'
      });
    });

    // ⭐ LoanSold — el más importante
    wsMarketplace.on('LoanSold', async (tokenId, seller, buyer, price, fee, timestamp, eventObj) => {
      try {
        const txHash = eventObj?.log?.transactionHash || eventObj?.transactionHash;

        if (!txHash) {
          logger.warn('WS: LoanSold sin txHash', { tokenId: tokenId?.toString() });
          // Si WS empieza a fallar → activar polling como backup
          if (!this.usePolling) this._startPolling();
          return;
        }

        // Deduplicar
        const eventId = `LoanSold-${txHash}-${eventObj?.log?.index || 0}`;
        if (stateManager.isEventProcessed(eventId)) return;
        stateManager.markEventProcessed(eventId);

        logger.info('WS: LoanSold recibido', {
          tokenId: tokenId.toString(),
          seller,
          buyer,
          price: price.toString(),
          txHash
        });

        await this._handleEvent('LoanSold', {
          tokenId: tokenId.toString(),
          seller,
          buyer,
          price: price.toString(),
          fee: fee.toString(),
          timestamp: timestamp.toString(),
          transactionHash: txHash,
          blockNumber: eventObj?.log?.blockNumber || 0,
          logIndex: eventObj?.log?.index || 0
        });

      } catch (error) {
        logger.error('WS: Error en LoanSold', { error: error.message });
        // WS fallando → activar polling
        if (!this.usePolling) {
          logger.warn('WS inestable — activando polling como backup');
          this._startPolling();
        }
      }
    });

    // PaymentClaimed — logging
    if (wsDistributor) {
      wsDistributor.on('PaymentClaimed', async (tokenId, claimer, amount, timestamp, eventObj) => {
        logger.info('WS: PaymentClaimed', {
          tokenId: tokenId.toString(),
          claimer,
          amount: amount.toString(),
          txHash: eventObj?.log?.transactionHash || 'unknown'
        });
      });
    }
  }

  // ═══════════════════════════════════════════════════════
  // HTTP POLLING
  // ═══════════════════════════════════════════════════════

  _startPolling() {
    if (this.pollingInterval) return; // ya corriendo

    this.usePolling = true;
    logger.info('HTTP polling iniciado', {
      intervalMs: this.POLLING_INTERVAL_MS,
      blocksPerPoll: this.BLOCKS_PER_POLL
    });

    // Primera poll inmediata
    this._pollEvents();

    this.pollingInterval = setInterval(() => {
      this._pollEvents();
    }, this.POLLING_INTERVAL_MS);
  }

  async _pollEvents() {
    try {
      const currentBlock = await avalancheService.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) return;

      const fromBlock = this.lastProcessedBlock + 1;
      const toBlock = Math.min(currentBlock, fromBlock + this.BLOCKS_PER_POLL - 1);

      logger.debug('Polling', { fromBlock, toBlock, current: currentBlock });

      // Buscar eventos en paralelo
      await Promise.all([
        this._pollLoanSold(fromBlock, toBlock),
        this._pollLoanNFTMinted(fromBlock, toBlock),
      ]);

      this.lastProcessedBlock = toBlock;

    } catch (error) {
      logger.error('Error en polling', { error: error.message });
      // No actualizar lastProcessedBlock → reintentar mismo rango
    }
  }

  async _pollLoanSold(fromBlock, toBlock) {
    try {
      const filter = this.marketplaceContract.filters.LoanSold();
      const events = await this.marketplaceContract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        try {
          const { tokenId, seller, buyer, price, fee, timestamp } = event.args;
          const txHash = event.transactionHash;

          // Deduplicar
          const eventId = `LoanSold-${txHash}-${event.logIndex}`;
          if (stateManager.isEventProcessed(eventId)) {
            logger.debug('POLL: LoanSold ya procesado, skip', { txHash });
            continue;
          }
          stateManager.markEventProcessed(eventId);

          logger.info('POLL: LoanSold encontrado', {
            tokenId: tokenId.toString(),
            seller,
            buyer,
            price: price.toString(),
            txHash,
            block: event.blockNumber
          });

          await this._handleEvent('LoanSold', {
            tokenId: tokenId.toString(),
            seller,
            buyer,
            price: price.toString(),
            fee: fee.toString(),
            timestamp: timestamp.toString(),
            transactionHash: txHash,
            blockNumber: event.blockNumber,
            logIndex: event.logIndex
          });

        } catch (eventError) {
          logger.error('POLL: Error procesando LoanSold', {
            error: eventError.message,
            txHash: event.transactionHash
          });
        }
      }
    } catch (error) {
      logger.error('POLL: queryFilter LoanSold falló', {
        error: error.message,
        fromBlock,
        toBlock
      });
    }
  }

  async _pollLoanNFTMinted(fromBlock, toBlock) {
    try {
      const filter = this.nftContract.filters.LoanNFTMinted();
      const events = await this.nftContract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        const { tokenId, loanId, lender } = event.args;
        logger.info('POLL: LoanNFTMinted encontrado', {
          tokenId: tokenId.toString(),
          loanId,
          lender,
          block: event.blockNumber
        });
      }
    } catch (error) {
      logger.error('POLL: queryFilter LoanNFTMinted falló', { error: error.message });
    }
  }

  // ═══════════════════════════════════════════════════════
  // SHARED
  // ═══════════════════════════════════════════════════════

  async _handleEvent(eventType, eventData) {
    try {
      logger.info(`Avalanche → queue: ${eventType}`, {
        tokenId: eventData.tokenId,
        blockNumber: eventData.blockNumber,
        txHash: eventData.transactionHash
      });

      this.eventQueue.add({
        type: eventType,
        chain: 'avalanche',
        ...eventData
      });

      stateManager.incrementMetric('eventsProcessed');

    } catch (error) {
      logger.error('Error encolando evento Avalanche', { eventType, error: error.message });
      stateManager.incrementMetric('errors');
    }
  }

  stop() {
    // Remover WS listeners
    try {
      avalancheService.getWsContract('loanNFT')?.removeAllListeners();
      avalancheService.getWsContract('marketplace')?.removeAllListeners();
      avalancheService.getWsContract('paymentDistributor')?.removeAllListeners();
    } catch (_) { }

    // Detener polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isListening = false;
    logger.info('Avalanche event listener stopped');
  }

  _startSyncStateUpdater() {
    setInterval(async () => {
      try {
        const blockNumber = await avalancheService.getBlockNumber();
        stateManager.updateSyncState('avalanche', blockNumber);
      } catch (error) {
        logger.error('Failed to update Avalanche sync state', { error: error.message });
      }
    }, 10000);
  }
}

export default AvalancheListener;