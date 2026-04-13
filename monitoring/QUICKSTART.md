# 🚀 Quick Start - Besu Monitoring

## Opción 1: Dashboard Rápido (Sin Docker)

Si solo quieres ver métricas de la API inmediatamente:

### 1. Iniciar la API
```bash
cd api
npm install
npm start
```

### 2. Abrir Dashboard en tu Navegador
```bash
# Windows
start monitoring\dashboard.html

# Linux
xdg-open monitoring/dashboard.html
```

**URLs útiles:**
- Dashboard rápido: `file:///path/to/monitoring/dashboard.html`
- Métricas crudas: `http://localhost:8070/monitoring`
- Prometheus format: `http://localhost:8070/metrics`

---

## Opción 2: Stack Completo (Prometheus + Grafana + Loki)

### Requisitos
- Docker instalado
- Docker Compose v2

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

### 3. Acceder a Servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Loki** | http://localhost:3100 | - |
| **Dashboard Rápido** | `monitoring/dashboard.html` | - |

### 4. Explorar Dashboards

En Grafana:
1. Ir a **Dashboards** → **Besu Network Overview**
2. Ver dashboards pre-configurados con:
   - Estado de nodos Besu
   - Métricas de API
   - Logs en tiempo real

---

## Ver Logs de la Red

### Opción A: Desde Grafana (Loki)
1. Ir a **Explore** → Seleccionar datasource **Loki**
2. Query: `{job="besu"}` para ver todos los logs
3. Filtrar por nodo: `{node="Node-FCI-Val1"}`

### Opción B: Terminal
```bash
# Ver logs de un nodo
tail -f Nodes/Node-FCI-Val1/besu.log

# Ver logs de API
cd api
npm run dev  # Muestra logs en consola
```

---

## Troubleshooting

### Dashboard HTML no muestra datos
- Verificar que la API esté corriendo: `curl http://localhost:8070/monitoring`
- Revisar consola del navegador (F12) para errores

### Docker no puede conectarse a nodos
- En Linux, cambiar `host.docker.internal` por `172.17.0.1` en `prometheus/prometheus.yml`
- O usar `host.docker.internal` con Docker Desktop

### Grafana no muestra métricas
1. Verificar Prometheus: http://localhost:9090/targets
2. Todos los targets deben estar **UP**
3. Si están **DOWN**, verificar que los nodos Besu estén corriendo

---

## Detener Monitoring

```bash
./scripts/stop-monitoring.sh
```

---

## Producción (Linux Server)

### 1. Configurar Nginx como Reverse Proxy
```nginx
server {
    listen 80;
    server_name monitoring.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Configurar Firewall
```bash
sudo ufw allow 3000/tcp  # Grafana
sudo ufw allow 9090/tcp  # Prometheus
```

### 3. Cambiar Password de Grafana
1. Ir a **Configuration** → **Server Admin**
2. Cambiar password de admin

### 4. Configurar Alertas (Opcional)
Ver `monitoring/README.md` → Sección **Alertas**
