const { ethers } = require('ethers');
const { rpcLoadBalancer, CONTRACTS, ABIs } = require('../config/blockchain');
const BaseContractService = require('./BaseContractService');

// ===== TX STORE (memoria) =====
const txStore = new Map();

// TTL 1 hora
const TX_TTL_MS = 60 * 60 * 1000;

function cleanupTxStore() {
  const now = Date.now();
  for (const [hash, data] of txStore.entries()) {
    const t = data?.updatedAt ?? data?.createdAt ?? now;
    if (now - t > TX_TTL_MS) txStore.delete(hash);
  }
}

class LoanRegistryService extends BaseContractService {
  constructor() {
    super('LoanRegistry', 'LoanRegistry');
  }

  // ===== FUNCIONES DE CONVERSIÓN =====

  /**
   * ✅ Convertir USD a centavos - Multiplica por 100
   */
  usdToCents(usd) {
    if (usd == null || usd === '') return 0;
    const num = Number(usd);
    if (isNaN(num)) {
      console.warn(`usdToCents: valor inválido → ${usd}`);
      return 0;
    }
    return Math.round(num * 100);
  }

  /**
   * ✅ Convertir centavos a USD con 2 decimales
   */
  centsToUSD(cents) {
    if (cents == null) return "0.00";
    const dollars = Number(cents) / 100;
    return dollars.toFixed(2);
  }

  /**
   * ✅ Convertir porcentaje (viene como entero, ej: 500 = 5.00%)
   */
  bpsToPercent(bps) {
    if (bps == null) return "0.00";
    const percent = Number(bps) / 100;
    return percent.toFixed(2);
  }

  /**
   * ✅ Convertir porcentaje a basis points (5.00% → 500)
   */
  percentToBps(percent) {
    if (percent == null || percent === '') return 0;
    const num = Number(percent);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  /**
   * ✅ Convertir boolean a string (true/false)
   */
  boolToString(value) {
    return value ? "true" : "false";
  }

  /**
   * ✅ Convertir string a boolean
   */
  stringToBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return false;
  }

  // ===== FUNCIONES DE GENERACIÓN DE ID =====

  /**
   * ✅ Generar LoanId localmente (para uso interno, no para el contrato)
   */
  async generateLoanId(lenderUid, loanUid) {
    if (!lenderUid || !loanUid) {
      throw new Error('LenderUid and LoanUid are required');
    }

    // Usar la misma lógica que el contrato
    const message = lenderUid + loanUid;
    const hash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Convertir a hexadecimal sin "0x" (igual que el contrato)
    return hash.substring(2); // Remover "0x"
  }

  /**
   * ✅ Convertir bytes32 a string hexadecimal
   */
  bytes32ToHex(bytes32) {
    if (!bytes32) return '';

    // Si ya es string, verificar formato
    if (typeof bytes32 === 'string') {
      // Si es hexadecimal sin "0x", agregarlo
      if (bytes32.match(/^[0-9a-fA-F]{64}$/)) {
        return '0x' + bytes32.toLowerCase();
      }
      // Si ya tiene "0x", devolverlo
      if (bytes32.startsWith('0x')) {
        return bytes32.toLowerCase();
      }
      return bytes32;
    }

    // Si es bytes32, convertirlo
    try {
      return ethers.hexlify(bytes32).toLowerCase();
    } catch (e) {
      console.warn('Error converting bytes32 to hex:', e.message);
      return '';
    }
  }

  /**
   * ✅ Normalizar loanId (asegurar formato correcto)
   */
  normalizeLoanId(loanId) {
      if (!loanId) return '';

      // Convertir a string si no lo es
      let idStr = loanId;
      if (typeof idStr !== 'string') {
        if (typeof idStr === 'object' || typeof idStr === 'bigint') {
          idStr = idStr.toString();
        } else {
          idStr = String(idStr);
        }
      }

      // Si viene con "0x", removerlo (el contrato usa sin "0x")
      if (idStr.startsWith('0x')) {
        return idStr.substring(2);
      }

      return idStr;
    }

    getTxStatus(txHash) {
    if (!txHash) return null;
    cleanupTxStore();
    return txStore.get(txHash.toLowerCase()) || null;
  }

  _setTx(txHash, patch) {
    const key = (txHash || '').toLowerCase();
    const prev = txStore.get(key) || {};
    txStore.set(key, {
      ...prev,
      ...patch,
      updatedAt: Date.now(),
    });
  }

