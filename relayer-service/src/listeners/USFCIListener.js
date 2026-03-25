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
        this.eventQueue.add({
          type: 'USFCI_BRIDGE_OUT',
          target,
          amount: amount.toString(),
          transactionHash: event.log.transactionHash
        });
      });

      logger.info('✅ USFCI Bridge Listener activo (TokensBridgedToAvalanche)');
    } catch (error) {
      logger.error('Fallo al iniciar USFCI Listener', { error: error.message });
    }
  }
}

export default USFCIListener;