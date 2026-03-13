import BaseHandler from './BaseHandler.js';
import avalancheService from '../services/AvalancheService.js';
import besuService from '../services/BesuService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';

/**
 * Handle LoanApprovalCancelled event from Besu
 * Flow: Besu approval cancelled → Update NFT status AND asking price in Avalanche
 * 
 * ✅ VERSIÓN COMPLETA: Requiere contrato LoanNFT con updateAskingPrice() o updateFullMetadata()
 */
class LoanApprovalCancelledHandler extends BaseHandler {
  constructor() {
    super('LoanApprovalCancelledHandler');
  }

  async process(event) {
    this.validate(event);
    this.logStart(event);

    try {
      const { loanId, lenderAddress, transactionHash } = event;

      logger.info(`Processing loan approval cancellation`, {
        loanId,
        lender: lenderAddress,
        txHash: transactionHash
      });

      // Check if NFT exists
      const tokenId = stateManager.getNFTForLoan(loanId);

      if (!tokenId) {
        logger.info('NFT not minted yet for this loan - no action needed', { loanId });
        return {
          success: true,
          loanId,
          reason: 'NFT not minted yet',
          skipped: true
        };
      }

      logger.info('Found NFT for cancelled loan, updating metadata', {
        loanId,
        tokenId
      });

      // Get LoanNFT contract
      const loanNFT = avalancheService.getContract('loanNFT');

      // Get current metadata
      const currentMetadata = await loanNFT.getLoanMetadata(tokenId);

      logger.info('Current NFT metadata', {
        loanId,
        tokenId,
        currentStatus: currentMetadata.status,
        currentBalance: currentMetadata.currentBalance.toString(),
        currentAskingPrice: currentMetadata.askingPrice.toString()
      });

      // Get fresh loan data from Besu
      const loanRegistry = besuService.getContract('loanRegistry');
      const loanData = await loanRegistry.readLoan(loanId);

      const updatedBalance = loanData.CurrentBalance;
      const newStatus = 'Active';

      logger.info('Updating NFT: status and asking price', {
        loanId,
        tokenId,
        newBalance: updatedBalance.toString(),
        newStatus: newStatus,
        newAskingPrice: 0
      });

      // OPCIÓN A: Si tienes updateFullMetadata (método nuevo)
      if (typeof loanNFT.updateFullMetadata === 'function') {
        const location = `${loanData.BorrowerCity || 'N/A'}, ${loanData.BorrowerState || 'N/A'}`;

        const tx = await loanNFT.updateFullMetadata(
          tokenId,
          updatedBalance,
          loanData.ScheduledPayment,
          loanData.IntRate,
          newStatus,
          location,
          0, // askingPrice = 0
          { gasLimit: 400000 }
        );

        logger.info('Full metadata update transaction sent', {
          loanId,
          tokenId,
          txHash: tx.hash
        });

        const receipt = await tx.wait();

        logger.info('NFT metadata updated successfully (full)', {
          loanId,
          tokenId,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber
        });

      }
      // OPCIÓN B: Si tienes updateAskingPrice (método nuevo)
      else if (typeof loanNFT.updateAskingPrice === 'function') {
        // Primero actualizar status
        const tx1 = await loanNFT.updateMetadata(
          tokenId,
          updatedBalance,
          newStatus,
          { gasLimit: 300000 }
        );
        await tx1.wait();

        // Luego limpiar asking price
        const tx2 = await loanNFT.updateAskingPrice(
          tokenId,
          0,
          { gasLimit: 200000 }
        );
        const receipt = await tx2.wait();

        logger.info('NFT metadata updated successfully (status + price)', {
          loanId,
          tokenId,
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber
        });

      }
      // OPCIÓN C: Fallback - solo actualizar status (asking price se queda)
      else {
        logger.warn('updateAskingPrice not available, only updating status', {
          loanId,
          tokenId
        });

        const tx = await loanNFT.updateMetadata(
          tokenId,
          updatedBalance,
          newStatus,
          { gasLimit: 300000 }
        );

        const receipt = await tx.wait();

        logger.warn('NFT status updated but askingPrice NOT cleared', {
          loanId,
          tokenId,
          txHash: receipt.hash,
          askingPriceStillSet: currentMetadata.askingPrice.toString()
        });
      }

      stateManager.incrementMetric('nftsUpdated');

      this.logSuccess(event, {
        loanId,
        tokenId,
        newStatus: newStatus,
        newBalance: updatedBalance.toString()
      });

      return {
        success: true,
        loanId,
        tokenId,
        newStatus: newStatus,
        newBalance: updatedBalance.toString()
      };

    } catch (error) {
      this.logError(event, error);
      stateManager.incrementMetric('errors');

      if (error.message.includes('Token does not exist') ||
        error.message.includes('nonexistent token') ||
        error.message.includes('ERC721: invalid token ID')) {
        logger.info('NFT does not exist yet - cancellation processed in Besu only', {
          loanId: event.loanId
        });
        return {
          success: true,
          loanId: event.loanId,
          reason: 'NFT not minted yet',
          skipped: true
        };
      }

      throw error;
    }
  }

  validate(event) {
    super.validate(event);

    if (!event.loanId) {
      throw new Error('Missing loan ID');
    }
    if (!event.lenderAddress) {
      throw new Error('Missing lender address');
    }

    return true;
  }
}

export default LoanApprovalCancelledHandler;