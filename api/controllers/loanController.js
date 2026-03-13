const loanService = require('../services/LoanRegistryService');
const cache = require('../config/cache');

function normalizeLoanKeys(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const map = {
    lenderuid: "LenderUid", loanuid: "LoanUid", originalbalance: "OriginalBalance",
    currentbalance: "CurrentBalance", status: "Status", noterate: "NoteRate",
    soldrate: "SoldRate", calcinterestrate: "CalcInterestRate", coborrower: "CoBorrower",
    activedefaultinterestrate: "ActiveDefaultInterestRate", deferredunpaidint: "DeferredUnpaidInt",
    deferredlatecharges: "DeferredLateCharges", deferredunpaidcharges: "DeferredUnpaidCharges",
    lenderownerpct: "LenderOwnerPct", lendername: "LenderName", city: "City", state: "State",
    propertyzip: "PropertyZip", account: "Account", maximumdraw: "MaximumDraw",
    closedate: "CloseDate", drawstatus: "DrawStatus", lenderfunddate: "LenderFundDate",
    isforeclosure: "IsForeclosure"
  };
  const normalized = {};
  for (const key of Object.keys(obj)) {
    const canonical = map[key.toLowerCase()] || key;
    normalized[canonical] = obj[key];
  }
  return normalized;
}

