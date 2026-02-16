import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import { AVALANCHE_CONFIG, RELAYER_CONFIG } from '../config/chains.js';
import { AVALANCHE_CONTRACTS } from '../config/contracts.js';

class AvalancheService {
  constructor() {
    this.httpProvider = null;
    this.wsProvider = null;
    this.wallet = null;
    this.contracts = {};
    this.wsContracts = {};
  }

  /**
   * Initialize Avalanche connection
   */
  async initialize() {
    try {
      logger.info('Initializing Avalanche service...');

      // HTTP Provider para transacciones
      this.httpProvider = new ethers.JsonRpcProvider(AVALANCHE_CONFIG.rpcUrl);

      // WebSocket Provider para eventos
      if (AVALANCHE_CONFIG.wsUrl) {
        this.wsProvider = new ethers.WebSocketProvider(AVALANCHE_CONFIG.wsUrl);

        // Handle WebSocket errors and reconnection
        this.wsProvider.websocket.on('error', (error) => {
          logger.error('Avalanche WebSocket error', { error: error.message });
        });

        this.wsProvider.websocket.on('close', () => {
          logger.warn('Avalanche WebSocket closed, attempting reconnect...');
          setTimeout(() => this._reconnectWebSocket(), 5000);
        });

        // Handle connection open
        this.wsProvider.websocket.on('open', () => {
          logger.info('Avalanche WebSocket connected');
        });
      } else {
        logger.warn('No WebSocket URL provided, using HTTP for events (not recommended)');
        this.wsProvider = this.httpProvider;
      }

      // Create wallet
      this.wallet = new ethers.Wallet(
        RELAYER_CONFIG.privateKey,
        this.httpProvider
      );

      // Initialize contracts (HTTP for writing)
      this.contracts.loanNFT = new ethers.Contract(
        AVALANCHE_CONTRACTS.loanNFT.address,
        AVALANCHE_CONTRACTS.loanNFT.abi,
        this.wallet
      );

      this.contracts.marketplace = new ethers.Contract(
        AVALANCHE_CONTRACTS.marketplace.address,
        AVALANCHE_CONTRACTS.marketplace.abi,
        this.wallet
      );

      this.contracts.bridgeReceiver = new ethers.Contract(
        AVALANCHE_CONTRACTS.bridgeReceiver.address,
        AVALANCHE_CONTRACTS.bridgeReceiver.abi,
        this.wallet
      );

      this.contracts.paymentDistributor = new ethers.Contract(
        AVALANCHE_CONTRACTS.paymentDistributor.address,
        AVALANCHE_CONTRACTS.paymentDistributor.abi,
        this.wallet
      );

      // Initialize WebSocket contracts (for listening)
      if (this.wsProvider !== this.httpProvider) {
        this.wsContracts.loanNFT = new ethers.Contract(
          AVALANCHE_CONTRACTS.loanNFT.address,
          AVALANCHE_CONTRACTS.loanNFT.abi,
          this.wsProvider
        );

        this.wsContracts.marketplace = new ethers.Contract(
          AVALANCHE_CONTRACTS.marketplace.address,
          AVALANCHE_CONTRACTS.marketplace.abi,
          this.wsProvider
        );

        this.wsContracts.bridgeReceiver = new ethers.Contract(
          AVALANCHE_CONTRACTS.bridgeReceiver.address,
          AVALANCHE_CONTRACTS.bridgeReceiver.abi,
          this.wsProvider
        );

        this.wsContracts.paymentDistributor = new ethers.Contract(
          AVALANCHE_CONTRACTS.paymentDistributor.address,
          AVALANCHE_CONTRACTS.paymentDistributor.abi,
          this.wsProvider
        );
      } else {
        // Fallback to HTTP contracts
        this.wsContracts = this.contracts;
      }

      // Test connection
      const network = await this.httpProvider.getNetwork();
      const balance = await this.httpProvider.getBalance(this.wallet.address);

      logger.info('Avalanche service initialized', {
        chainId: network.chainId.toString(),
        relayerAddress: this.wallet.address,
        balance: ethers.formatEther(balance)
      });

    } catch (error) {
      logger.error('Failed to initialize Avalanche service', { error: error.message });
      throw error;
    }
  }

  /**
   * Reconnect WebSocket
   */
  async _reconnectWebSocket() {
    try {
      logger.info('Reconnecting Avalanche WebSocket...');

      if (this.wsProvider && this.wsProvider.websocket) {
        this.wsProvider.websocket.terminate();
      }

      this.wsProvider = new ethers.WebSocketProvider(AVALANCHE_CONFIG.wsUrl);

      // Reinitialize WebSocket contracts
      this.wsContracts.loanNFT = new ethers.Contract(
        AVALANCHE_CONTRACTS.loanNFT.address,
        AVALANCHE_CONTRACTS.loanNFT.abi,
        this.wsProvider
      );

      this.wsContracts.marketplace = new ethers.Contract(
        AVALANCHE_CONTRACTS.marketplace.address,
        AVALANCHE_CONTRACTS.marketplace.abi,
        this.wsProvider
      );

      this.wsContracts.bridgeReceiver = new ethers.Contract(
        AVALANCHE_CONTRACTS.bridgeReceiver.address,
        AVALANCHE_CONTRACTS.bridgeReceiver.abi,
        this.wsProvider
      );

      this.wsContracts.paymentDistributor = new ethers.Contract(
        AVALANCHE_CONTRACTS.paymentDistributor.address,
        AVALANCHE_CONTRACTS.paymentDistributor.abi,
        this.wsProvider
      );

      logger.info('Avalanche WebSocket reconnected');
    } catch (error) {
      logger.error('Failed to reconnect Avalanche WebSocket', { error: error.message });
      setTimeout(() => this._reconnectWebSocket(), 5000);
    }
  }

