import BaseHandler from './BaseHandler.js';
import besuService from '../services/BesuService.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';
import { ethers } from 'ethers';

/**
 * Handle LoanApprovedForSale event from Besu
 * Flow: Besu loan approved → Mint NFT in Avalanche via bridge → Record token ID in Besu
 * 
 * ✅ ACTUALIZADO para compatibilidad con contratos v2:
 *    - Usa OriginalBalance, CurrentBalance, NoteRate, LenderOwnerPct del LoanRegistry
 *    - NO envía askingPrice al mint (solo está en MarketplaceBridge.ApprovalData)
 *    - NO usa modifiedInterestRate (fue removido, se usa NoteRate directamente)
 *    - Campos de ubicación: City y State (NO BorrowerCity/BorrowerState)
 */
class LoanApprovedHandler extends BaseHandler {
  constructor() {
    super('LoanApprovedHandler');
  }

  async process(event) {
    this.validate(event);
    this.logStart(event);

    let tx; // Declaramos tx al inicio para que esté disponible en todo el scope

    try {
      const {
        loanId,
        lenderAddress,
        askingPrice,
        transactionHash
      } = event;

      if (!transactionHash) {
        throw new Error('Missing transactionHash in event data');
      }

      logger.info('Procesando aprobación de préstamo', {
        loanId,
        lender: lenderAddress,
        price: askingPrice?.toString(),
        approvalTxHash: transactionHash
      });

      // PASO 1: Registrar txHash de la aprobación en MarketplaceBridge (idempotente)
      const marketplaceBridge = besuService.getContract('marketplaceBridge');

      try {
        const existingLoanId = await marketplaceBridge.getLoanIdByTxHash(transactionHash);
        if (existingLoanId && existingLoanId.trim() !== '') {
          if (existingLoanId === loanId) {
            logger.info('Approval txHash already registered (skipping)', { loanId, transactionHash });
          } else {
            logger.warn('TxHash mapped to different loan (possible inconsistency)', {
              transactionHash,
              expected: loanId,
              found: existingLoanId
            });
          }
        } else {
          logger.info('Registering approval txHash in MarketplaceBridge', { loanId, transactionHash });
          const registerTx = await marketplaceBridge.registerApprovalTxHash(
            loanId,
            transactionHash,
            { gasLimit: 150000 }
          );
          const registerReceipt = await registerTx.wait();
          logger.info('Approval txHash registered successfully', {
            loanId,
            transactionHash,
            registerTxHash: registerReceipt.hash,
            blockNumber: registerReceipt.blockNumber
          });
        }
      } catch (registerError) {
        logger.warn('Failed to register approval txHash (non-blocking)', {
          loanId,
          transactionHash,
          error: registerError.shortMessage || registerError.message
        });
      }

      // PASO 2: Verificar si ya fue minteado
      const existingTokenId = stateManager.getNFTForLoan(loanId);
      if (existingTokenId) {
        logger.warn('NFT already minted for this loan', { loanId, tokenId: existingTokenId });
        return { success: false, reason: 'Already minted', tokenId: existingTokenId };
      }

      // PASO 3: Obtener datos del préstamo
      logger.info(`Fetching loan data from LoanRegistry`, { loanId });
      const loanRegistry = besuService.getContract('loanRegistry');
      const loanData = await loanRegistry.readLoan(loanId);

      const originalBalance = loanData.OriginalBalance;
      const currentBalance = loanData.CurrentBalance;
      const noteRate = loanData.NoteRate;
      const lenderOwnerPct = loanData.LenderOwnerPct;
      const location = `${loanData.City || 'N/A'}, ${loanData.State || 'N/A'}`;
      const status = "ForSale";

      logger.info('Datos del préstamo obtenidos', {
        loanId,
        originalBalance: originalBalance.toString(),
        currentBalance: currentBalance.toString(),
        noteRate: noteRate.toString(),
        lenderOwnerPct: lenderOwnerPct.toString(),
        location
      });

      const bridgeReceiver = avalancheService.getContract('bridgeReceiver');

      // PASO 4: Marcar como APPROVED en Avalanche
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = stateManager.getNonce(loanId);

      const approvalMessageHash = ethers.keccak256(
        ethers.solidityPacked(['string', 'string', 'uint256', 'uint256'], ['APPROVED', loanId, timestamp, nonce])
      );

      const approvalSignatures = await this.collectSignatures(approvalMessageHash);

      logger.info('Marcando préstamo como aprobado en Avalanche', { loanId });
      const approvalTx = await bridgeReceiver.markLoanApprovedInBesu(
        loanId,
        timestamp,
        nonce,
        approvalSignatures,
        { gasLimit: 300000 }
      );
      await approvalTx.wait();
      logger.info('Préstamo marcado como aprobado en Avalanche', { loanId });

      // PASO 5: Preparar mensaje para MINT
      const mintNonce = stateManager.getNonce(loanId);
      const mintTimestamp = Math.floor(Date.now() / 1000);

      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ['string', 'string', 'address', 'uint256', 'uint256', 'uint256', 'uint256', 'string', 'string', 'uint256', 'uint256'],
          ['MINT', loanId, lenderAddress, originalBalance, currentBalance, noteRate, lenderOwnerPct, status, location, mintTimestamp, mintNonce]
        )
      );

