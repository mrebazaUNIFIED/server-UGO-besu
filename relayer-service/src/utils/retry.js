import logger from './logger.js';

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        logger.error(`Max retries (${maxRetries}) reached`, { error: error.message });
        throw error;
      }

      logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        error: error.message
      });

      if (onRetry) {
        await onRetry(attempt, error);
      }

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}