const events = require('events');

/**
 * Transaction Queue to prevent Nonce Collisions.
 * Ensures that transactions from the same account are sent sequentially.
 */
class TransactionQueue {
  constructor() {
    this.queue = Promise.resolve();
    this.isProcessing = false;
  }

  /**
   * Enqueue a function that returns a promise (the transaction execution).
   * @param {Function} task - async function that performs the transaction call.
   * @param {string} context - description for logging.
   * @returns {Promise} - resolves with the task result.
   */
  async enqueue(task, context = 'Tx') {
    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          console.log(`[Queue] ⏳ Processing: ${context}`);
          const start = Date.now();
          const result = await task();
          console.log(`[Queue] ✅ Completed: ${context} (${Date.now() - start}ms)`);
          resolve(result);
        } catch (error) {
          console.error(`[Queue] ❌ Error in ${context}:`, error.message);
          reject(error);
        }
      });
    });
  }
}

// Global Singleton
const globalTxQueue = new TransactionQueue();

module.exports = globalTxQueue;
