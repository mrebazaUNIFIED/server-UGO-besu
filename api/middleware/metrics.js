// ─── Métricas en memoria ─────────────────────────────────────────────────
const metrics = {
  http_requests_total: new Map(),       // {method, route, status} → count
  http_request_duration_seconds: [],    // {method, route, duration}
  cache_hits_total: new Map(),          // {cache_type} → count
  cache_misses_total: new Map(),        // {cache_type} → count
  cache_invalidations_total: new Map(), // {cache_type} → count
  cache_items_count: new Map(),         // {cache_type} → count
  besu_transactions_confirmed_total: 0,
  besu_transactions_pending_total: 0,
  besu_rpc_errors_total: new Map(),     // {node} → count
};

// ─── Middleware: captura requests HTTP ────────────────────────────────────
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  const route = req.route ? req.route.path : req.path;

  // Interceptar res.end para capturar status code
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    const key = `${req.method}|${route}|${res.statusCode}`;
    metrics.http_requests_total.set(key, (metrics.http_requests_total.get(key) || 0) + 1);
    metrics.http_request_duration_seconds.push({ method: req.method, route, duration, timestamp: Date.now() });

    // Mantener solo últimos 1000 registros
    if (metrics.http_request_duration_seconds.length > 1000) {
      metrics.http_request_duration_seconds = metrics.http_request_duration_seconds.slice(-1000);
    }

    originalEnd.apply(this, args);
  };

  next();
}

// ─── Helpers para rastrear cache ──────────────────────────────────────────
function recordCacheHit(cacheType) {
  const key = cacheType || 'default';
  metrics.cache_hits_total.set(key, (metrics.cache_hits_total.get(key) || 0) + 1);
}

function recordCacheMiss(cacheType) {
  const key = cacheType || 'default';
  metrics.cache_misses_total.set(key, (metrics.cache_misses_total.get(key) || 0) + 1);
}

function recordCacheInvalidation(cacheType) {
  const key = cacheType || 'default';
  metrics.cache_invalidations_total.set(key, (metrics.cache_invalidations_total.get(key) || 0) + 1);
}

function recordRpcError(node) {
  const key = node || 'unknown';
  metrics.besu_rpc_errors_total.set(key, (metrics.besu_rpc_errors_total.get(key) || 0) + 1);
}

function recordTxConfirmed() {
  metrics.besu_transactions_confirmed_total++;
}

function recordTxPending() {
  metrics.besu_transactions_pending_total++;
}

