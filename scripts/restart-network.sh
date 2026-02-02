#!/bin/bash

# Script para reiniciar la red Besu
# Uso: ./restart-network.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  Reiniciando Red Besu${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# Detener la red
echo -e "${YELLOW}Paso 1: Deteniendo la red...${NC}\n"
if [ -f "$SCRIPT_DIR/stop-network.sh" ]; then
    bash "$SCRIPT_DIR/stop-network.sh"
else
    echo -e "${RED}✗ Script stop-network.sh no encontrado${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Esperando 5 segundos antes de reiniciar...${NC}"
sleep 5

# Iniciar la red
echo -e "\n${YELLOW}Paso 2: Iniciando la red...${NC}\n"
if [ -f "$SCRIPT_DIR/start-network.sh" ]; then
    bash "$SCRIPT_DIR/start-network.sh"
else
    echo -e "${RED}✗ Script start-network.sh no encontrado${NC}"
    exit 1
fi

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Red reiniciada exitosamente${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}\n"