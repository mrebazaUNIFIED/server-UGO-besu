#!/bin/bash

# Script para regenerar genesis sin cuentas pre-fondeadas
# Basado en tu generate-keys.sh pero sin cuentas en alloc

set -e

echo "======================================"
echo "Regenerando Genesis sin Cuentas Fondeadas"
echo "======================================"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ADVERTENCIA
echo -e "\n${RED}⚠️  ADVERTENCIA:${NC}"
echo -e "${YELLOW}Esto regenerará genesis.json y reiniciará la blockchain.${NC}"
echo -e "${YELLOW}Se perderán bloques y transacciones actuales (estás en bloque 2750).${NC}"
echo -e "${YELLOW}Solo continúa si estás en desarrollo/testing.${NC}\n"

read -p "¿Continuar? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelado."
    exit 0
fi

# Verificar que Java 21 esté instalado
echo -e "\n${YELLOW}Verificando Java 21...${NC}"
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo -e "${RED}Error: Se requiere Java 21 o superior. Versión actual: $JAVA_VERSION${NC}"
    echo "Descarga desde: https://adoptium.net/"
    exit 1
fi
echo -e "${GREEN}✓ Java $JAVA_VERSION detectado${NC}"

# Verificar que Besu esté instalado
echo -e "${YELLOW}Verificando Besu...${NC}"
if ! command -v besu &> /dev/null; then
    echo -e "${RED}Error: Besu no encontrado en PATH${NC}"
    echo "Descarga desde: https://github.com/hyperledger/besu/releases"
    exit 1
fi
BESU_VERSION=$(besu --version | head -n 1)
echo -e "${GREEN}✓ $BESU_VERSION detectado${NC}"

# Paso 1: Hacer backup del genesis actual
echo -e "\n${YELLOW}Haciendo backup de archivos actuales...${NC}"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp genesis.json "$BACKUP_DIR/" 2>/dev/null || true
cp qbftConfigFile.json "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup guardado en $BACKUP_DIR/${NC}"

# Paso 2: Actualizar qbftConfigFile.json sin cuentas fondeadas
echo -e "\n${YELLOW}Actualizando qbftConfigFile.json sin cuentas fondeadas...${NC}"

cat > qbftConfigFile.json << 'EOF'
{
  "genesis": {
    "config": {
      "chainId": 12345,
      "berlinBlock": 0,
      "qbft": {
        "blockperiodseconds": 5,
        "epochlength": 30000,
        "requesttimeoutseconds": 10
      }
    },
    "nonce": "0x0",
    "timestamp": "0x58ee40ba",
    "gasLimit": "0x47b760",
    "difficulty": "0x1",
    "mixHash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
    "coinbase": "0x0000000000000000000000000000000000000000",
    "alloc": {
      "fe3b557e8fb62b89f4916b721be55ceb828dbd73": {
        "comment": "FCI Deployer Account (Funder)",
        "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
      }
    }
  },
  "blockchain": {
    "nodes": {
      "generate": true,
      "count": 4
    }
  }
}
EOF

echo -e "${GREEN}✓ qbftConfigFile.json actualizado${NC}"

# Paso 3: Detener la red si está corriendo
echo -e "\n${YELLOW}Deteniendo la red...${NC}"
./scripts/stop-network.sh 2>/dev/null || echo "Red no estaba corriendo"

# Paso 4: Limpiar datos antiguos de blockchain
echo -e "\n${YELLOW}Limpiando datos de blockchain antiguos...${NC}"
rm -rf Nodes/Node-FCI-Boot/data/database Nodes/Node-FCI-Boot/data/caches
rm -rf Nodes/Node-FCI-Val1/data/database Nodes/Node-FCI-Val1/data/caches
rm -rf Nodes/Node-FCI-Val2/data/database Nodes/Node-FCI-Val2/data/caches
rm -rf Nodes/Node-FCI-RPC1/data/database Nodes/Node-FCI-RPC1/data/caches
rm -rf Nodes/Node-FCI-RPC2/data/database Nodes/Node-FCI-RPC2/data/caches
rm -rf Nodes/Node-Sunwest-Val1/data/database Nodes/Node-Sunwest-Val1/data/caches
rm -rf Nodes/Node-Sunwest-Val2/data/database Nodes/Node-Sunwest-Val2/data/caches
rm -rf Nodes/Node-Sunwest-RPC/data/database Nodes/Node-Sunwest-RPC/data/caches

