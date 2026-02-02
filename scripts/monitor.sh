#!/bin/bash

# Script para monitorear la red Besu
# Uso: ./monitor.sh [intervalo_segundos]

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Directorio base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS_FILE="$BASE_DIR/besu.pids"

# Intervalo de actualización (segundos)
INTERVAL=${1:-5}

# Función para obtener información de un nodo via RPC
get_node_info() {
    local port=$1
    local metric=$2
    
    case $metric in
        "blockNumber")
            curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
                "http://localhost:$port" 2>/dev/null | \
                jq -r '.result // "N/A"' 2>/dev/null || echo "N/A"
            ;;
        "peerCount")
            curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' \
                "http://localhost:$port" 2>/dev/null | \
                jq -r '.result // "N/A"' 2>/dev/null || echo "N/A"
            ;;
        "syncing")
            curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' \
                "http://localhost:$port" 2>/dev/null | \
                jq -r '.result // "false"' 2>/dev/null || echo "N/A"
            ;;
        "chainId")
            curl -s -X POST -H "Content-Type: application/json" \
                --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
                "http://localhost:$port" 2>/dev/null | \
                jq -r '.result // "N/A"' 2>/dev/null || echo "N/A"
            ;;
    esac
}

# Función para convertir hex a decimal
hex_to_dec() {
    local hex=$1
    if [ "$hex" = "N/A" ] || [ -z "$hex" ]; then
        echo "N/A"
    else
        printf "%d" "$hex" 2>/dev/null || echo "N/A"
    fi
}

