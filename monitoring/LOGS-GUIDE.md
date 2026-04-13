# 📝 Guía Completa de Logs - Besu System

---

## 📋 Dónde Están los Logs

| Servicio | Archivo | Descripción |
|----------|---------|-------------|
| **Nodos Besu (8)** | `Nodes/*/besu.log` | Logs de cada nodo blockchain |
| **API Gateway** | `api/logs/api.log` | Logs de la API REST |
| **Relayer** | `relayer-service/logs/relayer.log` | Logs del relayer entre cadenas |

---

## 🔍 Opción 1: Ver Logs en Terminal

### Nodos Besu

```bash
# Ver un nodo en tiempo real
tail -f Nodes/Node-FCI-Val1/besu.log

# Ver los últimos 100 líneas de un nodo
tail -n 100 Nodes/Node-FCI-Val1/besu.log

# Ver TODOS los nodos al mismo tiempo
tail -f Nodes/*/besu.log

# Buscar errores en todos los nodos
grep -i "error" Nodes/*/besu.log | tail -30

# Buscar warnings
grep -i "warn" Nodes/Node-FCI-RPC1/besu.log | tail -20

# Ver solo transacciones
grep -i "tx" Nodes/Node-FCI-Val1/besu.log | tail -20

# Filtrar por timestamp (última hora)
awk -v d="$(date -d '1 hour ago' '+%Y-%m-%d %H:%M')" '$0 > d' Nodes/Node-FCI-Val1/besu.log
```

### API Gateway

```bash
# Ver logs en tiempo real (si está configurado LOG_FILE)
tail -f api/logs/api.log

# Ver últimos 50 logs
tail -n 50 api/logs/api.log

# Buscar errores
grep "ERROR" api/logs/api.log | tail -20

# Buscar cache operations
grep "\[cache\]" api/logs/api.log | tail -20

# Buscar transacciones blockchain
grep "CREATE\|UPDATE\|CONFIRMED" api/logs/api.log | tail -20

# Ver logs mientras la API corre (en otra terminal)
cd api && npm start
```

### Relayer Service

```bash
# Ver logs del relayer
tail -f relayer-service/logs/relayer.log

# Ver configuración de log del relayer
cat relayer-service/.env | grep LOG

# Si usa PM2
pm2 logs relayer

# Buscar errores de transacciones
grep -i "error\|failed\|revert" relayer-service/logs/relayer.log | tail -20
```

---

## 🚀 Opción 2: Ver Logs en Grafana (Con Monitoring Stack)

### Paso 1: Iniciar Monitoring Stack

```bash
# Asegurar Docker corriendo
sudo service docker start

# Iniciar stack
./scripts/start-monitoring.sh

# Verificar que Promtail está capturando logs
docker compose -f monitoring/docker-compose.yml logs -f promtail
```

### Paso 2: Acceder a Grafana

```
URL: http://localhost:3000
Usuario: admin
Password: admin
```

### Paso 3: Explorar Logs en Grafana

1. Ir a **Explore** (icono de brújula en sidebar)
2. Seleccionar datasource: **Loki**
3. Usar estas queries:

#### Ver logs de todos los nodos Besu
```
{job="besu"}
```

#### Ver logs de un nodo específico
```
{node="Node-FCI-Val1"}
```

#### Ver logs con errores
```
{job="besu"} |= "ERROR"
```

#### Ver logs de la API
```
{job="besu-api"}
```

#### Ver logs de la API con warnings
```
{job="besu-api"} |= "WARN"
```

#### Ver transacciones en logs
```
{job="besu-api"} |= "CREATE" or {job="besu-api"} |= "UPDATE"
```

### Paso 4: Configurar Dashboard de Logs

En Grafana:
1. Ir a **Dashboards** → **Besu Network Overview**
2. El panel inferior muestra **Logs (Loki)** en tiempo real
3. Puedes filtrar por nivel (ERROR, WARN, INFO)

---

## 📊 Comandos Útiles de Búsqueda

### Buscar en todos los logs

```bash
# Buscar una palabra en TODOS los logs
grep -r "palabra" Nodes/ api/logs/ relayer-service/logs/

# Buscar en archivos específicos
grep "ERROR" Nodes/*/besu.log api/logs/api.log

# Contar errores por nodo
for f in Nodes/*/besu.log; do
  count=$(grep -c "ERROR" "$f")
  echo "$(basename $f): $count errores"
done
```

