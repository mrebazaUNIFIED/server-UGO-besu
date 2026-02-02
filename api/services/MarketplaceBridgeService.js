const { ethers } = require('ethers');
const BaseContractService = require('./BaseContractService');

class MarketplaceBridgeService extends BaseContractService {
  constructor() {
    super('MarketplaceBridge', 'MarketplaceBridge');
    this.loanRegistryService = null; // Se inicializará después
  }

  /**
   * ✅ Inicializar referencia al LoanRegistryService
   * Esto es necesario para generar loanIds
   */
  setLoanRegistryService(loanRegistryService) {
    this.loanRegistryService = loanRegistryService;
  }

  /**
   * ✅ Normalizar valor USD - SIEMPRE asume 2 decimales
   */
  normalizeUSD(value) {
    if (!value && value !== 0) return 0;

    let strValue = String(value).trim();

    if (!strValue.includes('.')) {
      strValue = strValue + '.00';
    }

    return parseFloat(strValue);
  }

  /**
   * ✅ Convertir USD normalizado a centavos
   */
  usdToCents(usd) {
    const normalized = this.normalizeUSD(usd);
    return Math.round(normalized * 100);
  }

  /**
   * ✅ Convertir centavos a USD con 2 decimales
   */
  centsToUSD(cents) {
    if (!cents && cents !== 0) return "0.00";
    const dollars = Number(cents) / 100;
    return dollars.toFixed(2);
  }

