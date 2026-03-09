const { ethers } = require('ethers');
const BaseContractService = require('./BaseContractService');

class MarketplaceBridgeService extends BaseContractService {
  constructor() {
    super('MarketplaceBridge', 'MarketplaceBridge', 'marketplace');
    this.loanRegistryService = null;

    // ⭐ NUEVO: Cargar private key del .env
    this.privateKey = process.env.PRIVATE_KEY;
    if (!this.privateKey) {
      console.warn('⚠️ WARNING: PRIVATE_KEY not found in .env - write operations will fail');
    }
  }


  setLoanRegistryService(loanRegistryService) {
    this.loanRegistryService = loanRegistryService;
  }

  // ═══════════════════════════════════════════════════════════════
  // Helpers de conversión USD/Cents/Percent
  // ═══════════════════════════════════════════════════════════════
  normalizeUSD(value) {
    if (!value && value !== 0) return 0;
    let strValue = String(value).trim();
    if (!strValue.includes('.')) {
      strValue = strValue + '.00';
    }
    return parseFloat(strValue);
  }

  usdToCents(usd) {
    const normalized = this.normalizeUSD(usd);
    return Math.round(normalized * 100);
  }

  centsToUSD(cents) {
    if (!cents && cents !== 0) return "0.00";
    const dollars = Number(cents) / 100;
    return dollars.toFixed(2);
  }

