#!/bin/bash

# Script para detener la red Besu de forma ordenada
# Uso: ./stop-network.sh
# NOTA: Este script es independiente de los puertos configurados

set -e

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
echo -e "${BLUE}  Deteniendo Red Besu${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# Verificar si existe el archivo de PIDs
if [ ! -f "$PIDS_FILE" ]; then
    echo -e "${YELLOW}⚠ No se encontró archivo de PIDs${NC}"
    echo -e "${YELLOW}Intentando detener procesos Besu manualmente...${NC}\n"
    
    # Buscar procesos Besu
    BESU_PIDS=$(pgrep -f "besu.*config.toml" || true)
    
    if [ -z "$BESU_PIDS" ]; then
        echo -e "${GREEN}✓ No hay procesos Besu corriendo${NC}"
        exit 0
    fi
    
    echo -e "${YELLOW}Procesos Besu encontrados:${NC}"
    ps -p $BESU_PIDS -o pid,cmd | grep -v "PID"
    
    echo -e "\n${YELLOW}¿Detener estos procesos? (y/n)${NC}"
    read -r response
    if [ "$response" = "y" ]; then
        for pid in $BESU_PIDS; do
            echo -e "${YELLOW}Deteniendo proceso $pid...${NC}"
            kill -15 $pid 2>/dev/null || true
        done
        sleep 5
        
        # Verificar si aún existen
        for pid in $BESU_PIDS; do
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}Forzando detención del proceso $pid...${NC}"
                kill -9 $pid 2>/dev/null || true
            fi
        done
        echo -e "${GREEN}✓ Procesos detenidos${NC}"
    fi
    exit 0
fi

# Función para detener un nodo de forma ordenada
stop_node() {
    local node_name=$1
    local pid=$2
    
    if ! ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ $node_name (PID: $pid) ya no está corriendo${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}► Deteniendo $node_name (PID: $pid)...${NC}"
    
    # Intentar detención ordenada (SIGTERM)
    kill -15 $pid 2>/dev/null || true
    
    # Esperar hasta 15 segundos para que se detenga
    local count=0
    while ps -p $pid > /dev/null 2>&1 && [ $count -lt 15 ]; do
        sleep 1
        count=$((count + 1))
        echo -ne "${BLUE}  Esperando... ${count}/15\r${NC}"
    done
    echo -ne "\n"
    
    # Si aún sigue corriendo, forzar detención (SIGKILL)
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${RED}  Forzando detención...${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
    
    if ! ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $node_name detenido${NC}"
    else
        echo -e "${RED}✗ No se pudo detener $node_name${NC}"
        return 1
    fi
}

# Leer y detener nodos en orden inverso (RPC -> Validadores -> Bootnode)
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 1: Deteniendo Nodos RPC${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

grep "RPC" "$PIDS_FILE" 2>/dev/null | while IFS=: read -r node pid; do
    stop_node "$node" "$pid"
done

echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 2: Deteniendo Validadores${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

grep "Val" "$PIDS_FILE" 2>/dev/null | while IFS=: read -r node pid; do
    stop_node "$node" "$pid"
done

echo -e "\n${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}FASE 3: Deteniendo Bootnode${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}\n"

grep "Boot" "$PIDS_FILE" 2>/dev/null | while IFS=: read -r node pid; do
    stop_node "$node" "$pid"
done

# Limpiar archivo de PIDs
rm -f "$PIDS_FILE"

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Red Besu detenida completamente${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"

# Verificar que no queden procesos Besu
REMAINING=$(pgrep -f "besu.*config.toml" 2>/dev/null || true)
if [ -n "$REMAINING" ]; then
    echo -e "${YELLOW}⚠ Advertencia: Aún hay procesos Besu corriendo:${NC}"
    ps -p $REMAINING -o pid,cmd | grep -v "PID"
    echo -e "\n${YELLOW}Ejecute: kill -9 $REMAINING${NC}"
else
    echo -e "${GREEN}✓ No hay procesos Besu corriendo${NC}"
fi

echo -e "\n${BLUE}Para reiniciar la red:${NC}"
echo -e "  ${YELLOW}./scripts/start-network.sh${NC}\n"