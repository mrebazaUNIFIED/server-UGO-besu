const loanService = require('../services/LoanRegistryService');

/**
 * Normaliza las keys del body para que coincidan con los nombres del contrato.
 */
function normalizeLoanKeys(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const map = {
    lenderuid: "LenderUid",
    loanuid: "LoanUid",
    originalbalance: "OriginalBalance",
    currentbalance: "CurrentBalance",
    status: "Status",
    noterate: "NoteRate",
    soldrate: "SoldRate",
    calcinterestrate: "CalcInterestRate",
    coborrower: "CoBorrower",
    activedefaultinterestrate: "ActiveDefaultInterestRate",
    deferredunpaidint: "DeferredUnpaidInt",
    deferredlatecharges: "DeferredLateCharges",
    deferredunpaidcharges: "DeferredUnpaidCharges",
    lenderownerpct: "LenderOwnerPct",
    lendername: "LenderName",
    city: "City",
    state: "State",
    propertyzip: "PropertyZip",
    account: "Account",
    maximumdraw: "MaximumDraw",
    closedate: "CloseDate",
    drawstatus: "DrawStatus",
    lenderfunddate: "LenderFundDate",
    isforeclosure: "IsForeclosure"
  };

  const normalized = {};
  for (const key of Object.keys(obj)) {
    const canonical = map[key.toLowerCase()] || key;
    normalized[canonical] = obj[key];
  }
  return normalized;
}

/**
 * Obtiene y valida la private key desde las variables de entorno.
 */
function getPrivateKey() {
  let privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY not configured in environment variables');
  }

  privateKey = privateKey.trim();

  if (privateKey.length === 0) {
    throw new Error('PRIVATE_KEY is empty after trimming whitespace');
  }

  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  if (privateKey.length !== 66) {
    throw new Error(`PRIVATE_KEY has invalid length: ${privateKey.length} (expected 66 characters with 0x prefix)`);
  }

  const hexPattern = /^0x[0-9a-fA-F]{64}$/;
  if (!hexPattern.test(privateKey)) {
    throw new Error('PRIVATE_KEY is not a valid hexadecimal string');
  }

  return privateKey;
}

/**
 * Resuelve el parámetro `wait` del query string.
 *
 * Regla:
 *   ?wait=false  → false  (modo background, respuesta inmediata)
 *   cualquier otra cosa (ausente, ?wait=true, ?wait=1, etc.) → true
 *
 * Esto alinea el controller con el service, donde wait=true es el default.
 */
function resolveWait(query) {
  // Solo deshabilitar el wait si el cliente lo pide EXPLÍCITAMENTE
  return query.wait !== 'false';
}

class LoanController {

