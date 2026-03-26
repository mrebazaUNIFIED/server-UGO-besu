import BaseHandler from './BaseHandler.js';
import avalancheService from '../services/AvalancheService.js';
import stateManager from '../services/StateManager.js';
import logger from '../utils/logger.js';

class USFCIBridgeOutHandler extends BaseHandler {
  constructor() { super('USFCIBridgeOutHandler'); }

  async process(event) {
    const { target, amount, transactionHash, logIndex } = event;
    const eventId = `BridgeToAvalanche-${transactionHash}-${logIndex || 0}`;

    if (stateManager.isEventProcessed(eventId)) {
      logger.info('Skipping already processed Bridge OUT event', { eventId });
      return { success: true };
    }

    try {
      logger.info(`🌉 Bridge OUT: Enviando ${amount} a Avalanche wallet: ${target}`);

      // El "proof" es el hash de la red Besu para auditoría
      const proof = `BESU_TX_${transactionHash}`;
      const receipt = await avalancheService.mintUSFCI(target, amount, proof);

      stateManager.markEventProcessed(eventId);
      logger.info(`✅ Bridge OUT completado. Avax Tx: ${receipt.hash}`);
      return { success: true };
    } catch (error) {
      logger.error('Error en BridgeOut', { error: error.message });
      throw error;
    }
  }
}
export default USFCIBridgeOutHandler;