  /**
   * Get WebSocket contract for listening to events
   */
  getWsContract(contractName) {
    const contract = this.wsContracts[contractName] || this.contracts[`${contractName}Ws`];
    if (!contract) {
      throw new Error(`WebSocket contract ${contractName} not found. Available: ${Object.keys(this.wsContracts).join(', ')}`);
    }
    return contract;
  }

  /**
   * Get HTTP contract for transactions
   */
  getContract(contractName) {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }
    return contract;
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    return await this.httpProvider.getBlockNumber();
  }

  // ==================== MÉTODOS ACTUALIZADOS ====================

  /**
   * Update NFT metadata
   */
  async updateNFTMetadata(tokenId, newBalance, newStatus) {
    try {
      logger.info('Updating NFT metadata', {
        tokenId: tokenId.toString(),
        newBalance: newBalance.toString(),
        newStatus
      });

      const tx = await this.contracts.loanNFT.updateMetadata(
        tokenId,
        newBalance,
        newStatus,
        {
          gasLimit: 200000
        }
      );

      logger.info('NFT metadata update transaction sent', {
        txHash: tx.hash,
        tokenId: tokenId.toString()
      });

      const receipt = await tx.wait();

      logger.info('NFT metadata updated successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId: tokenId.toString()
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to update NFT metadata', {
        error: error.message,
        tokenId: tokenId.toString()
      });
      throw error;
    }
  }

  /**
   * Get loan metadata from NFT
   * ✅ ACTUALIZADO: Usa campos correctos del struct LoanNFT.LoanMetadata
   */
  async getLoanMetadata(tokenId) {
    try {
      logger.info('Getting loan metadata from NFT', {
        tokenId: tokenId.toString()
      });

      const metadata = await this.contracts.loanNFT.getLoanMetadata(tokenId);

      // ✅ Campos correctos del struct LoanMetadata
      const result = {
        loanId: metadata.loanId,
        originalBalance: metadata.originalBalance,
        currentBalance: metadata.currentBalance,
        noteRate: metadata.noteRate,
        lenderOwnerPct: metadata.lenderOwnerPct,
        status: metadata.status,
        location: metadata.location,
        mintedAt: metadata.mintedAt,
        lastUpdated: metadata.lastUpdated
      };

      logger.info('Loan metadata retrieved', {
        tokenId: tokenId.toString(),
        loanId: result.loanId,
        currentBalance: result.currentBalance.toString(),
        noteRate: result.noteRate.toString()
      });

      return result;

    } catch (error) {
      logger.error('Failed to get loan metadata', {
        error: error.message,
        tokenId: tokenId.toString()
      });
      throw error;
    }
  }

  /**
   * Record pending payment
   */
  async recordPendingPayment(tokenId, amount) {
    try {
      logger.info('Recording pending payment', {
        tokenId: tokenId.toString(),
        amount: amount.toString()
      });

      const tx = await this.contracts.paymentDistributor.recordPendingPayment(
        tokenId,  // uint256 tokenId
        amount,   // uint256 amount
        {
          gasLimit: 500000
        }
      );

      logger.info('Pending payment record transaction sent', {
        txHash: tx.hash,
        tokenId: tokenId.toString()
      });

      const receipt = await tx.wait();

      logger.info('Pending payment recorded successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        tokenId: tokenId.toString()
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to record pending payment', {
        error: error.message,
        tokenId: tokenId.toString()
      });
      throw error;
    }
  }

  async processBurnRequest(loanId, timestamp, nonce, signatures) {
    try {
      logger.info('Processing burn request via BridgeReceiver', {
        loanId,
        timestamp,
        nonce
      });

      const bridgeReceiver = this.contracts.bridgeReceiver;

      const tx = await bridgeReceiver.processBurnRequest(
        loanId,
        timestamp,
        nonce,
        signatures,
        { gasLimit: 300000 }
      );

      logger.info('Burn request transaction sent', {
        txHash: tx.hash,
        loanId
      });

      const receipt = await tx.wait();

      logger.info('Burn request processed successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        loanId,
        gasUsed: receipt.gasUsed?.toString()
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to process burn request', {
        error: error.message,
        loanId
      });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.wsProvider && this.wsProvider.websocket) {
      this.wsProvider.websocket.terminate();
    }
    logger.info('Avalanche service cleaned up');
  }
}

export default new AvalancheService();