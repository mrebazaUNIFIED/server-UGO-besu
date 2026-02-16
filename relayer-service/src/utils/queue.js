import logger from './logger.js';

/**
 * Simple in-memory queue with processing
 */
export class EventQueue {
  constructor(name, processor, options = {}) {
    this.name = name;
    this.processor = processor;
    this.queue = [];
    this.processing = false;
    this.processInterval = options.processInterval || 5000;
    this.maxConcurrent = options.maxConcurrent || 1;
    this.currentlyProcessing = 0;
    
    // Deduplication
    this.processedEvents = new Set();
    this.maxProcessedHistory = options.maxProcessedHistory || 10000;
  }

  /**
   * Add event to queue
   */
  add(event) {
    const eventKey = this._getEventKey(event);
    
    // Check if already processed
    if (this.processedEvents.has(eventKey)) {
      logger.debug(`Event already processed, skipping`, { eventKey, queue: this.name });
      return false;
    }

    // Check if already in queue
    const exists = this.queue.some(e => this._getEventKey(e) === eventKey);
    if (exists) {
      logger.debug(`Event already in queue, skipping`, { eventKey, queue: this.name });
      return false;
    }

    this.queue.push({
      ...event,
      addedAt: Date.now(),
      attempts: 0
    });

    logger.info(`Event added to queue`, {
      queue: this.name,
      queueSize: this.queue.length,
      event: eventKey
    });

    return true;
  }

  /**
   * Start processing queue
   */
  start() {
    if (this.processing) {
      logger.warn(`Queue already processing`, { queue: this.name });
      return;
    }

    this.processing = true;
    logger.info(`Queue processing started`, { queue: this.name });
    
    this._processLoop();
  }

  /**
   * Stop processing queue
   */
  stop() {
    this.processing = false;
    logger.info(`Queue processing stopped`, { queue: this.name });
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      name: this.name,
      queueSize: this.queue.length,
      processing: this.processing,
      currentlyProcessing: this.currentlyProcessing,
      processedTotal: this.processedEvents.size
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    logger.info(`Queue cleared`, { queue: this.name });
  }

  /**
   * Internal: Process loop
   */
  async _processLoop() {
    while (this.processing) {
      try {
        await this._processNext();
      } catch (error) {
        logger.error(`Error in process loop`, { 
          queue: this.name, 
          error: error.message 
        });
      }

      await this._sleep(this.processInterval);
    }
  }

  /**
   * Internal: Process next events
   */
  async _processNext() {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.maxConcurrent);
    
    await Promise.all(
      batch.map(event => this._processEvent(event))
    );
  }

  /**
   * Internal: Process single event
   */
  async _processEvent(event) {
    this.currentlyProcessing++;
    const eventKey = this._getEventKey(event);

    try {
      logger.info(`Processing event`, { 
        queue: this.name, 
        event: eventKey,
        attempt: event.attempts + 1
      });

      await this.processor(event);

      // Mark as processed
      this.processedEvents.add(eventKey);
      this._cleanupProcessedHistory();

      logger.info(`Event processed successfully`, {
        queue: this.name,
        event: eventKey
      });

    } catch (error) {
      logger.error(`Event processing failed`, {
        queue: this.name,
        event: eventKey,
        attempt: event.attempts + 1,
        error: error.message
      });

      // Retry logic
      event.attempts++;
      if (event.attempts < 3) {
        logger.info(`Re-queuing event`, { 
          queue: this.name, 
          event: eventKey,
          attempt: event.attempts
        });
        this.queue.push(event);
      } else {
        logger.error(`Event failed after max retries`, {
          queue: this.name,
          event: eventKey
        });
      }
    } finally {
      this.currentlyProcessing--;
    }
  }

  /**
   * Internal: Get unique event key
   */
  _getEventKey(event) {
    return `${event.type}-${event.transactionHash}-${event.logIndex}`;
  }

  /**
   * Internal: Cleanup processed history
   */
  _cleanupProcessedHistory() {
    if (this.processedEvents.size > this.maxProcessedHistory) {
      const toDelete = this.processedEvents.size - this.maxProcessedHistory;
      const entries = Array.from(this.processedEvents);
      
      for (let i = 0; i < toDelete; i++) {
        this.processedEvents.delete(entries[i]);
      }
    }
  }

  /**
   * Internal: Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}