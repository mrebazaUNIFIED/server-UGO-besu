#!/bin/bash
# Script to verify the complete monitoring stack setup

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║      BESU MONITORING STACK - VERIFICATION             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# ─── 1. Check Docker ─────────────────────────────────────────────────────
echo "📦 Checking Docker..."
if command -v docker &> /dev/null; then
    check_pass "Docker is installed"
else
    check_fail "Docker is not installed"
    echo "   Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if docker compose version &> /dev/null; then
    check_pass "Docker Compose is available"
else
    check_fail "Docker Compose is not available"
    exit 1
fi

# ─── 2. Check Log Files ──────────────────────────────────────────────────
echo ""
echo "📝 Checking Log Files..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -d "$PROJECT_DIR/api/logs" ]; then
    LOG_COUNT=$(find "$PROJECT_DIR/api/logs" -name "*.log" 2>/dev/null | wc -l)
    if [ "$LOG_COUNT" -gt 0 ]; then
        check_pass "API logs directory exists with $LOG_COUNT log file(s)"
    else
        check_warn "API logs directory exists but no log files yet (API may not be running)"
    fi
else
    check_fail "API logs directory does not exist"
fi

if [ -d "$PROJECT_DIR/relayer-service/logs" ]; then
    LOG_COUNT=$(find "$PROJECT_DIR/relayer-service/logs" -name "*.log" 2>/dev/null | wc -l)
    if [ "$LOG_COUNT" -gt 0 ]; then
        check_pass "Relayer logs directory exists with $LOG_COUNT log file(s)"
    else
        check_warn "Relayer logs directory exists but no log files yet (Relayer may not be running)"
    fi
else
    check_fail "Relayer logs directory does not exist"
fi

# ─── 3. Check .env Files ─────────────────────────────────────────────────
echo ""
echo "🔧 Checking Configuration Files..."

if [ -f "$PROJECT_DIR/api/.env" ]; then
    if grep -q "LOG_FILE" "$PROJECT_DIR/api/.env"; then
        LOG_FILE=$(grep "LOG_FILE" "$PROJECT_DIR/api/.env" | cut -d'=' -f2)
        check_pass "API .env has LOG_FILE configured: $LOG_FILE"
    else
        check_fail "API .env does not have LOG_FILE configured"
    fi
else
    check_fail "API .env file does not exist"
fi

if [ -f "$PROJECT_DIR/relayer-service/.env" ]; then
    if grep -q "LOG_FILE" "$PROJECT_DIR/relayer-service/.env"; then
        LOG_FILE=$(grep "LOG_FILE" "$PROJECT_DIR/relayer-service/.env" | cut -d'=' -f2)
        check_pass "Relayer .env has LOG_FILE configured: $LOG_FILE"
    else
        check_fail "Relayer .env does not have LOG_FILE configured"
    fi
else
    check_fail "Relayer .env file does not exist"
fi

# ─── 4. Check Monitoring Configuration ───────────────────────────────────
echo ""
echo "⚙️  Checking Monitoring Configuration..."

if [ -f "$PROJECT_DIR/monitoring/docker-compose.yml" ]; then
    check_pass "docker-compose.yml exists"
else
    check_fail "docker-compose.yml not found"
fi

if [ -f "$PROJECT_DIR/monitoring/prometheus/prometheus.yml" ]; then
    check_pass "Prometheus configuration exists"
else
    check_fail "Prometheus configuration not found"
fi

if [ -f "$PROJECT_DIR/monitoring/loki/loki-config.yml" ]; then
    check_pass "Loki configuration exists"
else
    check_fail "Loki configuration not found"
fi

if [ -f "$PROJECT_DIR/monitoring/promtail/promtail-config.yml" ]; then
    check_pass "Promtail configuration exists"
else
    check_fail "Promtail configuration not found"
fi

# ─── 5. Check Grafana Dashboards ─────────────────────────────────────────
echo ""
echo "📊 Checking Grafana Dashboards..."

DASHBOARD_DIR="$PROJECT_DIR/monitoring/grafana/provisioning/dashboards/json"

