const { ethers } = require('ethers');
const { CONTRACTS, ABIs, globalTxQueue } = require('../config/blockchain');
const BaseContractService = require('./BaseContractService');
const cache = require('../config/cache');

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

// ===== HELPER: Extraer revert reason real de ethers v6 =====
function extractErrorReason(err) {
  if (err?.error?.message) {
    if (err.error.message.includes('Known transaction')) return 'Known transaction (already in pool)';
    return err.error.message;
  }

  if (err?.code === 'ECONNRESET' || err?.message?.includes('socket hang up')) {
    return 'Network Error: Connection Reset by Peer (Besu node busy?)';
  }

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

  if (err?.shortMessage) return err.shortMessage;

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
    try {
      return ethers.hexlify(bytes32).toLowerCase();
    } catch (e) {
      console.warn('Error converting bytes32 to hex:', e.message);
      return String(bytes32);
    }
  }

  normalizeLoanId(loanId) {
    if (!loanId) return '';
    let idStr = loanId;

    if (typeof idStr === 'object' && idStr !== null) {
      try {
        if (idStr._isIndexed && idStr.hash) {
          idStr = idStr.hash;
        } else if (Array.isArray(idStr) && idStr.length > 0) {
          idStr = idStr[0];
        } else {
          idStr = ethers.hexlify(idStr);
        }
      } catch (_) {
        idStr = String(idStr);
      }
    }

    if (typeof idStr !== 'string') {
      idStr = String(idStr);
    }

    if (idStr === '[object Object]') {
      console.warn('⚠️  Critical Warning: loanId normalization failed. Source was:', typeof loanId, loanId);
      if (loanId && typeof loanId === 'object' && loanId.LoanUid) {
        return this.normalizeLoanId(loanId.LoanUid);
      }
      return 'unknown_id_' + Date.now();
    }

    if (idStr.startsWith('0x')) return idStr.substring(2);
    return idStr;
  }

  getTxStatus(txHash) {
    if (!txHash) return null;
    cleanupTxStore();
    return txStore.get(txHash.toLowerCase()) || null;
  }

  getTxSummary() {
    cleanupTxStore();
    const summary = {
      total: txStore.size,
      pending: 0,
      confirmed: 0,
      failed: 0,
      byOperation: {}
    };

    for (const tx of txStore.values()) {
      const status = (tx.status || 'UNKNOWN').toLowerCase();
      if (status === 'pending') summary.pending++;
      else if (status === 'confirmed') summary.confirmed++;
      else if (status === 'failed') summary.failed++;

      const op = tx.operation || 'other';
      summary.byOperation[op] = (summary.byOperation[op] || 0) + 1;
    }

    return summary;
  }

  _setTx(txHash, patch) {
    const key = (txHash || '').toLowerCase();
    const prev = txStore.get(key) || {};
    txStore.set(key, { ...prev, ...patch, updatedAt: Date.now() });
  }

  _parseLoanEventsFromReceipt(contract, receipt) {
    let txId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog.name === 'LoanCreated' || parsedLog.name === 'LoanUpdated') {
          txId = parsedLog.args.txId;
          if (txId && typeof txId !== 'string') txId = ethers.hexlify(txId);
          break;
        }
      } catch (_) { continue; }
    }
    return {
      loanId: null, // Note: log.args.loanId is a keccak256 hash because 'string indexed' was used in the event, DO NOT extract it.
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

    const loanInput = {
      LoanUid: loanData.LoanUid || '',
      Account: loanData.Account || '',
      LenderUid: loanData.LenderUid || '',
      OriginalBalance: BigInt(this.usdToCents(loanData.OriginalBalance)),
      CurrentBalance: BigInt(this.usdToCents(loanData.CurrentBalance)),
      VendorFeePct: this.percentToBps(loanData.VendorFeePct),
      NoteRate: this.percentToBps(loanData.NoteRate),
      SoldRate: this.percentToBps(loanData.SoldRate),
      CalcInterestRate: this.percentToBps(loanData.CalcInterestRate),
      CoBorrower: loanData.CoBorrower || '',
      ActiveDefaultInterestRate: this.percentToBps(loanData.ActiveDefaultInterestRate),
      ReserveBalanceRestricted: BigInt(this.usdToCents(loanData.ReserveBalanceRestricted)),
      DefaultInterestRate: this.percentToBps(loanData.DefaultInterestRate),
      DeferredPrinBal: BigInt(this.usdToCents(loanData.DeferredPrinBal)),
      DeferredUnpaidInt: BigInt(this.usdToCents(loanData.DeferredUnpaidInt)),
      DeferredLateCharges: BigInt(this.usdToCents(loanData.DeferredLateCharges)),
      DeferredUnpaidCharges: BigInt(this.usdToCents(loanData.DeferredUnpaidCharges)),
      MaximumDraw: BigInt(this.usdToCents(loanData.MaximumDraw)),
      CloseDate: loanData.CloseDate || '',
      DrawStatus: loanData.DrawStatus || '',
      LenderFundDate: loanData.LenderFundDate || '',
      LenderOwnerPct: this.percentToBps(loanData.LenderOwnerPct),
      LenderName: loanData.LenderName || '',
      LenderAccount: loanData.LenderAccount || '',
      IsForeclosure: loanData.IsForeclosure || false,
      Status: loanData.Status || '',
      PaidOffDate: loanData.PaidOffDate || '',
      PaidToDate: loanData.PaidToDate || '',
      MaturityDate: loanData.MaturityDate || '',
      NextDueDate: loanData.NextDueDate || '',
      City: loanData.City || '',
      State: loanData.State || '',
      PropertyZip: loanData.PropertyZip || '',
      LienPosition: loanData.LienPosition || 0,
      NoteStatus: loanData.NoteStatus || '',
      NoteType: loanData.NoteType || 0,
      NumPaymentsLas12Months: loanData.NumPaymentsLas12Months || '',
      PropertyType: loanData.PropertyType || 0,
      CurrentMarketValue: BigInt(this.usdToCents(loanData.CurrentMarketValue)),
      PaymentImpound: BigInt(this.usdToCents(loanData.PaymentImpound)),
      TotalInTrust: BigInt(this.usdToCents(loanData.TotalInTrust)),
      BalloonPymnt: loanData.BalloonPymnt || '',
      OnForbereance: loanData.OnForbereance || '',
      AmortizationType: loanData.AmortizationType || 0,
      PrepymntPenalty: loanData.PrepymntPenalty || '',
      FCModifiedTerms: loanData.FCModifiedTerms || '',
      LateCharges: BigInt(this.usdToCents(loanData.LateCharges)),
      RateType: loanData.RateType || 0,
      ApplyMERS: loanData.ApplyMERS || '',
      IsBankruptcy: loanData.IsBankruptcy || false,
      FirstPaymentDate: loanData.FirstPaymentDate || '',
      LastPaymentDate: loanData.LastPaymentDate || '',
      BkDischargeDate: loanData.BkDischargeDate || '',
      BkChapter: loanData.BkChapter || '',
      BkDismissalDate: loanData.BkDismissalDate || '',
      BkFillingDate: loanData.BkFillingDate || '',
      Ltv: this.percentToBps(loanData.Ltv),
      PCounty: loanData.PCounty || '',
      PValuationDate: loanData.PValuationDate || '',
      PCity: loanData.PCity || '',
      Address: loanData.Address || '',
    };

    // ✅ FIX: serializar solo el submit de la tx para evitar nonce race condition
    const tx = await globalTxQueue.enqueue(
      () => contract.createLoan(loanInput),
      `createLoan:${loanData.LoanUid}`
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

    // Background: wait=false — el poller corre libre sin bloquear
    tx.wait()
      .then((receipt) => {
        const parsed = this._parseLoanEventsFromReceipt(contract, receipt);
        const finalLoanId = parsed.loanId ?? this.normalizeLoanId(computedLoanId);

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
      updateLienPosition: fieldsToUpdate.LienPosition !== undefined,
      LienPosition: fieldsToUpdate.LienPosition || 0,
      updateNoteStatus: fieldsToUpdate.NoteStatus !== undefined,
      NoteStatus: fieldsToUpdate.NoteStatus || '',
      updateCurrentMarketValue: fieldsToUpdate.CurrentMarketValue !== undefined,
      CurrentMarketValue: fieldsToUpdate.CurrentMarketValue !== undefined ? BigInt(this.usdToCents(fieldsToUpdate.CurrentMarketValue)) : BigInt(0),
      updateIsBankruptcy: fieldsToUpdate.IsBankruptcy !== undefined,
      IsBankruptcy: fieldsToUpdate.IsBankruptcy !== undefined ? this.stringToBool(fieldsToUpdate.IsBankruptcy) : false,
      updateLtv: fieldsToUpdate.Ltv !== undefined,
      Ltv: fieldsToUpdate.Ltv !== undefined ? this.percentToBps(fieldsToUpdate.Ltv) : 0,
      updateAddress: fieldsToUpdate.Address !== undefined,
      Address: fieldsToUpdate.Address || '',
    };

    // ✅ FIX: serializar solo el submit de la tx para evitar nonce race condition
    const tx = await globalTxQueue.enqueue(
      () => contract.updateLoanPartial(normalizedLoanId, updateFields),
      `updateLoanPartial:${normalizedLoanId}`
    );

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

    // Background: wait=false
    tx.wait()
      .then((receipt) => {
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
    if (cached) return cached;
    const contract = this.getContractReadOnly();
    const loan = await contract.readLoan(normalizedLoanId, { gasLimit: 100000000 });
    const formatted = this._formatLoan(loan);
    cache.loans.set(cacheKey, formatted);
    return formatted;
  }

  async readLoanByUids(lenderUid, loanUid) {
    const cacheKey = `loan:byuids:${lenderUid}:${loanUid}`;
    const cached = cache.loans.get(cacheKey);
    if (cached) return cached;
    const contract = this.getContractReadOnly();
    const loan = await contract.getLoanByLenderAndUid(lenderUid, loanUid, { gasLimit: 100000000 });
    const formatted = this._formatLoan(loan);
    cache.loans.set(cacheKey, formatted);
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
      isTokenized: loan.avalancheTokenId > 0,
      LienPosition: Number(loan.LienPosition),
      NoteStatus: loan.NoteStatus,
      NoteType: Number(loan.NoteType),
      NumPaymentsLas12Months: loan.NumPaymentsLas12Months,
      PropertyType: Number(loan.PropertyType),
      CurrentMarketValue: this.centsToUSD(loan.CurrentMarketValue),
      PaymentImpound: this.centsToUSD(loan.PaymentImpound),
      TotalInTrust: this.centsToUSD(loan.TotalInTrust),
      BalloonPymnt: loan.BalloonPymnt,
      OnForbereance: loan.OnForbereance,
      AmortizationType: Number(loan.AmortizationType),
      PrepymntPenalty: loan.PrepymntPenalty,
      FCModifiedTerms: loan.FCModifiedTerms,
      LateCharges: this.centsToUSD(loan.LateCharges),
      RateType: Number(loan.RateType),
      ApplyMERS: loan.ApplyMERS,
      IsBankruptcy: loan.IsBankruptcy,
      FirstPaymentDate: loan.FirstPaymentDate,
      LastPaymentDate: loan.LastPaymentDate,
      BkDischargeDate: loan.BkDischargeDate,
      BkChapter: loan.BkChapter,
      BkDismissalDate: loan.BkDismissalDate,
      BkFillingDate: loan.BkFillingDate,
      Ltv: this.bpsToPercent(loan.Ltv),
      PCounty: loan.PCounty,
      PValuationDate: loan.PValuationDate,
      PCity: loan.PCity,
      Address: loan.Address,
    };
  }

  // ===== LECTURA (sin caché) =====

  async findLoansByLenderUid(lenderUid) {
    const cacheKey = `lender:loans:${lenderUid}`;
    const cached = cache.loans.get(cacheKey);
    if (cached) return cached;
    console.log(`[cache] MISS ${cacheKey}`);
    const loans = await this.getContractReadOnly().findLoansByLenderUid(lenderUid, { gasLimit: 100000000 });
    const formatted = loans.map(loan => this._formatLoan(loan));
    if (formatted.length > 0) cache.loans.set(cacheKey, formatted);
    return formatted;
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

    const [created, updated, deleted] = await Promise.all([
      contract.queryFilter(contract.filters.LoanCreated(normalizedLoanId)),
      contract.queryFilter(contract.filters.LoanUpdated(normalizedLoanId)),
      contract.queryFilter(contract.filters.LoanDeleted(normalizedLoanId)),
    ]);

    const all = [...created, ...updated, ...deleted]
      .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

    const historyParsed = await Promise.all(all.map(async (log) => {
      let inputData = null;
      let methodName = null;
      let timestamp = log.args.timestamp != null ? new Date(Number(log.args.timestamp) * 1000) : null;

      try {
        if (!timestamp) {
           const block = await log.getBlock();
           timestamp = new Date(Number(block.timestamp) * 1000);
        }

        const tx = await log.getTransaction();
        if (tx && tx.data && tx.data !== '0x') {
          const decoded = contract.interface.parseTransaction(tx);
          if (decoded) {
            methodName = decoded.name;
            
            const resultToObject = (result) => {
              if (typeof result !== 'object' || result === null) return result;
              const obj = {};
              for (const key of Object.keys(result)) {
                if (isNaN(key)) {
                  let val = result[key];
                  if (typeof val === 'bigint') {
                    val = val.toString();
                  } else if (typeof val === 'object' && val !== null) {
                      if (val.constructor && val.constructor.name === 'Result') {
                          val = resultToObject(val);
                      } else if (Array.isArray(val)) {
                          val = val.map(v => typeof v === 'object' && v !== null && v.constructor && v.constructor.name === 'Result' ? resultToObject(v) : v);
                      }
                  }
                  obj[key] = val;
                }
              }
              return obj;
            };

            inputData = resultToObject(decoded.args);
          }
        }
      } catch (e) {
        console.warn(`Could not parse tx data for Hash ${log.transactionHash}:`, e.message);
      }

      return {
        event: log.fragment.name,
        txHash: log.transactionHash,
        txId: this.bytes32ToHex(log.args.txId),
        blockNumber: log.blockNumber,
        timestamp: timestamp,
        methodName,
        inputData
      };
    }));

    return historyParsed;
  }

  async getLoanByTxId(txId) {
    const contract = this.getContractReadOnly();
    const txIdNormalized = (txId.startsWith('0x') ? txId : '0x' + txId).toLowerCase();

    // 1. Obtener el loanId real (string) del contrato porque log.args.loanId es un hash keccak256
    let loanId;
    try {
      loanId = await contract.getLoanIdByTxId(txIdNormalized, { gasLimit: 100000000 });
    } catch (err) {
      console.warn('getLoanIdByTxId fail (contract not upgraded?):', err.message);
    }
    
    if (!loanId) {
      throw new Error('Transaction not found (or contract not upgraded to support getLoanIdByTxId)');
    }

    // 2. Traer el evento específico para tener txHash, blockNumber y event
    const [allCreated, allUpdated, allDeleted] = await Promise.all([
      contract.queryFilter(contract.filters.LoanCreated()),
      contract.queryFilter(contract.filters.LoanUpdated()),
      contract.queryFilter(contract.filters.LoanDeleted()),
    ]);

    const log = [...allCreated, ...allUpdated, ...allDeleted].find(l => {
      const logTxId = l.args.txId
        ? (typeof l.args.txId === 'string' ? l.args.txId : ethers.hexlify(l.args.txId)).toLowerCase()
        : null;
      return logTxId === txIdNormalized;
    });

    if (!log) throw new Error('Transaction event not found in logs');

    let loan = null;
    const eventName = log.fragment.name;

    // 3. Obtener el estado actual del préstamo (excepto si fue borrado)
    if (eventName !== 'LoanDeleted') {
      try {
        loan = await this.readLoan(loanId);
      } catch (err) {
        if (!err.message.includes('LoanNotFound')) throw err;
      }
    }

    return {
      loan,
      txHash: log.transactionHash,
      txId: this.bytes32ToHex(log.args.txId),
      blockNumber: log.blockNumber,
      event: eventName,
    };
  }

  async deleteLoan(privateKey, loanId) {
    const normalizedLoanId = this.normalizeLoanId(loanId);
    const contract = this.getContract(privateKey);
    const tx = await contract.deleteLoan(normalizedLoanId);
    const receipt = await tx.wait();
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