      logger.info('Recolectando firmas para mensaje de mint', {
        messageHash,
        loanId,
        originalBalance: originalBalance.toString(),
        currentBalance: currentBalance.toString(),
        noteRate: noteRate.toString(),
        lenderOwnerPct: lenderOwnerPct.toString()
      });

      const signatures = await this.collectSignatures(messageHash);

      logger.info('Firmas recolectadas para mint', {
        count: signatures.length,
        loanId
      });

      // PASO 6: Llamar processLoanApproval
      logger.info('Preparando llamada a processLoanApproval', {
        loanId,
        lenderAddress,
        originalBalance: originalBalance.toString(),
        currentBalance: currentBalance.toString(),
        noteRate: noteRate.toString(),
        lenderOwnerPct: lenderOwnerPct.toString(),
        status,
        location,
        mintTimestamp,
        mintNonce,
        signaturesCount: signatures.length
      });

      tx = await bridgeReceiver.processLoanApproval(
        loanId,
        lenderAddress,
        originalBalance,
        currentBalance,
        noteRate,
        lenderOwnerPct,
        status,
        location,
        mintTimestamp,
        mintNonce,
        signatures,
        { gasLimit: 600000 } // Aumentado para dar más margen
      );

      logger.info('Transacción de mint enviada', {
        txHash: tx.hash,
        loanId,
        from: tx.from,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString()
      });

