const cache = require('../config/cache');

const GRAPHQL_URL = process.env.GRAPHQL_URL || process.env.GRAPHQL_URL_DEV;

const GET_LOAN_PORTFOLIO_QUERY = `
  {
    getLoanPortfolioBCv2 {
      loanUid
      lenderUid
      lenderName
    }
  }
`;

class GraphqlService {
  async getLoanPortfolio(userBearerToken) {
    if (!userBearerToken) throw new Error('Bearer token is required');
    if (!GRAPHQL_URL) throw new Error('GRAPHQL_URL is not set in environment');

    const cacheKey = `graphql:portfolio:${userBearerToken}`;
    const cached = cache.graphql.get(cacheKey);

    if (cached) {
      console.log(`[cache] HIT ${cacheKey}`);
      return cached;
    }

    console.log(`[cache] MISS ${cacheKey} — llamando GraphQL...`);
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBearerToken}`,
      },
      body: JSON.stringify({ query: GET_LOAN_PORTFOLIO_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.errors?.length) {
      throw new Error(`GraphQL errors: ${json.errors.map(e => e.message).join(', ')}`);
    }

    const items = json?.data?.getLoanPortfolioBCv2 || [];
    const userId = items.length > 0 ? items[0].lenderUid : null;

    const result = { userId, items };

    // Solo cachear si hay datos
    if (items.length > 0) {
      cache.graphql.set(cacheKey, result);
      console.log(`[cache] SET ${cacheKey} (${items.length} items)`);
    }

    return result;
  }
}

module.exports = new GraphqlService();