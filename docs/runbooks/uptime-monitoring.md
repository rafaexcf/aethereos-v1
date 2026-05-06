# Runbook — Uptime monitoring (MX179)

> Sprint 32 / MX179 — Gate 5 dependency.
> Ativa monitoramento externo do health endpoint para coletar 30 dias
> de uptime ≥ 99,5%.

---

## Endpoints monitorados

| Tipo           | URL                                                            | Resposta esperada                |
| -------------- | -------------------------------------------------------------- | -------------------------------- |
| Backend health | `https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health` | HTTP 200, JSON `{"status":"ok"}` |
| Frontend       | `https://aethereos.io`                                         | HTTP 200                         |

Health endpoint retorna 200 mesmo em estado degradado (`{"status":"degraded"}`)
intencionalmente — assim o monitor pode parsear o JSON e alertar
diferenciado, evitando falsos positivos durante deploy de DB.

---

## Setup recomendado: UptimeRobot (free tier)

1. Criar conta em https://uptimerobot.com (free).
2. Criar 2 monitors HTTP(S):

   ### Monitor 1 — Aethereos health endpoint
   - **Type:** HTTP(s) Keyword
   - **URL:** `https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health`
   - **Keyword:** `"status":"ok"` (alert se ausente)
   - **Interval:** 5 minutes
   - **Alert contacts:** rafacostafranco@gmail.com

   ### Monitor 2 — Aethereos frontend
   - **Type:** HTTP(s)
   - **URL:** `https://aethereos.io`
   - **Interval:** 5 minutes
   - **Alert contacts:** rafacostafranco@gmail.com

3. (Opcional) Criar **Status Page** em "Public Status Pages":
   - Nome: Aethereos Status
   - Adicionar os 2 monitors
   - Ativar — gera URL pública (ex: `stats.uptimerobot.com/xxxxx`)
   - Considerar CNAME para `status.aethereos.io` (Cloudflare)

---

## Alternativas

| Serviço      | Free tier                                   | Vantagem                           |
| ------------ | ------------------------------------------- | ---------------------------------- |
| UptimeRobot  | 50 monitors, intervalo 5 min                | Mais simples, status page free     |
| BetterUptime | 10 monitors, intervalo 30 s                 | Heartbeat APIs, status page bonita |
| Checkly      | 10k API checks/mês, frequência configurável | Programático via CLI/API           |

Recomendação: UptimeRobot por simplicidade. Migrar para BetterUptime/Checkly
em F2 se precisar de heartbeat ou API checks complexos.

---

## Automação via CLI (opcional)

UptimeRobot tem API key em Settings → API. Exemplo:

```bash
curl -X POST https://api.uptimerobot.com/v2/newMonitor \
  -d "api_key=$UPTIMEROBOT_API_KEY" \
  -d "format=json" \
  -d "type=2" \
  -d "url=https://oublhirkojyipwtmkzvw.supabase.co/functions/v1/health" \
  -d "friendly_name=Aethereos health" \
  -d "interval=300"
```

Não automatizado neste sprint — owner cria via UI por simplicidade.

---

## Verificação após setup

- [ ] Receber email de teste do UptimeRobot
- [ ] Aguardar 1 hora — confirmar que monitors estão `Up` no painel
- [ ] (Opcional) URL da status page acessível publicamente

Após 30 dias acumulados, atualizar `GATES_STATUS.md` Gate 5 → PASS se
uptime ≥ 99,5%.

---

## Falhas e troubleshooting

### Monitor mostra `Down` mas curl manual retorna 200

Verificar:

- IP do UptimeRobot bloqueado? (improvável — Supabase CDN aberto)
- Resposta tem `"status":"ok"` literal? Health pode retornar
  `"status":"degraded"` se DB falhou — keyword check captura isso.

### Alertas demais (flapping)

- Aumentar timeout do monitor para 30s.
- Ignorar alertas durante janela de deploy (~3 min).
- Se persistir: investigar logs do health endpoint via Supabase Dashboard.
