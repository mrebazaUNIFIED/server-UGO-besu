const { ethers } = require('ethers');
const { rpcLoadBalancer, CONTRACTS, ABIs } = require('../config/blockchain');
const BaseContractService = require('./BaseContractService');
const cache = require('../config/cache');

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

// ===== HELPER: Extraer revert reason real de ethers v6 =====
function extractErrorReason(err) {
  if (err?.reason) return err.reason;
  if (err?.data && typeof err.data === 'string' && err.data.startsWith('0x')) {
    try {
      if (err.data.startsWith('0x08c379a0')) {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ['string'],
          '0x' + err.data.slice(10)
        );
        return decoded[0];
      }
    } catch (_) { }
    return err.data;
  }
  if (err?.data && typeof err.data === 'string' && err.data.startsWith('0x4e487b71')) {
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['uint256'],
        '0x' + err.data.slice(10)
      );
      return `Panic(${decoded[0].toString()})`;
    } catch (_) { }
  }
  return err?.message || String(err);
}

function logTxError(context, txHash, err) {
  const reason = extractErrorReason(err);
  console.error(`\n[TX FAILED] ─── ${context} ───────────────────────`);
  console.error(`  txHash  : ${txHash}`);
  console.error(`  reason  : ${reason}`);
  console.error(`  code    : ${err?.code ?? 'N/A'}`);
  if (err?.receipt) {
    console.error(`  block   : ${err.receipt.blockNumber}`);
    console.error(`  gasUsed : ${err.receipt.gasUsed?.toString()}`);
    console.error(`  status  : ${err.receipt.status}`);
  }
  console.error(`────────────────────────────────────────────────────\n`);
  return reason;
}

class LoanRegistryService extends BaseContractService {
  constructor() {
    super('LoanRegistry', 'LoanRegistry', 'loans');
  }

  // ===== CONVERSIÓN =====

  usdToCents(usd) {
    if (usd == null || usd === '') return 0;
    const num = Number(usd);
    if (isNaN(num)) { console.warn(`usdToCents: valor inválido → ${usd}`); return 0; }
    return Math.round(num * 100);
  }

  centsToUSD(cents) {
    if (cents == null) return "0.00";
    return (Number(cents) / 100).toFixed(2);
  }

  bpsToPercent(bps) {
    if (bps == null) return "0.00";
    return (Number(bps) / 100).toFixed(2);
  }

  percentToBps(percent) {
    if (percent == null || percent === '') return 0;
    const num = Number(percent);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  boolToString(value) { return value ? "true" : "false"; }

  stringToBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    return false;
  }

  // ===== ID =====

  async generateLoanId(lenderUid, loanUid) {
    if (!lenderUid || !loanUid) throw new Error('LenderUid and LoanUid are required');
    const hash = ethers.keccak256(ethers.toUtf8Bytes(lenderUid + loanUid));
    return hash.substring(2);
  }

  bytes32ToHex(bytes32) {
    if (!bytes32) return '';
    if (typeof bytes32 === 'string') {
      if (bytes32.match(/^[0-9a-fA-F]{64}$/)) return '0x' + bytes32.toLowerCase();
      if (bytes32.startsWith('0x')) return bytes32.toLowerCase();
      return bytes32;
    }
    try { return ethers.hexlify(bytes32).toLowerCase(); }
    catch (e) { console.warn('Error converting bytes32 to hex:', e.message); return ''; }
  }

