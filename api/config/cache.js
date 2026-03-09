const NodeCache = require('node-cache');

const cache = {
  loans: new NodeCache({ stdTTL: 30, checkperiod: 60 }),

  invalidate(key) {
    this.loans.del(key);
  },

  invalidateAll() {
    this.loans.flushAll();
  }
};

module.exports = cache;