### Ver logs en tiempo real de TODO

```bash
# Abrir múltiples terminales con tmux
tmux new-session -d -s logs
tmux split-window -h "tail -f Nodes/Node-FCI-Val1/besu.log"
tmux split-window -v "tail -f Nodes/Node-FCI-RPC1/besu.log"
tmux split-window -v "tail -f api/logs/api.log"
tmux attach -t logs

# O más simple: tail de todo al mismo tiempo
tail -f Nodes/*/besu.log api/logs/api.log relayer-service/logs/relayer.log
```

---

## 🛠️ Configurar Log Levels

### Nodos Besu

En cada `Nodes/*/config.toml`:

```toml
# Cambiar nivel de logging
logging="INFO"    # Normal
logging="DEBUG"   # Más detallado (desarrollo)
logging="WARN"    # Solo warnings y errores
logging="ERROR"   # Solo errores
```

Reiniciar nodo después de cambiar:
```bash
./scripts/stop-network.sh
./scripts/start-network.sh
```

### API

En `api/.env`:
```bash
LOG_LEVEL=info    # Normal
LOG_LEVEL=debug   # Más detallado
LOG_LEVEL=error   # Solo errores
```

### Relayer

En `relayer-service/.env`:
```bash
LOG_LEVEL=info    # Normal
LOG_LEVEL=debug   # Más detallado
```

---

## 💾 Rotación de Logs

Los logs pueden crecer mucho. Para evitarlo:

### Opción 1: Logrotate (Linux)

```bash
sudo nano /etc/logrotate.d/besu

# Contenido:
/home/unified/server-UGO-besu/Nodes/*/besu.log
/home/unified/server-UGO-besu/api/logs/*.log
/home/unified/server-UGO-besu/relayer-service/logs/*.log
{
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### Opción 2: Limpiar manualmente

```bash
# Limpiar logs antiguos
> Nodes/Node-FCI-Val1/besu.log

# Eliminar logs comprimidos
find . -name "*.log.gz" -delete

# Ver tamaño de logs
du -sh Nodes/*/besu.log api/logs/*.log relayer-service/logs/*.log
```

---

## 🔍 Troubleshooting con Logs

### API no responde

```bash
# Ver logs de API
tail -n 100 api/logs/api.log

# Buscar errores de conexión a blockchain
grep "ECONNREFUSED\|ECONNRESET" api/logs/api.log

# Buscar errores de transacciones
grep "failed\|revert" api/logs/api.log
```

### Nodo Besu caído

```bash
# Ver último log del nodo
tail -n 50 Nodes/Node-FCI-Val1/besu.log

# Buscar errores fatales
grep -i "fatal\|error" Nodes/Node-FCI-Val1/besu.log | tail -20

# Ver si el proceso sigue corriendo
ps aux | grep besu | grep -v grep
```

### Relayer no procesa transacciones

```bash
# Ver logs del relayer
tail -f relayer-service/logs/relayer.log

# Buscar errores de transacciones
grep -i "error\|failed\|revert" relayer-service/logs/relayer.log

# Ver si está corriendo
pm2 logs relayer
# o
ps aux | grep relayer
```

---

## 📈 Exportar Logs

### Guardar logs en archivo

```bash
# Guardar últimas 1000 líneas de un nodo
tail -n 1000 Nodes/Node-FCI-Val1/besu.log > /tmp/val1-logs.txt

# Guardar logs de hoy
grep "$(date '+%Y-%m-%d')" Nodes/Node-FCI-Val1/besu.log > /tmp/val1-today.txt

# Guardar todos los logs comprimidos
tar czf /tmp/all-logs-$(date '+%Y%m%d').tar.gz \
  Nodes/*/besu.log \
  api/logs/*.log \
  relayer-service/logs/*.log
```

### Exportar desde Grafana/Loki

1. Ir a **Explore** → Query de Loki
2. Ejecutar query
3. Click en **Download** para exportar logs como JSON/CSV

---

## 🚀 Comandos Rápidos

```bash
# Ver TODO al mismo tiempo (terminal 1)
tail -f Nodes/Node-FCI-Val1/besu.log

# API logs (terminal 2)
tail -f api/logs/api.log

# Relayer logs (terminal 3)
tail -f relayer-service/logs/relayer.log

# Dashboard web (navegador)
http://localhost:3000  # Grafana con Loki
```
