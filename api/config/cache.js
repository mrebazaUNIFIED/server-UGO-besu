const NodeCache = require('node-cache');

const cache = {
  // Loans de blockchain — TTL 10 minutos
  loans: new NodeCache({ stdTTL: 600, checkperiod: 120 }),

  // Respuesta del GraphQL (qué loanUids pertenecen al usuario) — TTL 5 minutos
  graphql: new NodeCache({ stdTTL: 300, checkperiod: 60 }),

  invalidate(key) {
    this.loans.del(key);
    this.graphql.del(key);
  },

  invalidateUser(userId) {
    // Invalida todo lo relacionado a un usuario
    this.graphql.del(`graphql:portfolio:${userId}`);
    this.loans.del(`portfolio:cert:${userId}`);
  },

  invalidateAll() {
    this.loans.flushAll();
    this.graphql.flushAll();
  }
};

module.exports = cache;