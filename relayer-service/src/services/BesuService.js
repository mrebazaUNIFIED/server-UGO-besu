import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import { BESU_CONFIG, RELAYER_CONFIG } from '../config/chains.js';
import { BESU_CONTRACTS } from '../config/contracts.js';

class BesuService {
  constructor() {
    this.httpProvider = null;
    this.wsProvider = null;
    this.wallet = null;
    this.contracts = {};
    this.wsContracts = {};
  }

  /**
   * Initialize Besu connection
   */
  async initialize() {
    try {
      logger.info('Initializing Besu service...');

      // HTTP Provider para transacciones
      this.httpProvider = new ethers.JsonRpcProvider(BESU_CONFIG.rpcUrl);

      // WebSocket Provider para eventos
      if (BESU_CONFIG.wsUrl) {
        this.wsProvider = new ethers.WebSocketProvider(BESU_CONFIG.wsUrl);

        // Handle WebSocket errors and reconnection
        this.wsProvider.websocket.on('error', (error) => {
          logger.error('Besu WebSocket error', { error: error.message });
        });

        this.wsProvider.websocket.on('close', () => {
          logger.warn('Besu WebSocket closed, attempting reconnect...');
          setTimeout(() => this._reconnectWebSocket(), 5000);
        });

        // Handle connection open
        this.wsProvider.websocket.on('open', () => {
          logger.info('Besu WebSocket connected');
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
      this.contracts.marketplaceBridge = new ethers.Contract(
        BESU_CONTRACTS.marketplaceBridge.address,
        BESU_CONTRACTS.marketplaceBridge.abi,
        this.wallet
      );

      this.contracts.loanRegistry = new ethers.Contract(
        BESU_CONTRACTS.loanRegistry.address,
        BESU_CONTRACTS.loanRegistry.abi,
        this.wallet
      );

      // Initialize WebSocket contracts (for listening)
      if (this.wsProvider !== this.httpProvider) {
        this.wsContracts.marketplaceBridge = new ethers.Contract(
          BESU_CONTRACTS.marketplaceBridge.address,
          BESU_CONTRACTS.marketplaceBridge.abi,
          this.wsProvider
        );

        this.wsContracts.loanRegistry = new ethers.Contract(
          BESU_CONTRACTS.loanRegistry.address,
          BESU_CONTRACTS.loanRegistry.abi,
          this.wsProvider
        );
      } else {
        // Fallback to HTTP contracts
        this.wsContracts = this.contracts;
      }

      // Test connection
      const network = await this.httpProvider.getNetwork();
      const balance = await this.httpProvider.getBalance(this.wallet.address);

      logger.info('Besu service initialized', {
        chainId: network.chainId.toString(),
        relayerAddress: this.wallet.address,
        balance: ethers.formatEther(balance)
      });

    } catch (error) {
      logger.error('Failed to initialize Besu service', { error: error.message });
      throw error;
    }
  }

  /**
   * Reconnect WebSocket
   */
  async _reconnectWebSocket() {
    try {
      logger.info('Reconnecting Besu WebSocket...');

      if (this.wsProvider && this.wsProvider.websocket) {
        this.wsProvider.websocket.terminate();
      }

      this.wsProvider = new ethers.WebSocketProvider(BESU_CONFIG.wsUrl);

      // Reinitialize WebSocket contracts
      this.wsContracts.marketplaceBridge = new ethers.Contract(
        BESU_CONTRACTS.marketplaceBridge.address,
        BESU_CONTRACTS.marketplaceBridge.abi,
        this.wsProvider
      );

      this.wsContracts.loanRegistry = new ethers.Contract(
        BESU_CONTRACTS.loanRegistry.address,
        BESU_CONTRACTS.loanRegistry.abi,
        this.wsProvider
      );

      logger.info('Besu WebSocket reconnected');
    } catch (error) {
      logger.error('Failed to reconnect Besu WebSocket', { error: error.message });
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

  getProvider() {
    return this.httpProvider;
  }

  /**
   * Get WebSocket provider
   */
  getWsProvider() {
    return this.wsProvider;
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    return await this.httpProvider.getBlockNumber();
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return await this.httpProvider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction
   */
  async waitForTransaction(txHash, confirmations = 1) {
    return await this.httpProvider.waitForTransaction(txHash, confirmations);
  }

  // ==================== MÉTODOS ACTUALIZADOS ====================

  /**
   * Get loan data from registry
   * ✅ ACTUALIZADO: Usa campos correctos del LoanRegistry
   */
  async getLoan(loanId) {
    try {
      logger.info('Getting loan from registry', { loanId });

      const loan = await this.contracts.loanRegistry.readLoan(loanId);

      logger.info('Loan data retrieved', {
        loanId,
        loanUid: loan.LoanUid,
        lenderUid: loan.LenderUid,
        originalBalance: loan.OriginalBalance?.toString(),
        currentBalance: loan.CurrentBalance?.toString(),
        noteRate: loan.NoteRate?.toString()
      });

      return loan;
    } catch (error) {
      logger.error('Failed to get loan', {
        error: error.message,
        loanId
      });
      throw error;
    }
  }

  /**
   * Set Avalanche token ID in MarketplaceBridge
   */
  async setAvalancheTokenId(loanId, tokenId) {
    try {
      logger.info('Setting Avalanche token ID', {
        loanId,
        tokenId: tokenId.toString()
      });

      const tx = await this.contracts.marketplaceBridge.setAvalancheTokenId(
        loanId,
        tokenId,
        {
          gasLimit: 300000
        }
      );

      logger.info('Token ID set transaction sent', {
        txHash: tx.hash,
        loanId
      });

      const receipt = await tx.wait();

      logger.info('Token ID set successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        loanId,
        tokenId: tokenId.toString()
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to set token ID', {
        error: error.message,
        loanId,
        tokenId: tokenId.toString()
      });
      throw error;
    }
  }

  /**
   * Record ownership transfer in MarketplaceBridge
   */
  async recordOwnershipTransfer(loanId, newOwner, salePrice) {
    try {
      logger.info('Recording ownership transfer in MarketplaceBridge', {
        loanId,
        newOwner,
        salePrice: salePrice.toString()
      });

      const tx = await this.contracts.marketplaceBridge.recordOwnershipTransfer(
        loanId,      // string loanId
        newOwner,    // address newOwnerAddress
        salePrice,   // uint256 salePrice
        {
          gasLimit: 300000
        }
      );

      logger.info('Ownership transfer record transaction sent', {
        txHash: tx.hash,
        loanId
      });

      const receipt = await tx.wait();

      logger.info('Ownership transfer recorded successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        loanId
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to record ownership transfer', {
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
    logger.info('Besu service cleaned up');
  }
}

export default new BesuService();