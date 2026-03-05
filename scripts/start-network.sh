#!/bin/bash

# Script para iniciar la red Besu en el orden correcto

echo -e "${YELLOW}⚠ Limpiando procesos Besu previos y liberando puertos...${NC}"

PORTS=(
  # Bootnode
  30303 9545

  # Validadores (P2P + RPC + Métricas)
  30304 8050 8051 9546
  30305 8052 9547
  30308 8053 9550
  30309 8054 9551

  # RPC Nodes
  30306 8055 8056 9548
  30307 8057 8058 9549
  30310 8059 8060 9552
)

for port in "${PORTS[@]}"; do
  PID=$(sudo lsof -ti :$port 2>/dev/null)
  if [ -n "$PID" ]; then
    echo -e "${YELLOW}  • Liberando puerto $port (PID $PID)${NC}"
    sudo kill -9 $PID
  fi
done

# Matar cualquier Besu residual
sudo pkill -f besu || true
sleep 2

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS_FILE="$BASE_DIR/besu.pids"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Iniciando Red Besu - Orden Correcto${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# Verificar si la red ya está corriendo
if [ -f "$PIDS_FILE" ]; then
    echo -e "${YELLOW}⚠ Archivo de PIDs encontrado. Verificando procesos...${NC}"
    if ps -p $(awk -F: '{print $2}' "$PIDS_FILE" 2>/dev/null | head -1) > /dev/null 2>&1; then
        echo -e "${RED}✗ La red parece estar corriendo. Use ./stop-network.sh primero${NC}"
        exit 1
    else
        echo -e "${YELLOW}Limpiando PIDs antiguos...${NC}"
        rm -f "$PIDS_FILE"
    fi
fi

# Limpiar logs antiguos (opcional)
find "$BASE_DIR"/Nodes/Node-*/data -name "besu.log" -type f -exec rm -f {} \; 2>/dev/null || true

# Limpiar archivo de PIDs
rm -f "$PIDS_FILE"
touch "$PIDS_FILE"

# Función para iniciar un nodo
start_node() {
    local node_name=$1
    local node_dir="$BASE_DIR/Nodes/$node_name"
    local wait_time=$2
    
    if [ ! -d "$node_dir" ]; then
        echo -e "${RED}✗ Directorio no encontrado: $node_dir${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}► Iniciando $node_name...${NC}"
    
    cd "$node_dir"
    
    # Iniciar Besu en background
    #nohup besu --config-file=config.toml > "$node_dir/besu.log" 2>&1 &
    #Para produccion habilitar este y deshabilitar el de arriba
    nohup env JAVA_OPTS="-Djava.io.tmpdir=/var/tmp/besu-tmp" besu --config-file=config.toml > "$node_dir/besu.log" 2>&1 &
    local pid=$!
    
    # Guardar PID
    echo "$node_name:$pid" >> "$PIDS_FILE"
    
    # Verificar que el proceso inició correctamente
    sleep 2
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $node_name iniciado (PID: $pid)${NC}"
    else
        echo -e "${RED}✗ $node_name falló al iniciar${NC}"
        echo -e "${RED}  Ver logs en: $node_dir/besu.log${NC}"
        return 1
    fi
    
    # Esperar tiempo especificado
    if [ $wait_time -gt 0 ]; then
        echo -e "${BLUE}  Esperando $wait_time segundos...${NC}"
        sleep $wait_time
    fi
    
    cd "$BASE_DIR"
}

# Función para verificar servicios de un nodo
check_node_services() {
    local node_name=$1
    local rpc_port=$2
    
    if [ -z "$rpc_port" ]; then
        return 0
    fi
    
    for i in {1..10}; do
        if curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            "http://localhost:$rpc_port" > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ RPC respondiendo en puerto $rpc_port${NC}"
            return 0
        fi
        sleep 2
    done
    echo -e "${YELLOW}  ⚠ RPC no responde aún en puerto $rpc_port${NC}"
}

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 1: Iniciando Bootnode${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

start_node "Node-FCI-Boot" 15

echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 2: Iniciando Validadores (QBFT)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

start_node "Node-FCI-Val1" 5
check_node_services "Node-FCI-Val1" 8050

start_node "Node-FCI-Val2" 5
check_node_services "Node-FCI-Val2" 8052

start_node "Node-Sunwest-Val1" 5
check_node_services "Node-Sunwest-Val1" 8053

start_node "Node-Sunwest-Val2" 5
check_node_services "Node-Sunwest-Val2" 8054

echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Esperando sincronización de validadores...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"
sleep 30

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 3: Iniciando Nodos RPC${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

start_node "Node-FCI-RPC1" 5
check_node_services "Node-FCI-RPC1" 8055

start_node "Node-FCI-RPC2" 5
check_node_services "Node-FCI-RPC2" 8057

start_node "Node-Sunwest-RPC" 5
check_node_services "Node-Sunwest-RPC" 8059

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Red Besu iniciada completamente${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

echo -e "${BLUE}Nodos iniciados:${NC}"
cat "$PIDS_FILE" | while IFS=: read -r node pid; do
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $node (PID: $pid)"
    else
        echo -e "  ${RED}✗${NC} $node (PID: $pid) - No está corriendo"
    fi
done

echo -e "\n${BLUE}Comandos útiles:${NC}"
echo -e "  ${YELLOW}./scripts/monitor.sh${NC}      - Monitorear la red"
echo -e "  ${YELLOW}./scripts/stop-network.sh${NC} - Detener la red"
echo -e "  ${YELLOW}tail -f Nodes/Node-*/besu.log${NC}   - Ver logs en tiempo real"

echo -e "\n${BLUE}Puertos RPC activos (8050-8080):${NC}"
echo -e "  Node-FCI-Val1:     ${GREEN}http://localhost:8050${NC}"
echo -e "  Node-FCI-Val2:     ${GREEN}http://localhost:8052${NC}"
echo -e "  Node-Sunwest-Val1: ${GREEN}http://localhost:8053${NC}"
echo -e "  Node-Sunwest-Val2: ${GREEN}http://localhost:8054${NC}"
echo -e "  Node-FCI-RPC1:     ${GREEN}http://localhost:8055${NC} (WS: 8056)"
echo -e "  Node-FCI-RPC2:     ${GREEN}http://localhost:8057${NC} (WS: 8058)"
echo -e "  Node-Sunwest-RPC:  ${GREEN}http://localhost:8059${NC} (WS: 8060)\n"