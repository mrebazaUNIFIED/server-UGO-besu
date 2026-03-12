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

  async initialize() {
    try {
      logger.info('Initializing Avalanche service...');

      this.httpProvider = new ethers.JsonRpcProvider(AVALANCHE_CONFIG.rpcUrl);

      if (AVALANCHE_CONFIG.wsUrl) {
        this.wsProvider = new ethers.WebSocketProvider(AVALANCHE_CONFIG.wsUrl);
        this.wsProvider.websocket.on('error', (e) => logger.error('Avalanche WS error', { error: e.message }));
        this.wsProvider.websocket.on('close', () => {
          logger.warn('Avalanche WS closed, reconnecting...');
          setTimeout(() => this._reconnectWebSocket(), 5000);
        });
        this.wsProvider.websocket.on('open', () => logger.info('Avalanche WS connected'));
      } else {
        logger.warn('No WS URL — using HTTP for events');
        this.wsProvider = this.httpProvider;
      }

      this.wallet = new ethers.Wallet(RELAYER_CONFIG.privateKey, this.httpProvider);

      // ── Contratos HTTP (escritura) ────────────────────────────────────────
      this.contracts.usfci = new ethers.Contract(          // ✅ NUEVO
        AVALANCHE_CONTRACTS.usfci.address,
        AVALANCHE_CONTRACTS.usfci.abi,
        this.wallet
      );
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

      // ── Contratos WS (lectura de eventos) ────────────────────────────────
      if (this.wsProvider !== this.httpProvider) {
        this.wsContracts.usfci = new ethers.Contract(       // ✅ NUEVO
          AVALANCHE_CONTRACTS.usfci.address,
          AVALANCHE_CONTRACTS.usfci.abi,
          this.wsProvider
        );
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
        this.wsContracts = this.contracts;
      }

      const network = await this.httpProvider.getNetwork();
      const balance = await this.httpProvider.getBalance(this.wallet.address);

      logger.info('Avalanche service initialized', {
        chainId: network.chainId.toString(),
        relayerAddress: this.wallet.address,
        balance: ethers.formatEther(balance),
        usfciAddress: AVALANCHE_CONTRACTS.usfci.address   // ✅ NUEVO
      });

    } catch (error) {
      logger.error('Failed to initialize Avalanche service', { error: error.message });
      throw error;
    }
  }

  async _reconnectWebSocket() {
    try {
      logger.info('Reconnecting Avalanche WS...');
      if (this.wsProvider?.websocket) this.wsProvider.websocket.terminate();

      this.wsProvider = new ethers.WebSocketProvider(AVALANCHE_CONFIG.wsUrl);

      const names = ['usfci', 'loanNFT', 'marketplace', 'bridgeReceiver', 'paymentDistributor'];
      for (const name of names) {
        this.wsContracts[name] = new ethers.Contract(
          AVALANCHE_CONTRACTS[name].address,
          AVALANCHE_CONTRACTS[name].abi,
          this.wsProvider
        );
      }
      logger.info('Avalanche WS reconnected');
    } catch (error) {
      logger.error('Failed to reconnect WS', { error: error.message });
      setTimeout(() => this._reconnectWebSocket(), 5000);
    }
  }

  getWsContract(name) {
    const c = this.wsContracts[name];
    if (!c) throw new Error(`WS contract ${name} not found. Available: ${Object.keys(this.wsContracts).join(', ')}`);
    return c;
  }

  getContract(name) {
    const c = this.contracts[name];
    if (!c) throw new Error(`Contract ${name} not found`);
    return c;
  }

  async getBlockNumber() {
    return await this.httpProvider.getBlockNumber();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ NUEVO: mintUSFCI
  // Llamado cuando el deudor paga una cuota en Besu.
  // Mintea USFCI respaldado por el depósito real en Sunwest Bank.
  //
  // Flujo:
  //   1. mintTokens(paymentDistributor, amount, reserveProof)
  //      → USFCI aparece en el PaymentDistributor listo para ser reclamado
  //   2. Después el handler llama processPayment() en BridgeReceiver
  //      → recordPendingPayment() registra cuánto puede reclamar el dueño del NFT
  // ══════════════════════════════════════════════════════════════════════════
  async mintUSFCI(amount, reserveProof) {
    try {
      const distributorAddress = AVALANCHE_CONTRACTS.paymentDistributor.address;

      logger.info('Minting USFCI to PaymentDistributor', {
        amount: ethers.formatUnits(amount, 18),
        recipient: distributorAddress,
        reserveProof
      });

      const tx = await this.contracts.usfci.mintTokens(
        distributorAddress,  // recipient: el contrato que distribuye pagos
        amount,              // amount en wei (18 decimales)
        reserveProof,        // referencia bancaria Sunwest Bank
        { gasLimit: 200000 }
      );

      logger.info('USFCI mint tx sent', { txHash: tx.hash });
      const receipt = await tx.wait();

      logger.info('USFCI minted successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        amount: ethers.formatUnits(amount, 18),
        recipient: distributorAddress
      });

      return receipt;

    } catch (error) {
      logger.error('Failed to mint USFCI', { error: error.message, amount: amount.toString() });
      throw error;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Métodos existentes (sin cambios)
  // ══════════════════════════════════════════════════════════════════════════

  async updateNFTMetadata(tokenId, newBalance, newStatus) {
    try {
      logger.info('Updating NFT metadata', { tokenId: tokenId.toString(), newBalance: newBalance.toString(), newStatus });

      const tx = await this.contracts.loanNFT.updateMetadata(tokenId, newBalance, newStatus, { gasLimit: 200000 });
      logger.info('NFT metadata tx sent', { txHash: tx.hash });
      const receipt = await tx.wait();

      logger.info('NFT metadata updated', { txHash: receipt.hash, blockNumber: receipt.blockNumber });
      return receipt;
    } catch (error) {
      logger.error('Failed to update NFT metadata', { error: error.message, tokenId: tokenId.toString() });
      throw error;
    }
  }

  async getLoanMetadata(tokenId) {
    try {
      const metadata = await this.contracts.loanNFT.getLoanMetadata(tokenId);
      return {
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
    } catch (error) {
      logger.error('Failed to get loan metadata', { error: error.message, tokenId: tokenId.toString() });
      throw error;
    }
  }

  async recordPendingPayment(tokenId, amount) {
    try {
      logger.info('Recording pending payment', { tokenId: tokenId.toString(), amount: amount.toString() });
      const tx = await this.contracts.paymentDistributor.recordPendingPayment(tokenId, amount, { gasLimit: 500000 });
      const receipt = await tx.wait();
      logger.info('Pending payment recorded', { txHash: receipt.hash });
      return receipt;
    } catch (error) {
      logger.error('Failed to record pending payment', { error: error.message });
      throw error;
    }
  }

  async processBurnRequest(loanId, timestamp, nonce, signatures) {
    try {
      logger.info('Processing burn request', { loanId });
      const tx = await this.contracts.bridgeReceiver.processBurnRequest(loanId, timestamp, nonce, signatures, { gasLimit: 300000 });
      const receipt = await tx.wait();
      logger.info('Burn request processed', { txHash: receipt.hash, loanId });
      return receipt;
    } catch (error) {
      logger.error('Failed to process burn request', { error: error.message, loanId });
      throw error;
    }
  }

  async cleanup() {
    if (this.wsProvider?.websocket) this.wsProvider.websocket.terminate();
    logger.info('Avalanche service cleaned up');
  }
}

export default new AvalancheService();