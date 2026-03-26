import logger from '../utils/logger.js';
import besuService from '../services/BesuService.js';

class USFCIListener {
  constructor(eventQueue) {
    this.eventQueue = eventQueue;
  }

  async start() {
    try {
      const contract = besuService.getWsContract('usfci');

      // Escuchamos el nuevo evento dedicado al Bridge
      contract.on('TokensBridgedToAvalanche', (sender, target, amount, timestamp, event) => {
        logger.info('🔔 EVENTO DETECTADO: TokensBridgedToAvalanche', {
          sender,
          target,
          amount: amount.toString(),
          txHash: event.log.transactionHash
        });

        // stateManager.markEventProcessed(`bridge_out_${event.log.transactionHash}`); // MOVED TO HANDLER
        this.eventQueue.add({
          type: 'USFCI_BRIDGE_OUT',
          target,
          amount: amount.toString(),
          transactionHash: event.log.transactionHash,
          logIndex: event.log.index
        });
      });

      logger.info('✅ USFCI Bridge Listener activo (TokensBridgedToAvalanche)', {
        address: contract.target
      });
    } catch (error) {
      logger.error('Fallo al iniciar USFCI Listener', { error: error.message });
    }
  }
  /**
   * Detener la escucha de eventos
   */
  stop() {
    const contract = besuService.getWsContract('usfci');
    if (contract) {
      contract.removeAllListeners('TokensBridgedToAvalanche');
      logger.info('USFCI event listener stopped');
    }
  }
}

export default USFCIListener;