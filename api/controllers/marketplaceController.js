const marketplaceBridgeService = require('../services/MarketplaceBridgeService');
const loanService = require('../services/LoanRegistryService');

class MarketplaceController {

  constructor() {
    marketplaceBridgeService.setLoanRegistryService(loanService);
  }

  /**
   * POST /api/marketplace/approve
   * ⭐ ACTUALIZADO: Sin privateKey en body, sin modifiedInterestRate
   * 
   * Body: { lenderUid, loanUid, askingPrice }
   */
  async approveLoanForSale(req, res, next) {
    try {
      const { lenderUid, loanUid, askingPrice } = req.body;

      // Validaciones
      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      if (!askingPrice || askingPrice <= 0) {
        return res.status(400).json({ error: 'Valid asking price required' });
      }

      // Verificar que el loan existe
      const exists = await marketplaceBridgeService._verifyLoanExists(lenderUid, loanUid);
      if (!exists) {
        return res.status(404).json({
          error: `Loan not found for LenderUid: ${lenderUid}, LoanUid: ${loanUid}`
        });
      }

      // Verificar estado del loan
      const loan = await marketplaceBridgeService._getLoanFromBlockchain(lenderUid, loanUid);

      if (loan.isTokenized) {
        return res.status(400).json({
          error: 'Loan is already tokenized',
          tokenId: loan.AvalancheTokenId || 'Unknown'
        });
      }

      // ⭐ PASO 1: Aprobar para venta
      console.log(`📝 Approving loan for sale: ${loanUid}`);
      const approvalResult = await marketplaceBridgeService.approveLoanForSale(
        lenderUid,
        loanUid,
        askingPrice
      );
      console.log(`✅ Loan approved. TxHash: ${approvalResult.txHash}`);

      // ⭐ PASO 2: Registrar automáticamente el txHash
      let registrationResult = null;
      try {
        console.log(`📝 Registering txHash in contract: ${approvalResult.txHash}`);

        registrationResult = await marketplaceBridgeService.registerApprovalTxHash(
          lenderUid,
          loanUid,
          approvalResult.txHash
        );

        console.log(`✅ TxHash registered successfully in block ${registrationResult.blockNumber}`);
      } catch (regError) {
        console.error(`⚠️ Failed to register txHash automatically: ${regError.message}`);
        // No fallar la operación completa, solo loguear el warning
        console.error(`⚠️ User should call /register-txhash manually with txHash: ${approvalResult.txHash}`);
      }

      res.status(200).json({
        success: true,
        message: 'Loan approved for tokenization. The relayer will process it shortly.',
        loanId: approvalResult.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        noteRate: approvalResult.noteRate,
        approvalTxHash: approvalResult.txHash, // ⭐ Incluir el txHash en la respuesta
        data: {
          approval: approvalResult,
          txHashRegistration: registrationResult ? {
            registered: true,
            registrationTxHash: registrationResult.txHash,
            blockNumber: registrationResult.blockNumber
          } : {
            registered: false,
            warning: 'TxHash was not registered automatically. Please call /register-txhash manually.',
            pendingTxHash: approvalResult.txHash
          }
        }
      });

    } catch (error) {
      console.error('Error in approveLoanForSale:', error);

      if (error.message.includes('PRIVATE_KEY not configured')) {
        return res.status(500).json({
          error: 'Server configuration error: Private key not set'
        });
      }
      if (error.message.includes('Already approved')) {
        return res.status(400).json({ error: 'Loan is already approved for sale' });
      }
      if (error.message.includes('Not the loan lender')) {
        return res.status(403).json({
          error: 'Only the loan lender can approve it for sale'
        });
      }
      if (error.message.includes('Loan is already locked')) {
        return res.status(400).json({ error: 'Loan is already being processed' });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/cancel
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async cancelSaleListing(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      const result = await marketplaceBridgeService.cancelSaleListing(
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

      if (error.message.includes('PRIVATE_KEY not configured')) {
        return res.status(500).json({
          error: 'Server configuration error: Private key not set'
        });
      }
      if (error.message.includes('Not approved for sale')) {
        return res.status(400).json({ error: 'Loan is not approved for sale' });
      }
      if (error.message.includes('Already cancelled')) {
        return res.status(400).json({ error: 'Approval was already cancelled' });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/approval/:lenderUid/:loanUid
   * ⭐ ACTUALIZADO: Ya no retorna modifiedInterestRate
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

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Approval data not found'
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/status/:lenderUid/:loanUid
   */
  async getTokenizationStatus(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;

      const loan = await marketplaceBridgeService._getLoanFromBlockchain(lenderUid, loanUid);

      let approval = null;
      try {
        approval = await marketplaceBridgeService.getApprovalData(lenderUid, loanUid);
      } catch (error) {
        console.log('No approval data found for loan:', loan.ID);
      }

      const status = {
        loanId: loan.ID,
        lenderUid: lenderUid,
        loanUid: loanUid,
        isLocked: loan.isLocked || false,
        isTokenized: loan.isTokenized || false,
        avalancheTokenId: loan.AvalancheTokenId || '0',
        canBeMinted: approval ? (approval.isApproved && !approval.isMinted) : false,
        isApprovedForSale: approval ? (approval.isApproved && !approval.isCancelled) : false,
        loanDetails: {
          currentBalance: loan.CurrentBalance,
          status: loan.Status,
          noteRate: loan.NoteRate,
          lenderAddress: loan.LenderAddress
        },
        approval: approval
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error in getTokenizationStatus:', error);

      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return res.status(404).json({
          success: false,
          error: `Loan not found: ${error.message}`
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/marketplace/approved/:lenderAddress
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
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async setAvalancheTokenId(req, res, next) {
    try {
      const { lenderUid, loanUid, tokenId } = req.body;

      if (!lenderUid || !loanUid || !tokenId) {
        return res.status(400).json({
          error: 'lenderUid, loanUid and tokenId required'
        });
      }

      const result = await marketplaceBridgeService.setAvalancheTokenId(
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
      next(error);
    }
  }

  /**
   * POST /api/marketplace/record-transfer
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async recordOwnershipTransfer(req, res, next) {
    try {
      const { lenderUid, loanUid, newOwnerAddress, salePrice } = req.body;

      if (!lenderUid || !loanUid || !newOwnerAddress || !salePrice) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.recordOwnershipTransfer(
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
      next(error);
    }
  }

  /**
   * POST /api/marketplace/record-payment
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async recordPayment(req, res, next) {
    try {
      const { lenderUid, loanUid, amount } = req.body;

      if (!lenderUid || !loanUid || !amount) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.recordPayment(
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
      next(error);
    }
  }

  /**
   * POST /api/marketplace/mark-paid-off
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async markLoanAsPaidOff(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.markLoanAsPaidOff(
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
      next(error);
    }
  }

  /**
   * GET /api/marketplace/can-approve/:lenderUid/:loanUid/:lenderAddress
   */
  async canLenderApproveLoan(req, res, next) {
    try {
      const { lenderUid, loanUid, lenderAddress } = req.params;

      if (!lenderAddress) {
        return res.status(400).json({ error: 'lenderAddress parameter is required' });
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
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async registerApprovalTxHash(req, res, next) {
    try {
      const { lenderUid, loanUid, txHash } = req.body;

      if (!lenderUid || !loanUid || !txHash) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.registerApprovalTxHash(
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
      next(error);
    }
  }

  /**
   * GET /api/marketplace/txhash/:txHash
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
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async emergencyUnlock(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.emergencyUnlock(
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
      next(error);
    }
  }

  /**
   * POST /api/marketplace/force-unlock-paid-off
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async forceUnlockPaidOffLoan(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'All fields required' });
      }

      const result = await marketplaceBridgeService.forceUnlockPaidOffLoan(
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
      next(error);
    }
  }

  /**
   * GET /api/marketplace/relayer-address
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

  /**
   * POST /api/marketplace/request-burn-cancel
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async requestBurnAndCancel(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      const canCancelStatus = await marketplaceBridgeService.canCancel(lenderUid, loanUid);

      if (!canCancelStatus.canCancelNow) {
        return res.status(400).json({
          error: 'Cannot cancel this listing',
          details: 'Loan may not be approved or is already cancelled'
        });
      }

      if (!canCancelStatus.needsBurn) {
        const result = await marketplaceBridgeService.cancelSaleListing(
          lenderUid,
          loanUid
        );

        return res.json({
          success: true,
          message: 'Sale listing cancelled successfully',
          type: 'direct_cancel',
          loanId: result.loanId,
          lenderUid: lenderUid,
          loanUid: loanUid,
          data: result
        });
      }

      const tokenId = await marketplaceBridgeService.getTokenIdForLoan(lenderUid, loanUid);

      const result = await marketplaceBridgeService.requestBurnAndCancel(
        lenderUid,
        loanUid
      );

      res.status(200).json({
        success: true,
        message: 'Burn request submitted successfully',
        type: 'burn_required',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        avalancheTokenId: tokenId,
        nextStep: 'Relayer must burn the NFT on Avalanche chain',
        data: result
      });

    } catch (error) {
      console.error('Error in requestBurnAndCancel:', error);

      if (error.message.includes('NFT not minted yet')) {
        return res.status(400).json({
          error: 'NFT not minted yet, use cancelSaleListing instead'
        });
      }
      next(error);
    }
  }

  /**
   * POST /api/marketplace/confirm-burn-cancel
   * ⭐ ACTUALIZADO: Sin privateKey en body
   */
  async confirmBurnAndCancel(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.body;

      if (!lenderUid || !loanUid) {
        return res.status(400).json({ error: 'LenderUid and LoanUid are required' });
      }

      const result = await marketplaceBridgeService.confirmBurnAndCancel(
        lenderUid,
        loanUid
      );

      res.json({
        success: true,
        message: 'NFT burn confirmed and loan unlocked successfully',
        loanId: result.loanId,
        lenderUid: lenderUid,
        loanUid: loanUid,
        data: result
      });

    } catch (error) {
      console.error('Error in confirmBurnAndCancel:', error);
      next(error);
    }
  }

  /**
   * GET /api/marketplace/can-cancel/:lenderUid/:loanUid
   */
  async canCancel(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;

      const canCancelStatus = await marketplaceBridgeService.canCancel(lenderUid, loanUid);

      let tokenId = '0';
      let approvalData = null;

      try {
        approvalData = await marketplaceBridgeService.getApprovalData(lenderUid, loanUid);
        if (approvalData.isMinted) {
          tokenId = await marketplaceBridgeService.getTokenIdForLoan(lenderUid, loanUid);
        }
      } catch (error) {
        // No hay aprobación
      }

      const response = {
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        canCancelNow: canCancelStatus.canCancelNow,
        needsBurn: canCancelStatus.needsBurn,
        recommendation: canCancelStatus.canCancelNow
          ? (canCancelStatus.needsBurn
            ? 'Use requestBurnAndCancel (NFT must be burned on Avalanche)'
            : 'Use cancelSaleListing (direct cancellation)')
          : 'Cannot cancel this listing',
        currentStatus: {
          isApproved: approvalData?.isApproved || false,
          isMinted: approvalData?.isMinted || false,
          isCancelled: approvalData?.isCancelled || false,
          avalancheTokenId: tokenId !== '0' ? tokenId : null
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error in canCancel:', error);
      next(error);
    }
  }

  /**
   * GET /api/marketplace/token-id/:lenderUid/:loanUid
   */
  async getTokenId(req, res, next) {
    try {
      const { lenderUid, loanUid } = req.params;

      const tokenId = await marketplaceBridgeService.getTokenIdForLoan(lenderUid, loanUid);

      let approval = null;
      try {
        approval = await marketplaceBridgeService.getApprovalData(lenderUid, loanUid);
      } catch (error) {
        // No hay aprobación
      }

      res.json({
        success: true,
        lenderUid: lenderUid,
        loanUid: loanUid,
        tokenId: tokenId,
        isMinted: approval?.isMinted || false,
        isActive: approval?.isApproved && !approval?.isCancelled || false,
        message: tokenId !== '0'
          ? `NFT is minted with token ID: ${tokenId}`
          : 'NFT not minted yet'
      });

    } catch (error) {
      console.error('Error in getTokenId:', error);
      next(error);
    }
  }
}

module.exports = new MarketplaceController();