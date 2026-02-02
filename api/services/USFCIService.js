const { ethers } = require('ethers');
const { rpcLoadBalancer, CONTRACTS, ABIs } = require('../config/blockchain'); // ✅ Cambio aquí
const BaseContractService = require('./BaseContractService');

class USFCIService extends BaseContractService {
  constructor() {
    super('USFCI', 'USFCI');
  }
  /**
   * Inicializar ledger (solo admin)
   */
  async initLedger(privateKey) {
    const contract = this.getContract(privateKey);
    const tx = await contract.initLedger();
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Registrar wallet
   */
  async registerWallet(privateKey, mspId, userId, accountType) {
    const contract = this.getContract(privateKey);
    const tx = await contract.registerWallet(mspId, userId, accountType);
    const receipt = await tx.wait();

    // Parsear evento
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'WalletRegistered';
      } catch (e) {
        return false;
      }
    });

    return {
      success: true,
      walletAddress: receipt.from,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      event: event ? contract.interface.parseLog(event).args : null
    };
  }

  /**
   * Mintear tokens (requiere MINTER_ROLE)
   */
  async mintTokens(privateKey, walletAddress, amount, reserveProof) {
    const contract = this.getContract(privateKey);
    const tx = await contract.mintTokens(walletAddress, amount, reserveProof, {
      gasLimit: 500000
    });
    const receipt = await tx.wait();
    return { success: true, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  /**
   * Quemar tokens (requiere BURNER_ROLE)
   */
  async burnTokens(privateKey, walletAddress, amount, reason) {
    const contract = this.getContract(privateKey);
    const tx = await contract.burnTokens(walletAddress, amount, reason);
    const receipt = await tx.wait();

    // Parsear evento
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'TokensBurned';
      } catch (e) {
        return false;
      }
    });

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      event: event ? contract.interface.parseLog(event).args : null
    };
  }

  /**
   * Transferir tokens
   */
  async transfer(privateKey, recipient, amount) {
    const contract = this.getContract(privateKey);
    const tx = await contract.transfer(recipient, amount);
    const receipt = await tx.wait();

    // Parsear evento
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'TokensTransferred';
      } catch (e) {
        return false;
      }
    });

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      event: event ? contract.interface.parseLog(event).args : null
    };
  }

  /**
   * Actualizar estado de compliance (requiere COMPLIANCE_ROLE)
   */
  async updateComplianceStatus(privateKey, walletAddress, kycStatus, riskScore) {
    const contract = this.getContract(privateKey);
    const tx = await contract.updateComplianceStatus(walletAddress, kycStatus, riskScore);
    const receipt = await tx.wait();

    // Parsear evento
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'ComplianceUpdated';
      } catch (e) {
        return false;
      }
    });

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      event: event ? contract.interface.parseLog(event).args : null
    };
  }

  /**
   * Obtener detalles de cuenta
   */
  async getAccountDetails(walletAddress) {
    // this.getContractReadOnly() ya usa el rpcLoadBalancer gracias a BaseContractService
    const contract = this.getContractReadOnly();
    const account = await contract.getAccountDetails(walletAddress);

    return {
      mspId: account.mspId,
      userId: account.userId,
      frozenBalance: account.frozenBalance.toString(),
      lastActivity: new Date(Number(account.lastActivity) * 1000),
      kycStatus: account.kycStatus,
      riskScore: account.riskScore,
      accountType: account.accountType,
      exists: account.exists
    };
  }

  /**
   * Obtener balance
   */
  async getBalance(walletAddress) {
    const balance = await this.getContractReadOnly().balanceOf(walletAddress);
    return balance.toString();
  }

  /**
   * Obtener configuración del sistema
   */
  async getSystemConfig() {
    const contract = this.getContractReadOnly();
    const config = await contract.systemConfig();

    return {
      tokenName: config.tokenName,
      tokenSymbol: config.tokenSymbol,
      maxTransactionAmount: config.maxTransactionAmount.toString(),
      maxDailyTransactionAmount: config.maxDailyTransactionAmount.toString(),
      dailyReserveReportRequired: config.dailyReserveReportRequired,
      reserveBank: config.reserveBank,
      complianceEnabled: config.complianceEnabled
    };
  }

  /**
   * Pausar contrato (solo admin)
   */
  async pause(privateKey) {
    const contract = this.getContract(privateKey);
    const tx = await contract.pause();
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Despausar contrato (solo admin)
   */
  async unpause(privateKey) {
    const contract = this.getContract(privateKey);
    const tx = await contract.unpause();
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };

  }

  // ==================== MÉTODOS DE HISTORIAL ====================

  /**
   * Obtener todos los registros de minteo
   */
  async getAllMintRecords() {
    const contract = this.getContractReadOnly();
    const records = await contract.getAllMintRecords();

    return records.map(record => ({
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      reserveProof: record.reserveProof,
      timestamp: new Date(Number(record.timestamp) * 1000),
      minter: record.minter
    }));
  }

  /**
   * Obtener historial de minteo de una wallet específica
   */
  async getMintHistory(walletAddress) {
    const contract = this.getContractReadOnly();
    const records = await contract.getMintHistory(walletAddress);

    return records.map(record => ({
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      reserveProof: record.reserveProof,
      timestamp: new Date(Number(record.timestamp) * 1000),
      minter: record.minter
    }));
  }

  /**
   * Obtener todos los registros de quemado
   */
  async getAllBurnRecords() {
    const contract = this.getContractReadOnly();
    const records = await contract.getAllBurnRecords();

    return records.map(record => ({
      burnerAddress: record.burnerAddress,
      burnerMspId: record.burnerMspId,
      amount: record.amount.toString(),
      reason: record.reason,
      timestamp: new Date(Number(record.timestamp) * 1000)
    }));
  }

  /**
   * Obtener historial de quemado de una wallet específica
   */
  async getBurnHistory(walletAddress) {
    const contract = this.getContractReadOnly();
    const records = await contract.getBurnHistory(walletAddress);

    return records.map(record => ({
      burnerAddress: record.burnerAddress,
      burnerMspId: record.burnerMspId,
      amount: record.amount.toString(),
      reason: record.reason,
      timestamp: new Date(Number(record.timestamp) * 1000)
    }));
  }

  /**
   * Obtener todos los registros de transferencias
   */
  async getAllTransferRecords() {
    const contract = this.getContractReadOnly();
    const records = await contract.getAllTransferRecords();

    return records.map(record => ({
      senderAddress: record.senderAddress,
      senderMspId: record.senderMspId,
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      metadata: record.metadata,
      timestamp: new Date(Number(record.timestamp) * 1000),
      settlementType: record.settlementType
    }));
  }

  /**
   * Obtener historial completo de transacciones de una wallet (enviadas y recibidas)
   */
  async getTransactionHistory(walletAddress) {
    const contract = this.getContractReadOnly();
    const records = await contract.getTransactionHistory(walletAddress);

    return records.map(record => ({
      senderAddress: record.senderAddress,
      senderMspId: record.senderMspId,
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      metadata: record.metadata,
      timestamp: new Date(Number(record.timestamp) * 1000),
      settlementType: record.settlementType,
      type: record.senderAddress.toLowerCase() === walletAddress.toLowerCase() ? 'sent' : 'received'
    }));
  }

  /**
   * Obtener solo transferencias enviadas
   */
  async getSentTransactions(walletAddress) {
    const contract = this.getContractReadOnly();
    const records = await contract.getSentTransactions(walletAddress);

    return records.map(record => ({
      senderAddress: record.senderAddress,
      senderMspId: record.senderMspId,
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      metadata: record.metadata,
      timestamp: new Date(Number(record.timestamp) * 1000),
      settlementType: record.settlementType,
      type: 'sent'
    }));
  }

  /**
   * Obtener solo transferencias recibidas
   */
  async getReceivedTransactions(walletAddress) {
    const contract = this.getContractReadOnly();
    const records = await contract.getReceivedTransactions(walletAddress);

    return records.map(record => ({
      senderAddress: record.senderAddress,
      senderMspId: record.senderMspId,
      recipientAddress: record.recipientAddress,
      recipientMspId: record.recipientMspId,
      amount: record.amount.toString(),
      metadata: record.metadata,
      timestamp: new Date(Number(record.timestamp) * 1000),
      settlementType: record.settlementType,
      type: 'received'
    }));
  }

  /**
   * Obtener estadísticas generales
   */
  async getStatistics() {
    const contract = this.getContractReadOnly();
    const stats = await contract.getStatistics();

    return {
      totalMints: stats.totalMints.toString(),
      totalBurns: stats.totalBurns.toString(),
      totalTransfers: stats.totalTransfers.toString(),
      totalSupply: stats.totalSupply_.toString()
    };
  }

  /**
   * Obtener historial completo de una wallet (mints, burns, transfers)
   */
  async getWalletCompleteHistory(walletAddress) {
    const [mints, burns, transactions] = await Promise.all([
      this.getMintHistory(walletAddress),
      this.getBurnHistory(walletAddress),
      this.getTransactionHistory(walletAddress)
    ]);

    return {
      mints,
      burns,
      transactions,
      summary: {
        totalMints: mints.length,
        totalBurns: burns.length,
        totalTransactions: transactions.length
      }
    };
  }


}

module.exports = new USFCIService();