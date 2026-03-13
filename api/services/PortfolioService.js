// services/PortfolioService.js
const BaseContractService = require('./BaseContractService');
const loanRegistryService = require('./LoanRegistryService');
const userRegistryService = require('./UserRegistryService');
const cache = require('../config/cache');
const graphqlService = require('./GraphqlService');

// ===== CONFIG =====
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// ===== TX STORE (memoria) =====
const txStore = new Map();
const TX_TTL_MS = 60 * 60 * 1000;

function cleanupTxStore() {
  const now = Date.now();
  for (const [hash, data] of txStore.entries()) {
    const t = data?.updatedAt ?? data?.createdAt ?? now;
    if (now - t > TX_TTL_MS) txStore.delete(hash);
  }
}

class PortfolioService extends BaseContractService {
  constructor() {
    super('Portfolio', 'Portfolio', 'portfolio');
  }

  // ===== TX HELPERS =====

  getTxStatus(txHash) {
    if (!txHash) return null;
    cleanupTxStore();
    return txStore.get(txHash.toLowerCase()) || null;
  }

  _setTx(txHash, patch) {
    const key = (txHash || '').toLowerCase();
    const prev = txStore.get(key) || {};
    txStore.set(key, { ...prev, ...patch, updatedAt: Date.now() });
  }

  // ===== BLOCKCHAIN: resolver loans con cache =====

