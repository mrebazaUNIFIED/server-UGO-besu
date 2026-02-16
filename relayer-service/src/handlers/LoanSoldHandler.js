import BaseHandler from './BaseHandler.js';
import besuService from '../services/BesuService.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';

/**
 * Handle LoanSold event from Avalanche
 * Flow: NFT sold in Avalanche → Record new owner in Besu
 */
class LoanSoldHandler extends BaseHandler {
  constructor() {
    super('LoanSoldHandler');
  }

  async process(event) {
    this.validate(event);
    this.logStart(event);

    try {
      const { tokenId, seller, buyer, price } = event;

      logger.info(`Processing NFT sale`, {
        tokenId: tokenId?.toString(),
        seller,
        buyer,
        price: price?.toString()
      });

      // Step 1: Get loanId from tokenId
      logger.info(`Finding loan ID for token`, { tokenId: tokenId?.toString() });
      
      const loanNFT = avalancheService.getContract('loanNFT');
      const loanId = await loanNFT.tokenIdToLoanId(tokenId);

      if (!loanId || loanId === "") {
        throw new Error(`Could not find loan ID for token ${tokenId}`);
      }

      logger.info(`Loan identified`, { 
        tokenId: tokenId?.toString(), 
        loanId 
      });

      // Step 2: Record ownership transfer in Besu
      logger.info(`Recording ownership transfer in Besu`, {
        loanId,
        newOwner: buyer,
        price: price?.toString()
      });

      const marketplaceBridge = besuService.getContract('marketplaceBridge');
      
      const tx = await marketplaceBridge.recordOwnershipTransfer(
        loanId,      // string loanId
        buyer,       // address newOwnerAddress
        price,       // uint256 salePrice
        {
          gasLimit: 300000
        }
      );

      logger.info(`Ownership transfer record transaction sent`, {
        txHash: tx.hash,
        loanId
      });

      const receipt = await tx.wait();

      logger.info(`Ownership transfer recorded in Besu`, {
        loanId,
        newOwner: buyer,
        besuTx: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      // Step 3: Update metrics
      stateManager.incrementMetric('salesRecorded');

      this.logSuccess(event, {
        loanId,
        tokenId: tokenId?.toString(),
        newOwner: buyer,
        besuTxHash: receipt.hash
      });

      return {
        success: true,
        loanId,
        tokenId: tokenId?.toString(),
        newOwner: buyer,
        besuTxHash: receipt.hash
      };

    } catch (error) {
      this.logError(event, error);
      stateManager.incrementMetric('errors');
      throw error;
    }
  }

  validate(event) {
    super.validate(event);
    
    if (!event.tokenId) {
      throw new Error('Missing token ID');
    }
    if (!event.buyer) {
      throw new Error('Missing buyer address');
    }
    if (!event.price) {
      throw new Error('Missing sale price');
    }

    return true;
  }
}

export default LoanSoldHandler;