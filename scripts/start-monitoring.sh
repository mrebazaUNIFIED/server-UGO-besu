#!/bin/bash
# Script para iniciar el stack de monitoreo (Prometheus + Grafana + Loki)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MONITORING_DIR="$PROJECT_DIR/monitoring"

cd "$MONITORING_DIR"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         BESU MONITORING STACK - STARTING              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    echo "   Instale Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose no está disponible"
    exit 1
fi

# Verificar que la API esté corriendo
API_PORT=8070
if ! curl -s http://localhost:$API_PORT/health > /dev/null 2>&1; then
    echo "⚠️  Warning: API no está corriendo en puerto $API_PORT"
    echo "   Inicie la API primero: cd api && npm start"
    echo ""
fi

# Verificar nodos Besu
echo "📊 Verificando nodos Besu..."
BESU_PORTS=(9545 9546 9547 9548 9549 9550 9551 9552)
ACTIVE_NODES=0
for port in "${BESU_PORTS[@]}"; do
    if curl -s http://localhost:$port/metrics > /dev/null 2>&1; then
        ACTIVE_NODES=$((ACTIVE_NODES + 1))
    fi
done
echo "   ✅ $ACTIVE_NODES/${#BESU_PORTS[@]} nodos activos"
echo ""

# Verificar que existe docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.yml en $MONITORING_DIR"
    echo "   Verifique que el directorio monitoring existe"
    exit 1
fi

# Iniciar stack
echo "🚀 Iniciando Prometheus + Grafana + Loki..."
docker compose up -d

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              MONITORING STACK READY                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Servicios disponibles:"
echo "   • Prometheus:   http://localhost:9090"
echo "   • Grafana:      http://localhost:3000"
echo "     - Usuario:    admin"
echo "     - Password:   admin"
echo "   • Loki:         http://localhost:3100"
echo ""
echo "📈 Para ver logs:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Para detener:"
echo "   ./scripts/stop-monitoring.sh"
echo ""
