const NodeCache = require('node-cache');

const cache = {
  // Loans de blockchain — TTL 10 minutos
  loans: new NodeCache({ stdTTL: 600, checkperiod: 120 }),

  // Respuesta del GraphQL (qué loanUids pertenecen al usuario) — TTL 5 minutos
  graphql: new NodeCache({ stdTTL: 300, checkperiod: 60 }),

  // Índice: loanUid -> array de tokens de usuarios que tienen ese loan en su portfolio
  // Permite invalidación selectiva sin borrar todo el cache GraphQL
  graphqlIndex: new NodeCache({ stdTTL: 300, checkperiod: 60 }),

  invalidate(key) {
    this.loans.del(key);
    this.graphql.del(key);
    try { require('../middleware/metrics').recordCacheInvalidation('all'); } catch { }
  },

  invalidateUser(userId) {
    // Invalida todo lo relacionado a un usuario
    this.graphql.del(`graphql:portfolio:${userId}`);
    this.loans.del(`portfolio:cert:${userId}`);
    try { require('../middleware/metrics').recordCacheInvalidation(`user:${userId}`); } catch { }
  },

  /**
   * Invalidación selectiva de GraphQL por loanUid
   * Solo borra los portfolios de usuarios que tienen ese loan específico
   */
  invalidateGraphQLByLoanUid(loanUid) {
    if (!loanUid) return;

    const cacheKey = `index:loan:${loanUid}`;
    const affectedTokens = this.graphqlIndex.get(cacheKey);

    if (affectedTokens && affectedTokens.length > 0) {
      console.log(`[cache] Selective GraphQL invalidation for loanUid: ${loanUid} (${affectedTokens.length} users affected)`);
      for (const token of affectedTokens) {
        this.graphql.del(`graphql:portfolio:${token}`);
        try { require('../middleware/metrics').recordCacheInvalidation('graphql'); } catch { }
      }
      this.graphqlIndex.del(cacheKey);
    } else {
      console.log(`[cache] No cached portfolios found for loanUid: ${loanUid}`);
    }
  },

  /**
   * Invalidación selectiva por lenderUid (invalida todos los loans de ese lender)
   */
  invalidateGraphQLByLenderUID(lenderUid) {
    if (!lenderUid) return;

    const cacheKey = `index:lender:${lenderUid}`;
    const affectedTokens = this.graphqlIndex.get(cacheKey);

    if (affectedTokens && affectedTokens.length > 0) {
      console.log(`[cache] Selective GraphQL invalidation for lenderUid: ${lenderUid} (${affectedTokens.length} users affected)`);
      for (const token of affectedTokens) {
        this.graphql.del(`graphql:portfolio:${token}`);
        try { require('../middleware/metrics').recordCacheInvalidation('graphql'); } catch { }
      }
      this.graphqlIndex.del(cacheKey);
    } else {
      console.log(`[cache] No cached portfolios found for lenderUid: ${lenderUid}`);
    }
  },

  /**
   * Registra en el índice qué loans tiene cada usuario (token)
   * Se llama después de obtener datos de GraphQL
   */
  indexGraphQLPortfolio(token, items) {
    if (!items || items.length === 0) return;

    // Limpiar índices antiguos de este token
    for (const key of this.graphqlIndex.keys()) {
      if (key.startsWith(`idx:token:`)) {
        const oldTokenKey = key;
        const oldLoanUids = this.graphqlIndex.get(oldTokenKey) || [];
        for (const loanUid of oldLoanUids) {
          const indexKey = `index:loan:${loanUid}`;
          const tokens = this.graphqlIndex.get(indexKey) || [];
          const updated = tokens.filter(t => t !== token);
          if (updated.length === 0) {
            this.graphqlIndex.del(indexKey);
          } else {
            this.graphqlIndex.set(indexKey, updated);
          }
        }
        this.graphqlIndex.del(oldTokenKey);
      }
    }

    // Indexar nuevos loans
    const loanUids = items.map(item => item.loanUid).filter(Boolean);
    const lenderUids = [...new Set(items.map(item => item.lenderUid).filter(Boolean))];

    // Index: loanUid -> tokens
    for (const loanUid of loanUids) {
      const indexKey = `index:loan:${loanUid}`;
      const tokens = this.graphqlIndex.get(indexKey) || [];
      if (!tokens.includes(token)) {
        tokens.push(token);
        this.graphqlIndex.set(indexKey, tokens);
      }
    }

    // Index: lenderUid -> tokens
    for (const lenderUid of lenderUids) {
      const indexKey = `index:lender:${lenderUid}`;
      const tokens = this.graphqlIndex.get(indexKey) || [];
      if (!tokens.includes(token)) {
        tokens.push(token);
        this.graphqlIndex.set(indexKey, tokens);
      }
    }

    // Index: token -> loanUids (para limpieza)
    this.graphqlIndex.set(`idx:token:${token}`, loanUids);

    console.log(`[cache] Indexed GraphQL portfolio for token: ${loanUids.length} loans, ${lenderUids.length} lenders`);
  },

  invalidateAll() {
    this.loans.flushAll();
    this.graphql.flushAll();
    this.graphqlIndex.flushAll();
  }
};

module.exports = cache;