  async resolveLoansFromBlockchain(portfolioItems) {
    if (!portfolioItems?.length) return [];

    // Validar concurrencia máxima de llamadas RPC a Besu para evitar Sockets Hang up
    const MAX_CONCURRENT = 10;
    const results = [];

    for (let i = 0; i < portfolioItems.length; i += MAX_CONCURRENT) {
      const chunk = portfolioItems.slice(i, i + MAX_CONCURRENT);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            const loanId = await loanRegistryService.generateLoanIdLocally(item.lenderUid, item.loanUid);
            if (!loanId) return null;
            const loan = await loanRegistryService.readLoan(loanId);
            return { ...loan, LenderName: loan.LenderName || item.lenderName };
          } catch (err) {
            return null;
          }
        })
      );

      results.push(...chunkResults);
    }

    return results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);
  }

  // ===== MÉTODO PRINCIPAL: getPortfolio =====

  async getPortfolio(userBearerToken) {
    const { userId, items } = await graphqlService.getLoanPortfolio(userBearerToken);

    if (!items || !items.length) {
      return { userId, totalLoans: 0, loans: [] };
    }

    const loans = await this.resolveLoansFromBlockchain(items);
    return { userId, totalLoans: loans.length, loans };
  }

  // ===== CERTIFICACIÓN =====

  async certifyPortfolio(userId, loans, options = {}) {
    const wait = options.wait !== false;

    if (!userId) throw new Error('userId is required');
    if (!loans?.length) throw new Error('No loans to certify');
    if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY is not set in environment');

    const user = await userRegistryService.getUserByUserId(userId);
    if (!user?.walletAddress) throw new Error(`No wallet address found for userId: ${userId}`);
    const userAddress = user.walletAddress;

    console.log(`[PortfolioService] certifyPortfolio → userId: ${userId}, walletAddress: ${userAddress}`);

    const contract = this.getContract(PRIVATE_KEY);

    const totalPrincipalUSD = loans.reduce((sum, loan) => sum + parseFloat(loan.OriginalBalance || '0'), 0);
    const totalPrincipalCents = BigInt(Math.round(totalPrincipalUSD * 100));
    const loanIds = loans.map(loan => loan.ID || loan.LoanUid).filter(Boolean);

    let alreadyExists = false;
    try {
      alreadyExists = await contract.portfolioCertificateExists(userId);
    } catch (_) {
      alreadyExists = false;
    }

    const tx = alreadyExists
      ? await contract.updatePortfolioCertificate(userId, loanIds, totalPrincipalCents)
      : await contract.createPortfolioCertificate(userId, userAddress, loanIds, totalPrincipalCents);

    this._setTx(tx.hash, {
      status: 'PENDING',
      createdAt: Date.now(),
      operation: alreadyExists ? 'UPDATE_CERTIFICATE' : 'CREATE_CERTIFICATE',
      userId,
    });

    if (wait) {
      let receipt;
      try {
        receipt = await tx.wait();
      } catch (err) {
        const reason = err?.reason || err?.message || String(err);
        console.error(`[PortfolioService] certifyPortfolio failed: ${reason}`);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
        throw new Error(`certifyPortfolio failed: ${reason}`);
      }

      const finalStatus = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';

      // Invalidar cache del certificado
      cache.loans.del(`portfolio:cert:${userId}`);

      this._setTx(tx.hash, {
        status: finalStatus,
        receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
      });

      return {
        success: receipt.status === 1,
        status: finalStatus,
        userId,
        walletAddress: userAddress,
        operation: alreadyExists ? 'updated' : 'created',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        loansCount: loanIds.length,
        totalPrincipalCents: totalPrincipalCents.toString(),
      };
    }

    // Background
    tx.wait()
      .then((receipt) => {
        cache.loans.del(`portfolio:cert:${userId}`);
        this._setTx(tx.hash, {
          status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
          receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
        });
      })
      .catch((err) => {
        const reason = err?.reason || err?.message || String(err);
        console.error(`[PortfolioService] certifyPortfolio (background) failed: ${reason}`);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
      });

    return {
      success: true,
      status: 'PENDING',
      userId,
      walletAddress: userAddress,
      txHash: tx.hash,
      loansCount: loanIds.length,
    };
  }

  // ===== MÉTODOS DELEGADOS AL CONTRATO =====

  async createPortfolioCertificate(privateKey, userId, userAddress, loanIds, totalPrincipal) {
    const contract = this.getContract(privateKey);
    const totalPrincipalCents = BigInt(Math.round(Number(totalPrincipal) * 100));
    const tx = await contract.createPortfolioCertificate(userId, userAddress, loanIds, totalPrincipalCents);
    const receipt = await tx.wait();
    cache.loans.del(`portfolio:cert:${userId}`);
    return { success: receipt.status === 1, txHash: receipt.hash, blockNumber: receipt.blockNumber, userId };
  }

  async updatePortfolioCertificate(privateKey, userId, loanIds, totalPrincipal) {
    const contract = this.getContract(privateKey);
    const totalPrincipalCents = BigInt(Math.round(Number(totalPrincipal) * 100));
    const tx = await contract.updatePortfolioCertificate(userId, loanIds, totalPrincipalCents);
    const receipt = await tx.wait();
    cache.loans.del(`portfolio:cert:${userId}`);
    return { success: receipt.status === 1, txHash: receipt.hash, blockNumber: receipt.blockNumber, userId };
  }

  async getPortfolioCertificate(userId) {
    const cacheKey = `portfolio:cert:${userId}`;
    const cached = cache.loans.get(cacheKey);
    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }
    const cert = await this.getContractReadOnly().getPortfolioCertificate(userId);
    const formatted = this._formatCertificate(cert);
    cache.loans.set(cacheKey, formatted);
    console.log(`[cache] SET ${cacheKey}`);
    return formatted;
  }

  async getPortfolioCertificateByAddress(userAddress) {
    const cert = await this.getContractReadOnly().getPortfolioCertificateByAddress(userAddress);
    return this._formatCertificate(cert);
  }

  async getPortfolioCertificateTxId(userId) {
    return await this.getContractReadOnly().getPortfolioCertificateTxId(userId);
  }

  async getAllCertificates() {
    const certs = await this.getContractReadOnly().getAllCertificates();
    return certs.map(cert => this._formatCertificate(cert));
  }

  async portfolioCertificateExists(userId) {
    return await this.getContractReadOnly().portfolioCertificateExists(userId);
  }

  async getCertificateStats(userId) {
    const stats = await this.getContractReadOnly().getCertificateStats(userId);
    return {
      loansCount: Number(stats[0]),
      totalPrincipal: (Number(stats[1]) / 100).toFixed(2),
      version: Number(stats[2]),
      lastUpdatedAt: new Date(Number(stats[3]) * 1000),
    };
  }

  _formatCertificate(cert) {
    return {
      id: cert.id,
      userId: cert.userId,
      userAddress: cert.userAddress,
      txId: cert.txId,
      loanIds: cert.loanIds,
      loansCount: Number(cert.loansCount),
      totalPrincipal: (Number(cert.totalPrincipal) / 100).toFixed(2),
      createdAt: new Date(Number(cert.createdAt) * 1000),
      lastUpdatedAt: new Date(Number(cert.lastUpdatedAt) * 1000),
      version: Number(cert.version),
      exists: cert.exists,
    };
  }
}

module.exports = new PortfolioService();