function getPrivateKey() {
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error('PRIVATE_KEY not configured in environment variables');
  privateKey = privateKey.trim();
  if (privateKey.length === 0) throw new Error('PRIVATE_KEY is empty after trimming whitespace');
  if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;
  if (privateKey.length !== 66) throw new Error(`PRIVATE_KEY has invalid length: ${privateKey.length} (expected 66 characters with 0x prefix)`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error('PRIVATE_KEY is not a valid hexadecimal string');
  return privateKey;
}

function resolveWait(query) {
  return query.wait !== 'false';
}

class LoanController {

  async createLoan(req, res, next) {
    try {
      const privateKey = getPrivateKey();
      const rawLoanData = req.body?.loanData ?? req.body;
      const loanData = normalizeLoanKeys(rawLoanData);
      const wait = resolveWait(req.query);
      const isMissing = (v) => v === undefined || v === null || v === "";

      console.log("========== POST /loans ==========");
      console.log("wait:", wait, "| LenderUid:", loanData.LenderUid, "| LoanUid:", loanData.LoanUid);
      console.log("=================================");

      if (!loanData?.LenderUid || !loanData?.LoanUid) {
        return res.status(400).json({ error: 'Invalid loan data. Required: LenderUid and LoanUid' });
      }

      const loanId = await loanService.generateLoanId(loanData.LenderUid, loanData.LoanUid);
      const loanExists = await loanService.loanExists(loanId);

      if (!loanExists) {
        const requiredFields = ['LenderUid', 'LoanUid', 'OriginalBalance', 'CurrentBalance', 'Status'];
        const missingFields = requiredFields.filter((field) => isMissing(loanData[field]));
        if (missingFields.length > 0) {
          return res.status(400).json({ error: `Missing required fields for new loan: ${missingFields.join(', ')}` });
        }
        const result = await loanService.createLoan(privateKey, loanData, { wait });

        // ✅ Invalidar cache del lender al crear un loan nuevo
        cache.loans.del(`lender:loans:${loanData.LenderUid}`);

        return res.status(201).json({ success: true, message: 'Loan created successfully', operation: 'CREATE', data: result });
      }

      const providedFields = Object.keys(loanData).filter(key => key !== 'LenderUid' && key !== 'LoanUid');

      if (providedFields.length <= 10) {
        console.log(`📝 Detected PARTIAL update: ${providedFields.length} fields provided`);
        const supportedPartialFields = [
          'CurrentBalance', 'NoteRate', 'Status', 'NextDueDate', 'PaidToDate',
          'PaidOffDate', 'DeferredUnpaidInt', 'DeferredLateCharges', 'DeferredUnpaidCharges',
          'LenderOwnerPct', 'IsForeclosure', 'CoBorrower', 'LenderName', 'City', 'State', 'PropertyZip'
        ];
        const partialUpdateFields = {};
        supportedPartialFields.forEach(field => { if (loanData[field] !== undefined) partialUpdateFields[field] = loanData[field]; });
        if (Object.keys(partialUpdateFields).length === 0) {
          return res.status(400).json({ error: 'No valid fields to update', hint: 'Provide at least one of: ' + supportedPartialFields.join(', ') });
        }
        const result = await loanService.updateLoanPartial(privateKey, loanId, partialUpdateFields, { wait });

        // ✅ Invalidar cache del lender y del loan individual al actualizar
        cache.loans.del(`lender:loans:${loanData.LenderUid}`);
        cache.loans.del(`loan:${loanId}`);

        return res.json({ success: true, message: 'Loan updated partially', operation: 'PARTIAL_UPDATE', loanId, lenderUid: loanData.LenderUid, loanUid: loanData.LoanUid, updatedFields: Object.keys(partialUpdateFields), data: result });
      }

      console.log(`📝 Detected FULL update: ${providedFields.length} fields provided`);
      const result = await loanService.createLoan(privateKey, loanData, { wait });

      // ✅ Invalidar cache del lender al hacer full update
      cache.loans.del(`lender:loans:${loanData.LenderUid}`);
      cache.loans.del(`loan:${loanId}`);

      return res.json({ success: true, message: 'Loan updated completely', operation: 'FULL_UPDATE', loanId, lenderUid: loanData.LenderUid, loanUid: loanData.LoanUid, data: result });

    } catch (error) {
      console.error('Error in createLoan:', error);
      if (error.message.includes('PRIVATE_KEY')) return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      if (error.message.includes('required')) return res.status(400).json({ error: error.message });
      if (error.message.includes('Cannot update locked loan')) return res.status(400).json({ error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.' });
      if (error.message.includes('createLoan failed:') || error.message.includes('updateLoanPartial failed:') || error.message.includes('revert')) return res.status(400).json({ error: 'Blockchain transaction failed', details: error.message });
      next(error);
    }
  }

  async updateLoanPartial(req, res, next) {
    try {
      const { loanId } = req.params;
      const { fields } = req.body;
      const privateKey = getPrivateKey();
      const wait = resolveWait(req.query);
      if (!fields || Object.keys(fields).length === 0) return res.status(400).json({ error: 'No fields to update provided' });
      const result = await loanService.updateLoanPartial(privateKey, loanId, fields, { wait });

      // ✅ Invalidar cache del loan individual
      cache.loans.del(`loan:${loanId}`);

      res.json({ success: true, message: 'Loan updated partially', loanId, updatedFields: Object.keys(fields), data: result });
    } catch (error) {
      console.error('Error in updateLoanPartial:', error);
      if (error.message.includes('PRIVATE_KEY')) return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      if (error.message.includes('does not exist')) return res.status(404).json({ error: 'Loan not found' });
      if (error.message.includes('Cannot update locked loan')) return res.status(400).json({ error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.' });
      if (error.message.includes('updateLoanPartial failed:') || error.message.includes('revert')) return res.status(400).json({ error: 'Blockchain transaction failed', details: error.message });
      next(error);
    }
  }

  async updateLockedLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const { newBalance, newStatus, newPaidToDate } = req.body;
      const privateKey = getPrivateKey();
      if (newBalance === undefined && !newStatus && !newPaidToDate) return res.status(400).json({ error: 'Provide at least one field to update: newBalance, newStatus, or newPaidToDate' });
      const result = await loanService.updateLockedLoan(privateKey, loanId, newBalance, newStatus, newPaidToDate);

      // ✅ Invalidar cache del loan bloqueado
      cache.loans.del(`loan:${loanId}`);

      res.json({ success: true, message: 'Locked loan updated successfully', loanId, data: result });
    } catch (error) {
      console.error('Error in updateLockedLoan:', error);
      if (error.message.includes('PRIVATE_KEY')) return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      if (error.message.includes('does not exist')) return res.status(404).json({ error: 'Loan not found' });
      if (error.message.includes('Only for locked loans')) return res.status(400).json({ error: 'Loan is not locked/tokenized' });
      if (error.message.includes('NFT not minted yet')) return res.status(400).json({ error: 'Loan token not minted yet' });
      next(error);
    }
  }

  async getLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const loan = await loanService.readLoan(loanId); // ✅ cache en service
      res.json({ success: true, data: loan });
    } catch (error) {
      if (error.message.includes('does not exist')) return res.status(404).json({ error: 'Loan not found' });
      next(error);
    }
  }

  async getLoanByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      const loanId = await loanService.generateLoanId(lenderUid, loanUid);
      const loan = await loanService.readLoan(loanId); // ✅ cache en service
      res.json({ success: true, loanId, lenderUid, loanUid, data: loan });
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.warn(`⚠️ Loan not in blockchain: ${req.params.lenderUid}/${req.params.loanUid}`);
        return res.status(404).json({ error: 'Loan not found', inBlockchain: false });
      }
      console.error('Error in getLoanByUids:', error);
      next(error);
    }
  }

  async getLoansByLenderUid(req, res, next) {
    try {
      const { lenderUid } = req.params;
      // ✅ cache ya está en findLoansByLenderUid del service — no duplicar aquí
      const loans = await loanService.findLoansByLenderUid(lenderUid);
      res.json({ success: true, count: loans.length, lenderUid, data: loans });
    } catch (error) {
      console.error('Error in getLoansByLenderUid:', error);
      next(error);
    }
  }

  async countLoansByLenderUid(req, res, next) {
    try {
      const { lenderUid } = req.params;
      const count = await loanService.countLoansByLenderUid(lenderUid);
      res.json({ success: true, lenderUid, count });
    } catch (error) {
      console.error('Error in countLoansByLenderUid:', error);
      next(error);
    }
  }

  async getLoanByLoanUid(req, res, next) {
    try {
      const { loanUid } = req.params;
      const loan = await loanService.findLoanByLoanUid(loanUid);
      res.json({ success: true, loanUid, data: loan });
    } catch (error) {
      if (error.message.includes('No loan found')) return res.status(404).json({ error: `Loan not found with LoanUid: ${loanUid}` });
      next(error);
    }
  }

  async getLoanHistory(req, res, next) {
    try {
      const { loanId } = req.params;
      const history = await loanService.getLoanHistory(loanId);
      res.json({ success: true, count: history.length, loanId, data: history });
    } catch (error) {
      console.error('Error in getLoanHistory:', error);
      next(error);
    }
  }

  async getLoanByTxId(req, res, next) {
    try {
      const { txId } = req.params;
      const result = await loanService.getLoanByTxId(txId);
      res.json({ success: true, txId, loan: result.loan, changes: result.changes });
    } catch (error) {
      if (error.message.includes('Transaction not found')) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (error.message.includes('Loan state not found')) return res.status(404).json({ success: false, error: 'Loan state not found for this TxId' });
      next(error);
    }
  }

  async deleteLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const privateKey = getPrivateKey();
      const exists = await loanService.loanExists(loanId);
      if (!exists) return res.status(404).json({ error: 'Loan not found' });
      const isLocked = await loanService.isLoanLocked(loanId);
      if (isLocked) return res.status(400).json({ error: 'Cannot delete locked/tokenized loan' });
      const isTokenized = await loanService.isLoanTokenized(loanId);
      if (isTokenized) return res.status(400).json({ error: 'Cannot delete tokenized loan. Unlock it first.' });
      const result = await loanService.deleteLoan(privateKey, loanId);

      // ✅ Invalidar cache al eliminar
      cache.loans.del(`loan:${loanId}`);

      res.json({ success: true, message: 'Loan deleted successfully', loanId, data: result });
    } catch (error) {
      console.error('Error in deleteLoan:', error);
      if (error.message.includes('PRIVATE_KEY')) return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      if (error.message.includes('Cannot delete locked loan')) return res.status(400).json({ error: 'Cannot delete locked loan. Unlock it first.' });
      if (error.message.includes('Cannot delete tokenized loan')) return res.status(400).json({ error: 'Cannot delete tokenized loan. Unlock it first.' });
      next(error);
    }
  }

  async getAllLoans(req, res, next) {
    try {
      const offset = parseInt(req.query.offset) || 0;
      const limit = parseInt(req.query.limit) || 50;
      const fetchAll = req.query.fetchAll === 'true';

      const cacheKey = `allloans:${offset}:${limit}:${fetchAll}`;
      const cached = cache.loans.get(cacheKey);
      if (cached) {
        console.log(`[cache] HIT ${cacheKey}`);
        return res.json(cached);
      }

      let result;
      if (fetchAll) {
        const loans = await loanService.queryAllLoansComplete();
        result = { success: true, count: loans.length, total: loans.length, data: loans };
      } else {
        const paginatedResult = await loanService.queryAllLoans(offset, limit);
        result = { success: true, count: paginatedResult.returned, total: paginatedResult.total, offset: paginatedResult.offset, limit: paginatedResult.limit, data: paginatedResult.loans };
      }

      cache.loans.set(cacheKey, result);
      console.log(`[cache] SET ${cacheKey}`);
      res.json(result);
    } catch (error) {
      console.error('Error in getAllLoans:', error);
      if (error.message.includes('ABI decoding')) return res.status(400).json({ success: false, error: 'Error al decodificar datos del contrato', hint: 'Verifica que el contrato esté desplegado correctamente' });
      next(error);
    }
  }

  async getTotalLoansCount(req, res, next) {
    try {
      const count = await loanService.getTotalLoansCount();
      res.json({ success: true, totalCount: count });
    } catch (error) {
      next(error);
    }
  }

  async checkLoanExists(req, res, next) {
    try {
      const { loanId } = req.params;
      const exists = await loanService.loanExists(loanId);
      res.json({ success: true, loanId, exists });
    } catch (error) {
      next(error);
    }
  }

  async checkLoanExistsByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      const loanId = await loanService.generateLoanId(lenderUid, loanUid);
      const exists = await loanService.loanExists(loanId);
      res.json({ success: true, lenderUid, loanUid, loanId, exists });
    } catch (error) {
      next(error);
    }
  }

  async checkLoanIsLocked(req, res, next) {
    try {
      const { loanId } = req.params;
      const isLocked = await loanService.isLoanLocked(loanId);
      res.json({ success: true, loanId, isLocked });
    } catch (error) {
      next(error);
    }
  }

  async checkLoanIsTokenized(req, res, next) {
    try {
      const { loanId } = req.params;
      const isTokenized = await loanService.isLoanTokenized(loanId);
      let tokenId = null;
      if (isTokenized) tokenId = await loanService.getAvalancheTokenId(loanId);
      res.json({ success: true, loanId, isTokenized, tokenId });
    } catch (error) {
      next(error);
    }
  }

  async getAvalancheTokenId(req, res, next) {
    try {
      const { loanId } = req.params;
      const tokenId = await loanService.getAvalancheTokenId(loanId);
      res.json({ success: true, loanId, tokenId });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentTransaction(req, res, next) {
    try {
      const { loanId } = req.params;
      const txId = await loanService.getCurrentTransactionByLoan(loanId);
      res.json({ success: true, loanId, currentTxId: txId });
    } catch (error) {
      next(error);
    }
  }

  async getLoanByLenderAndAccount(req, res, next) {
    try {
      const { lenderUid, account } = req.params;
      const loan = await loanService.findLoanByLenderAndAccount(lenderUid, account);
      res.json({ success: true, lenderUid, account, data: loan });
    } catch (error) {
      if (error.message.includes('Loan not found')) return res.status(404).json({ error: `Loan not found for Account: ${lenderUid}, Account: ${account}` });
      next(error);
    }
  }

  async getPortfolio(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token provided' });

      // ✅ Usar el servicio unificado en lugar de duplicar lógica GraphQL
      // (requiere inyectar o requerir portfolioService)
      const portfolioService = require('../services/PortfolioService');
      const result = await portfolioService.getPortfolio(token);

      res.json({
        success: true,
        count: result.totalLoans,
        data: result.loans
      });
    } catch (error) {
      console.error('❌ getPortfolio:', error.message);
      next(error);
    }
  }

  async generateLoanId(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;
      if (!lenderUid || !loanUid) return res.status(400).json({ error: 'Both lenderUid and loanUid are required' });
      const loanId = await loanService.generateLoanId(lenderUid, loanUid);
      res.json({ success: true, lenderUid, loanUid, loanId });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LoanController();