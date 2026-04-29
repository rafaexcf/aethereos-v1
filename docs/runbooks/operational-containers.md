# Runbook — Containers Operacionais (Infra Local)

> Versões estáveis conhecidas e diagnóstico de problemas comuns dos containers de desenvolvimento.

## Versões estáveis (Sprint 8 — validadas em 2026-04-29)

| Serviço        | Imagem                                          | Porta     | Notas                                         |
| -------------- | ----------------------------------------------- | --------- | --------------------------------------------- |
| NATS JetStream | `nats:2.11-alpine`                              | 4222      | Estável                                       |
| LiteLLM        | `ghcr.io/berriai/litellm:main-latest`           | 4000      | Degradado sem API key real                    |
| Langfuse       | `langfuse/langfuse:2` (última testada: 2.95.11) | 3001      | **v2 — v3 requer ClickHouse**                 |
| Unleash        | `unleashorg/unleash-server:latest`              | 4242      | Estável (unhealthy = normal sem flags)        |
| OTel Collector | `otel/opentelemetry-collector-contrib:latest`   | 4317/4318 | Usar `otlphttp/loki` — loki exporter removido |
| Tempo          | `grafana/tempo:2.5.0`                           | 3200      | Pinado — `grpc_listen_port: 9096` obrigatório |
| Loki           | `grafana/loki:latest`                           | 3100      | Estável, suporta OTLP nativo (/otlp)          |
| Prometheus     | `prom/prometheus:latest`                        | 9090      | Estável                                       |
| Grafana        | `grafana/grafana:latest`                        | 3002      | Estável                                       |

---

## Problemas conhecidos e fixes

### Langfuse em loop (CLICKHOUSE_URL not configured)

**Causa:** `langfuse:latest` agora é v3. Langfuse v3 tornou ClickHouse obrigatório — sem `CLICKHOUSE_URL`, o container aborta no startup com `Error: CLICKHOUSE_URL is not configured`.

**Fix:** pinar para `langfuse/langfuse:2` no docker-compose:

```yaml
langfuse:
  image: langfuse/langfuse:2
```

**Sinais no log:**

```
Error: CLICKHOUSE_URL is not configured. Migrating from V2? Check out migration guide: ...
```

---

### Tempo em loop (port 9095 already in use)

**Causa:** Conflito de porta dentro do container. O componente `server` do Tempo usa `grpc_listen_port: 9095` como default. O `distributor.receivers.otlp.protocols.grpc.endpoint` também está configurado para `0.0.0.0:9095`. Ambos competem pelo mesmo bind no startup.

**Fix:** adicionar `server.grpc_listen_port: 9096` em `infra/otel/tempo-config.yaml`:

```yaml
server:
  http_listen_port: 3200
  grpc_listen_port: 9096
```

**Sinais no log:**

```
error starting receiver: listen tcp 0.0.0.0:9095: bind: address already in use
```

---

### OTel Collector em loop (unknown type: "loki")

**Causa:** O exporter `loki` foi removido do `otelcol-contrib` em versões recentes. A config usava `exporters.loki` que não existe mais.

**Fix:** substituir o exporter `loki` por `otlphttp/loki` em `infra/otel/otel-collector-config.yaml`:

```yaml
exporters:
  otlphttp/loki:
    endpoint: http://loki:3100/otlp
```

E atualizar o pipeline de logs:

```yaml
service:
  pipelines:
    logs:
      exporters: [otlphttp/loki]
```

O Loki 3.x tem suporte OTLP nativo em `/otlp/v1/logs` — o exporter `otlphttp` appenda `/v1/logs` automaticamente.

**Sinais no log:**

```
'exporters' unknown type: "loki" for id: "loki"
```

---

## Como restartar um container específico

```bash
# Para e recria com force-recreate (resolve bind mount issues no WSL)
docker compose -f infra/local/docker-compose.dev.yml up -d --force-recreate <container-name>

# Exemplos:
docker compose -f infra/local/docker-compose.dev.yml up -d --force-recreate langfuse
docker compose -f infra/local/docker-compose.dev.yml up -d --force-recreate tempo otel-collector
```

**Nota WSL:** No Docker Desktop + WSL, se o container falhar com erro de bind mount ("no such file or directory"), usar `--force-recreate` para recriar o container com os mounts atualizados.

---

## Como verificar saúde pós-restart

```bash
# Ver status de todos
docker ps --format "table {{.Names}}\t{{.Status}}"

# Esperado: nenhum container em "Restarting"
# Langfuse leva ~60s para healthcheck passar (health: starting → healthy)
# OTel collector e Tempo devem ficar estáveis em ~10s

# Verificar logs de um container específico
docker logs aethereos-langfuse-dev 2>&1 | tail -20
docker logs aethereos-tempo-dev 2>&1 | tail -10
docker logs aethereos-otel-collector-dev 2>&1 | tail -10
```

---

## Guia de troubleshooting

| Sintoma                              | Causa mais provável              | Ação                                 |
| ------------------------------------ | -------------------------------- | ------------------------------------ |
| Langfuse: CLICKHOUSE_URL error       | Versão v3 sem ClickHouse         | Pinar para `langfuse/langfuse:2`     |
| Tempo: port 9095 already in use      | Conflito server.grpc vs receiver | `server.grpc_listen_port: 9096`      |
| OTel: unknown type "loki"            | Exporter removido                | Usar `otlphttp/loki`                 |
| Bind mount error no WSL              | Docker Desktop path stale        | `up -d --force-recreate`             |
| Langfuse unhealthy depois de startup | DB migration pendente            | Aguardar 2-3min; reloga se persistir |