// ─── Endpoint: formato Prometheus ─────────────────────────────────────────
function generatePrometheusMetrics() {
  // Lazy load para evitar circular dependency
  const cache = require('../config/cache');
  let output = '';

  // HELP & TYPE para http_requests_total
  output += '# HELP http_requests_total Total HTTP requests\n';
  output += '# TYPE http_requests_total counter\n';
  for (const [key, count] of metrics.http_requests_total.entries()) {
    const [method, route, status] = key.split('|');
    output += `http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}\n`;
  }

  // HELP & TYPE para http_request_duration_seconds
  output += '# HELP http_request_duration_seconds HTTP request duration in seconds\n';
  output += '# TYPE http_request_duration_seconds histogram\n';

  // Calcular buckets simples
  const durations = metrics.http_request_duration_seconds.map(d => d.duration);
  if (durations.length > 0) {
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const sum = durations.reduce((a, b) => a + b, 0);

    output += `http_request_duration_seconds_bucket{le="0.1"} ${durations.filter(d => d <= 0.1).length}\n`;
    output += `http_request_duration_seconds_bucket{le="0.5"} ${durations.filter(d => d <= 0.5).length}\n`;
    output += `http_request_duration_seconds_bucket{le="1"} ${durations.filter(d => d <= 1).length}\n`;
    output += `http_request_duration_seconds_bucket{le="5"} ${durations.filter(d => d <= 5).length}\n`;
    output += `http_request_duration_seconds_bucket{le="+Inf"} ${durations.length}\n`;
    output += `http_request_duration_seconds_sum ${sum.toFixed(3)}\n`;
    output += `http_request_duration_seconds_count ${durations.length}\n`;
    output += `http_request_duration_seconds_p50 ${p50.toFixed(3)}\n`;
    output += `http_request_duration_seconds_p95 ${p95.toFixed(3)}\n`;
    output += `http_request_duration_seconds_p99 ${p99.toFixed(3)}\n`;
  }

  // HELP & TYPE para cache_hits_total
  output += '# HELP cache_hits_total Cache hits\n';
  output += '# TYPE cache_hits_total counter\n';
  for (const [key, count] of metrics.cache_hits_total.entries()) {
    output += `cache_hits_total{cache_type="${key}"} ${count}\n`;
  }

  // HELP & TYPE para cache_misses_total
  output += '# HELP cache_misses_total Cache misses\n';
  output += '# TYPE cache_misses_total counter\n';
  for (const [key, count] of metrics.cache_misses_total.entries()) {
    output += `cache_misses_total{cache_type="${key}"} ${count}\n`;
  }

  // HELP & TYPE para cache_invalidations_total
  output += '# HELP cache_invalidations_total Cache invalidations\n';
  output += '# TYPE cache_invalidations_total counter\n';
  for (const [key, count] of metrics.cache_invalidations_total.entries()) {
    output += `cache_invalidations_total{cache_type="${key}"} ${count}\n`;
  }

  // HELP & TYPE para cache_items_count
  output += '# HELP cache_items_count Number of items in cache\n';
  output += '# TYPE cache_items_count gauge\n';
  const loansKeys = cache.loans.keys();
  const graphqlKeys = cache.graphql.keys();
  const graphqlIndexKeys = cache.graphqlIndex.keys();
  output += `cache_items_count{cache_type="loans"} ${loansKeys.length}\n`;
  output += `cache_items_count{cache_type="graphql"} ${graphqlKeys.length}\n`;
  output += `cache_items_count{cache_type="graphqlIndex"} ${graphqlIndexKeys.length}\n`;

  // HELP & TYPE para besu_transactions
  output += '# HELP besu_transactions_confirmed_total Confirmed blockchain transactions\n';
  output += '# TYPE besu_transactions_confirmed_total counter\n';
  output += `besu_transactions_confirmed_total ${metrics.besu_transactions_confirmed_total}\n`;

  output += '# HELP besu_transactions_pending_total Pending blockchain transactions\n';
  output += '# TYPE besu_transactions_pending_total gauge\n';
  output += `besu_transactions_pending_total ${metrics.besu_transactions_pending_total}\n`;

  // HELP & TYPE para besu_rpc_errors_total
  output += '# HELP besu_rpc_errors_total RPC errors per node\n';
  output += '# TYPE besu_rpc_errors_total counter\n';
  for (const [key, count] of metrics.besu_rpc_errors_total.entries()) {
    output += `besu_rpc_errors_total{node="${key}"} ${count}\n`;
  }

  return output;
}

// ─── Endpoint: formato JSON para dashboard rápido ─────────────────────────
function getMetricsJSON() {
  // Lazy load para evitar circular dependency
  const cache = require('../config/cache');
  const loansKeys = cache.loans.keys();
  const graphqlKeys = cache.graphql.keys();

  // Calcular latencias
  const durations = metrics.http_request_duration_seconds.map(d => d.duration);
  const sorted = durations.length > 0 ? [...durations].sort((a, b) => a - b) : [];
  const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
  const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;

  // Calcular requests por status
  const statusCounts = { '2xx': 0, '4xx': 0, '5xx': 0 };
  for (const [key, count] of metrics.http_requests_total.entries()) {
    const status = parseInt(key.split('|')[2]);
    if (status >= 200 && status < 300) statusCounts['2xx'] += count;
    else if (status >= 400 && status < 500) statusCounts['4xx'] += count;
    else if (status >= 500) statusCounts['5xx'] += count;
  }

  return {
    http: {
      totalRequests: Array.from(metrics.http_requests_total.values()).reduce((a, b) => a + b, 0),
      statusCodes: statusCounts,
      latency: {
        p50: `${(p50 * 1000).toFixed(2)} ms`,
        p95: `${(p95 * 1000).toFixed(2)} ms`,
        p99: `${(p99 * 1000).toFixed(2)} ms`,
      }
    },
    cache: {
      hits: Object.fromEntries(metrics.cache_hits_total.entries()),
      misses: Object.fromEntries(metrics.cache_misses_total.entries()),
      invalidations: Object.fromEntries(metrics.cache_invalidations_total.entries()),
      sizes: {
        loans: loansKeys.length,
        graphql: graphqlKeys.length,
      }
    },
    transactions: {
      confirmed: metrics.besu_transactions_confirmed_total,
      pending: metrics.besu_transactions_pending_total,
    },
    rpcErrors: Object.fromEntries(metrics.besu_rpc_errors_total.entries()),
  };
}

module.exports = {
  metricsMiddleware,
  recordCacheHit,
  recordCacheMiss,
  recordCacheInvalidation,
  recordRpcError,
  recordTxConfirmed,
  recordTxPending,
  generatePrometheusMetrics,
  getMetricsJSON,
};
