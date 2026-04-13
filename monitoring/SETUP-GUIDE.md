# 🔧 Monitoring Stack - Setup & Verification Guide

## ✅ What Has Been Fixed

### 1. **Promtail Configuration** (`monitoring/promtail/promtail-config.yml`)
- ✅ Fixed JSON log parsing for both API and Relayer
- ✅ Updated job labels: `besu-api` and `relayer-service`
- ✅ Added proper field extraction for `level`, `message`, `timestamp`
- ✅ Added error field extraction for API logs

### 2. **Grafana Dashboards** (`monitoring/grafana/provisioning/dashboards/json/`)
- ✅ Updated `api-relayer-logs.json` to use correct job labels
- ✅ Updated `besu-network-overview.json` Loki queries
- ✅ All dashboards now query: `{job="besu-api"}` and `{job="relayer-service"}`

### 3. **Docker Compose** (`monitoring/docker-compose.yml`)
- ✅ Added healthcheck for Grafana service
- ✅ Volume mounts verified for log directories

### 4. **Log Directories**
- ✅ `api/logs/` - Contains API logs (configured in `.env`)
- ✅ `relayer-service/logs/` - Contains Relayer logs (configured in `.env`)

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  API Gateway (Port 8070)     │  Relayer Service (Port 8080) │
│  Logs: ./logs/api.log        │  Logs: ./logs/relayer.log    │
│  Format: JSON                │  Format: JSON                │
│  Metrics: /metrics           │  Metrics: N/A                │
└──────────┬──────────────────┴──────────┬─────────────────────┘
           │                             │
           ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      LOG LAYER (Promtail)                   │
├─────────────────────────────────────────────────────────────┤
│  Mounts:                                                     │
│  - ../api/logs → /var/log/besu-api                          │
│  - ../relayer-service/logs → /var/log/relayer               │
│                                                              │
│  Parses JSON logs and forwards to Loki                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    AGGREGATION (Loki)                       │
├─────────────────────────────────────────────────────────────┤
│  Port: 3100                                                  │
│  Stores and indexes logs with labels:                       │
│  - job: besu-api, relayer-service                           │
│  - level: info, warn, error                                 │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  VISUALIZATION (Grafana)                    │
├─────────────────────────────────────────────────────────────┤
│  Port: 3000 (admin/admin)                                    │
│  Dashboards:                                                 │
│  1. Besu Network Overview - Nodes + API + Logs              │
│  2. API Performance - Metrics from Prometheus               │
│  3. API & Relayer Logs - Live log viewer from Loki          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   METRICS (Prometheus)                      │
├─────────────────────────────────────────────────────────────┤
│  Port: 9090                                                  │
│  Scrapes:                                                    │
│  - API /metrics endpoint                                    │
│  - Besu nodes metrics (8 nodes)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Start Monitoring

### Option 1: Quick Dashboard (No Docker)

```bash
# Start API
cd api
npm start

# Open dashboard in browser
# Windows: start ..\monitoring\dashboard.html
# Linux: xdg-open ../monitoring/dashboard.html
```

### Option 2: Full Monitoring Stack (Recommended)

```bash
# 1. Start API (in one terminal)
cd api
npm start

# 2. Start Relayer (in another terminal)
cd ../relayer-service
npm start

# 3. Start Monitoring Stack
cd ..
./scripts/start-monitoring.sh

# 4. Verify everything
./scripts/verify-monitoring.sh
```

---

## 🔍 Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Loki** | http://localhost:3100 | - |
| **API Health** | http://localhost:8070/health | - |
| **API Metrics** | http://localhost:8070/metrics | - |

---

## 📊 Grafana Queries

### View Logs

```
# All API logs
{job="besu-api"}

# All Relayer logs
{job="relayer-service"}

# Error logs from API
{job="besu-api", level="error"}

# Error logs from Relayer
{job="relayer-service", level="error"}

# Search for specific text
{job="besu-api"} |= "transaction"
{job="relayer-service"} |= "event"
```

### View Metrics