  normalizeLoanId(loanId) {
    if (!loanId) return '';
    let idStr = loanId;
    if (typeof idStr !== 'string') {
      if (typeof idStr === 'object' || typeof idStr === 'bigint') idStr = idStr.toString();
      else idStr = String(idStr);
    }
    if (idStr.startsWith('0x')) return idStr.substring(2);
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
    txStore.set(key, { ...prev, ...patch, updatedAt: Date.now() });
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
      } catch (_) { continue; }
    }
    return {
      loanId: loanId ? this.normalizeLoanId(loanId) : null,
      txId: txId ? this.bytes32ToHex(txId) : null,
      blockNumber: receipt.blockNumber,
    };
  }

  // ===== ESCRITURA =====

  async createLoan(privateKey, loanData, options = {}) {
    const wait = options.wait !== false;
    const contract = this.getContract(privateKey);

    if (!loanData.LenderUid || !loanData.LoanUid) throw new Error('LenderUid and LoanUid are required');

    const computedLoanId = await this.generateLoanId(loanData.LenderUid, loanData.LoanUid);

    const tx = await contract.createLoan(
      loanData.LoanUid || '', loanData.Account || '', loanData.LenderUid || '',
      BigInt(this.usdToCents(loanData.OriginalBalance)),
      BigInt(this.usdToCents(loanData.CurrentBalance)),
      this.percentToBps(loanData.VendorFeePct), this.percentToBps(loanData.NoteRate),
      this.percentToBps(loanData.SoldRate), this.percentToBps(loanData.CalcInterestRate),
      loanData.CoBorrower || '', this.percentToBps(loanData.ActiveDefaultInterestRate),
      BigInt(this.usdToCents(loanData.ReserveBalanceRestricted)),
      this.percentToBps(loanData.DefaultInterestRate),
      BigInt(this.usdToCents(loanData.DeferredPrinBal)),
      BigInt(this.usdToCents(loanData.DeferredUnpaidInt)),
      BigInt(this.usdToCents(loanData.DeferredLateCharges)),
      BigInt(this.usdToCents(loanData.DeferredUnpaidCharges)),
      BigInt(this.usdToCents(loanData.MaximumDraw)),
      loanData.CloseDate || '', loanData.DrawStatus || '', loanData.LenderFundDate || '',
      this.percentToBps(loanData.LenderOwnerPct), loanData.LenderName || '',
      loanData.LenderAccount || '', loanData.IsForeclosure || false,
      loanData.Status || '', loanData.PaidOffDate || '', loanData.PaidToDate || '',
      loanData.MaturityDate || '', loanData.NextDueDate || '',
      loanData.City || '', loanData.State || '', loanData.PropertyZip || ''
    );

    this._setTx(tx.hash, {
      status: 'PENDING', createdAt: Date.now(), operation: 'CREATE_OR_UPSERT',
      loanId: this.normalizeLoanId(computedLoanId),
      lenderUid: loanData.LenderUid, loanUid: loanData.LoanUid,
    });

    if (wait) {
      let receipt;
      try { receipt = await tx.wait(); }
      catch (err) {
        const reason = logTxError('createLoan', tx.hash, err);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
        throw new Error(`createLoan failed: ${reason}`);
      }

      const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
      const finalLoanId = parsed.loanId ?? this.normalizeLoanId(computedLoanId);
      const finalStatus = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';

      // ✅ Invalidar caché al confirmar escritura
      cache.invalidate(`loan:${finalLoanId}`);
      cache.invalidate(`loan:byuids:${loanData.LenderUid}:${loanData.LoanUid}`);

      this._setTx(tx.hash, {
        status: finalStatus, txId: parsed.txId,
        receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
        loanId: finalLoanId,
      });

      return {
        success: receipt.status === 1, status: finalStatus,
        loanId: finalLoanId, lenderUid: loanData.LenderUid, loanUid: loanData.LoanUid,
        txId: parsed.txId || '', txHash: receipt.hash, blockNumber: receipt.blockNumber,
      };
    }

    // Background
    tx.wait()
      .then((receipt) => {
        const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
        const finalLoanId = parsed.loanId ?? this.normalizeLoanId(computedLoanId);

        // ✅ Invalidar caché en background también
        cache.invalidate(`loan:${finalLoanId}`);
        cache.invalidate(`loan:byuids:${loanData.LenderUid}:${loanData.LoanUid}`);

        this._setTx(tx.hash, {
          status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
          txId: parsed.txId,
          receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
          loanId: finalLoanId,
        });
      })
      .catch((err) => {
        const reason = logTxError('createLoan (background)', tx.hash, err);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
      });

    return {
      success: true, status: 'PENDING',
      loanId: this.normalizeLoanId(computedLoanId),
      lenderUid: loanData.LenderUid, loanUid: loanData.LoanUid, txHash: tx.hash,
    };
  }

  async updateLoanPartial(privateKey, loanId, fieldsToUpdate, options = {}) {
    const wait = options.wait !== false;
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const exists = await this.loanExists(normalizedLoanId);
    if (!exists) throw new Error('Loan does not exist');

    const contract = this.getContract(privateKey);

    const updateFields = {
      updateCurrentBalance: fieldsToUpdate.CurrentBalance !== undefined,
      CurrentBalance: fieldsToUpdate.CurrentBalance !== undefined ? BigInt(this.usdToCents(fieldsToUpdate.CurrentBalance)) : BigInt(0),
      updateNoteRate: fieldsToUpdate.NoteRate !== undefined,
      NoteRate: fieldsToUpdate.NoteRate !== undefined ? this.percentToBps(fieldsToUpdate.NoteRate) : 0,
      updateStatus: fieldsToUpdate.Status !== undefined,
      Status: fieldsToUpdate.Status || '',
      updateNextDueDate: fieldsToUpdate.NextDueDate !== undefined,
      NextDueDate: fieldsToUpdate.NextDueDate || '',
      updatePaidToDate: fieldsToUpdate.PaidToDate !== undefined,
      PaidToDate: fieldsToUpdate.PaidToDate || '',
      updatePaidOffDate: fieldsToUpdate.PaidOffDate !== undefined,
      PaidOffDate: fieldsToUpdate.PaidOffDate || '',
      updateDeferredUnpaidInt: fieldsToUpdate.DeferredUnpaidInt !== undefined,
      DeferredUnpaidInt: fieldsToUpdate.DeferredUnpaidInt !== undefined ? BigInt(this.usdToCents(fieldsToUpdate.DeferredUnpaidInt)) : BigInt(0),
      updateDeferredLateCharges: fieldsToUpdate.DeferredLateCharges !== undefined,
      DeferredLateCharges: fieldsToUpdate.DeferredLateCharges !== undefined ? BigInt(this.usdToCents(fieldsToUpdate.DeferredLateCharges)) : BigInt(0),
      updateDeferredUnpaidCharges: fieldsToUpdate.DeferredUnpaidCharges !== undefined,
      DeferredUnpaidCharges: fieldsToUpdate.DeferredUnpaidCharges !== undefined ? BigInt(this.usdToCents(fieldsToUpdate.DeferredUnpaidCharges)) : BigInt(0),
      updateLenderOwnerPct: fieldsToUpdate.LenderOwnerPct !== undefined,
      LenderOwnerPct: fieldsToUpdate.LenderOwnerPct !== undefined ? this.percentToBps(fieldsToUpdate.LenderOwnerPct) : 0,
      updateIsForeclosure: fieldsToUpdate.IsForeclosure !== undefined,
      IsForeclosure: fieldsToUpdate.IsForeclosure !== undefined ? this.stringToBool(fieldsToUpdate.IsForeclosure) : false,
      updateCoBorrower: fieldsToUpdate.CoBorrower !== undefined,
      CoBorrower: fieldsToUpdate.CoBorrower || '',
      updateLenderName: fieldsToUpdate.LenderName !== undefined,
      LenderName: fieldsToUpdate.LenderName || '',
      updateCity: fieldsToUpdate.City !== undefined,
      City: fieldsToUpdate.City || '',
      updateState: fieldsToUpdate.State !== undefined,
      State: fieldsToUpdate.State || '',
      updatePropertyZip: fieldsToUpdate.PropertyZip !== undefined,
      PropertyZip: fieldsToUpdate.PropertyZip || '',
    };

    const tx = await contract.updateLoanPartial(normalizedLoanId, updateFields);
    this._setTx(tx.hash, { status: 'PENDING', createdAt: Date.now(), operation: 'PARTIAL_UPDATE', loanId: normalizedLoanId });

    if (wait) {
      let receipt;
      try { receipt = await tx.wait(); }
      catch (err) {
        const reason = logTxError('updateLoanPartial', tx.hash, err);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
        throw new Error(`updateLoanPartial failed: ${reason}`);
      }

      const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
      const finalStatus = receipt.status === 1 ? 'CONFIRMED' : 'FAILED';

      // ✅ Invalidar caché
      cache.invalidate(`loan:${normalizedLoanId}`);

      this._setTx(tx.hash, {
        status: finalStatus, txId: parsed.txId,
        receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
      });

      return {
        success: receipt.status === 1, status: finalStatus,
        loanId: normalizedLoanId, txId: parsed.txId || '',
        txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString(),
      };
    }

    tx.wait()
      .then((receipt) => {
        // ✅ Invalidar caché en background
        cache.invalidate(`loan:${normalizedLoanId}`);
        const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
        this._setTx(tx.hash, {
          status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
          txId: parsed.txId,
          receipt: { txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed?.toString() },
        });
      })
      .catch((err) => {
        const reason = logTxError('updateLoanPartial (background)', tx.hash, err);
        this._setTx(tx.hash, { status: 'FAILED', error: reason });
      });

    return { success: true, status: 'PENDING', loanId: normalizedLoanId, txHash: tx.hash };
  }

  // ===== LECTURA CON CACHÉ =====

  async readLoan(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const cacheKey = `loan:${normalizedLoanId}`;

    const cached = cache.loans.get(cacheKey);
    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }

    const contract = this.getContractReadOnly();
    const loan = await contract.readLoan(normalizedLoanId, { gasLimit: 100000000 });
    const formatted = this._formatLoan(loan);

    cache.loans.set(cacheKey, formatted);
    console.log(`[cache] SET ${cacheKey}`);
    return formatted;
  }

  async readLoanByUids(lenderUid, loanUid) {
    const cacheKey = `loan:byuids:${lenderUid}:${loanUid}`;

    const cached = cache.loans.get(cacheKey);
    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }

    const contract = this.getContractReadOnly();
    const loan = await contract.getLoanByLenderAndUid(lenderUid, loanUid, { gasLimit: 100000000 });
    const formatted = this._formatLoan(loan);

    cache.loans.set(cacheKey, formatted);
    console.log(`[cache] SET ${cacheKey}`);
    return formatted;
  }

  // ===== FORMATEO =====

  _formatLoan(loan) {
    return {
      ID: loan.ID,
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

  // ===== RESTO DE LECTURA (sin caché — menos frecuentes) =====

  async findLoansByLenderUid(lenderUid) {
    const loans = await this.getContractReadOnly().findLoansByLenderUid(lenderUid, { gasLimit: 100000000 });
    return loans.map(loan => this._formatLoan(loan));
  }

  async findLoanByLoanUid(loanUid) {
    const loan = await this.getContractReadOnly().findLoanByLoanUid(loanUid, { gasLimit: 100000000 });
    return this._formatLoan(loan);
  }

  async loanExistsByLenderAndUid(lenderUid, loanUid) {
    return await this.getContractReadOnly().loanExistsByLenderAndUid(lenderUid, loanUid, { gasLimit: 100000000 });
  }

  async loanExists(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    return await this.getContractReadOnly().loanExists(normalizedLoanId, { gasLimit: 100000000 });
  }

  async loanExistsByUids(lenderUid, loanUid) {
    return await this.getContractReadOnly().loanExistsByLenderAndUid(lenderUid, loanUid, { gasLimit: 100000000 });
  }

  async countLoansByLenderUid(lenderUid) {
    const count = await this.getContractReadOnly().countLoansByLenderUid(lenderUid, { gasLimit: 100000000 });
    return Number(count);
  }

  async getLoanHistory(loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContractReadOnly();
    const result = await contract.getLoanHistoryWithChanges(normalizedLoanId, { gasLimit: 100000000 });

    const history = [];
    for (let i = 0; i < result.txIds.length; i++) {
      const changes = await contract.getActivityChanges(result.txIds[i], { gasLimit: 100000000 });
      history.push({
        TxId: this.bytes32ToHex(result.txIds[i]),
        Timestamp: new Date(Number(result.timestamps[i]) * 1000),
        IsDelete: result.isDeletes[i],
        ChangeCount: Number(result.changeCounts[i]),
        Changes: changes.map(c => ({ PropertyName: c.PropertyName, OldValue: c.OldValue, NewValue: c.NewValue }))
      });
    }
    return history;
  }

  async getLoanByTxId(txId) {
    const contract = this.getContractReadOnly();
    try {
      const result = await contract.getLoanByTxId(txId, { gasLimit: 100000000 });
      return { loan: this._formatLoan(result[0]), changes: result[1].map(c => ({ PropertyName: c.PropertyName, OldValue: c.OldValue, NewValue: c.NewValue })) };
    } catch (error) {
      if (error.message.includes('Transaction not found')) throw new Error('Transaction not found');
      if (error.message.includes('Loan state not found')) throw new Error('Loan state not found for this TxId');
      throw error;
    }
  }

  async deleteLoan(privateKey, loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContract(privateKey);
    const tx = await contract.deleteLoan(normalizedLoanId);
    const receipt = await tx.wait();

    // ✅ Invalidar caché al eliminar
    cache.invalidate(`loan:${normalizedLoanId}`);

    return { success: true, loanId: normalizedLoanId, txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  async queryAllLoans(offset = 0, limit = 50) {
    const contract = this.getContractReadOnly();
    try {
      const result = await contract.queryLoansPaginated(offset, limit, { gasLimit: 100000000 });
      return { loans: result[0].map(loan => this._formatLoan(loan)), total: Number(result[1]), returned: Number(result[2]), offset, limit };
    } catch (error) {
      console.warn('queryLoansPaginated failed, trying getAllLoanIds...', error.message);
      try {
        const loanIds = await contract.getAllLoanIds({ gasLimit: 100000000 });
        const allLoans = [];
        for (const loanId of loanIds) {
          try { allLoans.push(this._formatLoan(await contract.readLoan(loanId, { gasLimit: 100000000 }))); }
          catch (e) { console.warn(`Failed to read loan ${loanId}:`, e.message); }
        }
        const start = Math.min(offset, allLoans.length);
        const end = Math.min(offset + limit, allLoans.length);
        return { loans: allLoans.slice(start, end), total: allLoans.length, returned: allLoans.slice(start, end).length, offset, limit };
      } catch (fallbackError) {
        console.error('Both methods failed:', fallbackError.message);
        throw new Error('Failed to query loans');
      }
    }
  }

  async queryAllLoansComplete() {
    const pageSize = 50;
    let allLoans = [], offset = 0, total = 0;
    do {
      const result = await this.queryAllLoans(offset, pageSize);
      allLoans = allLoans.concat(result.loans);
      total = result.total;
      offset += pageSize;
    } while (offset < total);
    return allLoans;
  }

  async getTotalLoansCount() {
    return Number(await this.getContractReadOnly().getTotalLoansCount({ gasLimit: 100000000 }));
  }

  async getAllLoanIds() {
    return await this.getContractReadOnly().getAllLoanIds({ gasLimit: 100000000 });
  }

  async isLoanLocked(loanId) {
    return await this.getContractReadOnly().isLoanLocked(this.normalizeLoanId(loanId), { gasLimit: 100000000 });
  }

  async isLoanTokenized(loanId) {
    return await this.getContractReadOnly().isLoanTokenized(this.normalizeLoanId(loanId), { gasLimit: 100000000 });
  }

  async getAvalancheTokenId(loanId) {
    return (await this.getContractReadOnly().getAvalancheTokenId(this.normalizeLoanId(loanId), { gasLimit: 100000000 })).toString();
  }

  async getCurrentTransactionByLoan(loanId) {
    return this.bytes32ToHex(await this.getContractReadOnly().getCurrentTransactionByLoan(this.normalizeLoanId(loanId), { gasLimit: 100000000 }));
  }

  async updateLockedLoan(privateKey, loanId, newBalance, newStatus, newPaidToDate) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContract(privateKey);
    const tx = await contract.updateLockedLoan(normalizedLoanId, BigInt(this.usdToCents(newBalance)), newStatus || '', newPaidToDate || '');
    const receipt = await tx.wait();

    // ✅ Invalidar caché al actualizar loan bloqueado
    cache.invalidate(`loan:${normalizedLoanId}`);

    let txId = null;
    const logs = receipt.logs.map(log => { try { return contract.interface.parseLog(log); } catch (e) { return null; } }).filter(Boolean);
    const lockedLoanUpdatedEvent = logs.find(log => log.name === 'LockedLoanUpdated');
    if (lockedLoanUpdatedEvent) txId = lockedLoanUpdatedEvent.args.txId || lockedLoanUpdatedEvent.args[1];

    return { success: true, loanId: normalizedLoanId, txId: this.bytes32ToHex(txId), txHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
  }

  async generateLoanIdLocally(lenderUid, loanUid) {
    return this.generateLoanId(lenderUid, loanUid);
  }
}

module.exports = new LoanRegistryService();