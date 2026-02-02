#!/bin/bash

# Script para obtener los enodes de todos los nodos activos
# Uso: ./get-enodes.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Obteniendo Enodes de Todos los Nodos${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Función para obtener enode de un nodo
get_enode() {
    local node_name=$1
    local rpc_port=$2
    
    echo -e "${YELLOW}► $node_name (puerto $rpc_port):${NC}"
    
    local enode=$(curl -s -X POST \
        --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' \
        http://localhost:$rpc_port 2>/dev/null | \
        grep -o '"enode":"[^"]*"' | \
        cut -d'"' -f4)
    
    if [ -z "$enode" ]; then
        echo -e "  ${YELLOW}⚠ No se pudo obtener enode (¿nodo corriendo?)${NC}\n"
        return 1
    fi
    
    echo -e "  ${GREEN}$enode${NC}\n"
}

# Obtener enodes de nodos con RPC
echo -e "${BLUE}Nodos FCI:${NC}"
get_enode "FCI-Val1" 8545
get_enode "FCI-Val2" 8553
get_enode "FCI-RPC1" 8547
get_enode "FCI-RPC2" 8549

echo -e "${BLUE}Nodos Sunwest:${NC}"
get_enode "Sunwest-Val1" 8554
get_enode "Sunwest-Val2" 8555
get_enode "Sunwest-RPC" 8551

echo -e "\n${YELLOW}Nota: El Bootnode (30303) no tiene RPC habilitado${NC}"
echo -e "${YELLOW}Para obtener su enode, revisa: Node-FCI-Boot/besu.log${NC}"
echo -e "${YELLOW}Busca una línea como: 'enode://...'${NC}\n"

# Buscar enode del bootnode en logs
if [ -f "Node-FCI-Boot/besu.log" ]; then
    echo -e "${BLUE}Buscando enode del Bootnode en logs...${NC}"
    BOOT_ENODE=$(grep -o 'enode://[^"]*' Node-FCI-Boot/besu.log | head -1)
    if [ ! -z "$BOOT_ENODE" ]; then
        echo -e "${GREEN}Bootnode: $BOOT_ENODE${NC}\n"
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cómo usar estos enodes:${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "1. Copia los enodes de arriba"
echo -e "2. Actualiza ${YELLOW}permissions_config.toml${NC} con los valores reales"
echo -e "3. Actualiza los ${YELLOW}bootnodes${NC} en cada config.toml"
echo -e "4. Reinicia la red: ${YELLOW}./scripts/restart-network.sh${NC}\n"