if [ -d "$DASHBOARD_DIR" ]; then
    DASHBOARD_COUNT=$(find "$DASHBOARD_DIR" -name "*.json" 2>/dev/null | wc -l)
    check_pass "Grafana dashboards directory exists with $DASHBOARD_COUNT dashboard(s)"
    
    for dashboard in "$DASHBOARD_DIR"/*.json; do
        if [ -f "$dashboard" ]; then
            DASHBOARD_NAME=$(basename "$dashboard")
            check_pass "  - $DASHBOARD_NAME"
        fi
    done
else
    check_fail "Grafana dashboards directory does not exist"
fi

if [ -f "$PROJECT_DIR/monitoring/grafana/provisioning/datasources/datasources.yml" ]; then
    check_pass "Grafana datasources configuration exists"
else
    check_fail "Grafana datasources configuration not found"
fi

# ─── 6. Check Running Services ───────────────────────────────────────────
echo ""
echo "🚀 Checking Running Services..."

if docker ps --filter "name=besu-prometheus" --filter "status=running" | grep -q "besu-prometheus"; then
    check_pass "Prometheus is running"
    PROMETHEUS_HEALTH=$(curl -s http://localhost:9090/-/healthy 2>/dev/null || echo "unreachable")
    if echo "$PROMETHEUS_HEALTH" | grep -q "Prometheus Server is Healthy"; then
        check_pass "  Prometheus health check passed"
    else
        check_warn "  Prometheus health check unknown"
    fi
else
    check_warn "Prometheus is not running (start with: ./scripts/start-monitoring.sh)"
fi

if docker ps --filter "name=besu-grafana" --filter "status=running" | grep -q "besu-grafana"; then
    check_pass "Grafana is running"
    GRAFANA_HEALTH=$(curl -s http://localhost:3000/api/health 2>/dev/null || echo "unreachable")
    if echo "$GRAFANA_HEALTH" | grep -q "\"commit\""; then
        check_pass "  Grafana health check passed"
    else
        check_warn "  Grafana health check unknown"
    fi
else
    check_warn "Grafana is not running (start with: ./scripts/start-monitoring.sh)"
fi

if docker ps --filter "name=besu-loki" --filter "status=running" | grep -q "besu-loki"; then
    check_pass "Loki is running"
    LOKI_HEALTH=$(curl -s http://localhost:3100/ready 2>/dev/null || echo "unreachable")
    if [ "$LOKI_HEALTH" = "ready" ]; then
        check_pass "  Loki health check passed"
    else
        check_warn "  Loki health check unknown"
    fi
else
    check_warn "Loki is not running (start with: ./scripts/start-monitoring.sh)"
fi

if docker ps --filter "name=besu-promtail" --filter "status=running" | grep -q "besu-promtail"; then
    check_pass "Promtail is running"
else
    check_warn "Promtail is not running (start with: ./scripts/start-monitoring.sh)"
fi

# ─── 7. Check API and Relayer ────────────────────────────────────────────
echo ""
echo "🔗 Checking Application Services..."

API_HEALTH=$(curl -s http://localhost:8070/health 2>/dev/null || echo "unreachable")
if echo "$API_HEALTH" | grep -q "\"status\""; then
    check_pass "API is running and healthy"
else
    check_warn "API is not running (start with: cd api && npm start)"
fi

# ─── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              VERIFICATION COMPLETE                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Access monitoring services:"
echo "   • Grafana:      http://localhost:3000 (admin/admin)"
echo "   • Prometheus:   http://localhost:9090"
echo "   • Loki:         http://localhost:3100"
echo ""
echo "📈 Useful queries in Grafana Explore:"
echo "   • API Logs:     {job=\"besu-api\"}"
echo "   • Relayer Logs: {job=\"relayer-service\"}"
echo "   • Error Logs:   {job=\"besu-api\", level=\"error\"}"
echo ""
echo "🛑 To stop monitoring:"
echo "   ./scripts/stop-monitoring.sh"
echo ""