# Función para mostrar el dashboard
show_dashboard() {
    clear
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}                     ${CYAN}BESU NETWORK MONITOR${NC}                              ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                    $(date '+%Y-%m-%d %H:%M:%S')                            ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════════╝${NC}\n"
    
    # Verificar si existe el archivo de PIDs
    if [ ! -f "$PIDS_FILE" ]; then
        echo -e "${RED}⚠ No se encontró archivo de PIDs. La red no está iniciada.${NC}"
        echo -e "${YELLOW}Ejecute: ./scripts/start-network.sh${NC}\n"
        return
    fi
    
    # Estado de los procesos
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}ESTADO DE PROCESOS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}\n"
    
    printf "%-25s %-10s %-10s %-10s\n" "NODO" "PID" "ESTADO" "MEMORIA"
    echo "───────────────────────────────────────────────────────────────────────────"
    
    while IFS=: read -r node pid; do
        if ps -p $pid > /dev/null 2>&1; then
            local mem=$(ps -p $pid -o rss= 2>/dev/null | awk '{printf "%.1f MB", $1/1024}')
            printf "%-25s ${GREEN}%-10s${NC} ${GREEN}%-10s${NC} %-10s\n" "$node" "$pid" "✓ RUNNING" "$mem"
        else
            printf "%-25s ${RED}%-10s${NC} ${RED}%-10s${NC} %-10s\n" "$node" "$pid" "✗ STOPPED" "N/A"
        fi
    done < "$PIDS_FILE"
    
    echo ""
    
    # Información de la blockchain
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}INFORMACIÓN DE BLOCKCHAIN${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}\n"
    
    printf "%-25s %-8s %-12s %-10s %-15s\n" "NODO" "PUERTO" "BLOCK #" "PEERS" "SYNC STATUS"
    echo "───────────────────────────────────────────────────────────────────────────"
    
    # Array de nodos y sus puertos RPC (ACTUALIZADO al rango 8050-8080)
    declare -A node_ports=(
        ["Node-FCI-Boot"]="30303"
        ["Node-FCI-Val1"]="8050"      # era 8545
        ["Node-FCI-Val2"]="8052"      # era 8553
        ["Node-Sunwest-Val1"]="8053"  # era 8554
        ["Node-Sunwest-Val2"]="8054"  # era 8555
        ["Node-FCI-RPC1"]="8055"      # era 8547
        ["Node-FCI-RPC2"]="8057"      # era 8549
        ["Node-Sunwest-RPC"]="8059"   # era 8551
    )
    
    while IFS=: read -r node pid; do
        local port=${node_ports[$node]}
        
        if [ -z "$port" ] || [ "$port" = "30303" ]; then
            printf "%-25s ${YELLOW}%-8s${NC} ${YELLOW}%-12s${NC} ${YELLOW}%-10s${NC} ${YELLOW}%-15s${NC}\n" \
                "$node" "N/A" "N/A" "N/A" "BOOTNODE"
            continue
        fi
        
        if ps -p $pid > /dev/null 2>&1; then
            local block_hex=$(get_node_info "$port" "blockNumber")
            local block_num=$(hex_to_dec "$block_hex")
            local peer_count_hex=$(get_node_info "$port" "peerCount")
            local peer_count=$(hex_to_dec "$peer_count_hex")
            local syncing=$(get_node_info "$port" "syncing")
            
            local sync_status
            if [ "$syncing" = "false" ]; then
                sync_status="${GREEN}SYNCED${NC}"
            elif [ "$syncing" = "N/A" ]; then
                sync_status="${RED}NO RPC${NC}"
            else
                sync_status="${YELLOW}SYNCING${NC}"
            fi
            
            printf "%-25s %-8s %-12s %-10s %-15b\n" \
                "$node" "$port" "$block_num" "$peer_count" "$sync_status"
        else
            printf "%-25s ${RED}%-8s${NC} ${RED}%-12s${NC} ${RED}%-10s${NC} ${RED}%-15s${NC}\n" \
                "$node" "$port" "OFFLINE" "N/A" "OFFLINE"
        fi
    done < "$PIDS_FILE"
    
    echo ""
    
    # Resumen de la red
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}RESUMEN DE LA RED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}\n"
    
    local total_nodes=$(wc -l < "$PIDS_FILE")
    local running_nodes=0
    local total_mem=0
    
    while IFS=: read -r node pid; do
        if ps -p $pid > /dev/null 2>&1; then
            running_nodes=$((running_nodes + 1))
            local node_mem=$(ps -p $pid -o rss= 2>/dev/null || echo "0")
            total_mem=$((total_mem + node_mem))
        fi
    done < "$PIDS_FILE"
    
    local total_mem_mb=$(awk "BEGIN {printf \"%.1f\", $total_mem/1024}")
    
    echo -e "  ${CYAN}Total de nodos:${NC}        $total_nodes"
    echo -e "  ${CYAN}Nodos activos:${NC}         ${GREEN}$running_nodes${NC}"
    echo -e "  ${CYAN}Nodos inactivos:${NC}       ${RED}$((total_nodes - running_nodes))${NC}"
    echo -e "  ${CYAN}Memoria total usada:${NC}   ${YELLOW}${total_mem_mb} MB${NC}"
    
    # Obtener chain ID del primer nodo disponible (ACTUALIZADO)
    local chain_id="N/A"
    for port in 8050 8052 8053 8055; do  # era 8545 8546 8547
        chain_id=$(get_node_info "$port" "chainId" 2>/dev/null)
        if [ "$chain_id" != "N/A" ] && [ -n "$chain_id" ]; then
            chain_id=$(hex_to_dec "$chain_id")
            break
        fi
    done
    echo -e "  ${CYAN}Chain ID:${NC}              ${MAGENTA}$chain_id${NC}"
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}\n"
    echo -e "${YELLOW}Actualizando en $INTERVAL segundos... (Ctrl+C para salir)${NC}"
}

# Verificar dependencias
command -v jq >/dev/null 2>&1 || {
    echo -e "${RED}Error: jq no está instalado${NC}"
    echo -e "${YELLOW}Instale jq con: sudo apt-get install jq${NC}"
    exit 1
}

# Loop principal
if [ "$INTERVAL" = "once" ]; then
    show_dashboard
else
    while true; do
        show_dashboard
        sleep "$INTERVAL"
    done
fi