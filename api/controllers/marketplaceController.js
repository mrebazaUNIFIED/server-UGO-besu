const marketplaceBridgeService = require('../services/MarketplaceBridgeService');
const loanService = require('../services/LoanRegistryService');

class MarketplaceController {

  /**
   * ✅ Inicializar la dependencia del LoanRegistryService
   */
  constructor() {
    // Inicializar la dependencia
    marketplaceBridgeService.setLoanRegistryService(loanService);
  }

  /**
   * POST /api/marketplace/approve
   * Aprobar un loan para tokenización
   * IMPORTANTE: Ahora recibe lenderUid y loanUid en lugar de loanId
   */
  async approveLoanForSale(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid, askingPrice, modifiedInterestRate } = req.body;

      if (!privateKey) {
        return res.status(400).json({ error: 'Private key required' });
      }

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      if (!askingPrice || askingPrice <= 0) {
        return res.status(400).json({ error: 'Valid asking price required' });
      }

      if (modifiedInterestRate === undefined) {
        return res.status(400).json({ error: 'Modified interest rate required' });
      }

      // Verificar que el loan existe
      const loanId = loanService.generateLoanId(lenderUid, loanUid);
      const exists = await loanService.loanExists(loanId);
      if (!exists) {
        return res.status(404).json({ 
          error: `Loan not found for LenderUid: ${lenderUid}, LoanUid: ${loanUid}` 
        });
      }

      // Verificar si ya está tokenizado
      const isTokenized = await loanService.isLoanTokenized(loanId);
      if (isTokenized) {
        return res.status(400).json({ 
          error: 'Loan is already tokenized',
          tokenId: await loanService.getAvalancheTokenId(loanId)
        });
      }

      const result = await marketplaceBridgeService.approveLoanForSale(
        privateKey,
        lenderUid,
        loanUid,
        askingPrice,
        modifiedInterestRate
      );

