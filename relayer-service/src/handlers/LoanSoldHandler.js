// LoanSoldHandler.js
import BaseHandler from './BaseHandler.js';
import besuService from '../services/BesuService.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';

/**
 * Handle LoanSold event from Avalanche
 * 
 * DECISIÓN DE DISEÑO sobre el nuevo dueño:
 * El comprador tiene wallet en Avalanche pero NO está registrado en Besu UserRegistry.
 * NO intentamos registrarlo — solo registramos la transferencia en MarketplaceBridge
 * emitiendo el evento OwnershipTransferred con su wallet address.
 * 
 * La fuente de verdad del dueño actual es Avalanche: loanNFT.ownerOf(tokenId)
 * Besu solo guarda el historial de la venta para auditoría.
 * 
 * Flow:
 *   1. Obtener loanId del tokenId
 *   2. Actualizar metadata del NFT (status → "Sold")  
 *   3. Registrar transferencia en MarketplaceBridge de Besu (solo auditoría)
 *   4. Actualizar LoanRegistry en Besu con el nuevo status
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

      logger.info('Processing NFT sale', {
        tokenId: tokenId?.toString(),
        seller,
        buyer,
        price: price?.toString()
      });

      // PASO 1: Obtener loanId del tokenId
      const loanNFT = avalancheService.getContract('loanNFT');
      const loanId = await loanNFT.tokenIdToLoanId(tokenId);

      if (!loanId || loanId === '') {
        throw new Error(`Could not find loan ID for token ${tokenId}`);
      }

      logger.info('Loan identified', { tokenId: tokenId?.toString(), loanId });

      // PASO 2: Actualizar metadata del NFT (status → "Sold")
      try {
        const currentMeta = await loanNFT.getLoanMetadata(tokenId);
        const bridgeReceiver = avalancheService.getContract('bridgeReceiver');

        const timestamp = Math.floor(Date.now() / 1000);
        const nonce = stateManager.getNonce(loanId);

        const messageHash = ethers.keccak256(
          ethers.solidityPacked(
            ['string', 'string', 'uint256', 'string', 'uint256', 'uint256'],
            ['UPDATE', loanId, currentMeta.currentBalance, 'Sold', timestamp, nonce]
          )
        );

        const signatures = await this.collectSignatures(messageHash);

        const updateTx = await bridgeReceiver.processMetadataUpdate(
          loanId,
          currentMeta.currentBalance,
          'Sold',
          timestamp,
          nonce,
          signatures,
          { gasLimit: 300000 }
        );
        await updateTx.wait();

        logger.info('NFT metadata updated to Sold', { tokenId, loanId });
      } catch (updateError) {
        // No crítico — el NFT ya fue transferido, solo falla el status
        logger.warn('Failed to update NFT metadata to Sold (non-critical)', {
          loanId,
          error: updateError.message
        });
      }

      // PASO 3: Registrar transferencia en MarketplaceBridge de Besu (auditoría)
      // IMPORTANTE: El buyer puede no estar en UserRegistry — eso está bien.
      // MarketplaceBridge.recordOwnershipTransfer() solo emite un evento,
      // no intenta registrar al usuario en ningún mapping de Besu.
      // La fuente de verdad del dueño = loanNFT.ownerOf(tokenId) en Avalanche.
      try {
        logger.info('Recording ownership transfer in Besu for audit', {
          loanId,
          seller,
          buyer,
          price: price?.toString()
        });

        const marketplaceBridge = besuService.getContract('marketplaceBridge');
        const besuTx = await marketplaceBridge.recordOwnershipTransfer(
          loanId,
          buyer,   // wallet address del comprador en Avalanche
          price,
          { gasLimit: 300000 }
        );
        const besuReceipt = await besuTx.wait();

        logger.info('Ownership transfer recorded in Besu', {
          loanId,
          buyer,
          besuTx: besuReceipt.hash
        });
      } catch (besuError) {
        // No crítico — la venta en Avalanche ya fue exitosa
        logger.warn('Failed to record ownership in Besu (non-critical)', {
          loanId,
          error: besuError.message
        });
      }

      // PASO 4: Actualizar LoanRegistry con nuevo status "Sold"
      // Usamos updateLockedLoan que permite actualizar loans locked/tokenizados
      try {
        const loanRegistry = besuService.getContract('loanRegistry');
        const loanData = await loanRegistry.readLoan(loanId);

        const updateTx = await loanRegistry.updateLockedLoan(
          loanId,
          loanData.CurrentBalance,  // balance no cambia por la venta
          'Sold',
          loanData.PaidToDate,
          { gasLimit: 300000 }
        );
        await updateTx.wait();

        logger.info('LoanRegistry updated with Sold status', { loanId });
      } catch (registryError) {
        logger.warn('Failed to update LoanRegistry status (non-critical)', {
          loanId,
          error: registryError.message
        });
      }

      stateManager.incrementMetric('salesRecorded');

      this.logSuccess(event, {
        loanId,
        tokenId: tokenId?.toString(),
        seller,
        newOwner: buyer,
      });

      return {
        success: true,
        loanId,
        tokenId: tokenId?.toString(),
        seller,
        newOwner: buyer,
        price: price?.toString()
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
    if (!event.tokenId) throw new Error('Missing token ID');
    if (!event.buyer) throw new Error('Missing buyer address');
    if (!event.price) throw new Error('Missing sale price');
    return true;
  }
}

export default LoanSoldHandler;