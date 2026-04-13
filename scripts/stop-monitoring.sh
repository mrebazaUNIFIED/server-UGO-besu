#!/bin/bash
# Script para detener el stack de monitoreo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$SCRIPT_DIR/../monitoring"

echo "🛑 Deteniendo monitoring stack..."

cd "$MONITORING_DIR"
docker compose down

echo ""
echo "✅ Monitoring stack stopped"
echo ""
echo "📊 Datos preservados en Docker volumes:"
echo "   • prometheus_data"
echo "   • grafana_data"
echo "   • loki_data"
echo ""
echo "Para eliminar datos también:"
echo "   docker compose down -v"
echo ""