      res.status(200).json({
        success: true,
        message: 'Loan approved for tokenization. The relayer will process it shortly.',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });

    } catch (error) {
      console.error('Error in approveLoanForSale:', error);
      
      if (error.message.includes('Already approved')) {
        return res.status(400).json({ error: 'Loan is already approved for sale' });
      }
      if (error.message.includes('Not the loan lender')) {
        return res.status(403).json({ 
          error: 'Only the loan lender can approve it for sale. Verify your LenderUid matches the lender address.' 
        });
      }
      if (error.message.includes('Cannot tokenize paid off loan')) {
        return res.status(400).json({ error: 'Cannot tokenize a paid off loan' });
      }
      if (error.message.includes('Loan balance must be > 0')) {
        return res.status(400).json({ error: 'Loan balance must be greater than 0' });
      }
      if (error.message.includes('User not active')) {
        return res.status(403).json({ error: 'User account is not active' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/cancel
   * Cancelar aprobación de venta
   * IMPORTANTE: Ahora recibe lenderUid y loanUid
   */
  async cancelSaleListing(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid } = req.body;

      if (!privateKey) {
        return res.status(400).json({ error: 'Private key required' });
      }

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      const result = await marketplaceBridgeService.cancelSaleListing(
        privateKey,
        lenderUid,
        loanUid
      );

      res.json({
        success: true,
        message: 'Sale listing cancelled successfully',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });

    } catch (error) {
      console.error('Error in cancelSaleListing:', error);
      
      if (error.message.includes('Not approved for sale')) {
        return res.status(400).json({ error: 'Loan is not approved for sale' });
      }
      if (error.message.includes('Already cancelled')) {
        return res.status(400).json({ error: 'Approval was already cancelled' });
      }
      if (error.message.includes('Not the loan lender')) {
        return res.status(403).json({ error: 'Only the loan lender can cancel the listing' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/approval/:lenderUid/:loanUid
   * Obtener datos de aprobación
   */
  async getApprovalData(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;
      
      const approval = await marketplaceBridgeService.getApprovalData(lenderUid, loanUid);

      res.json({
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        loanId: approval.loanId,
        data: approval
      });

    } catch (error) {
      console.error('Error in getApprovalData:', error);
      next(error);
    }
  }

  /**
   * GET /api/marketplace/status/:lenderUid/:loanUid
   * Obtener estado completo de tokenización
   */
  async getTokenizationStatus(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;

      // Generar loanId
      const loanId = loanService.generateLoanId(lenderUid, loanUid);

      // Obtener loan de LoanRegistry
      const loan = await loanService.readLoan(loanId);

      // Obtener datos de aprobación
      const approval = await marketplaceBridgeService.getApprovalData(lenderUid, loanUid);

      // Obtener token ID si está tokenizado
      let avalancheTokenId = '0';
      if (loan.isTokenized) {
        avalancheTokenId = await loanService.getAvalancheTokenId(loanId);
      }

      const status = {
        loanId: loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        isLocked: loan.isLocked || false,
        isTokenized: loan.isTokenized || false,
        avalancheTokenId: avalancheTokenId,
        canBeMinted: await marketplaceBridgeService.canBeMinted(lenderUid, loanUid),
        isApprovedForSale: await marketplaceBridgeService.isLoanApprovedForSale(lenderUid, loanUid),
        loanDetails: {
          currentBalance: loan.CurrentBalance,
          status: loan.Status,
          noteRate: loan.NoteRate
        },
        approval: approval.isApproved ? approval : null
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error in getTokenizationStatus:', error);
      
      if (error.message.includes('does not exist')) {
        return res.status(404).json({ 
          error: `Loan not found for LenderUid: ${req.params.lenderUid}, LoanUid: ${req.params.loanUid}` 
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/approved/:lenderAddress
   * Listar todos los loans aprobados de un lender
   */
  async getApprovedLoansByLender(req, res, next) {
    try {
      const { lenderAddress } = req.params;

      const approvedLoans = await marketplaceBridgeService.getApprovedLoansByLender(lenderAddress);

      res.json({
        success: true,
        lenderAddress: lenderAddress,
        count: approvedLoans.length,
        data: approvedLoans
      });

    } catch (error) {
      console.error('Error in getApprovedLoansByLender:', error);
      next(error);
    }
  }

  /**
   * GET /api/marketplace/tokenized
   * Obtener todos los loans tokenizados
   */
  async getTokenizedLoans(req, res, next) {
    try {
      const tokenizedLoans = await marketplaceBridgeService.getTokenizedLoans();

      res.json({
        success: true,
        count: tokenizedLoans.length,
        data: tokenizedLoans
      });

    } catch (error) {
      console.error('Error in getTokenizedLoans:', error);
      next(error);
    }
  }

  /**
   * POST /api/marketplace/set-token-id
   * Relayer establece el tokenId de Avalanche después de mintear el NFT
   * IMPORTANTE: Ahora recibe lenderUid y loanUid
   */
  async setAvalancheTokenId(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid, tokenId } = req.body;

      if (!privateKey || !lenderUid || !loanUid || !tokenId) {
        return res.status(400).json({ 
          error: 'Private key, lenderUid, loanUid and tokenId required' 
        });
      }

      const result = await marketplaceBridgeService.setAvalancheTokenId(
        privateKey,
        lenderUid,
        loanUid,
        tokenId
      );

      res.json({
        success: true,
        message: 'Avalanche token ID set successfully',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in setAvalancheTokenId:', error);
      
      if (error.message.includes('Already minted')) {
        return res.status(400).json({ error: 'NFT already minted' });
      }
      if (error.message.includes('Loan not approved')) {
        return res.status(400).json({ error: 'Loan not approved or cancelled' });
      }
      if (error.message.includes('Approval was cancelled')) {
        return res.status(400).json({ error: 'Approval was cancelled' });
      }
      if (error.message.includes('Loan is not locked')) {
        return res.status(400).json({ error: 'Loan is not locked. Approve it for sale first.' });
      }
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can set token IDs' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/record-transfer
   * Relayer registra transferencia de ownership (compra/venta)
   * IMPORTANTE: Ahora recibe lenderUid y loanUid
   */
  async recordOwnershipTransfer(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid, newOwnerAddress, salePrice } = req.body;

      if (!privateKey || !lenderUid || !loanUid || !newOwnerAddress || !salePrice) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.recordOwnershipTransfer(
        privateKey,
        lenderUid,
        loanUid,
        newOwnerAddress,
        salePrice
      );

      res.json({
        success: true,
        message: 'Ownership transfer recorded',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in recordOwnershipTransfer:', error);
      
      if (error.message.includes('NFT not minted yet')) {
        return res.status(400).json({ error: 'NFT not minted yet' });
      }
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can record transfers' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/record-payment
   * Relayer registra pago del borrower
   * IMPORTANTE: Ahora recibe lenderUid y loanUid
   */
  async recordPayment(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid, amount } = req.body;

      if (!privateKey || !lenderUid || !loanUid || !amount) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.recordPayment(
        privateKey,
        lenderUid,
        loanUid,
        amount
      );

      res.json({
        success: true,
        message: 'Payment recorded',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in recordPayment:', error);
      
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can record payments' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/mark-paid-off
   * Relayer marca loan como pagado
   */
  async markLoanAsPaidOff(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid } = req.body;

      if (!privateKey || !lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.markLoanAsPaidOff(
        privateKey,
        lenderUid,
        loanUid
      );

      res.json({
        success: true,
        message: 'Loan marked as paid off',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in markLoanAsPaidOff:', error);
      
      if (error.message.includes('Not minted')) {
        return res.status(400).json({ error: 'Loan not tokenized yet' });
      }
      if (error.message.includes('Loan not paid off')) {
        return res.status(400).json({ error: 'Loan is not in Paid Off status' });
      }
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can mark loans as paid off' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/can-approve/:lenderUid/:loanUid/:lenderAddress
   * Verificar si un lender puede aprobar un préstamo
   */
  async canLenderApproveLoan(req, res, next) {
    try {
      const { lenderUid, loanUid, lenderAddress } = req.params;

      if (!lenderAddress) {
        return res.status(400).json({ error: 'lenderAddress query parameter is required' });
      }

      const result = await marketplaceBridgeService.canLenderApproveLoan(
        lenderUid,
        loanUid,
        lenderAddress
      );

      res.json({
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        lenderAddress: lenderAddress,
        canApprove: result.canApprove,
        reason: result.reason,
        recommendation: result.canApprove 
          ? 'You can proceed with approval' 
          : `Cannot approve: ${result.reason}`
      });

    } catch (error) {
      console.error('Error in canLenderApproveLoan:', error);
      next(error);
    }
  }

  /**
   * POST /api/marketplace/register-txhash
   * Registrar hash de transacción de aprobación
   */
  async registerApprovalTxHash(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid, txHash } = req.body;

      if (!privateKey || !lenderUid || !loanUid || !txHash) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.registerApprovalTxHash(
        privateKey,
        lenderUid,
        loanUid,
        txHash
      );

      res.json({
        success: true,
        message: 'Transaction hash registered successfully',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in registerApprovalTxHash:', error);
      
      if (error.message.includes('Loan not approved')) {
        return res.status(400).json({ error: 'Loan not approved yet' });
      }
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can register transaction hashes' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/txhash/:txHash
   * Obtener loanId por hash de transacción
   */
  async getLoanIdByTxHash(req, res, next) {
    try {
      const { txHash } = req.params;

      const loanId = await marketplaceBridgeService.getLoanIdByTxHash(txHash);

      res.json({
        success: true,
        txHash: txHash,
        loanId: loanId
      });

    } catch (error) {
      console.error('Error in getLoanIdByTxHash:', error);
      
      if (error.message.includes('TxHash not found')) {
        return res.status(404).json({ error: 'Transaction hash not found in registry' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/approval-by-txhash/:txHash
   * Obtener datos de aprobación por hash de transacción
   */
  async getApprovalDataByTxHash(req, res, next) {
    try {
      const { txHash } = req.params;

      const result = await marketplaceBridgeService.getApprovalDataByTxHash(txHash);

      res.json({
        success: true,
        txHash: txHash,
        data: result
      });

    } catch (error) {
      console.error('Error in getApprovalDataByTxHash:', error);
      
      if (error.message.includes('TxHash not found')) {
        return res.status(404).json({ error: 'Transaction hash not found' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/emergency-unlock
   * Función de emergencia para desbloquear (solo owner)
   */
  async emergencyUnlock(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid } = req.body;

      if (!privateKey || !lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.emergencyUnlock(
        privateKey,
        lenderUid,
        loanUid
      );

      res.json({
        success: true,
        message: 'Loan unlocked in emergency mode',
        warning: 'SYNC NEEDED: If NFT was minted, you must also burn/retire it on Avalanche',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in emergencyUnlock:', error);
      
      if (error.message.includes('Not approved')) {
        return res.status(400).json({ error: 'Loan not approved' });
      }
      if (error.message.includes('NFT already minted')) {
        return res.status(400).json({ 
          error: 'NFT already minted. Cannot emergency unlock.' 
        });
      }
      if (error.message.includes('Only owner')) {
        return res.status(403).json({ error: 'Only contract owner can perform emergency unlock' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/force-unlock-paid-off
   * Forzar desbloqueo para préstamos pagados (solo relayer)
   */
  async forceUnlockPaidOffLoan(req, res, next) {
    try {
      const { privateKey, lenderUid, loanUid } = req.body;

      if (!privateKey || !lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.forceUnlockPaidOffLoan(
        privateKey,
        lenderUid,
        loanUid
      );

      res.json({
        success: true,
        message: 'Paid off loan unlocked successfully',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });
    } catch (error) {
      console.error('Error in forceUnlockPaidOffLoan:', error);
      
      if (error.message.includes('Loan not paid off')) {
        return res.status(400).json({ error: 'Loan is not in Paid Off status' });
      }
      if (error.message.includes('Only MarketplaceBridge')) {
        return res.status(403).json({ error: 'Only the relayer can force unlock paid off loans' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/relayer-address
   * Obtener dirección del relayer configurada
   */
  async getRelayerAddress(req, res, next) {
    try {
      const relayerAddress = await marketplaceBridgeService.getRelayerAddress();

      res.json({
        success: true,
        relayerAddress: relayerAddress
      });

    } catch (error) {
      console.error('Error in getRelayerAddress:', error);
      next(error);
    }
  }
}

module.exports = new MarketplaceController();