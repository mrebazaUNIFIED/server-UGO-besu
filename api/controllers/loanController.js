const loanService = require('../services/LoanRegistryService');

/**
 * Obtiene y valida la private key desde las variables de entorno
 * @returns {string} Private key configurada en .env (limpia y validada)
 * @throws {Error} Si no está configurada o es inválida la private key
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

function getPrivateKey() {
  let privateKey = process.env.PRIVATE_KEY;
  
  // Verificar que existe
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not configured in environment variables');
  }

  // Limpiar espacios en blanco y saltos de línea
  privateKey = privateKey.trim();

  // Validar que no esté vacío después de limpiar
  if (privateKey.length === 0) {
    throw new Error('PRIVATE_KEY is empty after trimming whitespace');
  }

  // Asegurar que tenga el prefijo 0x
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  // Validar longitud (64 caracteres hex + 0x = 66 total)
  if (privateKey.length !== 66) {
    throw new Error(`PRIVATE_KEY has invalid length: ${privateKey.length} (expected 66 characters with 0x prefix)`);
  }

  // Validar que sea hexadecimal válido
  const hexPattern = /^0x[0-9a-fA-F]{64}$/;
  if (!hexPattern.test(privateKey)) {
    throw new Error('PRIVATE_KEY is not a valid hexadecimal string');
  }

  return privateKey;
}

class LoanController {

  /**
   * POST /api/loans
   * POST INTELIGENTE: Crear O Actualizar (parcial o completo)
   * 
   * El controlador detecta automáticamente:
   * 1. Si el loan NO existe → Crear (requiere todos los campos)
   * 2. Si el loan existe Y enviaste todos los campos → Actualizar completo
   * 3. Si el loan existe Y enviaste solo algunos campos → Actualizar PARCIAL
   */
  async createLoan(req, res, next) {
    try {
      // ✅ Obtener private key desde .env
      const privateKey = getPrivateKey();
      const rawLoanData = req.body?.loanData ?? req.body;
      const loanData = normalizeLoanKeys(rawLoanData);


      console.log("========== POST /loans =========="); //
      console.log("Content-Type:", req.headers["content-type"]); //
      console.log("================================="); //

      const isMissing = (v) => v === undefined || v === null || v === ""; //

      console.log("LenderUid:", loanData.LenderUid); //
      console.log("LoanUid:", loanData.LoanUid); //
      if (!loanData || !loanData.LenderUid || !loanData.LoanUid) {
        return res.status(400).json({
          error: 'Invalid loan data. Required: LenderUid and LoanUid'
        });
      }

      // ✅ PASO 1: Generar el ID compuesto
      const loanId = loanService.generateLoanId(loanData.LenderUid, loanData.LoanUid);

      // ✅ PASO 2: Verificar si el loan existe
      const loanExists = await loanService.loanExists(loanId);

      // ✅ CASO 1: Loan NO existe → Crear loan nuevo (requiere todos los campos)
      if (!loanExists) {
        // Validar que tenga los campos mínimos para crear
        const requiredFields = [
          'LenderUid', 'LoanUid', 'OriginalBalance', 'CurrentBalance', 'Status'
        ];

        const missingFields = requiredFields.filter((field) => isMissing(loanData[field])); //

        if (missingFields.length > 0) {
          return res.status(400).json({
            error: `Missing required fields for new loan: ${missingFields.join(', ')}`
          });
        }

        // Crear loan completo
        const result = await loanService.createLoan(privateKey, loanData);

        return res.status(201).json({
          success: true,
          message: 'Loan created successfully',
          operation: 'CREATE',
          data: result
        });
      }

      // ✅ CASO 2 y 3: Loan SÍ existe → Determinar si es actualización parcial o completa

      // Leer el loan actual para saber qué campos tiene
      const currentLoan = await loanService.readLoan(loanId);

      // Contar cuántos campos enviaron (sin contar LenderUid y LoanUid que son ID)
      const providedFields = Object.keys(loanData).filter(
        key => key !== 'LenderUid' && key !== 'LoanUid'
      );
      const providedFieldCount = providedFields.length;

      // Si enviaron 10 o menos campos → Actualización PARCIAL
      if (providedFieldCount <= 10) {
        console.log(`📝 Detected PARTIAL update: ${providedFieldCount} fields provided`);

        // Extraer solo los campos que se pueden actualizar parcialmente
        const partialUpdateFields = {};
        const supportedPartialFields = [
          'CurrentBalance', 'NoteRate', 'Status', 'NextDueDate', 'PaidToDate',
          'PaidOffDate', 'DeferredUnpaidInt', 'DeferredLateCharges',
          'DeferredUnpaidCharges', 'LenderOwnerPct', 'IsForeclosure',
          'CoBorrower', 'LenderName', 'City', 'State', 'PropertyZip'
        ];

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

        // Usar actualización parcial
        const result = await loanService.updateLoanPartial(
          privateKey,
          loanId,
          partialUpdateFields
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

      // Si enviaron más de 10 campos → Actualización COMPLETA
      console.log(`📝 Detected FULL update: ${providedFieldCount} fields provided`);

      // Para actualización completa, usar createLoan (que funciona como upsert)
      const result = await loanService.createLoan(privateKey, loanData);

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
        return res.status(500).json({ 
          error: 'Server configuration error: ' + error.message
        });
      }
      if (error.message.includes('required')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('Cannot update locked loan')) {
        return res.status(400).json({
          error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.'
        });
      }
      if (error.message.includes('revert')) {
        return res.status(400).json({
          error: 'Transaction reverted. Check loan data and permissions.',
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

      // ✅ Obtener private key desde .env
      const privateKey = getPrivateKey();

      if (!fields || Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields to update provided' });
      }

      const result = await loanService.updateLoanPartial(privateKey, loanId, fields);

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
        return res.status(500).json({ 
          error: 'Server configuration error: ' + error.message
        });
      }
      if (error.message.includes('does not exist')) {
        return res.status(404).json({ error: 'Loan not found' });
      }
      if (error.message.includes('Cannot update locked loan')) {
        return res.status(400).json({
          error: 'Cannot update locked/tokenized loan. Use updateLockedLoan instead.'
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

      // ✅ Obtener private key desde .env
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
        return res.status(500).json({ 
          error: 'Server configuration error: ' + error.message
        });
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
   * Obtener un loan por ID compuesto (bytes32)
   */
  async getLoan(req, res, next) {
    try {
      const { loanId } = req.params;
      const loan = await loanService.readLoan(loanId);

      res.json({
        success: true,
        data: loan
      });

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
   * Obtener un loan por LenderUid + LoanUid
   */
  async getLoanByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;

      // Generar loanId
      const loanId = loanService.generateLoanId(lenderUid, loanUid);

      const loan = await loanService.readLoan(loanId);

      res.json({
        success: true,
        loanId: loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: loan
      });

    } catch (error) {
      console.error('Error in getLoanByUids:', error);

      if (error.message.includes('does not exist')) {
        return res.status(404).json({
          error: `Loan not found for LenderUid: ${req.params.lenderUid}, LoanUid: ${req.params.loanUid}`
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/lender/:lenderUid
   * Obtener loans de un lender
   */
  async getLoansByLenderUid(req, res, next) {
    try {
      const { lenderUid } = req.params;
      const loans = await loanService.findLoansByLenderUid(lenderUid);

      res.json({
        success: true,
        count: loans.length,
        lenderUid: lenderUid,
        data: loans
      });

    } catch (error) {
      console.error('Error in getLoansByLenderUid:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/lender/:lenderUid/count
   * Contar loans de un lender
   */
  async countLoansByLenderUid(req, res, next) {
    try {
      const { lenderUid } = req.params;
      const count = await loanService.countLoansByLenderUid(lenderUid);

      res.json({
        success: true,
        lenderUid: lenderUid,
        count: count
      });

    } catch (error) {
      console.error('Error in countLoansByLenderUid:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/loanuid/:loanUid
   * Buscar loan por LoanUid
   */
  async getLoanByLoanUid(req, res, next) {
    try {
      const { loanUid } = req.params;
      const loan = await loanService.findLoanByLoanUid(loanUid);

      res.json({
        success: true,
        loanUid: loanUid,
        data: loan
      });

    } catch (error) {
      console.error('Error in getLoanByLoanUid:', error);

      if (error.message.includes('No loan found')) {
        return res.status(404).json({
          error: `Loan not found with LoanUid: ${loanUid}`
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/history
   * Obtener historial de un loan
   */
  async getLoanHistory(req, res, next) {
    try {
      const { loanId } = req.params;
      const history = await loanService.getLoanHistory(loanId);

      res.json({
        success: true,
        count: history.length,
        loanId: loanId,
        data: history
      });

    } catch (error) {
      console.error('Error in getLoanHistory:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/tx/:txId
   * Obtener loan por TxId con sus cambios
   */
  async getLoanByTxId(req, res, next) {
    try {
      const { txId } = req.params;

      console.log(`Getting loan by TxId: ${txId}`);
      const result = await loanService.getLoanByTxId(txId);

      res.json({
        success: true,
        txId: txId,
        loan: result.loan,
        changes: result.changes
      });

    } catch (error) {
      console.error('Error in getLoanByTxId:', error);

      if (error.message.includes('Transaction not found')) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }
      if (error.message.includes('Loan state not found')) {
        return res.status(404).json({
          success: false,
          error: 'Loan state not found for this TxId'
        });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/loans/:loanId
   * Eliminar un loan (soft delete)
   */
  async deleteLoan(req, res, next) {
    try {
      const { loanId } = req.params;

      // ✅ Obtener private key desde .env
      const privateKey = getPrivateKey();

      // Verificar que el loan existe
      const exists = await loanService.loanExists(loanId);
      if (!exists) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      // Verificar que no está bloqueado
      const isLocked = await loanService.isLoanLocked(loanId);
      if (isLocked) {
        return res.status(400).json({
          error: 'Cannot delete locked/tokenized loan'
        });
      }

      // Verificar que no está tokenizado
      const isTokenized = await loanService.isLoanTokenized(loanId);
      if (isTokenized) {
        return res.status(400).json({
          error: 'Cannot delete tokenized loan. Unlock it first.'
        });
      }

      const result = await loanService.deleteLoan(privateKey, loanId);

      res.json({
        success: true,
        message: 'Loan deleted successfully',
        loanId: loanId,
        data: result
      });

    } catch (error) {
      console.error('Error in deleteLoan:', error);

      if (error.message.includes('PRIVATE_KEY')) {
        return res.status(500).json({ 
          error: 'Server configuration error: ' + error.message
        });
      }
      if (error.message.includes('Cannot delete locked loan')) {
        return res.status(400).json({
          error: 'Cannot delete locked loan. Unlock it first.'
        });
      }
      if (error.message.includes('Cannot delete tokenized loan')) {
        return res.status(400).json({
          error: 'Cannot delete tokenized loan. Unlock it first.'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/loans
   * Obtener todos los loans
   */
  async getAllLoans(req, res, next) {
    try {
      const offset = parseInt(req.query.offset) || 0;
      const limit = parseInt(req.query.limit) || 50;
      const fetchAll = req.query.fetchAll === 'true';

      // ✅ CORRECTO: Usar queryAllLoans, NO readLoan
      let result;

      if (fetchAll) {
        const loans = await loanService.queryAllLoansComplete();
        result = {
          success: true,
          count: loans.length,
          total: loans.length,
          data: loans
        };
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

      // Manejo específico de errores
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
   * Obtener conteo total de loans
   */
  async getTotalLoansCount(req, res, next) {
    try {
      const count = await loanService.getTotalLoansCount();

      res.json({
        success: true,
        totalCount: count
      });

    } catch (error) {
      console.error('Error in getTotalLoansCount:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/exists
   * Verificar si existe un loan
   */
  async checkLoanExists(req, res, next) {
    try {
      const { loanId } = req.params;
      const exists = await loanService.loanExists(loanId);

      res.json({
        success: true,
        loanId: loanId,
        exists: exists
      });

    } catch (error) {
      console.error('Error in checkLoanExists:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/uids/:lenderUid/:loanUid/exists
   * Verificar si existe un loan por LenderUid + LoanUid
   */
  async checkLoanExistsByUids(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      const loanId = loanService.generateLoanId(lenderUid, loanUid);
      const exists = await loanService.loanExists(loanId);

      res.json({
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        loanId: loanId,
        exists: exists
      });

    } catch (error) {
      console.error('Error in checkLoanExistsByUids:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/is-locked
   * Verificar si un loan está bloqueado
   */
  async checkLoanIsLocked(req, res, next) {
    try {
      const { loanId } = req.params;
      const isLocked = await loanService.isLoanLocked(loanId);

      res.json({
        success: true,
        loanId: loanId,
        isLocked: isLocked
      });

    } catch (error) {
      console.error('Error in checkLoanIsLocked:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/is-tokenized
   * Verificar si un loan está tokenizado
   */
  async checkLoanIsTokenized(req, res, next) {
    try {
      const { loanId } = req.params;
      const isTokenized = await loanService.isLoanTokenized(loanId);
      let tokenId = null;

      if (isTokenized) {
        tokenId = await loanService.getAvalancheTokenId(loanId);
      }

      res.json({
        success: true,
        loanId: loanId,
        isTokenized: isTokenized,
        tokenId: tokenId
      });

    } catch (error) {
      console.error('Error in checkLoanIsTokenized:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/avalanche-token-id
   * Obtener token ID de Avalanche
   */
  async getAvalancheTokenId(req, res, next) {
    try {
      const { loanId } = req.params;
      const tokenId = await loanService.getAvalancheTokenId(loanId);

      res.json({
        success: true,
        loanId: loanId,
        tokenId: tokenId
      });

    } catch (error) {
      console.error('Error in getAvalancheTokenId:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/:loanId/current-tx
   * Obtener transacción actual de un loan
   */
  async getCurrentTransaction(req, res, next) {
    try {
      const { loanId } = req.params;
      const txId = await loanService.getCurrentTransactionByLoan(loanId);

      res.json({
        success: true,
        loanId: loanId,
        currentTxId: txId
      });

    } catch (error) {
      console.error('Error in getCurrentTransaction:', error);
      next(error);
    }
  }

  /**
   * GET /api/loans/by-account/:lenderUid/:account
   * Buscar loan por LenderUid y Account
   */
  async getLoanByLenderAndAccount(req, res, next) {
    try {
      const { lenderUid, account } = req.params;
      const loan = await loanService.findLoanByLenderAndAccount(lenderUid, account);

      res.json({
        success: true,
        lenderUid: lenderUid,
        account: account,
        data: loan
      });

    } catch (error) {
      console.error('Error in getLoanByLenderAndAccount:', error);

      if (error.message.includes('Loan not found')) {
        return res.status(404).json({
          error: `Loan not found for LenderUid: ${lenderUid}, Account: ${account}`
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/loans/generate-id
   * Generar loanId a partir de LenderUid y LoanUid
   */
  async generateLoanId(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({
          error: 'Both lenderUid and loanUid are required'
        });
      }

      const loanId = loanService.generateLoanId(lenderUid, loanUid);

      res.json({
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        loanId: loanId
      });

    } catch (error) {
      console.error('Error in generateLoanId:', error);
      next(error);
    }
  }
}

module.exports = new LoanController();