  _parseLoanEventsFromReceipt(contract, receipt) {
    let loanId = null;
    let txId = null;

    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);

        if (parsedLog.name === 'LoanCreated' || parsedLog.name === 'LoanUpdated') {
          loanId = parsedLog.args.loanId;
          txId = parsedLog.args.txId;

          if (loanId && typeof loanId !== 'string') loanId = ethers.hexlify(loanId);
          if (txId && typeof txId !== 'string') txId = ethers.hexlify(txId);
          break;
        }
      } catch (_) {
        continue;
      }
    }

    return {
      loanId: loanId ? this.normalizeLoanId(loanId) : null,
      txId: txId ? this.bytes32ToHex(txId) : null,
      blockNumber: receipt.blockNumber,
    };
  }

  // ===== FUNCIONES PRINCIPALES =====

  /**
   * ✅ Crear un loan - Nueva estructura con ID generado automáticamente
   */
  /**
 * ✅ Crear/Upsert loan
 * options.wait=true  => espera receipt (modo antiguo)
 * options.wait=false => responde rápido y confirma en background
 */
async createLoan(privateKey, loanData, options = {}) {
  const wait = options.wait === true;
  const contract = this.getContract(privateKey);

  if (!loanData.LenderUid || !loanData.LoanUid) {
    throw new Error('LenderUid and LoanUid are required');
  }

  // LoanId determinístico (mismo algoritmo que contrato)
  const computedLoanId = await this.generateLoanId(loanData.LenderUid, loanData.LoanUid);

  const tx = await contract.createLoan(
      loanData.LoanUid || '',
      loanData.Account || '',
      loanData.LenderUid || '',
      BigInt(this.usdToCents(loanData.OriginalBalance)),
      BigInt(this.usdToCents(loanData.CurrentBalance)),
      this.percentToBps(loanData.VendorFeePct),
      this.percentToBps(loanData.NoteRate),
      this.percentToBps(loanData.SoldRate),
      this.percentToBps(loanData.CalcInterestRate),
      loanData.CoBorrower || '',
      this.percentToBps(loanData.ActiveDefaultInterestRate),
      BigInt(this.usdToCents(loanData.ReserveBalanceRestricted)),
      this.percentToBps(loanData.DefaultInterestRate),
      BigInt(this.usdToCents(loanData.DeferredPrinBal)),
      BigInt(this.usdToCents(loanData.DeferredUnpaidInt)),
      BigInt(this.usdToCents(loanData.DeferredLateCharges)),
      BigInt(this.usdToCents(loanData.DeferredUnpaidCharges)),
      BigInt(this.usdToCents(loanData.MaximumDraw)),
      loanData.CloseDate || '',
      loanData.DrawStatus || '',
      loanData.LenderFundDate || '',
      this.percentToBps(loanData.LenderOwnerPct),
      loanData.LenderName || '',
      loanData.LenderAccount || '',
      loanData.IsForeclosure || false,
      loanData.Status || '',
      loanData.PaidOffDate || '',
      loanData.PaidToDate || '',
      loanData.MaturityDate || '',
      loanData.NextDueDate || '',
      loanData.City || '',
      loanData.State || '',
      loanData.PropertyZip || ''
    );

    // Guardar PENDING inmediatamente
    this._setTx(tx.hash, {
      status: 'PENDING',
      createdAt: Date.now(),
      operation: 'CREATE_OR_UPSERT',
      loanId: this.normalizeLoanId(computedLoanId),
      lenderUid: loanData.LenderUid,
      loanUid: loanData.LoanUid,
    });

    // wait=true => devolver con receipt (modo antiguo)
    if (wait) {
      const receipt = await tx.wait();
      const parsed = this._parseLoanEventsFromReceipt(contract, receipt);

      this._setTx(tx.hash, {
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        txId: parsed.txId,
        receipt: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString?.(),
        },
        loanId: parsed.loanId ?? this.normalizeLoanId(computedLoanId),
      });

      return {
        success: true,
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        loanId: parsed.loanId ?? this.normalizeLoanId(computedLoanId),
        lenderUid: loanData.LenderUid,
        loanUid: loanData.LoanUid,
        txId: parsed.txId || '',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    }

    // Background confirm (no bloquea el request)
    tx.wait()
      .then((receipt) => {
        const parsed = this._parseLoanEventsFromReceipt(contract, receipt);

        this._setTx(tx.hash, {
          status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
          txId: parsed.txId,
          receipt: {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString?.(),
          },
          loanId: parsed.loanId ?? this.normalizeLoanId(computedLoanId),
        });
      })
      .catch((err) => {
        this._setTx(tx.hash, {
          status: 'FAILED',
          error: err?.message || String(err),
        });
      });

    // Respuesta rápida
    return {
      success: true,
      status: 'PENDING',
      loanId: this.normalizeLoanId(computedLoanId),
      lenderUid: loanData.LenderUid,
      loanUid: loanData.LoanUid,
      txHash: tx.hash
    };
  }


  /**
   * ✅ Actualización parcial de loan
   */
  async updateLoanPartial(privateKey, loanId, fieldsToUpdate, options = {}) {
  const wait = options.wait === true;

  const normalizedLoanId = this.normalizeLoanId(loanId);
  const exists = await this.loanExists(normalizedLoanId);
  if (!exists) throw new Error('Loan does not exist');

  const contract = this.getContract(privateKey);

  const updateFields = { /* <-- DEJA TU STRUCT EXACTAMENTE IGUAL (no lo cambio) */ 
      updateCurrentBalance: fieldsToUpdate.CurrentBalance !== undefined,
      CurrentBalance: fieldsToUpdate.CurrentBalance !== undefined
        ? BigInt(this.usdToCents(fieldsToUpdate.CurrentBalance))
        : BigInt(0),

      updateNoteRate: fieldsToUpdate.NoteRate !== undefined,
      NoteRate: fieldsToUpdate.NoteRate !== undefined
        ? this.percentToBps(fieldsToUpdate.NoteRate)
        : 0,

      updateStatus: fieldsToUpdate.Status !== undefined,
      Status: fieldsToUpdate.Status || '',

      updateNextDueDate: fieldsToUpdate.NextDueDate !== undefined,
      NextDueDate: fieldsToUpdate.NextDueDate || '',

      updatePaidToDate: fieldsToUpdate.PaidToDate !== undefined,
      PaidToDate: fieldsToUpdate.PaidToDate || '',

      updatePaidOffDate: fieldsToUpdate.PaidOffDate !== undefined,
      PaidOffDate: fieldsToUpdate.PaidOffDate || '',

      updateDeferredUnpaidInt: fieldsToUpdate.DeferredUnpaidInt !== undefined,
      DeferredUnpaidInt: fieldsToUpdate.DeferredUnpaidInt !== undefined
        ? BigInt(this.usdToCents(fieldsToUpdate.DeferredUnpaidInt))
        : BigInt(0),

      updateDeferredLateCharges: fieldsToUpdate.DeferredLateCharges !== undefined,
      DeferredLateCharges: fieldsToUpdate.DeferredLateCharges !== undefined
        ? BigInt(this.usdToCents(fieldsToUpdate.DeferredLateCharges))
        : BigInt(0),

      updateDeferredUnpaidCharges: fieldsToUpdate.DeferredUnpaidCharges !== undefined,
      DeferredUnpaidCharges: fieldsToUpdate.DeferredUnpaidCharges !== undefined
        ? BigInt(this.usdToCents(fieldsToUpdate.DeferredUnpaidCharges))
        : BigInt(0),

      updateLenderOwnerPct: fieldsToUpdate.LenderOwnerPct !== undefined,
      LenderOwnerPct: fieldsToUpdate.LenderOwnerPct !== undefined
        ? this.percentToBps(fieldsToUpdate.LenderOwnerPct)
        : 0,

      updateIsForeclosure: fieldsToUpdate.IsForeclosure !== undefined,
      IsForeclosure: fieldsToUpdate.IsForeclosure !== undefined
        ? this.stringToBool(fieldsToUpdate.IsForeclosure)
        : false,

      updateCoBorrower: fieldsToUpdate.CoBorrower !== undefined,
      CoBorrower: fieldsToUpdate.CoBorrower || '',

      updateLenderName: fieldsToUpdate.LenderName !== undefined,
      LenderName: fieldsToUpdate.LenderName || '',

      updateCity: fieldsToUpdate.City !== undefined,
      City: fieldsToUpdate.City || '',

      updateState: fieldsToUpdate.State !== undefined,
      State: fieldsToUpdate.State || '',

      updatePropertyZip: fieldsToUpdate.PropertyZip !== undefined,
      PropertyZip: fieldsToUpdate.PropertyZip || ''
    };

    const tx = await contract.updateLoanPartial(normalizedLoanId, updateFields);

    // Guardar PENDING
    this._setTx(tx.hash, {
      status: 'PENDING',
      createdAt: Date.now(),
      operation: 'PARTIAL_UPDATE',
      loanId: normalizedLoanId,
    });

    if (wait) {
      const receipt = await tx.wait();
      const parsed = this._parseLoanEventsFromReceipt(contract, receipt);

      this._setTx(tx.hash, {
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        txId: parsed.txId,
        receipt: {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString?.(),
        },
      });

      return {
        success: true,
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        loanId: normalizedLoanId,
        txId: parsed.txId || '',
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString?.()
      };
    }

    // Background confirm
    tx.wait()
      .then((receipt) => {
        const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
        this._setTx(tx.hash, {
          status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
          txId: parsed.txId,
          receipt: {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString?.(),
          },
        });
      })
      .catch((err) => {
        this._setTx(tx.hash, {
          status: 'FAILED',
          error: err?.message || String(err),
        });
      });

    return {
      success: true,
      status: 'PENDING',
      loanId: normalizedLoanId,
      txHash: tx.hash
    };
  }


  /**
   * ✅ Leer loan por ID
   */
  async readLoan(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();

    const loan = await contract.readLoan(normalizedLoanId, {
      gasLimit: 100000000
    });

    return this._formatLoan(loan);
  }

  /**
   * ✅ Leer loan por LenderUid + LoanUid
   */
  async readLoanByUids(lenderUid, loanUid) {
    const contract = this.getContractReadOnly();

    // Usar la función del contrato directamente
    const loan = await contract.getLoanByLenderAndUid(lenderUid, loanUid, {
      gasLimit: 100000000
    });

    return this._formatLoan(loan);
  }

  /**
   * ✅ Formatear loan (convierte de blockchain a formato legible)
   */
  _formatLoan(loan) {
    return {
      ID: loan.ID, // ✅ Ya viene como string hexadecimal del contrato
      LoanUid: loan.LoanUid,
      Account: loan.Account,
      LenderUid: loan.LenderUid,
      OriginalBalance: this.centsToUSD(loan.OriginalBalance),
      CurrentBalance: this.centsToUSD(loan.CurrentBalance),
      VendorFeePct: this.bpsToPercent(loan.VendorFeePct),
      NoteRate: this.bpsToPercent(loan.NoteRate),
      SoldRate: this.bpsToPercent(loan.SoldRate),
      CalcInterestRate: this.bpsToPercent(loan.CalcInterestRate),
      CoBorrower: loan.CoBorrower,
      ActiveDefaultInterestRate: this.bpsToPercent(loan.ActiveDefaultInterestRate),
      ReserveBalanceRestricted: this.centsToUSD(loan.ReserveBalanceRestricted),
      DefaultInterestRate: this.bpsToPercent(loan.DefaultInterestRate),
      DeferredPrinBal: this.centsToUSD(loan.DeferredPrinBal),
      DeferredUnpaidInt: this.centsToUSD(loan.DeferredUnpaidInt),
      DeferredLateCharges: this.centsToUSD(loan.DeferredLateCharges),
      DeferredUnpaidCharges: this.centsToUSD(loan.DeferredUnpaidCharges),
      MaximumDraw: this.centsToUSD(loan.MaximumDraw),
      CloseDate: loan.CloseDate,
      DrawStatus: loan.DrawStatus,
      LenderFundDate: loan.LenderFundDate,
      LenderOwnerPct: this.bpsToPercent(loan.LenderOwnerPct),
      LenderName: loan.LenderName,
      LenderAccount: loan.LenderAccount,
      IsForeclosure: loan.IsForeclosure,
      Status: loan.Status,
      PaidOffDate: loan.PaidOffDate,
      PaidToDate: loan.PaidToDate,
      MaturityDate: loan.MaturityDate,
      NextDueDate: loan.NextDueDate,
      City: loan.City,
      State: loan.State,
      PropertyZip: loan.PropertyZip,
      TxId: this.bytes32ToHex(loan.TxId),
      BLOCKAUDITCreationAt: new Date(Number(loan.BLOCKAUDITCreationAt) * 1000),
      BLOCKAUDITUpdatedAt: new Date(Number(loan.BLOCKAUDITUpdatedAt) * 1000),
      exists: loan.exists,
      isLocked: loan.isLocked,
      avalancheTokenId: loan.avalancheTokenId.toString(),
      lastSyncTimestamp: Number(loan.lastSyncTimestamp),
      isTokenized: loan.avalancheTokenId > 0
    };
  }

  /**
   * ✅ Buscar préstamos por LenderUid
   */
  async findLoansByLenderUid(lenderUid) {
    const contract = this.getContractReadOnly();
    const loans = await contract.findLoansByLenderUid(lenderUid, {
      gasLimit: 100000000
    });

    return loans.map(loan => this._formatLoan(loan));
  }

  /**
   * ✅ Buscar préstamo por LoanUid
   */
  async findLoanByLoanUid(loanUid) {
    const contract = this.getContractReadOnly();
    const loan = await contract.findLoanByLoanUid(loanUid, {
      gasLimit: 100000000
    });
    return this._formatLoan(loan);
  }

  /**
   * ✅ Verificar existencia de loan por LenderUid + LoanUid
   */
  async loanExistsByLenderAndUid(lenderUid, loanUid) {
    const contract = this.getContractReadOnly();
    return await contract.loanExistsByLenderAndUid(lenderUid, loanUid, {
      gasLimit: 100000000
    });
  }

  /**
   * ✅ Verificar existencia de loan por ID
   */
  async loanExists(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    return await contract.loanExists(normalizedLoanId, {
      gasLimit: 100000000
    });
  }

  /**
   * ✅ Verificar existencia de loan por LenderUid + LoanUid
   */
  async loanExistsByUids(lenderUid, loanUid) {
    const contract = this.getContractReadOnly();
    return await contract.loanExistsByLenderAndUid(lenderUid, loanUid, {
      gasLimit: 100000000
    });
  }

  /**
   * ✅ Contar préstamos por LenderUid
   */
  async countLoansByLenderUid(lenderUid) {
    const contract = this.getContractReadOnly();
    const count = await contract.countLoansByLenderUid(lenderUid, {
      gasLimit: 100000000
    });
    return Number(count);
  }

  /**
   * ✅ Obtener historial de loan con cambios
   */
  async getLoanHistory(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    const result = await contract.getLoanHistoryWithChanges(normalizedLoanId, {
      gasLimit: 100000000
    });

    const history = [];
    for (let i = 0; i < result.txIds.length; i++) {
      const changes = await contract.getActivityChanges(result.txIds[i], {
        gasLimit: 100000000
      });

      history.push({
        TxId: this.bytes32ToHex(result.txIds[i]),
        Timestamp: new Date(Number(result.timestamps[i]) * 1000),
        IsDelete: result.isDeletes[i],
        ChangeCount: Number(result.changeCounts[i]),
        Changes: changes.map(c => ({
          PropertyName: c.PropertyName,
          OldValue: c.OldValue,
          NewValue: c.NewValue
        }))
      });
    }

    return history;
  }

  /**
   * ✅ Obtener loan por TxId
   */
  async getLoanByTxId(txId) {
    const contract = this.getContractReadOnly();

    try {
      const result = await contract.getLoanByTxId(txId, {
        gasLimit: 100000000
      });

      const loan = result[0];
      const changes = result[1];

      return {
        loan: this._formatLoan(loan),
        changes: changes.map(c => ({
          PropertyName: c.PropertyName,
          OldValue: c.OldValue,
          NewValue: c.NewValue
        }))
      };
    } catch (error) {
      if (error.message.includes('Transaction not found')) {
        throw new Error('Transaction not found');
      }
      if (error.message.includes('Loan state not found')) {
        throw new Error('Loan state not found for this TxId');
      }
      throw error;
    }
  }

  /**
   * ✅ Eliminar loan
   */
  async deleteLoan(privateKey, loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContract(privateKey);
    const tx = await contract.deleteLoan(normalizedLoanId);
    const receipt = await tx.wait();

    return {
      success: true,
      loanId: normalizedLoanId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * ✅ Query loans paginado
   */
  async queryAllLoans(offset = 0, limit = 50) {
    const contract = this.getContractReadOnly();

    try {
      // ✅ CORRECTO: Usar queryLoansPaginated del contrato
      const result = await contract.queryLoansPaginated(offset, limit, {
        gasLimit: 100000000
      });

      const loans = result[0].map(loan => this._formatLoan(loan));

      return {
        loans: loans,
        total: Number(result[1]),
        returned: Number(result[2]),
        offset: offset,
        limit: limit
      };

    } catch (error) {
      console.warn('queryLoansPaginated failed, trying getAllLoanIds...', error.message);

      // Fallback: usar getAllLoanIds y luego leer cada loan
      try {
        const loanIds = await contract.getAllLoanIds({
          gasLimit: 100000000
        });

        const allLoans = [];
        for (const loanId of loanIds) {
          try {
            const loan = await contract.readLoan(loanId, { gasLimit: 100000000 });
            allLoans.push(this._formatLoan(loan));
          } catch (e) {
            console.warn(`Failed to read loan ${loanId}:`, e.message);
          }
        }

        // Paginación manual
        const start = Math.min(offset, allLoans.length);
        const end = Math.min(offset + limit, allLoans.length);
        const paginatedLoans = allLoans.slice(start, end);

        return {
          loans: paginatedLoans,
          total: allLoans.length,
          returned: paginatedLoans.length,
          offset: offset,
          limit: limit
        };

      } catch (fallbackError) {
        console.error('Both methods failed:', fallbackError.message);
        throw new Error('Failed to query loans');
      }
    }
  }

  /**
   * ✅ Obtener todos los loans (sin paginación)
   */
  async queryAllLoansComplete() {
    const pageSize = 50;
    let allLoans = [];
    let offset = 0;
    let total = 0;

    do {
      const result = await this.queryAllLoans(offset, pageSize);
      allLoans = allLoans.concat(result.loans);
      total = result.total;
      offset += pageSize;
    } while (offset < total);

    return allLoans;
  }

  /**
   * ✅ Obtener conteo total de loans
   */
  async getTotalLoansCount() {
    const contract = this.getContractReadOnly();
    const count = await contract.getTotalLoansCount({
      gasLimit: 100000000
    });
    return Number(count);
  }

  /**
   * ✅ Obtener todos los IDs de loans
   */
  async getAllLoanIds() {
    const contract = this.getContractReadOnly();
    const loanIds = await contract.getAllLoanIds({
      gasLimit: 100000000
    });
    return loanIds;
  }

  /**
   * ✅ Verificar si loan está bloqueado
   */
  async isLoanLocked(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    return await contract.isLoanLocked(normalizedLoanId, {
      gasLimit: 100000000
    });
  }

  /**
   * ✅ Verificar si loan está tokenizado
   */
  async isLoanTokenized(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    return await contract.isLoanTokenized(normalizedLoanId, {
      gasLimit: 100000000
    });
  }

  /**
   * ✅ Obtener token ID de Avalanche
   */
  async getAvalancheTokenId(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    const tokenId = await contract.getAvalancheTokenId(normalizedLoanId, {
      gasLimit: 100000000
    });
    return tokenId.toString();
  }

  /**
   * ✅ Obtener transacción actual de un loan
   */
  async getCurrentTransactionByLoan(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    const txId = await contract.getCurrentTransactionByLoan(normalizedLoanId, {
      gasLimit: 100000000
    });
    return this.bytes32ToHex(txId);
  }

  /**
   * ✅ Actualizar loan bloqueado (para loans tokenizados)
   */
  async updateLockedLoan(privateKey, loanId, newBalance, newStatus, newPaidToDate) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContract(privateKey);

    const tx = await contract.updateLockedLoan(
      normalizedLoanId,
      BigInt(this.usdToCents(newBalance)),
      newStatus || '',
      newPaidToDate || ''
    );

    const receipt = await tx.wait();

    // Extraer eventos
    let txId = null;
    const logs = receipt.logs.map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    }).filter(log => log !== null);

    const lockedLoanUpdatedEvent = logs.find(log => log.name === 'LockedLoanUpdated');
    if (lockedLoanUpdatedEvent) {
      txId = lockedLoanUpdatedEvent.args.txId || lockedLoanUpdatedEvent.args[1];
    }

    return {
      success: true,
      loanId: normalizedLoanId,
      txId: this.bytes32ToHex(txId),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * ✅ Generar ID localmente (solo para verificación, no para el contrato)
   */
  async generateLoanIdLocally(lenderUid, loanUid) {
    // Solo para uso interno/debug, no para interactuar con el contrato
    return this.generateLoanId(lenderUid, loanUid);
  }
}

module.exports = new LoanRegistryService();