// services/PortfolioService.js
const BaseContractService = require('./BaseContractService');
const loanRegistryService = require('./LoanRegistryService');
const userRegistryService = require('./UserRegistryService');
const cache = require('../config/cache');

// ===== CONFIG =====
const GRAPHQL_URL = process.env.GRAPHQL_URL || process.env.GRAPHQL_URL_DEV;
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

// ===== GRAPHQL QUERY =====
const GET_LOAN_PORTFOLIO_QUERY = `
  {
    getLoanPortfolioBCv2 {
      loanUid
      lenderUid
    }
  }
`;

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

  // ===== GRAPHQL con cache =====

  async fetchPortfolioFromGraphQL(userBearerToken) {
    if (!userBearerToken) throw new Error('Bearer token is required');
    if (!GRAPHQL_URL) throw new Error('GRAPHQL_URL is not set in environment');

    // Cache key basado en el token — cada usuario tiene su propio cache
    const cacheKey = `graphql:portfolio:${userBearerToken}`;
    const cached = cache.graphql.get(cacheKey);
    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }

    console.log(`[cache] MISS ${cacheKey} — llamando GraphQL...`);
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBearerToken}`,
      },
      body: JSON.stringify({ query: GET_LOAN_PORTFOLIO_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`);
    }

    const items = json?.data?.getLoanPortfolioBCv2 || [];
    const userId = items.length > 0 ? items[0].lenderUid : null;

    const result = { userId, items };

    // Solo cachear si hay datos — no cachear respuestas vacías
    if (items.length > 0) {
      cache.graphql.set(cacheKey, result);
      console.log(`[cache] SET ${cacheKey} (${items.length} items)`);
    }

    return result;
  }

  // ===== BLOCKCHAIN: resolver loans con cache =====

  async resolveLoansFromBlockchain(portfolioItems) {
    if (!portfolioItems?.length) return [];

    const lenderMap = new Map();
    for (const item of portfolioItems) {
      if (!lenderMap.has(item.lenderUid)) {
        lenderMap.set(item.lenderUid, new Set());
      }
      lenderMap.get(item.lenderUid).add(item.loanUid);
    }

    const lenderFetches = Array.from(lenderMap.entries()).map(async ([lenderUid, loanUidSet]) => {
      try {
        const cacheKey = `portfolio:lender:${lenderUid}`;
        const cached = cache.loans.get(cacheKey);
        if (cached) {
          console.log(`[cache] HIT ${cacheKey} (${cached.length} loans)`);
          return cached;
        }

        console.log(`[cache] MISS ${cacheKey} `);
        const loansFromChain = await loanRegistryService.findLoansByLenderUid(lenderUid);
        const filtered = loansFromChain.filter(loan => loanUidSet.has(loan.LoanUid));

        // Solo cachear si hay loans
        if (filtered.length > 0) {
          cache.loans.set(cacheKey, filtered);
          console.log(`[cache] SET ${cacheKey} (${filtered.length} loans)`);
        } else {
          console.warn(`[cache] SKIP SET ${cacheKey} `);
        }

        return filtered;
      } catch (err) {
        console.error(`[PortfolioService] Error fetching loans for lenderUid ${lenderUid}:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(lenderFetches);
    return results.flat();
  }

  // ===== MÉTODO PRINCIPAL: getPortfolio =====

  async getPortfolio(userBearerToken) {
    const { userId, items } = await this.fetchPortfolioFromGraphQL(userBearerToken);

    if (!items.length) {
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