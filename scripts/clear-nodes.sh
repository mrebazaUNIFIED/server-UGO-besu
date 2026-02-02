#!/bin/bash

# Directorio base de los nodos
NODES_DIR="./Nodes"

echo "🧹 Limpiando nodos en: $NODES_DIR"
echo "-----------------------------------"

for NODE in "$NODES_DIR"/*; do
  [ -d "$NODE" ] || continue

  NODE_NAME=$(basename "$NODE")
  DATA_DIR="$NODE/data"

  if [ ! -d "$DATA_DIR" ]; then
    echo "⚠️  $NODE_NAME no tiene carpeta data, saltando..."
    continue
  fi

  echo "➡️ Procesando $NODE_NAME"

  # Detectar si es Validator
  if [[ "$NODE_NAME" == *"Val"* ]]; then
    echo "   🔐 Modo Validator: conservando key y key.pub"

    for ITEM in "$DATA_DIR"/*; do
      BASENAME=$(basename "$ITEM")

      if [[ "$BASENAME" != "key" && "$BASENAME" != "key.pub" ]]; then
        rm -rf "$ITEM"
        echo "     ❌ Eliminado: $BASENAME"
      else
        echo "     ✅ Conservado: $BASENAME"
      fi
    done

  else
    echo "   🌐 Modo RPC/Boot: limpiando data completamente"
    rm -rf "$DATA_DIR"
    mkdir -p "$DATA_DIR"
    echo "     ♻️ data recreada"
  fi

done

echo "-----------------------------------"
echo "✅ Limpieza de nodos completada"
