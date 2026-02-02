#!/bin/bash

# Script para habilitar permissioning en la red
# IMPORTANTE: La red debe estar corriendo para obtener los enodes

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Habilitando Permissioning en la Red${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verificar que la red está corriendo
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${RED}✗ La red no está corriendo. Inicia primero con ./scripts/start-network.sh${NC}"
    exit 1
fi

# Paso 1: Obtener todos los enodes
echo -e "${YELLOW}► Paso 1: Obteniendo enodes de todos los nodos...${NC}\n"

declare -A ENODES
PORTS=(8545 8553 8547 8549 8554 8555 8551)
NAMES=("FCI-Val1" "FCI-Val2" "FCI-RPC1" "FCI-RPC2" "Sunwest-Val1" "Sunwest-Val2" "Sunwest-RPC")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    NAME=${NAMES[$i]}
    
    echo -e "${BLUE}Obteniendo enode de $NAME (puerto $PORT)...${NC}"
    
    ENODE=$(curl -s -X POST \
        --data '{"jsonrpc":"2.0","method":"admin_nodeInfo","params":[],"id":1}' \
        http://localhost:$PORT 2>/dev/null | \
        grep -o '"enode":"[^"]*"' | \
        cut -d'"' -f4)
    
    if [ -z "$ENODE" ]; then
        echo -e "${RED}  ✗ No se pudo obtener enode${NC}"
    else
        ENODES[$NAME]=$ENODE
        echo -e "${GREEN}  ✓ $ENODE${NC}"
    fi
done

# Obtener enode del bootnode desde logs
echo -e "\n${BLUE}Obteniendo enode del Bootnode desde logs...${NC}"
if [ -f "Node-FCI-Boot/besu.log" ]; then
    BOOT_ENODE=$(grep -o 'enode://[^"]*' Node-FCI-Boot/besu.log | head -1)
    if [ ! -z "$BOOT_ENODE" ]; then
        ENODES["Bootnode"]=$BOOT_ENODE
        echo -e "${GREEN}  ✓ $BOOT_ENODE${NC}"
    else
        echo -e "${RED}  ✗ No encontrado en logs${NC}"
    fi
fi

# Paso 2: Crear permissions_config.toml
echo -e "\n${YELLOW}► Paso 2: Creando permissions_config.toml...${NC}"

cat > permissions_config.toml << 'EOF'
# Configuración de Permissioning para Red FCI-Sunwest
# Generado automáticamente

[nodes-allowlist]
# Solo estos nodos pueden conectarse a la red
nodes=[
EOF

# Agregar enodes al archivo
for NAME in "${!ENODES[@]}"; do
    echo "  \"${ENODES[$NAME]}\"," >> permissions_config.toml
done

cat >> permissions_config.toml << 'EOF'
]

[accounts-allowlist]
# Solo estas cuentas pueden hacer transacciones
# NOTA: Actualiza con las direcciones reales de tus validadores y cuentas operativas
accounts=[
  "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
  "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
  "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
  "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef",
  "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544",
  "0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2",
  "0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e"
]
EOF

echo -e "${GREEN}✓ permissions_config.toml creado${NC}"

# Paso 3: Copiar a todos los nodos
echo -e "\n${YELLOW}► Paso 3: Copiando permissions_config.toml a todos los nodos...${NC}"

NODES=("Node-FCI-Boot" "Node-FCI-Val1" "Node-FCI-Val2" "Node-FCI-RPC1" "Node-FCI-RPC2" "Node-Sunwest-Val1" "Node-Sunwest-Val2" "Node-Sunwest-RPC")

for NODE in "${NODES[@]}"; do
    if [ -d "$NODE" ]; then
        cp permissions_config.toml "$NODE/"
        echo -e "${GREEN}  ✓ Copiado a $NODE/${NC}"
    fi
done

# Paso 4: Actualizar config.toml
echo -e "\n${YELLOW}► Paso 4: Actualizando config.toml de cada nodo...${NC}"

for NODE in "${NODES[@]}"; do
    CONFIG="$NODE/config.toml"
    if [ -f "$CONFIG" ]; then
        # Descomentar las líneas de permissioning
        sed -i 's/# permissions-nodes-config-file-enabled=true/permissions-nodes-config-file-enabled=true/' "$CONFIG"
        sed -i 's/# permissions-nodes-config-file="permissions_config.toml"/permissions-nodes-config-file="permissions_config.toml"/' "$CONFIG"
        echo -e "${GREEN}  ✓ $NODE/config.toml actualizado${NC}"
    fi
done

# Resumen
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Permissioning Configurado${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Archivos creados/modificados:${NC}"
echo -e "  • permissions_config.toml (raíz)"
echo -e "  • Copiado a todos los nodos (Node-*/permissions_config.toml)"
echo -e "  • Actualizado config.toml de todos los nodos"

echo -e "\n${YELLOW}IMPORTANTE:${NC}"
echo -e "  1. Verifica permissions_config.toml y ajusta las cuentas si es necesario"
echo -e "  2. Reinicia la red para aplicar cambios:"
echo -e "     ${BLUE}./scripts/restart-network.sh${NC}"
echo -e "\n${YELLOW}  3. Después del reinicio, solo nodos/cuentas en la whitelist podrán operar${NC}\n"