# Limpiar metadata
find Nodes/Node-*/data -name "DATABASE_METADATA.json" -delete 2>/dev/null || true
find Nodes/Node-*/data -name "VERSION_METADATA.json" -delete 2>/dev/null || true

echo -e "${GREEN}✓ Datos antiguos limpiados${NC}"

# Paso 5: Generar nuevo genesis.json y keys de validadores
echo -e "\n${YELLOW}Generando nuevo genesis.json y keys de validadores...${NC}"

# Limpiar networkFiles anterior
rm -rf networkFiles

besu operator generate-blockchain-config \
  --config-file=qbftConfigFile.json \
  --to=networkFiles \
  --private-key-file-name=key

if [ $? -ne 0 ]; then
    echo -e "${RED}Error al generar configuración${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Genesis y keys generados en networkFiles/${NC}"

# Paso 6: Copiar genesis.json a la raíz
echo -e "\n${YELLOW}Copiando genesis.json a raíz...${NC}"
cp networkFiles/genesis.json .
echo -e "${GREEN}✓ genesis.json copiado${NC}"

# Paso 7: Asignar keys a validadores
echo -e "\n${YELLOW}Asignando keys a validadores...${NC}"

# Limpiar keys antiguas
rm -f Nodes/Node-FCI-Val1/data/key Nodes/Node-FCI-Val1/data/key.pub
rm -f Nodes/Node-FCI-Val2/data/key Nodes/Node-FCI-Val2/data/key.pub
rm -f Nodes/Node-Sunwest-Val1/data/key Nodes/Node-Sunwest-Val1/data/key.pub
rm -f Nodes/Node-Sunwest-Val2/data/key Nodes/Node-Sunwest-Val2/data/key.pub

# Listar las addresses generadas
KEYS_DIRS=(networkFiles/keys/*)
if [ ${#KEYS_DIRS[@]} -ne 4 ]; then
    echo -e "${RED}Error: Se esperaban 4 validadores, se encontraron ${#KEYS_DIRS[@]}${NC}"
    exit 1
fi

# Asignar keys en orden: FCI-Val1, FCI-Val2, Sunwest-Val1, Sunwest-Val2
echo "Asignando:"
echo "  ${KEYS_DIRS[0]} -> Nodes/Node-FCI-Val1/data/"
cp -r ${KEYS_DIRS[0]}/* Nodes/Node-FCI-Val1/data/

echo "  ${KEYS_DIRS[1]} -> Nodes/Node-FCI-Val2/data/"
cp -r ${KEYS_DIRS[1]}/* Nodes/Node-FCI-Val2/data/

echo "  ${KEYS_DIRS[2]} -> Nodes/Node-Sunwest-Val1/data/"
cp -r ${KEYS_DIRS[2]}/* Nodes/Node-Sunwest-Val1/data/

echo "  ${KEYS_DIRS[3]} -> Nodes/Node-Sunwest-Val2/data/"
cp -r ${KEYS_DIRS[3]}/* Nodes/Node-Sunwest-Val2/data/

echo -e "${GREEN}✓ Keys asignadas a validadores${NC}"

# Limpiar keys de nodos RPC/Boot (se regenerarán automáticamente)
rm -f Nodes/Node-FCI-Boot/data/key
rm -f Nodes/Node-FCI-RPC1/data/key
rm -f Nodes/Node-FCI-RPC2/data/key
rm -f Nodes/Node-Sunwest-RPC/data/key

echo -e "${YELLOW}Nota: Bootnode y nodos RPC generarán sus keys automáticamente al iniciar${NC}"

# Resumen
echo -e "\n${GREEN}======================================"
echo "Genesis Regenerado Exitosamente (sin cuentas iniciales)"
echo "======================================${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Iniciar la red: ${BLUE}./scripts/start-network.sh${NC}"
echo -e "  2. Verificar balances: ${BLUE}./scripts/create-accounts.sh${NC}"
echo -e "  3. Deploy contratos: ${BLUE}cd contracts && npm run deploy${NC}"
echo ""
echo -e "${GREEN}Backup anterior guardado en: $BACKUP_DIR/${NC}"
echo ""