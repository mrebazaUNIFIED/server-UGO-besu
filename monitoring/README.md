# 🔍 Besu Monitoring Stack

Stack completo de monitoreo para la red Besu privada con **Prometheus + Grafana + Loki**.

## 📋 Componentes

| Componente | Puerto | Función |
|------------|--------|---------|
| **Prometheus** | 9090 | Recopila métricas de todos los nodos Besu + API |
| **Grafana** | 3000 | Dashboards visuales en tiempo real |
| **Loki** | 3100 | Agregación y búsqueda de logs |
| **Promtail** | - | Envía logs de nodos a Loki |

## 🚀 Inicio Rápido

### 1. Iniciar la API

```bash
cd api
npm install
npm start
```

### 2. Iniciar Monitoring Stack

```bash
./scripts/start-monitoring.sh
```

### 3. Acceder a Grafana

- URL: `http://localhost:3000`
- Usuario: `admin`
- Password: `admin`

## 📊 Dashboards Disponibles

### Besu Network Overview
- Estado de todos los nodos (UP/DOWN)
- Block number por nodo
- Peer count
- Transaction rate
- API requests/sec y latencia
- Cache hit rate
- Logs en tiempo real (Loki)

### API Performance
- HTTP status codes (2xx, 4xx, 5xx)
- Latencia por endpoint (p50, p95, p99)
- Cache operations (hits, misses, invalidations)
- Blockchain transactions
- Error rate

## 🔧 Endpoints de la API

| Endpoint | Descripción |
|----------|-------------|
| `/health` | Health check de nodos |
| `/rpc-status` | Estado detallado de RPC |
| `/cache-status` | Estadísticas de cache |
| `/metrics` | Métricas formato Prometheus |
| `/monitoring` | Métricas formato JSON |

## 📁 Estructura de Archivos

```
monitoring/
├── docker-compose.yml          # Stack completo
├── prometheus/
│   └── prometheus.yml          # Configuración Prometheus
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/        # Datasources auto-configurados
│   │   └── dashboards/         # Dashboards auto-configurados
│   └── dashboards/
│       ├── besu-network-overview.json
│       └── api-performance.json
├── loki/
│   └── loki-config.yml         # Configuración Loki
└── promtail/
    └── promtail-config.yml     # Configuración Promtail
```

## 🎯 Métricas Monitoreadas

### Besu Nodes (8 nodos)
- `besu_blockchain_height` - Altura de blockchain
- `besu_peers_connected_count` - Pares conectados
- `besu_transaction_pool_transactions` - TX pool
- `jvm_*` - Métricas de JVM (memory, GC, threads)
- `up` - Estado del nodo (1=UP, 0=DOWN)

### API
- `http_requests_total` - Requests por método/ruta/status
- `http_request_duration_seconds` - Latencia (p50, p95, p99)
- `cache_hits_total` - Cache hits por tipo
- `cache_misses_total` - Cache misses por tipo
- `cache_invalidations_total` - Invalidaciones por tipo
- `cache_items_count` - Items en cache por tipo
- `besu_transactions_confirmed_total` - TX confirmadas
- `besu_transactions_pending_total` - TX pendientes
- `besu_rpc_errors_total` - Errores RPC por nodo

## 🔍 Consultas Útiles en Grafana

### Ver logs de un nodo específico
```
{node="Node-FCI-Val1"} |= "ERROR"
```

### Ver logs de la API
```
{job="besu-api"} |= "cache"
```

### Buscar transacciones fallidas
```
{filename=~".*besu.*"} |= "failed" | json
```

## 🛑 Detener Monitoring

```bash
./scripts/stop-monitoring.sh
```

Para eliminar datos también:
```bash
cd monitoring
docker compose down -v
```

## 🏗️ Producción

### Linux Server

1. Instalar Docker:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. Configurar Prometheus `prometheus.yml`:
```yaml
# Cambiar host.docker.internal por la IP real del host
static_configs:
  - targets: ['172.17.0.1:8070']  # IP del host Docker
```

3. Iniciar:
```bash
./scripts/start-monitoring.sh
```

4. Configurar Nginx como reverse proxy (opcional):
```nginx
server {
    listen 80;
    server_name monitoring.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

### Alertas (opcional)

Crear `monitoring/grafana/provisioning/alerting/alerts.yml`:
```yaml
apiVersion: 1
groups:
  - orgId: 1
    name: besu-alerts
    rules:
      - uid: node-down
        title: "Besu Node Down"
        condition: B
        data:
          - refId: A
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: up{job=~"besu-.*"} == 0
        noDataState: NoData
        execErrState: Error
        for: 1m
        annotations:
          summary: "Node {{ $labels.node }} is down"
```

## 📈 Escalar

Para monitorear más nodos, agregar a `prometheus/prometheus.yml`:

```yaml
  - job_name: 'besu-new-node'
    static_configs:
      - targets: ['host.docker.internal:9553']
        labels:
          cluster: 'besu-private'
          node: 'new-node'
          role: 'validator'
```

## 🐛 Troubleshooting

### Prometheus no scrapea métricas
```bash
# Verificar conectividad
curl http://localhost:9546/metrics

# Verificar configuración Docker
docker exec besu-prometheus cat /etc/prometheus/prometheus.yml
```

### Grafana no muestra datos
1. Verificar datasource: Configuration → Data Sources → Prometheus
2. Debe apuntar a: `http://prometheus:9090`
3. Verificar logs: `docker compose logs grafana`

### Loki no recibe logs
```bash
# Verificar Promtail
docker compose logs promtail

# Verificar rutas de logs
ls -la ../Nodes/*/besu.log
```

### API /metrics no funciona
```bash
curl http://localhost:8070/metrics
# Debe retornar métricas en formato Prometheus
```

## 📚 Recursos

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Loki Docs](https://grafana.com/docs/loki/latest/)
- [Besu Metrics](https://besu.hyperledger.org/private-networks/how-to/monitor/metrics)
