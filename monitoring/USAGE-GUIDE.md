# 🚀 Guía Completa de Uso - Besu Monitoring

---

## 📋 Resumen Rápido

| Componente | Puerto | Función |
|------------|--------|---------|
| **API Gateway** | 8070 | REST API de tu aplicación |
| **Nodos RPC** | 8050-8059 | Puntos de acceso a blockchain |
| **Métricas Besu** | 9545-9552 | Prometheus scrapea aquí |
| **Prometheus** | 9090 | Almacena métricas |
| **Grafana** | 3000 | Dashboards visuales |
| **Loki** | 3100 | Agrega logs |

---

## 🔧 DESARROLLO (Tu máquina local)

### Opción 1: Solo Dashboard Rápido (Sin Docker)

Ideal para desarrollo rápido sin infraestructura adicional.

```bash
# 1. Ir al directorio de la API
cd /home/unified/server-UGO-besu/api

# 2. Instalar dependencias (solo primera vez)
npm install

# 3. Iniciar API
npm start
# o para desarrollo con auto-reload:
npm run dev

# 4. Verificar que funcione
curl http://localhost:8070/health
curl http://localhost:8070/monitoring

# 5. Abrir dashboard en navegador
# Desde terminal:
xdg-open ../monitoring/dashboard.html  # Linux
# o manualmente: file:///home/unified/server-UGO-besu/monitoring/dashboard.html
```

**Esto te da:**
- ✅ Métricas en tiempo real de la API
- ✅ Cache hit rate
- ✅ Latencia (p50, p95, p99)
- ✅ Transacciones blockchain
- ❌ No incluye métricas de nodos Besu
- ❌ No histórico de datos

---

### Opción 2: Stack Completo (Desarrollo)

Para desarrollo con monitoreo profundo.

#### Pre-requisitos
```bash
# Instalar Docker (Ubuntu/WSL)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login para aplicar grupo

# Verificar instalación
docker --version
docker compose version
```

#### Pasos

```bash
# 1. Asegurar que nodos Besu están corriendo
cd /home/unified/server-UGO-besu
cat besu.pids
# Deberías ver 8 procesos

# Si no están corriendo, iniciarlos:
./scripts/start-network.sh

# 2. Verificar que métricas estén habilitadas
curl http://localhost:9546/metrics | head -5
# Debe mostrar métricas en formato Prometheus

# 3. Iniciar API
cd api
npm start &  # En background

# 4. Iniciar monitoring stack
cd /home/unified/server-UGO-besu
./scripts/start-monitoring.sh

# 5. Verificar servicios
docker compose -f monitoring/docker-compose.yml ps
# Debe mostrar 4 containers: prometheus, grafana, loki, promtail
```

#### Acceder a Dashboards

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Dashboard Rápido | file:///home/unified/server-UGO-besu/monitoring/dashboard.html | - |

#### Ver Logs en Tiempo Real

```bash
# Logs de monitoring stack
docker compose -f monitoring/docker-compose.yml logs -f

# Solo Grafana
docker compose -f monitoring/docker-compose.yml logs -f grafana

# Logs de nodos Besu
tail -f Nodes/Node-FCI-Val1/besu.log
```

#### Detener (Desarrollo)

```bash
# Detener monitoring
./scripts/stop-monitoring.sh

# Detener API
kill $(cat api/.pid 2>/dev/null) 2>/dev/null
# o Ctrl+C si está en foreground

# Detener nodos Besu
./scripts/stop-network.sh
```

---

## 🏗️ PRODUCCIÓN (Linux Server)

### 1. Preparar Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar dependencias Node.js (si no existe)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 para gestionar procesos
sudo npm install -g pm2
```

### 2. Configurar Aplicación

```bash
# Clonar/setup proyecto
cd /home/unified/server-UGO-besu

# Instalar dependencias API
cd api
npm ci --production
cd ..

# Crear .env de producción
cp api/.env.example api/.env
nano api/.env
# Cambiar:
# - JWT_SECRET a uno seguro
# - PRIVATE_KEY a la real
# - NODE_ENV=production
```

### 3. Configurar Prometheus para Producción

```bash
cd /home/unified/server-UGO-besu/monitoring/prometheus

# Editar prometheus.yml
nano prometheus.yml

# Cambiar TODAS las líneas que digan:
#   targets: ['host.docker.internal:XXXX']
# Por la IP de tu host (usualmente 172.17.0.1 o tu IP real):
#   targets: ['172.17.0.1:XXXX']

# O mejor: usar la IP de la red de Docker
docker network create monitoring
```

**Ejemplo de cambio:**
```yaml
# DESARROLLO:
- job_name: 'besu-fci-val1'
  static_configs:
    - targets: ['host.docker.internal:9546']

# PRODUCCIÓN:
- job_name: 'besu-fci-val1'
  static_configs:
    - targets: ['172.17.0.1:9546']  # IP real del host
