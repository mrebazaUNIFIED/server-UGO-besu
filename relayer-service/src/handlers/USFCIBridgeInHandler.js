import BaseHandler from './BaseHandler.js';
import besuService from '../services/BesuService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';

class USFCIBridgeInHandler extends BaseHandler {
  constructor() { super('USFCIBridgeInHandler'); }

  async process(event) {
    const { target, amount, transactionHash } = event;
    const stateKey = `bridge_in_${transactionHash}`;

    if (stateManager.isEventProcessed(stateKey)) return { success: true };

    try {
      logger.info(`🔙 Bridge IN: Restaurando ${amount} en Besu para: ${target}`);

      const proof = `AVAX_TX_${transactionHash}`;
      // Importante: BesuService debe tener implementado mintTokens
      const receipt = await besuService.mintTokens(target, amount, proof);

      stateManager.markEventProcessed(stateKey);
      logger.info(`✅ Bridge IN completado en Besu. Tx: ${receipt.hash}`);
      return { success: true };
    } catch (error) {
      logger.error('Error en BridgeIn', { error: error.message });
      throw error;
    }
  }
}
export default USFCIBridgeInHandler;