  percentToBps(percent) {
    if (percent == null || percent === '') return 0;
    const num = Number(percent);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  bpsToPercent(bps) {
    if (bps == null) return "0.00";
    const percent = Number(bps) / 100;
    return percent.toFixed(2);
  }

  // ═══════════════════════════════════════════════════════════════
  // Helpers para obtener loan real desde blockchain
  // ═══════════════════════════════════════════════════════════════
  async _getLoanFromBlockchain(lenderUid, loanUid) {
    if (!this.loanRegistryService) {
      throw new Error('LoanRegistryService not initialized');
    }

    try {
      return await this.loanRegistryService.readLoanByUids(lenderUid, loanUid);
    } catch (error) {
      const allLoans = await this.loanRegistryService.queryAllLoansComplete();
      const matchingLoan = allLoans.find(loan =>
        loan.LenderUid === lenderUid && loan.LoanUid === loanUid
      );

      if (!matchingLoan) {
        throw new Error(`Loan not found for LenderUid: ${lenderUid}, LoanUid: ${loanUid}`);
      }

      return matchingLoan;
    }
  }

  async _getLoanIdFromBlockchain(lenderUid, loanUid) {
    const loan = await this._getLoanFromBlockchain(lenderUid, loanUid);
    return loan.ID;
  }

  async _verifyLoanExists(lenderUid, loanUid) {
    try {
      const loan = await this._getLoanFromBlockchain(lenderUid, loanUid);
      return !!loan;
    } catch (error) {
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ ACTUALIZADO: approveLoanForSale (sin modifiedInterestRate)
  // ═══════════════════════════════════════════════════════════════
  /**
   * Aprobar loan para venta/tokenización
   * 
   * CAMBIOS:
   * - Ya NO recibe modifiedInterestRate (removido de ApprovalData)
   * - Usa private key del .env en lugar de recibirla como parámetro
   * - El evento solo emite: loanId, lenderAddress, askingPrice, timestamp
   */
  async approveLoanForSale(lenderUid, loanUid, askingPriceUSD) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    // Obtener loan y verificar estado
    const loan = await this._getLoanFromBlockchain(lenderUid, loanUid);

    if (loan.isTokenized) {
      throw new Error('Loan is already tokenized');
    }

    if (loan.isLocked) {
      throw new Error('Loan is already locked');
    }

    const loanId = loan.ID;
    const contract = this.getContract(this.privateKey);
    const priceInCents = this.usdToCents(askingPriceUSD);

    // ⭐ NUEVA FIRMA: Solo loanId y askingPrice
    const tx = await contract.approveLoanForSale(
      loanId,
      BigInt(priceInCents)
      // ❌ modifiedInterestRate REMOVIDO
    );

    const receipt = await tx.wait();

    // Extraer datos del evento
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const approvedEvent = logs.find(log => log.name === 'LoanApprovedForSale');

    // ⭐ EVENTO ACTUALIZADO: Ya no tiene modifiedInterestRate
    let eventData = {};
    if (approvedEvent) {
      eventData = {
        loanId: approvedEvent.args[0],
        lenderAddress: approvedEvent.args[1],
        askingPrice: approvedEvent.args[2].toString(),
        timestamp: approvedEvent.args[3].toString()
        // ❌ modifiedInterestRate ya no existe en el evento
      };
    }

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      askingPriceUSD: this.centsToUSD(priceInCents),
      askingPriceCents: priceInCents.toString(),
      // ℹ️ modifiedInterestRate ahora se obtiene del LoanRegistry.NoteRate
      noteRate: loan.NoteRate, // Este es el que se usa ahora
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      eventData: eventData
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ ACTUALIZADO: registerApprovalTxHash (sin privateKey param)
  // ═══════════════════════════════════════════════════════════════
  async registerApprovalTxHash(lenderUid, loanUid, txHash) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

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

  // ═══════════════════════════════════════════════════════════════
  // READ-ONLY: No requieren cambios
  // ═══════════════════════════════════════════════════════════════
  async getLoanIdByTxHash(txHash) {
    const contract = this.getContractReadOnly();
    const txHashBytes32 = txHash.startsWith('0x') ? txHash : '0x' + txHash;

    const loanId = await contract.getLoanIdByTxHash(txHashBytes32);

    if (!loanId || loanId.trim() === '') {
      throw new Error('TxHash not found in registry');
    }

    return loanId;
  }

  async getApprovalDataByTxHash(txHash) {
    const contract = this.getContractReadOnly();
    const txHashBytes32 = txHash.startsWith('0x') ? txHash : '0x' + txHash;

    const [approval, loanId] = await contract.getApprovalDataByTxHash(txHashBytes32);

    let lenderUid = '';
    let loanUid = '';
    try {
      if (this.loanRegistryService) {
        const loan = await this.loanRegistryService.readLoan(loanId);
        lenderUid = loan.LenderUid;
        loanUid = loan.LoanUid;
      }
    } catch (error) {
      console.warn('Could not get loan details:', error.message);
    }

    return {
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      isApproved: approval.isApproved,
      askingPrice: this.centsToUSD(approval.askingPrice),
      // ❌ modifiedInterestRate ya no existe en ApprovalData
      lenderAddress: approval.lenderAddress,
      approvalTimestamp: new Date(Number(approval.approvalTimestamp) * 1000),
      isMinted: approval.isMinted,
      isCancelled: approval.isCancelled,
      approvalTxHash: txHash
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ ACTUALIZADO: cancelSaleListing (sin privateKey param)
  // ═══════════════════════════════════════════════════════════════
  async cancelSaleListing(lenderUid, loanUid) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const tx = await contract.cancelSaleListing(loanId);
    const receipt = await tx.wait();

    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const cancelledEvent = logs.find(log => log.name === 'LoanApprovalCancelled');

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async getApprovalData(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    const approval = await contract.getApprovalData(loanId);

    let approvalTxHash = null;

    try {
      const registeredTxHash = await contract.getApprovalTxHash(loanId);

      // Verificar que no sea el hash vacío (0x0000...)
      if (registeredTxHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        approvalTxHash = registeredTxHash;
        console.log(`✅ TxHash obtained from contract mapping: ${approvalTxHash}`);
      } else {
        console.log(`⚠️ TxHash not registered for loanId ${loanId}`);
        console.log(`💡 Call registerApprovalTxHash() to store the txHash`);

        // ⭐ FALLBACK: Buscar en eventos solo si el mapping está vacío
        approvalTxHash = await this._findTxHashInEvents(contract, loanId);
      }
    } catch (error) {
      // Si el contrato no tiene getApprovalTxHash(), usar fallback
      console.warn(`⚠️ getApprovalTxHash() not available: ${error.message}`);
      console.log(`💡 Upgrade your contract to include getApprovalTxHash() function`);

      // FALLBACK: Buscar en eventos
      approvalTxHash = await this._findTxHashInEvents(contract, loanId);
    }

    return {
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      isApproved: approval.isApproved,
      askingPrice: this.centsToUSD(approval.askingPrice),
      lenderAddress: approval.lenderAddress,
      approvalTimestamp: new Date(Number(approval.approvalTimestamp) * 1000),
      isMinted: approval.isMinted,
      isCancelled: approval.isCancelled,
      approvalTxHash: approvalTxHash
    };
  }

  /**
   * ⭐ HELPER: Buscar txHash en eventos (fallback cuando el mapping no está disponible)
   */
  async _findTxHashInEvents(contract, loanId) {
    try {
      const currentBlock = await contract.provider.getBlockNumber();

      // Buscar primero en últimos 10k bloques (más rápido)
      let fromBlock = Math.max(0, currentBlock - 10000);

      console.log(`🔍 Searching approval events for loanId: ${loanId}`);
      console.log(`📊 Block range: ${fromBlock} to ${currentBlock}`);

      const filter = contract.filters.LoanApprovedForSale(loanId);
      let events = await contract.queryFilter(filter, fromBlock, currentBlock);

      // Si no encontró nada, ampliar a 50k bloques
      if (events.length === 0 && currentBlock > 10000) {
        console.log(`⚠️ Not found in last 10k blocks, expanding to 50k...`);
        fromBlock = Math.max(0, currentBlock - 50000);
        events = await contract.queryFilter(filter, fromBlock, currentBlock);
      }

      // Si aún no encontró nada, buscar desde genesis (puede ser lento)
      if (events.length === 0 && currentBlock > 50000) {
        console.log(`⚠️ Not found in last 50k blocks, searching from genesis...`);
        try {
          events = await contract.queryFilter(filter, 0, currentBlock);
        } catch (genesisError) {
          console.error(`❌ Genesis search failed: ${genesisError.message}`);
        }
      }

      if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        const txHash = latestEvent.transactionHash;
        console.log(`✅ Found txHash in events: ${txHash}`);
        return txHash;
      } else {
        console.warn(`❌ No approval events found for loanId ${loanId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error searching events: ${error.message}`);
      return null;
    }
  }


  async canBeMinted(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    return await contract.canBeMinted(loanId);
  }

  async isLoanApprovedForSale(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    return await contract.isLoanApprovedForSale(loanId);
  }

  async getAvalancheTokenId(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();
    const tokenId = await contract.getAvalancheTokenId(loanId);
    return tokenId.toString();
  }

  // ═══════════════════════════════════════════════════════════════
  // ⭐ ACTUALIZADO: Resto de funciones sin privateKey param
  // ═══════════════════════════════════════════════════════════════
  async setAvalancheTokenId(lenderUid, loanUid, tokenId) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const tx = await contract.setAvalancheTokenId(loanId, tokenId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      tokenId: tokenId.toString(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async recordOwnershipTransfer(lenderUid, loanUid, newOwnerAddress, salePriceUSD) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const priceInCents = this.usdToCents(salePriceUSD);

    const tx = await contract.recordOwnershipTransfer(
      loanId,
      newOwnerAddress,
      BigInt(priceInCents)
    );
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      newOwnerAddress: newOwnerAddress,
      salePriceUSD: this.centsToUSD(priceInCents),
      salePriceCents: priceInCents.toString(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async recordPayment(lenderUid, loanUid, amountUSD) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const amountInCents = this.usdToCents(amountUSD);

    const tx = await contract.recordPayment(loanId, BigInt(amountInCents));
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      amountUSD: this.centsToUSD(amountInCents),
      amountCents: amountInCents.toString(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  async markLoanAsPaidOff(lenderUid, loanUid) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const tx = await contract.markLoanAsPaidOff(loanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BURN FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  async requestBurnAndCancel(lenderUid, loanUid) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const approval = await contract.getApprovalData(loanId);

    if (!approval.isApproved) {
      throw new Error('Loan not approved for sale');
    }

    if (!approval.isMinted) {
      throw new Error('NFT not minted yet. Use cancelSaleListing instead.');
    }

    if (approval.isCancelled) {
      throw new Error('Approval already cancelled');
    }

    const tx = await contract.requestBurnAndCancel(loanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      message: 'Burn request submitted. Relayer will process the NFT burn on Avalanche.'
    };
  }

  async confirmBurnAndCancel(lenderUid, loanUid) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

    const tx = await contract.confirmBurnAndCancel(loanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: loanId,
      lenderUid: lenderUid,
      loanUid: loanUid,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      message: 'NFT burn confirmed and loan unlocked successfully.'
    };
  }

  async canCancel(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.canCancel(loanId);
      return {
        canCancelNow: result[0],
        needsBurn: result[1]
      };
    } catch (error) {
      console.error('Error in canCancel:', error);

      try {
        const approval = await this.getApprovalData(lenderUid, loanUid);

        if (!approval.isApproved || approval.isCancelled) {
          return { canCancelNow: false, needsBurn: false };
        }

        return {
          canCancelNow: true,
          needsBurn: approval.isMinted
        };
      } catch (innerError) {
        throw error;
      }
    }
  }

  async getTokenIdForLoan(lenderUid, loanUid) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    const tokenId = await contract.getAvalancheTokenId(loanId);
    return tokenId.toString();
  }

  // ═══════════════════════════════════════════════════════════════
  // AUXILIARY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  async getApprovedLoansByLender(lenderAddress) {
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.getApprovedLoansByLender(lenderAddress);
      return result;
    } catch (error) {
      console.warn('getApprovedLoansByLender not available:', error.message);

      if (!this.loanRegistryService) {
        throw new Error('LoanRegistryService not initialized');
      }

      const allLoans = await this.loanRegistryService.queryAllLoansComplete();
      const approvedLoans = [];

      for (const loan of allLoans) {
        try {
          const approval = await this.getApprovalData(loan.LenderUid, loan.LoanUid);
          if (approval.isApproved && !approval.isCancelled) {
            approvedLoans.push({
              loanId: loan.ID,
              lenderUid: loan.LenderUid,
              loanUid: loan.LoanUid,
              askingPrice: approval.askingPrice,
              isMinted: approval.isMinted
            });
          }
        } catch (err) {
          // Ignorar loans sin aprobación
        }
      }

      return approvedLoans;
    }
  }

  async getTokenizedLoans() {
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.getTokenizedLoans();
      return result;
    } catch (error) {
      console.warn('getTokenizedLoans not available:', error.message);

      if (!this.loanRegistryService) {
        throw new Error('LoanRegistryService not initialized');
      }

      const allLoans = await this.loanRegistryService.queryAllLoansComplete();
      const tokenizedLoans = [];

      for (const loan of allLoans) {
        try {
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
        } catch (err) {
          // Ignorar loans sin token
        }
      }

      return tokenizedLoans;
    }
  }

  async canLenderApproveLoan(lenderUid, loanUid, lenderAddress) {
    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.canLenderApproveLoan(loanId, lenderAddress);
      return {
        canApprove: result[0],
        reason: result[1]
      };
    } catch (error) {
      console.warn('canLenderApproveLoan not available:', error.message);

      try {
        const loan = await this._getLoanFromBlockchain(lenderUid, loanUid);

        if (loan.isLocked) {
          return { canApprove: false, reason: 'Loan already tokenized' };
        }

        const approval = await this.getApprovalData(lenderUid, loanUid);
        if (approval.isApproved) {
          return { canApprove: false, reason: 'Already approved' };
        }

        if (approval.isCancelled) {
          return { canApprove: false, reason: 'Was cancelled' };
        }

        if (loan.CurrentBalance === '0.00' || loan.CurrentBalance === 0) {
          return { canApprove: false, reason: 'Loan balance must be > 0' };
        }

        if (loan.Status === 'Paid Off') {
          return { canApprove: false, reason: 'Cannot sell paid off loan' };
        }

        return { canApprove: true, reason: '' };
      } catch (innerError) {
        return { canApprove: false, reason: 'Loan not found or error' };
      }
    }
  }

  async emergencyUnlock(lenderUid, loanUid) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

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

  async forceUnlockPaidOffLoan(lenderUid, loanUid) {
    if (!this.privateKey) {
      throw new Error('PRIVATE_KEY not configured in .env');
    }

    const loanId = await this._getLoanIdFromBlockchain(lenderUid, loanUid);
    const contract = this.getContract(this.privateKey);

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

  async getRelayerAddress() {
    const contract = this.getContractReadOnly();
    return await contract.relayerAddress();
  }
}

module.exports = new MarketplaceBridgeService();