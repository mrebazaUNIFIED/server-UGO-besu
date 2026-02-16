import BaseHandler from './BaseHandler.js';
import besuService from '../services/BesuService.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';

/**
 * Handle NFTBurnRequired event from Besu
 * Flow: Lender requests burn → Relayer burns NFT in Avalanche → Confirm burn in Besu
 */
class BurnRequestedHandler extends BaseHandler {
  constructor() {
    super('BurnRequestedHandler');
  }

  async process(event) {
    this.validate(event);
    this.logStart(event);

    try {
      const {
        loanId,
        tokenId,        // Incluido en el evento NFTBurnRequired
        requester,      // Dirección que solicitó el burn
        transactionHash
      } = event;

      logger.info(`Processing NFT burn request`, {
        loanId,
        tokenId,
        requester,
        txHash: transactionHash
      });

      // ═══════════════════════════════════════════════════════════════
      // PASO 1: Verificar que el NFT existe en Avalanche
      // ═══════════════════════════════════════════════════════════════
      const nftContract = avalancheService.getContract('loanNFT');

      try {
        // Verificar que el NFT existe y obtener owner
        const owner = await nftContract.ownerOf(tokenId);
        logger.info('NFT ownership verified', {
          tokenId,
          owner,
          exists: true
        });
      } catch (error) {
        logger.error('NFT not found or already burned', {
          tokenId,
          error: error.message
        });
        throw new Error(`NFT not found or already burned: ${tokenId}`);
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 2: Verificar que el request es válido (check en Besu)
      // ═══════════════════════════════════════════════════════════════
      const marketplaceBridge = besuService.getContract('marketplaceBridge');

      // ⭐ PRIMERO: Obtener tokenId de Besu
      const tokenIdInBesu = await marketplaceBridge.getAvalancheTokenId(loanId);

      // Verificar approval data en Besu
      const approval = await marketplaceBridge.getApprovalData(loanId);
      logger.info('Approval data from Besu', {
        loanId,
        isApproved: approval.isApproved,
        isMinted: approval.isMinted,
        isCancelled: approval.isCancelled,
        lenderAddress: approval.lenderAddress,
        tokenIdInBesu: tokenIdInBesu.toString()
      });

      // Validaciones
      if (!approval.isApproved) {
        throw new Error('Loan is not approved for sale');
      }

      if (!approval.isMinted) {
        throw new Error('NFT not minted yet');
      }

      if (approval.isCancelled) {
        throw new Error('Approval already cancelled');
      }

      // Verificar que el requester sea el lender original
      if (approval.lenderAddress.toLowerCase() !== requester.toLowerCase()) {
        throw new Error(`Only original lender can request burn. Expected: ${approval.lenderAddress}, Got: ${requester}`);
      }

      // Verificar tokenId coincide
      if (tokenIdInBesu.toString() !== tokenId) {
        throw new Error(`Token ID mismatch. Besu: ${tokenIdInBesu}, Event: ${tokenId}`);
      }

      // ⭐ Verificar también con canCancel
      const canCancel = await marketplaceBridge.canCancel(loanId);
      logger.info('Can cancel check', {
        canCancelNow: canCancel[0],
        needsBurn: canCancel[1]
      });

      if (!canCancel[0]) {
        throw new Error('Cannot cancel this loan at this time');
      }

      if (!canCancel[1]) {
        throw new Error('This loan does not require burn (not minted yet)');
      }
      // ═══════════════════════════════════════════════════════════════
      // PASO 3: Verificar estado del NFT en Avalanche
      // ═══════════════════════════════════════════════════════════════
      const currentOwner = await nftContract.ownerOf(tokenId);
      const relayerAddress = avalancheService.wallet.address;

      logger.info('NFT current status', {
        tokenId,
        currentOwner,
        relayerAddress,
        ownedByRelayer: currentOwner.toLowerCase() === relayerAddress.toLowerCase()
      });

      // Si el NFT no es propiedad del relayer, verificar aprobación
      if (currentOwner.toLowerCase() !== relayerAddress.toLowerCase()) {
        logger.info('NFT not owned by relayer, checking if burn can proceed', {
          tokenId,
          currentOwner
        });

        // El contrato BridgeReceiver puede quemar NFTs que no son propiedad del relayer
        // siempre que el mensaje esté firmado correctamente
        // Solo loguear advertencia
        logger.warn('NFT not owned by relayer, but BridgeReceiver can still burn it', {
          tokenId,
          currentOwner
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // PASO 4: Preparar firmas para quemado multi-sig
      // ═══════════════════════════════════════════════════════════════
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = stateManager.getNonce(loanId);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['string', 'string', 'uint256', 'uint256'],
          ['BURN', loanId, timestamp, nonce]
        )
      );

      logger.info('Preparando firmas para burn', {
        loanId,
        tokenId,
        timestamp,
        nonce,
        messageHash
      });

      const signatures = await this.collectSignatures(messageHash);   // ← solo messageHash

      logger.info('Firmas recolectadas para burn', {
        count: signatures.length,
        loanId,
        tokenId
      });

      // ═══════════════════════════════════════════════════════════════
      // PASO 5: Quemar el NFT en Avalanche via BridgeReceiver
      // ═══════════════════════════════════════════════════════════════
      const bridgeReceiver = avalancheService.getContract('bridgeReceiver');

      logger.info('Llamando processBurnRequest', {
        loanId,
        timestamp,
        nonce,
        signaturesCount: signatures.length
      });

      const burnTx = await bridgeReceiver.processBurnRequest(
        loanId,
        timestamp,
        nonce,
        signatures,
        { gasLimit: 400000 }   // sube un poco por si acaso
      );

      logger.info('Burn transaction sent to Avalanche', {
        txHash: burnTx.hash,
        loanId,
        tokenId
      });

      const burnReceipt = await burnTx.wait();

      logger.info('NFT burned successfully in Avalanche', {
        txHash: burnReceipt.hash,
        blockNumber: burnReceipt.blockNumber,
        tokenId,
        gasUsed: burnReceipt.gasUsed?.toString()
      });

      // ═══════════════════════════════════════════════════════════════
      // PASO 6: Confirmar quemado en Besu
      // ═══════════════════════════════════════════════════════════════
      logger.info('Confirming burn in Besu MarketplaceBridge', { loanId });

      const confirmTx = await marketplaceBridge.confirmBurnAndCancel(
        loanId,
        { gasLimit: 200000 }
      );

      const confirmReceipt = await confirmTx.wait();

      logger.info('Burn confirmed in Besu', {
        txHash: confirmReceipt.hash,
        blockNumber: confirmReceipt.blockNumber,
        loanId
      });

      // ═══════════════════════════════════════════════════════════════
      // PASO 7: Limpiar estado local
      // ═══════════════════════════════════════════════════════════════
      stateManager.removeNFTMapping(loanId);
      stateManager.incrementMetric('nftsBurned');

      this.logSuccess(event, {
        loanId,
        tokenId,
        avalancheBurnTx: burnReceipt.hash,
        besuConfirmTx: confirmReceipt.hash
      });

      return {
        success: true,
        loanId,
        tokenId,
        avalancheBurnTxHash: burnReceipt.hash,
        besuConfirmTxHash: confirmReceipt.hash
      };

    } catch (error) {
      logger.error('BurnRequestedHandler failed', {
        loanId: event.loanId,
        tokenId: event.tokenId,
        error: error.message,
        errorCode: error.code,
        errorData: error.data,
        stack: error.stack
      });

      this.logError(event, error);
      stateManager.incrementMetric('errors');
      throw error;
    }
  }

  /**
   * Collect multi-sig signatures from validators
   * ⭐ ACTUALIZADO: BridgeReceiver usa verifyMessage que aplica prefijo Ethereum
   */
  async collectSignatures(messageHash) {   // ← Solo recibe messageHash
    try {
      const validatorKeys = [
        process.env.VALIDATOR_PK1,
        process.env.VALIDATOR_PK2,
        process.env.VALIDATOR_PK3,
        process.env.VALIDATOR_PK4
      ].filter(pk => pk && pk.trim().length > 0 && pk !== 'undefined');

      if (validatorKeys.length === 0) {
        throw new Error('No validator private keys configured in .env');
      }

      logger.info('Recolectando firmas para BURN', {
        validatorCount: validatorKeys.length,
        messageHash
      });

      const signatures = [];

      for (let i = 0; i < validatorKeys.length; i++) {
        try {
          const pk = validatorKeys[i];
          const wallet = new ethers.Wallet(pk);

          // Firma directamente sobre el messageHash (como en el mint)
          const sig = await wallet.signMessage(ethers.getBytes(messageHash));

          logger.debug('Firma recolectada para burn', {
            validator: i + 1,
            address: wallet.address,
            signaturePrefix: sig.substring(0, 20) + '...'
          });

          signatures.push(sig);
        } catch (validatorError) {
          logger.error(`Fallo al obtener firma del validador ${i + 1}`, {
            error: validatorError.message
          });
          continue;
        }
      }

      const minSignatures = Math.max(1, Math.floor(validatorKeys.length / 2) + 1);
      if (signatures.length < minSignatures) {
        throw new Error(`Firmas insuficientes: ${signatures.length} recolectadas, mínimo requerido: ${minSignatures}`);
      }

      logger.info('Firmas recolectadas exitosamente para burn', {
        count: signatures.length,
        required: minSignatures
      });

      return signatures;

    } catch (error) {
      logger.error('Fallo al recolectar firmas para burn', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Validate event data
   */
  validate(event) {
    super.validate(event);

    if (!event.loanId) {
      throw new Error('Missing loan ID');
    }
    if (!event.tokenId) {
      throw new Error('Missing token ID');
    }
    if (!event.requester) {
      throw new Error('Missing requester address');
    }

    return true;
  }
}

export default BurnRequestedHandler;