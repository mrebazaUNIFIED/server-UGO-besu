#!/bin/bash
# Script para ver logs de todos los servicios

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║              BESU LOG VIEWER                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Función para verificar si un archivo existe y mostrarlo
show_log() {
    local file=$1
    local label=$2
    local lines=${3:-50}
    
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "📄 $label"
    echo "═══════════════════════════════════════════════════════"
    
    if [ -f "$file" ]; then
        if [ -s "$file" ]; then
            tail -n $lines "$file"
        else
            echo "⚠️  Archivo vacío"
        fi
    else
        echo "❌ Archivo no encontrado: $file"
    fi
    echo ""
}

# Ver logs de nodos Besu
echo "📊 LOGS DE NODOS BESU"
echo "═══════════════════════════════════════════════════════"

for node_dir in "$PROJECT_DIR"/Nodes/Node-*; do
    if [ -d "$node_dir" ]; then
        node_name=$(basename "$node_dir")
        log_file="$node_dir/besu.log"
        if [ -f "$log_file" ]; then
            lines=$(wc -l < "$log_file")
            echo "  • $node_name: $lines líneas"
        fi
    fi
done

echo ""
echo "¿Qué nodo quieres ver? (ej: Node-FCI-Val1, o 'all' para todos)"
read -p "> " node_choice

if [ "$node_choice" = "all" ]; then
    echo ""
    echo "📡 Mostrando TODOS los logs (últimas 20 líneas por nodo)..."
    echo ""
    
    for node_dir in "$PROJECT_DIR"/Nodes/Node-*; do
        if [ -d "$node_dir" ]; then
            node_name=$(basename "$node_dir")
            show_log "$node_dir/besu.log" "$node_name" 20
        fi
    done
elif [ -n "$node_choice" ]; then
    log_file="$PROJECT_DIR/Nodes/$node_choice/besu.log"
    if [ -f "$log_file" ]; then
        show_log "$log_file" "$node_choice" 50
    else
        echo "❌ Nodo no encontrado: $node_choice"
        echo "Nodos disponibles:"
        ls -d "$PROJECT_DIR"/Nodes/Node-* 2>/dev/null | xargs -n1 basename
    fi
fi

# Ver logs de API
echo ""
echo "═══════════════════════════════════════════════════════"
echo "🌐 API GATEWAY LOGS"
echo "═══════════════════════════════════════════════════════"

api_log="$PROJECT_DIR/api/logs/api.log"
if [ -f "$api_log" ]; then
    lines=$(wc -l < "$api_log")
    echo "  📄 api.log: $lines líneas"
    echo ""
    echo "¿Ver logs de API? (s/n)"
    read -p "> " api_choice
    if [ "$api_choice" = "s" ]; then
        show_log "$api_log" "API Gateway (últimas 50 líneas)" 50
    fi
else
    echo "  ⚠️  No se encontró api/logs/api.log"
    echo "  💡 Configura LOG_FILE=./logs/api.log en api/.env"
fi

# Ver logs de Relayer
echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔄 RELAYER SERVICE LOGS"
echo "═══════════════════════════════════════════════════════"

relayer_log="$PROJECT_DIR/relayer-service/logs/relayer.log"
if [ -f "$relayer_log" ]; then
    lines=$(wc -l < "$relayer_log")
    echo "  📄 relayer.log: $lines líneas"
    echo ""
    echo "¿Ver logs de relayer? (s/n)"
    read -p "> " relayer_choice
    if [ "$relayer_choice" = "s" ]; then
        show_log "$relayer_log" "Relayer Service (últimas 50 líneas)" 50
    fi
else
    echo "  ⚠️  No se encontró relayer-service/logs/relayer.log"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Done"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "💡 Para ver logs en tiempo real:"
echo "   tail -f Nodes/Node-FCI-Val1/besu.log"
echo "   tail -f api/logs/api.log"
echo "   tail -f relayer-service/logs/relayer.log"
echo ""
echo "💡 Con Grafana + Loki (si monitoring está activo):"
echo "   http://localhost:3000 → Explore → Loki"
echo ""
