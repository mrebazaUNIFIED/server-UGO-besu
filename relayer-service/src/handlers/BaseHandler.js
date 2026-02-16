import logger from '../utils/logger.js';

/**
 * Base class for event handlers
 */
class BaseHandler {
  constructor(name) {
    this.name = name;
  }

  /**
   * Process event - to be implemented by subclasses
   */
  async process(event) {
    throw new Error(`${this.name}: process() must be implemented`);
  }

  /**
   * Validate event data
   */
  validate(event) {
    if (!event.transactionHash) {
      throw new Error('Missing transaction hash');
    }
    if (!event.blockNumber) {
      throw new Error('Missing block number');
    }
    return true;
  }

  /**
   * Log processing start
   */
  logStart(event) {
    logger.info(`${this.name}: Processing started`, {
      type: event.type,
      txHash: event.transactionHash,
      block: event.blockNumber
    });
  }

  /**
   * Log processing success
   */
  logSuccess(event, result = {}) {
    logger.info(`${this.name}: Processing completed`, {
      type: event.type,
      txHash: event.transactionHash,
      ...result
    });
  }

  /**
   * Log processing error
   */
  logError(event, error) {
    logger.error(`${this.name}: Processing failed`, {
      type: event.type,
      txHash: event.transactionHash,
      error: error.message
    });
  }
}

export default BaseHandler;