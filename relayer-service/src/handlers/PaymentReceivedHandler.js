import BaseHandler from './BaseHandler.js';
import avalancheService from '../services/AvalancheService.js';
import besuService from '../services/BesuService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';

/**
 * Handle PaymentRecorded event from Besu
 * Flow: Payment received in Besu → Update NFT metadata (opcional) → Record payment via bridge
 */
class PaymentReceivedHandler extends BaseHandler {
  constructor() {
    super('PaymentReceivedHandler');
  }

  async process(event) {
    this.validate(event);
    this.logStart(event);

    try {
      const { loanId, amount } = event;

      logger.info(`Processing payment`, { 
        loanId, 
        amount: amount?.toString() 
      });

      // Step 1: Get token ID for this loan
      const tokenId = stateManager.getNFTForLoan(loanId);

      if (!tokenId) {
        logger.warn(`No NFT found for loan, skipping payment distribution`, { 
          loanId 
        });
        return { 
          success: false, 
          reason: 'NFT not found for this loan' 
        };
      }

      logger.info(`Found NFT for loan`, { loanId, tokenId });

      // Step 2: Update NFT metadata (OPCIONAL)
      try {
        logger.info(`Fetching updated loan data from Besu`, { loanId });
        const loanRegistry = besuService.getContract('loanRegistry');
        const loanData = await loanRegistry.readLoan(loanId);

        const newBalance = loanData.CurrentPrincipalBal;
        const newStatus = loanData.Status;

        logger.info(`Updating NFT metadata`, {
          tokenId,
          newBalance: newBalance?.toString(),
          newStatus
        });

        const loanNFT = avalancheService.getContract('loanNFT');
        const updateTx = await loanNFT.updateMetadata(
          tokenId,
          newBalance,
          newStatus,
          {
            gasLimit: 200000
          }
        );

        await updateTx.wait();
        logger.info(`NFT metadata updated`, { tokenId });
      } catch (error) {
        logger.warn(`Failed to update NFT metadata (non-critical)`, {
          tokenId,
          error: error.message
        });
      }

      // Step 3: Generar mensaje para multi-sig
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = stateManager.getNonce(loanId);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['string', 'string', 'uint256', 'uint256', 'uint256'],
          ['PAYMENT', loanId, amount, timestamp, nonce]
        )
      );

      // Step 4: Recolectar firmas
      const signatures = await this.collectSignatures(messageHash);  // Igual que en LoanApproved

      // Step 5: Llamar processPayment en BridgeReceiver
      logger.info(`Calling processPayment in Avalanche`, { loanId });
      const bridgeReceiver = avalancheService.getContract('bridgeReceiver');
      const tx = await bridgeReceiver.processPayment(
        loanId, amount, timestamp, nonce, signatures,
        { gasLimit: 500000 }
      );

      logger.info(`Process payment transaction sent`, {
        txHash: tx.hash,
        tokenId
      });

      const receipt = await tx.wait();

      logger.info(`Payment processed successfully via bridge`, {
        tokenId,
        amount: amount?.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

      // Step 6: Update metrics
      stateManager.incrementMetric('paymentsDistributed');

      this.logSuccess(event, {
        loanId,
        tokenId,
        amount: amount?.toString(),
        avalancheTxHash: receipt.hash
      });

      return {
        success: true,
        loanId,
        tokenId,
        amount: amount?.toString(),
        avalancheTxHash: receipt.hash
      };

    } catch (error) {
      this.logError(event, error);
      stateManager.incrementMetric('errors');
      throw error;
    }
  }

  // Placeholder para signatures (igual que arriba)
  async collectSignatures(messageHash) {
    const validatorKeys = [process.env.VALIDATOR_PK1, process.env.VALIDATOR_PK2];
    const signatures = [];
    for (const pk of validatorKeys) {
      const wallet = new ethers.Wallet(pk);
      const sig = await wallet.signMessage(ethers.getBytes(messageHash));
      signatures.push(sig);
    }
    return signatures;
  }

  validate(event) {
    super.validate(event);

    if (!event.loanId) {
      throw new Error('Missing loan ID');
    }
    if (!event.amount) {
      throw new Error('Missing payment amount');
    }

    return true;
  }
}

export default PaymentReceivedHandler;