```
# API requests per second
rate(http_requests_total[1m])

# API response latency (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Cache hit rate
rate(cache_hits_total[1m]) / (rate(cache_hits_total[1m]) + rate(cache_misses_total[1m]))

# Besu node status
up{job=~"besu-.*"}

# Blockchain height
besu_blockchain_height
```

---

## 🧪 Verification Checklist

Run the verification script:
```bash
./scripts/verify-monitoring.sh
```

Manual checklist:
- [ ] Docker is running
- [ ] API is running (http://localhost:8070/health)
- [ ] Relayer is running (check logs in relayer-service/logs/)
- [ ] Prometheus is running (http://localhost:9090)
- [ ] Grafana is running (http://localhost:3000)
- [ ] Loki is running (http://localhost:3100/ready)
- [ ] Promtail is running (check docker logs)
- [ ] Log files exist in api/logs/ and relayer-service/logs/
- [ ] Grafana dashboards are loaded
- [ ] Can see logs in Grafana Explore with Loki

---

## 🛑 Stop Monitoring

```bash
# Stop monitoring stack
./scripts/stop-monitoring.sh

# Stop API (if running with PM2)
pm2 stop besu-api

# Stop Relayer (if running with PM2)
pm2 stop relayer

# To remove all data
cd monitoring
docker compose down -v
```

---

## 🐛 Troubleshooting

### Logs not showing in Grafana

1. **Check Promtail logs:**
   ```bash
   docker logs besu-promtail
   ```

2. **Verify log files exist:**
   ```bash
   ls -la api/logs/
   ls -la relayer-service/logs/
   ```

3. **Check Promtail config:**
   ```bash
   docker exec besu-promtail cat /etc/promtail/config.yml
   ```

4. **Test Loki directly:**
   ```bash
   curl http://localhost:3100/loki/api/v1/labels
   ```

### API logs not being collected

- Ensure `LOG_FILE=./logs/api.log` is set in `api/.env`
- Check that API is actually writing to the file:
  ```bash
  tail -f api/logs/api.log
  ```

### Relayer logs not being collected

- Ensure `LOG_FILE=./logs/relayer.log` is set in `relayer-service/.env`
- Check that Relayer is actually writing to the file:
  ```bash
  tail -f relayer-service/logs/relayer.log
  ```

### Grafana dashboards not loading

1. Check datasources:
   - Go to Configuration → Data Sources
   - Verify Prometheus points to `http://prometheus:9090`
   - Verify Loki points to `http://loki:3100`

2. Check provisioning:
   ```bash
   docker exec besu-grafana ls /etc/grafana/provisioning/dashboards/json/
   ```

### Prometheus not scraping metrics

1. Check targets:
   ```bash
   curl http://localhost:9090/api/v1/targets | jq
   ```

2. Verify API metrics endpoint:
   ```bash
   curl http://localhost:8070/metrics
   ```

3. Check Besu nodes metrics:
   ```bash
   curl http://localhost:9546/metrics | head -20
   ```

---

## 📁 File Structure

```
monitoring/
├── docker-compose.yml              # Stack configuration
├── prometheus/
│   └── prometheus.yml              # Prometheus scrape config
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml     # Auto-configure datasources
│   │   └── dashboards/
│   │       ├── dashboards.yml      # Auto-configure dashboards
│   │       └── json/
│   │           ├── besu-network-overview.json
│   │           ├── api-performance.json
│   │           └── api-relayer-logs.json
├── loki/
│   ├── loki-config.yml             # Loki configuration
│   └── rules/                      # Alerting rules
└── promtail/
    └── promtail-config.yml         # Log shipping config

scripts/
├── start-monitoring.sh             # Start monitoring stack
├── stop-monitoring.sh              # Stop monitoring stack
└── verify-monitoring.sh            # Verify setup (NEW)
```

---

## 🎯 Next Steps

1. **Start the services** and verify everything is working
2. **Explore logs** in Grafana Explore panel
3. **Customize dashboards** to your needs
4. **Set up alerts** for critical conditions
5. **Configure log retention** in Loki config if needed

---

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