  /**
   * POST /api/loans
   * POST INTELIGENTE: Crear O Actualizar (parcial o completo)
   *
   * El controlador detecta automáticamente:
   * 1. Si el loan NO existe → Crear (requiere campos mínimos)
   * 2. Si el loan existe Y enviaste más de 10 campos → Actualización completa (upsert)
   * 3. Si el loan existe Y enviaste 10 o menos campos → Actualización PARCIAL
   */
  async createLoan(req, res, next) {
    try {
      const privateKey = getPrivateKey();
      const rawLoanData = req.body?.loanData ?? req.body;
      const loanData = normalizeLoanKeys(rawLoanData);

      // ── CAMBIO PRINCIPAL: wait=true por defecto ────────────────────────────
      const wait = resolveWait(req.query);
      // ────────────────────────────────────────────────────────────────────────

      console.log("========== POST /loans ==========");
      console.log("Content-Type:", req.headers["content-type"]);
      console.log("wait:", wait);
      console.log("LenderUid:", loanData.LenderUid);
      console.log("LoanUid:", loanData.LoanUid);
      console.log("=================================");

      const isMissing = (v) => v === undefined || v === null || v === "";

      if (!loanData || !loanData.LenderUid || !loanData.LoanUid) {
        return res.status(400).json({
          error: 'Invalid loan data. Required: LenderUid and LoanUid'
        });
      }

      // ✅ PASO 1: Generar el ID compuesto
      const loanId = await loanService.generateLoanId(loanData.LenderUid, loanData.LoanUid);

      // ✅ PASO 2: Verificar si el loan existe
      const loanExists = await loanService.loanExists(loanId);

      // ── CASO 1: Loan NO existe → Crear ─────────────────────────────────────
      if (!loanExists) {
        const requiredFields = ['LenderUid', 'LoanUid', 'OriginalBalance', 'CurrentBalance', 'Status'];
        const missingFields = requiredFields.filter((field) => isMissing(loanData[field]));

        if (missingFields.length > 0) {
          return res.status(400).json({
            error: `Missing required fields for new loan: ${missingFields.join(', ')}`
          });
        }

        const result = await loanService.createLoan(privateKey, loanData, { wait });

        return res.status(201).json({
          success: true,
          message: 'Loan created successfully',
          operation: 'CREATE',
          data: result
        });
      }

      // ── CASO 2/3: Loan SÍ existe → Determinar tipo de update ───────────────
      const providedFields = Object.keys(loanData).filter(
        key => key !== 'LenderUid' && key !== 'LoanUid'
      );
      const providedFieldCount = providedFields.length;

      // 10 o menos campos → Actualización PARCIAL
      if (providedFieldCount <= 10) {
        console.log(`📝 Detected PARTIAL update: ${providedFieldCount} fields provided`);

        const supportedPartialFields = [
          'CurrentBalance', 'NoteRate', 'Status', 'NextDueDate', 'PaidToDate',
          'PaidOffDate', 'DeferredUnpaidInt', 'DeferredLateCharges',
          'DeferredUnpaidCharges', 'LenderOwnerPct', 'IsForeclosure',
          'CoBorrower', 'LenderName', 'City', 'State', 'PropertyZip'
        ];

        const partialUpdateFields = {};
        supportedPartialFields.forEach(field => {
          if (loanData[field] !== undefined) {
            partialUpdateFields[field] = loanData[field];
          }
        });

        if (Object.keys(partialUpdateFields).length === 0) {
          return res.status(400).json({
            error: 'No valid fields to update',
            hint: 'Provide at least one of: ' + supportedPartialFields.join(', ')
          });
        }

        const result = await loanService.updateLoanPartial(
          privateKey,
          loanId,
          partialUpdateFields,
          { wait }
        );

        return res.json({
          success: true,
          message: 'Loan updated partially',
          operation: 'PARTIAL_UPDATE',
          loanId: loanId,
          lenderUid: loanData.LenderUid,
          loanUid: loanData.LoanUid,
          updatedFields: Object.keys(partialUpdateFields),
          data: result
        });
      }

      // Más de 10 campos → Actualización COMPLETA (upsert)
      console.log(`📝 Detected FULL update: ${providedFieldCount} fields provided`);

      const result = await loanService.createLoan(privateKey, loanData, { wait });

      return res.json({
        success: true,
        message: 'Loan updated completely',
        operation: 'FULL_UPDATE',
        loanId: loanId,
        lenderUid: loanData.LenderUid,
        loanUid: loanData.LoanUid,
        data: result
      });

    } catch (error) {
      console.error('Error in createLoan:', error);

      if (error.message.includes('PRIVATE_KEY')) {
        return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      }
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('Cannot update locked loan')) {
        return res.status(400).json({
          error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.'
        });
      }
      // ── NUEVO: capturar errores de tx que ahora se propagan del service ─────
      if (
        error.message.includes('createLoan failed:') ||
        error.message.includes('updateLoanPartial failed:') ||
        error.message.includes('revert')
      ) {
        return res.status(400).json({
          error: 'Blockchain transaction failed',
          details: error.message
        });
      }
      next(error);
    }
  }

  /**
   * PUT /api/loans/:loanId/partial
   * Actualización PARCIAL de loan (para updates específicos)
   */
  async updateLoanPartial(req, res, next) {
    try {
      const { loanId } = req.params;
      const { fields } = req.body;
      const privateKey = getPrivateKey();

      // ── CAMBIO PRINCIPAL: wait=true por defecto ────────────────────────────
      const wait = resolveWait(req.query);
      // ────────────────────────────────────────────────────────────────────────

      if (!fields || Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields to update provided' });
      }

      const result = await loanService.updateLoanPartial(privateKey, loanId, fields, { wait });

      res.json({
        success: true,
        message: 'Loan updated partially',
        loanId: loanId,
        updatedFields: Object.keys(fields),
        data: result
      });

    } catch (error) {
      console.error('Error in updateLoanPartial:', error);

      if (error.message.includes('PRIVATE_KEY')) {
        return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      }
      if (error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      if (error.message.includes('Cannot update locked loan')) {
        return res.status(400).json({
          error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.'
        });
      }
      // ── NUEVO: capturar errores de tx que ahora se propagan del service ─────
      if (error.message.includes('updateLoanPartial failed:') || error.message.includes('revert')) {
        return res.status(400).json({
          error: 'Blockchain transaction failed',
          details: error.message
        });
      }
      next(error);
    }
  }

  /**
   * PUT /api/loans/:loanId/locked
   * Actualizar loan bloqueado/tokenizado
   */
  async updateLockedLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const { newBalance, newStatus, newPaidToDate } = req.body;
      const privateKey = getPrivateKey();

      if (newBalance === undefined && !newStatus && !newPaidToDate) {
        return res.status(400).json({
          error: 'Provide at least one field to update: newBalance, newStatus, or newPaidToDate'
        });
      }

      const result = await loanService.updateLockedLoan(
        privateKey,
        loanId,
        newBalance,
        newStatus,
        newPaidToDate
      );

      res.json({
        success: true,
        message: 'Locked loan updated successfully',
        loanId: loanId,
        data: result
      });

    } catch (error) {
      console.error('Error in updateLockedLoan:', error);

      if (error.message.includes('PRIVATE_KEY')) {
        return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      }
      if (error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      if (error.message.includes('Only for locked loans')) {
        return res.status(400).json({ error: 'Loan is not locked/tokenized' });
      }
      if (error.message.includes('NFT not minted yet')) {
        return res.status(400).json({ error: 'Loan token not minted yet' });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId
   */
  async getLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const loan = await loanService.readLoan(loanId);

      res.json({ success: true, data: loan });

    } catch (error) {
      console.error('Error in getLoan:', error);
      if (error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/by-uids/:lenderUid/:loanUid
   */
  async getLoanByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      const loanId = await loanService.generateLoanId(lenderUid, loanUid);
      const loan = await loanService.readLoan(loanId);

      res.json({ success: true, loanId, lenderUid, loanUid, data: loan });

    } catch (error) {
      if (error.message.includes('does not exist')) {
        // 👇 console.warn en vez de console.error, y sin stack trace
        console.warn(`⚠️ Loan not in blockchain: ${req.params.lenderUid}/${req.params.loanUid}`);
        return res.status(404).json({
          error: `Loan not found`,
          inBlockchain: false  // 👈 útil para el frontend
        });
      }
      console.error('Error in getLoanByUids:', error); // solo para errores reales
      next(error);
    }
  }

  /**
   * GET /api/loans/lender/:lenderUid
   */
  async getLoansByLenderUid(req, res, next) {
    try {
      const { lenderUid } = req.params;
      const loans = await loanService.findLoansByLenderUid(lenderUid);

      res.json({
        success: true,
        count: loans.length,
        lenderUid,
        data: loans
      });

    } catch (error) {
      console.error('Error in getLoansByLenderUid:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/lender/:lenderUid/count
   */
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

  /**
   * GET /api/loans/loanuid/:loanUid
   */
  async getLoanByLoanUid(req, res, next) {
    try {
      const { loanUid } = req.params;
      const loan = await loanService.findLoanByLoanUid(loanUid);

      res.json({ success: true, loanUid, data: loan });

    } catch (error) {
      console.error('Error in getLoanByLoanUid:', error);
      if (error.message.includes('No loan found')) {
        return res.status(404).json({ error: `Loan not found with LoanUid: ${loanUid}` });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/history
   */
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

  /**
   * GET /api/loans/tx/:txId
   */
  async getLoanByTxId(req, res, next) {
    try {
      const { txId } = req.params;
      console.log(`Getting loan by TxId: ${txId}`);
      const result = await loanService.getLoanByTxId(txId);

      res.json({ success: true, txId, loan: result.loan, changes: result.changes });

    } catch (error) {
      console.error('Error in getLoanByTxId:', error);
      if (error.message.includes('Transaction not found')) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      if (error.message.includes('Loan state not found')) {
        return res.status(404).json({ success: false, error: 'Loan state not found for this TxId' });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/loans/:loanId
   */
  async deleteLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const privateKey = getPrivateKey();

      const exists = await loanService.loanExists(loanId);
      if (!exists) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      const isLocked = await loanService.isLoanLocked(loanId);
      if (isLocked) {
        return res.status(400).json({ error: 'Cannot delete locked/tokenized loan' });
      }

      const isTokenized = await loanService.isLoanTokenized(loanId);
      if (isTokenized) {
        return res.status(400).json({ error: 'Cannot delete tokenized loan. Unlock it first.' });
      }

      const result = await loanService.deleteLoan(privateKey, loanId);

      res.json({ success: true, message: 'Loan deleted successfully', loanId, data: result });

    } catch (error) {
      console.error('Error in deleteLoan:', error);

      if (error.message.includes('PRIVATE_KEY')) {
        return res.status(500).json({ error: 'Server configuration error: ' + error.message });
      }
      if (error.message.includes('Cannot delete locked loan')) {
        return res.status(400).json({ error: 'Cannot delete locked loan. Unlock it first.' });
      }
      if (error.message.includes('Cannot delete tokenized loan')) {
        return res.status(400).json({ error: 'Cannot delete tokenized loan. Unlock it first.' });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans
   */
  async getAllLoans(req, res, next) {
    try {
      const offset = parseInt(req.query.offset) || 0;
      const limit = parseInt(req.query.limit) || 50;
      const fetchAll = req.query.fetchAll === 'true';

      let result;

      if (fetchAll) {
        const loans = await loanService.queryAllLoansComplete();
        result = { success: true, count: loans.length, total: loans.length, data: loans };
      } else {
        const paginatedResult = await loanService.queryAllLoans(offset, limit);
        result = {
          success: true,
          count: paginatedResult.returned,
          total: paginatedResult.total,
          offset: paginatedResult.offset,
          limit: paginatedResult.limit,
          data: paginatedResult.loans
        };
      }

      res.json(result);

    } catch (error) {
      console.error('Error in getAllLoans:', error);

      if (error.message.includes('ABI decoding')) {
        return res.status(400).json({
          success: false,
          error: 'Error al decodificar datos del contrato',
          hint: 'Verifica que el contrato esté desplegado correctamente'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/count
   */
  async getTotalLoansCount(req, res, next) {
    try {
      const count = await loanService.getTotalLoansCount();
      res.json({ success: true, totalCount: count });
    } catch (error) {
      console.error('Error in getTotalLoansCount:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/exists
   */
  async checkLoanExists(req, res, next) {
    try {
      const { loanId } = req.params;
      const exists = await loanService.loanExists(loanId);
      res.json({ success: true, loanId, exists });
    } catch (error) {
      console.error('Error in checkLoanExists:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/uids/:lenderUid/:loanUid/exists
   */
  async checkLoanExistsByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      const loanId = await loanService.generateLoanId(lenderUid, loanUid);
      const exists = await loanService.loanExists(loanId);

      res.json({ success: true, lenderUid, loanUid, loanId, exists });
    } catch (error) {
      console.error('Error in checkLoanExistsByUids:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/is-locked
   */
  async checkLoanIsLocked(req, res, next) {
    try {
      const { loanId } = req.params;
      const isLocked = await loanService.isLoanLocked(loanId);
      res.json({ success: true, loanId, isLocked });
    } catch (error) {
      console.error('Error in checkLoanIsLocked:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/is-tokenized
   */
  async checkLoanIsTokenized(req, res, next) {
    try {
      const { loanId } = req.params;
      const isTokenized = await loanService.isLoanTokenized(loanId);
      let tokenId = null;

      if (isTokenized) {
        tokenId = await loanService.getAvalancheTokenId(loanId);
      }

      res.json({ success: true, loanId, isTokenized, tokenId });
    } catch (error) {
      console.error('Error in checkLoanIsTokenized:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/avalanche-token-id
   */
  async getAvalancheTokenId(req, res, next) {
    try {
      const { loanId } = req.params;
      const tokenId = await loanService.getAvalancheTokenId(loanId);
      res.json({ success: true, loanId, tokenId });
    } catch (error) {
      console.error('Error in getAvalancheTokenId:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/current-tx
   */
  async getCurrentTransaction(req, res, next) {
    try {
      const { loanId } = req.params;
      const txId = await loanService.getCurrentTransactionByLoan(loanId);
      res.json({ success: true, loanId, currentTxId: txId });
    } catch (error) {
      console.error('Error in getCurrentTransaction:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/by-account/:lenderUid/:account
   */
  async getLoanByLenderAndAccount(req, res, next) {
    try {
      const { lenderUid, account } = req.params;
      const loan = await loanService.findLoanByLenderAndAccount(lenderUid, account);

      res.json({ success: true, lenderUid, account, data: loan });
    } catch (error) {
      console.error('Error in getLoanByLenderAndAccount:', error);
      if (error.message.includes('Loan not found')) {
        return res.status(404).json({
          error: `Loan not found for Account: ${lenderUid}, Account: ${account}`
        });
      }
      next(error);
    }
  }

  async getPortfolio(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // 1. Pedir refs al GraphQL usando el token del usuario
      const graphqlResponse = await fetch(process.env.GRAPHQL_URL_DEV, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `{
          getLoanPortfolioBCv2 {
            loanUid
            lenderUid
            lenderName
          }
        }`,
        }),
      });

      const graphqlJson = await graphqlResponse.json();

      if (graphqlJson.errors) {
        return res.status(400).json({ error: graphqlJson.errors[0]?.message });
      }

      const refs = graphqlJson.data.getLoanPortfolioBCv2;

      // 2. Por cada ref, verificar si existe en blockchain y leer
      const results = await Promise.allSettled(
        refs.map(async ({ lenderUid, loanUid, lenderName }) => {
          const loanId = await loanService.generateLoanId(lenderUid, loanUid);
          const exists = await loanService.loanExists(loanId);
          if (!exists) return null;
          const loan = await loanService.readLoan(loanId);
          return { ...loan, LenderName: loan.LenderName || lenderName };
        })
      );

      const loans = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      res.json({ success: true, count: loans.length, data: loans });

    } catch (error) {
      console.error('❌ getPortfolio:', error.message);
      next(error);
    }
  }

  /**
   * POST /api/loans/generate-id
   */
  async generateLoanId(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'Both lenderUid and loanUid are required' });
      }

      const loanId = await loanService.generateLoanId(lenderUid, loanUid);

      res.json({ success: true, lenderUid, loanUid, loanId });
    } catch (error) {
      console.error('Error in generateLoanId:', error);
      next(error);
    }
  }
}

module.exports = new LoanController();