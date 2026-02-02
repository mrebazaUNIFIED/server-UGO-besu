const { ethers } = require('ethers');
const BaseContractService = require('./BaseContractService');

class PortfolioService extends BaseContractService {
  constructor() {
    super('Portfolio', 'Portfolio');
    // Gas limit para creación de certificados (puede ser alto si el array de loanIds crece)
    this.GAS_LIMIT_WRITE = 800000;
  }

  /**
   * Crear certificado de portafolio (Escritura - Sticky Node)
   */
  async createPortfolioCertificate(privateKey, userId, userAddress, loanIds, totalPrincipal) {
    try {
      const contract = this.getContract(privateKey);
      
      console.log(`📜 Generando Certificado para Usuario: ${userId} (${loanIds.length} préstamos)...`);

      const tx = await contract.createPortfolioCertificate(
        userId,
        userAddress,
        loanIds,
        totalPrincipal,
        { gasLimit: this.GAS_LIMIT_WRITE }
      );

      console.log(`⏳ Tx enviada: ${tx.hash}. Confirmando...`);
      const receipt = await tx.wait();

      const event = this._parseEvent(contract, receipt, 'CertificateCreated');

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        event: event ? event.args : null
      };
    } catch (error) {
      console.error("❌ Error en createPortfolioCertificate:", error.message);
      throw error;
    }
  }

  /**
   * Actualizar certificado (Escritura)
   */
  async updatePortfolioCertificate(privateKey, userId, loanIds, totalPrincipal) {
    const contract = this.getContract(privateKey);
    const tx = await contract.updatePortfolioCertificate(
      userId,
      loanIds,
      totalPrincipal,
      { gasLimit: this.GAS_LIMIT_WRITE }
    );
    const receipt = await tx.wait();
    const event = this._parseEvent(contract, receipt, 'CertificateUpdated');

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      event: event ? event.args : null
    };
  }

  // ==================== MÉTODOS DE LECTURA (Balanced Load) ====================

  async getPortfolioCertificate(userId) {
    const cert = await this.getContractReadOnly().getPortfolioCertificate(userId);
    return this._mapCertificate(cert);
  }

  async getPortfolioCertificateByAddress(userAddress) {
    const cert = await this.getContractReadOnly().getPortfolioCertificateByAddress(userAddress);
    return this._mapCertificate(cert);
  }

  async getAllCertificates() {
    const certs = await this.getContractReadOnly().getAllCertificates();
    return certs.map(c => this._mapCertificate(c));
  }

  async getCertificateStats(userId) {
    const stats = await this.getContractReadOnly().getCertificateStats(userId);
    return {
      loansCount: Number(stats.loansCount),
      totalPrincipal: stats.totalPrincipal.toString(),
      version: Number(stats.version),
      lastUpdated: new Date(Number(stats.lastUpdated) * 1000)
    };
  }

  async portfolioCertificateExists(userId) {
    return await this.getContractReadOnly().portfolioCertificateExists(userId);
  }

  // ==================== HELPERS ====================

  _mapCertificate(cert) {
    return {
      id: cert.id,
      userId: cert.userId,
      userAddress: cert.userAddress,
      txId: cert.txId,
      loanIds: cert.loanIds,
      loansCount: Number(cert.loansCount),
      totalPrincipal: cert.totalPrincipal.toString(),
      createdAt: new Date(Number(cert.createdAt) * 1000),
      lastUpdatedAt: new Date(Number(cert.lastUpdatedAt) * 1000),
      version: Number(cert.version),
      exists: cert.exists
    };
  }

  _parseEvent(contract, receipt, eventName) {
    const log = receipt.logs.find(l => {
      try {
        const p = contract.interface.parseLog(l);
        return p && p.name === eventName;
      } catch (e) { return false; }
    });
    return log ? contract.interface.parseLog(log) : null;
  }
}

module.exports = new PortfolioService();