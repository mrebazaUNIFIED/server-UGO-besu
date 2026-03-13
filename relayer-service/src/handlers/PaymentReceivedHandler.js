import BaseHandler from './BaseHandler.js';
import avalancheService from '../services/AvalancheService.js';
import besuService from '../services/BesuService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';

/**
 * Handle PaymentRecorded event from Besu
 * Flow:
 *   1. Mintear USFCI al PaymentDistributor (respaldado por pago real en Besu)
 *   2. Llamar processPayment en BridgeReceiver → recordPendingPayment
 *   3. Actualizar metadata del NFT (nuevo balance)
 *   4. Registrar pago en MarketplaceBridge de Besu
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

      logger.info('Processing payment', {
        loanId,
        amount: amount?.toString()
      });

      // PASO 1: Obtener tokenId del loan
      const tokenId = stateManager.getNFTForLoan(loanId);

      if (!tokenId) {
        logger.warn('No NFT found for loan, skipping payment distribution', { loanId });
        return { success: false, reason: 'NFT not found for this loan' };
      }

      logger.info('Found NFT for loan', { loanId, tokenId });

      // PASO 2: Mintear USFCI al PaymentDistributor
      // El amount viene de Besu en la misma unidad que USFCI (18 decimales)
      // Si en Besu el amount es en dólares enteros → convertir aquí
      try {
        const reserveProof = `PAYMENT-${loanId}-${Date.now()}`;
        await avalancheService.mintUSFCI(amount, reserveProof);

        logger.info('USFCI minted to PaymentDistributor', {
          loanId,
          amount: ethers.formatUnits(amount, 18),
          reserveProof
        });
      } catch (mintError) {
        // Si falla el mint, NO podemos registrar el pago — los fondos no existen
        logger.error('Failed to mint USFCI — aborting payment processing', {
          loanId,
          error: mintError.message
        });
        throw mintError;
      }

      // PASO 3: Llamar processPayment en BridgeReceiver
      // Esto llama recordPendingPayment en PaymentDistributor
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = stateManager.getNonce(loanId);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['string', 'string', 'uint256', 'uint256', 'uint256'],
          ['PAYMENT', loanId, amount, timestamp, nonce]
        )
      );

      const signatures = await this.collectSignatures(messageHash);

      logger.info('Calling processPayment in BridgeReceiver', { loanId, tokenId });

      const bridgeReceiver = avalancheService.getContract('bridgeReceiver');
      const paymentTx = await bridgeReceiver.processPayment(
        loanId,
        amount,
        timestamp,
        nonce,
        signatures,
        { gasLimit: 500000 }
      );

      const paymentReceipt = await paymentTx.wait();

      logger.info('Payment processed via BridgeReceiver', {
        loanId,
        tokenId,
        txHash: paymentReceipt.hash
      });

      // PASO 4: Actualizar metadata del NFT con nuevo balance de Besu
      try {
        const loanRegistry = besuService.getContract('loanRegistry');
        const loanData = await loanRegistry.readLoan(loanId);

        // ⭐ Campo correcto: CurrentBalance (no CurrentPrincipalBal)
        const newBalance = loanData.CurrentBalance;
        const newStatus = loanData.Status;

        const updateTimestamp = Math.floor(Date.now() / 1000);
        const updateNonce = stateManager.getNonce(loanId);

        const updateHash = ethers.keccak256(
          ethers.solidityPacked(
            ['string', 'string', 'uint256', 'string', 'uint256', 'uint256'],
            ['UPDATE', loanId, newBalance, newStatus, updateTimestamp, updateNonce]
          )
        );

        const updateSignatures = await this.collectSignatures(updateHash);

        const updateTx = await bridgeReceiver.processMetadataUpdate(
          loanId,
          newBalance,
          newStatus,
          updateTimestamp,
          updateNonce,
          updateSignatures,
          { gasLimit: 300000 }
        );
        await updateTx.wait();

        logger.info('NFT metadata updated after payment', {
          tokenId,
          newBalance: newBalance.toString(),
          newStatus
        });
      } catch (updateError) {
        logger.warn('Failed to update NFT metadata after payment (non-critical)', {
          loanId,
          error: updateError.message
        });
      }

      // PASO 5: Registrar pago en MarketplaceBridge de Besu
      try {
        const marketplaceBridge = besuService.getContract('marketplaceBridge');
        const besuTx = await marketplaceBridge.recordPayment(
          loanId,
          amount,
          { gasLimit: 200000 }
        );
        await besuTx.wait();

        logger.info('Payment recorded in Besu MarketplaceBridge', { loanId });
      } catch (besuError) {
        logger.warn('Failed to record payment in Besu (non-critical)', {
          loanId,
          error: besuError.message
        });
      }

      stateManager.incrementMetric('paymentsDistributed');

      this.logSuccess(event, {
        loanId,
        tokenId,
        amount: amount?.toString(),
        avalancheTxHash: paymentReceipt.hash
      });

      return {
        success: true,
        loanId,
        tokenId,
        amount: amount?.toString(),
        avalancheTxHash: paymentReceipt.hash
      };

    } catch (error) {
      this.logError(event, error);
      stateManager.incrementMetric('errors');
      throw error;
    }
  }

  async collectSignatures(messageHash) {
    const validatorKeys = [
      process.env.VALIDATOR_PK1,
      process.env.VALIDATOR_PK2,
      process.env.VALIDATOR_PK3,
      process.env.VALIDATOR_PK4
    ].filter(pk => pk && pk.trim().length > 0 && pk !== 'undefined');

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
    if (!event.loanId) throw new Error('Missing loan ID');
    if (!event.amount) throw new Error('Missing payment amount');
    return true;
  }
}

export default PaymentReceivedHandler;