      let receipt;
      try {
        const waitPromise = tx.wait();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout esperando confirmación (30s)')), 30000);
        });

        receipt = await Promise.race([waitPromise, timeoutPromise]);

        logger.info('Transacción de mint confirmada', {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          gasUsed: receipt.gasUsed?.toString()
        });
      } catch (waitError) {
        logger.error('Fallo al esperar confirmación de mint', {
          txHash: tx.hash,
          error: waitError.message,
          code: waitError.code,
          reason: waitError.reason,
          transaction: {
            from: tx.from,
            to: tx.to,
            data: tx.data?.substring(0, 100) + '...' || null
          }
        });

        if (waitError.code === 'CALL_EXCEPTION') {
          logger.error('Excepción en llamada al contrato (probable revert)', {});
        }

        throw waitError;
      }

      // PASO 7: Extraer tokenId del evento LoanMinted
      let tokenId;
      for (const log of receipt.logs) {
        try {
          const parsed = bridgeReceiver.interface.parseLog(log);
          if (parsed?.name === 'LoanMinted') {
            tokenId = parsed.args.tokenId.toString();
            logger.info('Evento LoanMinted encontrado', {
              tokenId,
              loanId: parsed.args.loanId,
              lender: parsed.args.lender
            });
            break;
          }
        } catch {
          continue;
        }
      }

      if (!tokenId) {
        throw new Error('No se encontró evento LoanMinted en los logs de la transacción');
      }

      // PASO 8: Registrar tokenId en Besu
      try {
        logger.info('Registrando token ID en Besu', { loanId, tokenId });
        const besuTx = await marketplaceBridge.setAvalancheTokenId(loanId, tokenId, { gasLimit: 300000 });
        await besuTx.wait();
        logger.info('Token ID registrado en Besu correctamente', { loanId, tokenId });
      } catch (err) {
        logger.warn('Fallo al registrar token ID en Besu (no crítico)', { error: err.message });
      }

      // PASO 9: Actualizar estado local

      try {
        logger.info('Listando NFT en marketplace', { loanId, tokenId, askingPrice: askingPrice.toString() });

        const marketplace = avalancheService.getContract('marketplace');

        const listTx = await marketplace.listForSaleByRelayer(
          tokenId,
          askingPrice,  // viene del evento LoanApprovedForSale de Besu
          lenderAddress,
          { gasLimit: 200000 }
        );
        await listTx.wait();

        logger.info('NFT listado en marketplace exitosamente', {
          loanId,
          tokenId,
          price: askingPrice.toString(),
          seller: lenderAddress
        });
      } catch (listError) {
        logger.warn('Fallo al listar en marketplace (no crítico)', {
          loanId,
          tokenId,
          error: listError.message
        });
        // No lanzamos el error — el mint ya fue exitoso
      }

      stateManager.mapLoanToNFT(loanId, tokenId);
      stateManager.incrementMetric('nftsMinted');

      this.logSuccess(event, {
        loanId,
        tokenId,
        avalancheTx: receipt.hash
      });

      return {
        success: true,
        loanId,
        tokenId,
        askingPrice: askingPrice.toString(),  // ← agrega esto
        avalancheTxHash: receipt.hash
      };

    } catch (error) {
      // Manejo seguro de errores
      const txInfo = tx ? {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        gasLimit: tx.gasLimit?.toString()
      } : { txHash: 'no-enviada' };

      logger.error('LoanApprovedHandler falló', {
        ...txInfo,
        loanId: event?.loanId,
        errorMessage: error.message,
        errorCode: error.code,
        errorReason: error.reason,
        stack: error.stack?.substring(0, 500),
        revertData: error.data || error.error?.data || null,
        receipt: error.receipt ? JSON.stringify(error.receipt, null, 2) : null
      });

      // Intentar decodificar el revert si hay datos
      if ((error.data || error.error?.data) && bridgeReceiver?.interface) {
        try {
          const revertData = error.data || error.error?.data;
          const iface = bridgeReceiver.interface;
          const decoded = iface.parseError(revertData);
          logger.error('Motivo del revert decodificado:', {
            errorName: decoded.name,
            args: decoded.args ? JSON.stringify(decoded.args, null, 2) : null
          });
        } catch (decodeErr) {
          logger.warn('No se pudo decodificar el motivo del revert', {
            decodeError: decodeErr.message
          });
        }
      }

      throw error;
    }
  }



  /**
   * Collect multi-sig signatures from validators
   */
  async collectSignatures(messageHash) {
    try {
      const validatorKeys = [
        process.env.VALIDATOR_PK1,
        process.env.VALIDATOR_PK2,
        process.env.VALIDATOR_PK3,
        process.env.VALIDATOR_PK4
      ].filter(pk => pk && pk.trim().length > 0 && pk !== 'undefined');

      if (validatorKeys.length === 0) {
        throw new Error('No se configuraron claves privadas de validadores en .env');
      }

      logger.info('Recolectando firmas', {
        validatorCount: validatorKeys.length,
        messageHash
      });

      const signatures = [];

      for (let i = 0; i < validatorKeys.length; i++) {
        try {
          const pk = validatorKeys[i];
          if (!pk.startsWith('0x')) {
            logger.warn(`Clave del validador ${i + 1} no comienza con 0x`);
          }

          const wallet = new ethers.Wallet(pk);
          const messageBytes = ethers.getBytes(messageHash);
          const sig = await wallet.signMessage(messageBytes);

          logger.debug('Firma recolectada', {
            validator: i + 1,
            address: wallet.address,
            signaturePrefix: sig.substring(0, 20) + '...'
          });

          signatures.push(sig);
        } catch (err) {
          logger.error(`Fallo al obtener firma del validador ${i + 1}`, {
            error: err.message
          });
          continue;
        }
      }

      const minSignatures = Math.max(1, Math.floor(validatorKeys.length / 2) + 1);
      if (signatures.length < minSignatures) {
        throw new Error(`Firmas insuficientes: ${signatures.length} recolectadas, mínimo requerido: ${minSignatures}`);
      }

      logger.info('Firmas recolectadas exitosamente', {
        count: signatures.length,
        required: minSignatures
      });

      return signatures;
    } catch (error) {
      logger.error('Fallo al recolectar firmas', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Validate event data
   */
  validate(event) {
    super.validate(event);

    if (!event.loanId) throw new Error('Missing loan ID');
    if (!event.lenderAddress) throw new Error('Missing lender address');
    if (!event.askingPrice) throw new Error('Missing asking price');

    return true;
  }
}

export default LoanApprovedHandler;