  /**
   * ✅ Convertir porcentaje a basis points
   */
  percentToBps(percent) {
    if (percent == null || percent === '') return 0;
    const num = Number(percent);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  /**
   * ✅ Generar loanId (requiere LoanRegistryService inicializado)
   */
  _generateLoanId(lenderUid, loanUid) {
    if (!this.loanRegistryService) {
      throw new Error('LoanRegistryService not initialized. Call setLoanRegistryService() first.');
    }
    return this.loanRegistryService.generateLoanId(lenderUid, loanUid);
  }

  /**
   * ✅ Verificar que loan existe (requiere LoanRegistryService inicializado)
   */
  async _verifyLoanExists(loanId) {
    if (!this.loanRegistryService) {
      throw new Error('LoanRegistryService not initialized. Call setLoanRegistryService() first.');
    }
    return await this.loanRegistryService.loanExists(loanId);
  }

  // ===== FUNCIONES PRINCIPALES =====

  /**
   * ✅ Aprobar un loan para tokenización/venta
   * IMPORTANTE: Ahora usa lenderUid y loanUid en lugar de loanId
   */
  async approveLoanForSale(privateKey, lenderUid, loanUid, askingPriceUSD, modifiedInterestRate) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    // Generar loanId
    const loanId = this._generateLoanId(lenderUid, loanUid);

    // Verificar que el loan existe
    const loanExists = await this._verifyLoanExists(loanId);
    if (!loanExists) {
      throw new Error(`Loan does not exist for LenderUid: ${lenderUid}, LoanUid: ${loanUid}`);
    }

    const contract = this.getContract(privateKey);

    // Convertir USD a centavos
    const priceInCents = this.usdToCents(askingPriceUSD);

    const tx = await contract.approveLoanForSale(
      loanId,
      BigInt(priceInCents),
      this.percentToBps(modifiedInterestRate)
    );

    const receipt = await tx.wait();

    // Extraer eventos
    let approvalTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const approvedEvent = logs.find(log => log.name === 'LoanApprovedForSale');
    if (approvedEvent) {
      approvalTxId = approvedEvent.args.txId || approvedEvent.args[2];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      askingPriceUSD: this.centsToUSD(priceInCents),
      askingPriceCents: priceInCents,
      modifiedInterestRate: modifiedInterestRate,
      approvalTxId: approvalTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Registrar hash de transacción de aprobación
   */
  async registerApprovalTxHash(privateKey, lenderUid, loanUid, txHash) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    // Formato correcto del txHash
    const txHashBytes32 = txHash.startsWith('0x') ? txHash : `0x${txHash}`;

    const tx = await contract.registerApprovalTxHash(loanId, txHashBytes32);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      registeredTxHash: txHash,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Obtener loanId por hash de transacción
   */
  async getLoanIdByTxHash(txHash) {
    const contract = this.getContractReadOnly();

    // Asegurarse formato correcto
    const txHashBytes32 = txHash.startsWith('0x') ? txHash : '0x' + txHash;

    const loanId = await contract.getLoanIdByTxHash(txHashBytes32);

    if (!loanId || loanId.trim() === '') {
      throw new Error('TxHash not found in registry');
    }

    return loanId;
  }

  /**
   * ✅ Obtener datos de aprobación por hash de transacción
   */
  async getApprovalDataByTxHash(txHash) {
    const contract = this.getContractReadOnly();
    const txHashBytes32 = txHash.startsWith('0x') ? txHash : '0x' + txHash;

    const [approval, loanId] = await contract.getApprovalDataByTxHash(txHashBytes32);

    // Obtener loanUid y lenderUid del loan
    let lenderUid = '';
    let loanUid = '';
    try {
      const loanRegistryService = require('./LoanRegistryService');
      const loan = await loanRegistryService.readLoan(loanId);
      lenderUid = loan.LenderUid;
      loanUid = loan.LoanUid;
    } catch (error) {
      console.warn('Could not get loan details:', error.message);
    }

    return {
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      isApproved: approval.isApproved,
      askingPrice: this.centsToUSD(approval.askingPrice),
      modifiedInterestRate: this.bpsToPercent(approval.modifiedInterestRate),
      lenderAddress: approval.lenderAddress,
      approvalTimestamp: new Date(Number(approval.approvalTimestamp) * 1000),
      isMinted: approval.isMinted,
      isCancelled: approval.isCancelled,
      approvalTxHash: txHash
    };
  }

  /**
   * ✅ Cancelar listado de venta
   */
  async cancelSaleListing(privateKey, lenderUid, loanUid) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    const tx = await contract.cancelSaleListing(loanId);
    const receipt = await tx.wait();

    // Extraer eventos
    let cancellationTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const cancelledEvent = logs.find(log => log.name === 'LoanApprovalCancelled');
    if (cancelledEvent) {
      cancellationTxId = cancelledEvent.args.txId || cancelledEvent.args[2];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      cancellationTxId: cancellationTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Obtener datos de aprobación de un loan
   */
  async getApprovalData(lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    const approval = await contract.getApprovalData(loanId);

    // Buscar el hash de la transacción del evento
    let approvalTxHash = null;
    let approvalTxId = null;
    try {
      const filter = contract.filters.LoanApprovedForSale(loanId);
      const events = await contract.queryFilter(filter);
      if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        approvalTxHash = latestEvent.transactionHash;
        approvalTxId = latestEvent.args.txId || latestEvent.args[2];
      }
    } catch (error) {
      console.error('Error fetching approval event:', error);
    }

    return {
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      isApproved: approval.isApproved,
      askingPrice: this.centsToUSD(approval.askingPrice),
      modifiedInterestRate: this.bpsToPercent(approval.modifiedInterestRate),
      lenderAddress: approval.lenderAddress,
      approvalTimestamp: new Date(Number(approval.approvalTimestamp) * 1000),
      isMinted: approval.isMinted,
      isCancelled: approval.isCancelled,
      approvalTxHash: approvalTxHash,
      approvalTxId: approvalTxId
    };
  }

  /**
   * ✅ Verificar si un loan puede ser minteado
   */
  async canBeMinted(lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    return await contract.canBeMinted(loanId);
  }

  /**
   * ✅ Verificar si un loan está aprobado para venta
   */
  async isLoanApprovedForSale(lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    return await contract.isLoanApprovedForSale(loanId);
  }

  /**
   * ✅ Obtener token ID de Avalanche
   */
  async getAvalancheTokenId(lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    const tokenId = await contract.getAvalancheTokenId(loanId);
    return tokenId.toString();
  }

  /**
   * ✅ Establecer token ID de Avalanche (solo relayer)
   */
  async setAvalancheTokenId(privateKey, lenderUid, loanUid, tokenId) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    const tx = await contract.setAvalancheTokenId(loanId, tokenId);
    const receipt = await tx.wait();

    // Extraer eventos
    let tokenSetTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const tokenSetEvent = logs.find(log => log.name === 'AvalancheTokenIdSet');
    if (tokenSetEvent) {
      tokenSetTxId = tokenSetEvent.args.txId || tokenSetEvent.args[2];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      tokenId: tokenId.toString(),
      tokenSetTxId: tokenSetTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Registrar transferencia de propiedad
   */
  async recordOwnershipTransfer(privateKey, lenderUid, loanUid, newOwnerAddress, salePriceUSD) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    // Convertir USD a centavos
    const priceInCents = this.usdToCents(salePriceUSD);

    const tx = await contract.recordOwnershipTransfer(
      loanId,
      newOwnerAddress,
      BigInt(priceInCents)
    );
    const receipt = await tx.wait();

    // Extraer eventos
    let transferTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const transferEvent = logs.find(log => log.name === 'OwnershipTransferred');
    if (transferEvent) {
      transferTxId = transferEvent.args.txId || transferEvent.args[3];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      newOwnerAddress: newOwnerAddress,
      salePriceUSD: this.centsToUSD(priceInCents),
      salePriceCents: priceInCents.toString(),
      transferTxId: transferTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Registrar pago
   */
  async recordPayment(privateKey, lenderUid, loanUid, amountUSD) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    // Convertir USD a centavos
    const amountInCents = this.usdToCents(amountUSD);

    const tx = await contract.recordPayment(loanId, BigInt(amountInCents));
    const receipt = await tx.wait();

    // Extraer eventos
    let paymentTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const paymentEvent = logs.find(log => log.name === 'PaymentRecorded');
    if (paymentEvent) {
      paymentTxId = paymentEvent.args.txId || paymentEvent.args[2];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      amountUSD: this.centsToUSD(amountInCents),
      amountCents: amountInCents.toString(),
      paymentTxId: paymentTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Marcar loan como pagado (solo relayer)
   */
  async markLoanAsPaidOff(privateKey, lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    const tx = await contract.markLoanAsPaidOff(loanId);
    const receipt = await tx.wait();

    // Extraer eventos
    let paidOffTxId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const paidOffEvent = logs.find(log => log.name === 'LoanPaidOff');
    if (paidOffEvent) {
      paidOffTxId = paidOffEvent.args.txId || paidOffEvent.args[1];
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      paidOffTxId: paidOffTxId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ===== FUNCIONES AUXILIARES =====

  /**
   * ✅ Convertir basis points a porcentaje
   */
  bpsToPercent(bps) {
    if (bps == null) return "0.00";
    const percent = Number(bps) / 100;
    return percent.toFixed(2);
  }

  /**
   * ✅ Obtener préstamos aprobados por un lender
   */
  async getApprovedLoansByLender(lenderAddress) {
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.getApprovedLoansByLender(lenderAddress);
      return result;
    } catch (error) {
      // Si la función no existe en el contrato, buscar manualmente
      console.warn('getApprovedLoansByLender not available:', error.message);

      // Implementación alternativa: obtener todos los loans y filtrar
      const loanRegistryService = require('./LoanRegistryService');
      const allLoans = await loanRegistryService.queryAllLoansComplete();

      const approvedLoans = [];
      for (const loan of allLoans) {
        const approval = await this.getApprovalData(loan.LenderUid, loan.LoanUid);
        if (approval.isApproved && !approval.isCancelled) {
          approvedLoans.push({
            loanId: loan.ID,
            lenderUid: loan.LenderUid,
            loanUid: loan.LoanUid,
            askingPrice: approval.askingPrice,
            modifiedInterestRate: approval.modifiedInterestRate,
            isMinted: approval.isMinted
          });
        }
      }

      return approvedLoans;
    }
  }

  /**
   * ✅ Obtener préstamos tokenizados
   */
  async getTokenizedLoans() {
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.getTokenizedLoans();
      return result;
    } catch (error) {
      // Si la función no existe en el contrato, buscar manualmente
      console.warn('getTokenizedLoans not available:', error.message);

      // Implementación alternativa
      const loanRegistryService = require('./LoanRegistryService');
      const allLoans = await loanRegistryService.queryAllLoansComplete();

      const tokenizedLoans = [];
      for (const loan of allLoans) {
        const tokenId = await this.getAvalancheTokenId(loan.LenderUid, loan.LoanUid);
        if (tokenId !== '0') {
          tokenizedLoans.push({
            loanId: loan.ID,
            lenderUid: loan.LenderUid,
            loanUid: loan.LoanUid,
            tokenId: tokenId,
            currentBalance: loan.CurrentBalance,
            status: loan.Status
          });
        }
      }

      return tokenizedLoans;
    }
  }

  /**
   * ✅ Verificar si un lender puede aprobar un préstamo
   */
  async canLenderApproveLoan(lenderUid, loanUid, lenderAddress) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.canLenderApproveLoan(loanId, lenderAddress);
      return {
        canApprove: result[0],
        reason: result[1]
      };
    } catch (error) {
      // Si la función no existe, hacer verificaciones manuales
      console.warn('canLenderApproveLoan not available:', error.message);

      const loanRegistryService = require('./LoanRegistryService');

      // Verificar existencia
      if (!await this._verifyLoanExists(loanId)) {
        return { canApprove: false, reason: 'Loan does not exist' };
      }

      // Verificar si ya está bloqueado
      const isLocked = await loanRegistryService.isLoanLocked(loanId);
      if (isLocked) {
        return { canApprove: false, reason: 'Loan already tokenized' };
      }

      // Verificar aprobación existente
      const approval = await this.getApprovalData(lenderUid, loanUid);
      if (approval.isApproved) {
        return { canApprove: false, reason: 'Already approved' };
      }

      if (approval.isCancelled) {
        return { canApprove: false, reason: 'Was cancelled' };
      }

      // Verificar balance y estado
      const loan = await loanRegistryService.readLoan(loanId);
      if (loan.CurrentBalance === '0.00') {
        return { canApprove: false, reason: 'Loan balance must be > 0' };
      }

      if (loan.Status === 'Paid Off') {
        return { canApprove: false, reason: 'Cannot sell paid off loan' };
      }

      return { canApprove: true, reason: '' };
    }
  }

  /**
   * ✅ Función de emergencia para desbloquear (solo owner)
   */
  async emergencyUnlock(privateKey, lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    const tx = await contract.emergencyUnlock(loanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * ✅ Forzar desbloqueo para préstamos pagados (solo relayer)
   */
  async forceUnlockPaidOffLoan(privateKey, lenderUid, loanUid) {
    const loanId = this._generateLoanId(lenderUid, loanUid);
    const contract = this.getContract(privateKey);

    const tx = await contract.forceUnlockPaidOffLoan(loanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * ✅ Obtener dirección del relayer
   */
  async getRelayerAddress() {
    const contract = this.getContractReadOnly();
    return await contract.relayerAddress();
  }
}


module.exports = new MarketplaceBridgeService();