```

### 4. Configurar Nginx (Acceso Seguro)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Configurar reverse proxy
sudo nano /etc/nginx/sites-available/monitoring

# Contenido:
server {
    listen 80;
    server_name monitoring.tudominio.com;  # O tu IP

    # Grafana
    location /grafana/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Prometheus
    location /prometheus/ {
        proxy_pass http://localhost:9090/;
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8070/;
        proxy_set_header Host $host;
    }
}

# Activar site
sudo ln -s /etc/nginx/sites-available/monitoring /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Iniciar Servicios con PM2

```bash
cd /home/unified/server-UGO-besu

# Iniciar nodos Besu
./scripts/start-network.sh

# Iniciar API con PM2
cd api
pm2 start server.js --name besu-api --max-memory-restart 1G
pm2 save

# Verificar
pm2 status
# Debe mostrar: besu-api online
```

### 6. Iniciar Monitoring Stack

```bash
cd /home/unified/server-UGO-besu
./scripts/start-monitoring.sh

# Verificar
docker compose -f monitoring/docker-compose.yml ps

# Ver logs
docker compose -f monitoring/docker-compose.yml logs -f
```

### 7. Cambiar Credenciales de Grafana

1. Ir a http://tu-servidor:3000
2. Login: admin / admin
3. Te pedirá cambiar password — **HACERLO**
4. O por CLI:
```bash
docker exec besu-grafana grafana-cli admin reset-admin-password nuevo-password-seguro
```

### 8. Configurar Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Nginx)
sudo ufw allow 443/tcp   # HTTPS (si usas SSL)
sudo ufw allow 8070/tcp  # API (si acceso directo)
sudo ufw enable
```

### 9. Auto-Start en Boot (Systemd)

```bash
# Crear servicio para monitoring
sudo nano /etc/systemd/system/besu-monitoring.service

# Contenido:
[Unit]
Description=Besu Monitoring Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/unified/server-UGO-besu/monitoring
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target

# Activar
sudo systemctl daemon-reload
sudo systemctl enable besu-monitoring
sudo systemctl start besu-monitoring
```

---

## 🔍 Comandos Útiles

### Ver Estado Completo
```bash
# Nodos Besu
cat besu.pids
ps aux | grep besu

# API
pm2 status
curl http://localhost:8070/health

# Monitoring
docker compose -f monitoring/docker-compose.yml ps
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health  # Grafana
```

### Logs en Tiempo Real
```bash
# Todos los logs de monitoring
docker compose -f monitoring/docker-compose.yml logs -f --tail=100

# Solo Prometheus
docker compose -f monitoring/docker-compose.yml logs -f prometheus

# Solo Grafana
docker compose -f monitoring/docker-compose.yml logs -f grafana

# Logs de nodos Besu
tail -f Nodes/*/besu.log
```

### Métricas Rápidas
```bash
# API métricas JSON
curl http://localhost:8070/monitoring | jq

# API métricas Prometheus
curl http://localhost:8070/metrics

# Métricas de un nodo Besu
curl http://localhost:9546/metrics | head -20
```

---

## 🚨 Troubleshooting

### API no responde
```bash
# Verificar proceso
pm2 logs besu-api

# Reiniciar
pm2 restart besu-api

# Ver logs
tail -f api/logs/*.log  # Si tienes logging a archivo
```

### Prometheus no scrapea métricas
```bash
# Ver targets
curl http://localhost:9090/api/v1/targets | jq

# Si están DOWN, verificar conectividad
curl http://localhost:9546/metrics

# Si falla, verificar que el nodo esté corriendo
cat Nodes/Node-FCI-Val1/besu.log | tail -20
```

### Grafana no muestra datos
1. Ir a **Configuration → Data Sources**
2. Verificar que Prometheus apunte a `http://prometheus:9090`
3. Click **Save & Test**
4. Ver logs: `docker compose logs grafana`

### Dashboard HTML no carga
```bash
# Verificar API
curl http://localhost:8070/monitoring

# Si falla, API está caída
pm2 status
pm2 logs besu-api
```

### Docker no tiene conexión a red del host
```bash
# En Linux, a veces necesitas iptables rules
sudo iptables -I FORWARD -i docker0 -o eth0 -j ACCEPT
sudo iptables -I FORWARD -i eth0 -o docker0 -j ACCEPT

# O usar host network en docker-compose (no recomendado para producción)
```

---

## 📊 Consultas Útiles en Grafana

### Ver logs de un nodo específico
```
{node="Node-FCI-Val1"} |= "ERROR"
```

### Ver transacciones en la API
```
{job="besu-api"} |= "CREATE"
```

### Buscar errores en todos los logs
```
{filename=~".*besu.*"} |= "failed" | json
```

### Ver métrica específica
```
besu_blockchain_height{node="fci-val1"}
```

---

## 🛑 Detener Todo

```bash
# Detener monitoring
./scripts/stop-monitoring.sh

# Detener API
pm2 stop besu-api

# Detener nodos Besu
./scripts/stop-network.sh

# O con PM2 todo junto
pm2 stop all
```
