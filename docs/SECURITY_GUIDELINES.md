# Aethereos — Security Guidelines v1.0

**Documento operacional companheiro da Fundamentação v4.3**

*Implementação de segurança: CSP policies, sandbox, postMessage allowlists, validação de webhooks inbound, isolamento de segredos OAuth, staff access, break-glass.*

---

## Escopo

Este documento descreve **como implementar** os controles de segurança que a Fundamentação v4.3 e o THREAT_MODEL.md prescrevem. Audiência: engenheiros de backend, frontend, DevOps e segurança.

Onde THREAT_MODEL.md pergunta "quais são as ameaças e qual a defesa conceitual", este documento responde "qual a configuração exata do CSP, quais scripts rodam onde, como valida postMessage".

Subordinado à Fundamentação v4.3 e ao THREAT_MODEL.md. Em caso de conflito, a Fundamentação prevalece.

## 1. Content Security Policy (CSP)

### Princípio

CSP é primeira linha de defesa contra XSS e exfiltração. Configurado de forma restritiva por padrão; relaxamento requer justificativa explícita.

### CSP por tipo de contexto

**Shell do Aethereos (app.aethereos.com e subdomínios de tenant):**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval' https://cdn.aethereos.com;
  style-src 'self' 'unsafe-inline' https://cdn.aethereos.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://cdn.aethereos.com data:;
  connect-src 'self' https://api.aethereos.com https://realtime.aethereos.com wss://realtime.aethereos.com;
  frame-src 'self' https://*.aethereos-apps.io;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
```

Justificativas:
- `'wasm-unsafe-eval'` necessário para WebAssembly de módulos específicos (pgvector, criptografia)
- `'unsafe-inline'` em `style-src` é aceito temporariamente; removível após migração para CSS-in-JS com nonce em fase 2
- `frame-ancestors 'none'` impede que Aethereos seja embedado em outros sites (clickjacking)

**Iframe de app third-party (app-id.tenant.aethereos-apps.io):**

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.aethereos.com;
  font-src 'self' data:;
  frame-ancestors https://app.aethereos.com;
  base-uri 'self';
  form-action 'self';
```

Justificativas:
- Mais restritivo — app third-party opera em sandbox isolado
- `connect-src` limitado à API da própria plataforma; app não pode chamar URLs externos diretamente (tudo passa pelo kernel via capability tokens)
- `frame-ancestors` permite apenas embedding pelo shell oficial

**Apps first-party com integração mais profunda (quando Module Federation for habilitado, Fase 2):**

CSP derivado do shell com ajustes mínimos — mais permissivo que iframe third-party mas menos que shell puro. Definição exata em ADR específico quando Module Federation for implementado.

### Nonces e hashes

Scripts inline do shell devem ter `nonce` gerado por request:

```html
<script nonce="${cspNonce}">
  // código inline do shell
</script>
```

`cspNonce` é gerado no servidor (32 bytes random, base64) e adicionado ao header CSP dinamicamente:

```
script-src 'self' 'nonce-${cspNonce}' ...
```

Isso elimina necessidade de `'unsafe-inline'` em script-src do shell.

### CSP Report-Only em desenvolvimento

Em staging, adicionar header `Content-Security-Policy-Report-Only` com endpoint `/csp-violations` para capturar violações sem bloquear. Logs são análise obrigatória antes de promoção para prod.

### Subresource Integrity (SRI)

Scripts carregados de CDNs externos (Cloudflare) devem ter SRI hash:

```html
<script src="https://cdn.aethereos.com/lib/xyz.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

Build pipeline gera SRI automaticamente; manifesto HTML sem SRI em CDN externo falha em CI.

## 2. iframe Sandbox

### Atributos sandbox obrigatórios

Iframes de apps third-party:

```html
<iframe
  src="https://app-id.tenant.aethereos-apps.io/"
  sandbox="allow-scripts allow-forms allow-same-origin"
  allow=""
  referrerpolicy="no-referrer"
  loading="lazy">
</iframe>
```

Permissões concedidas:
- `allow-scripts` — necessário; app precisa rodar JavaScript
- `allow-forms` — necessário; apps frequentemente têm forms
- `allow-same-origin` — necessário para app acessar seu próprio localStorage (isolado da origem do shell)

Permissões **recusadas** por default:
- `allow-top-navigation` — app nunca pode redirecionar janela pai
- `allow-popups` — app não abre popups
- `allow-modals` — app não abre modals nativos bloqueantes
- `allow-pointer-lock` — app não captura mouse
- `allow-orientation-lock` — não aplicável a web
- `allow-presentation` — não usado

Apps que solicitam permissões adicionais declaram em `manifest.json`; cada permissão adicional requer review explícito na Magic Store.

### `allow` attribute (Feature Policy / Permissions Policy)

Por default, todos os recursos de hardware negados:

```html
allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'"
```

Apps que genuinamente precisam declaram em manifesto + aprovação do tenant.

## 3. postMessage — IPC entre iframe app e kernel

### Problema conceitual

postMessage é única ponte entre iframe sandboxed e shell. Usado maliciosamente, é vetor de ataque; usado sem disciplina, é bug factory.

### Schema obrigatório

Toda mensagem passa por validação Zod:

```typescript
import { z } from 'zod';

const MessageSchema = z.object({
  // Identificação
  id: z.string().uuid(),                          // UUID v7 do request
  correlation_id: z.string().uuid().optional(),   // para resposta
  
  // Tipo e versão
  type: z.enum([
    'request.scp.emit',
    'request.scp.subscribe',
    'request.storage.read',
    'request.storage.write',
    'response.ok',
    'response.error',
    // ... enum exaustivo de tipos permitidos
  ]),
  protocol_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  
  // Payload tipado por type (discriminated union)
  payload: z.any(),  // refinado per type
  
  // Security
  capability_token: z.string().optional(),   // quando operação requer capability
  
  // Metadata
  timestamp: z.string().datetime(),
});
```

Kernel rejeita mensagens que:
- Falham validação de schema (não conforme Zod)
- Têm `type` não reconhecido
- Têm `protocol_version` incompatível
- Têm `capability_token` ausente quando required
- Têm `capability_token` inválido ou revogado

### targetOrigin sempre explícito

Kernel envia mensagens ao iframe com `targetOrigin` específico (a origem do app, nunca `'*'`):

```typescript
// CORRETO
iframeElement.contentWindow.postMessage(message, `https://${appId}.${tenantId}.aethereos-apps.io`);

// NUNCA FAZER
iframeElement.contentWindow.postMessage(message, '*');
```

Iframe app recebe mensagens apenas do origin do shell:

```typescript
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://app.aethereos.com') {
    return;  // ignora mensagens de origem não confiável
  }
  // processa
});
```

SDK do Aethereos (`@aethereos/client`) encapsula essa lógica — apps não implementam postMessage manualmente.

### Rate limiting e quotas

Cada app tem quota de mensagens/segundo:
- Free tier: 10 msg/s
- Pro tier: 50 msg/s
- Enterprise: 200 msg/s

Quota excedida: kernel ignora mensagens e retorna erro `QUOTA_EXCEEDED` ao próximo request. App deve implementar backoff.

### Nonce e replay protection

Cada request tem `id` único (UUID v7). Kernel mantém cache de IDs processados (LRU, 1000 últimos) — requests com ID repetido são rejeitados. Previne replay de mensagens interceptadas.

## 4. Webhook validation — inbound

### Problema

Connectors recebem webhooks de sistemas externos. Sem validação de origem, qualquer atacante pode forjar eventos.

### Padrão por provider

**HMAC signing (Stripe, Shopify, GitHub, Resend, muitos outros):**

```typescript
function verifyHMACSignature(
  rawBody: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  const expected = crypto
    .createHmac(algorithm, secret)
    .update(rawBody)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

**Timestamp validation (Slack, Twilio, muitos):**

```typescript
function verifyTimestamp(timestampHeader: string, tolerance = 300): boolean {
  const timestamp = parseInt(timestampHeader);
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestamp) <= tolerance;  // 5 min default
}
```

Sem timestamp check, atacante pode replayar webhook antigo capturado.

**JWT com chave pública (Google, alguns outros):**

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

async function verifyGoogleWebhook(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'https://accounts.google.com',
    audience: 'aethereos-connector',
  });
  return payload;
}
```

### SDK do Aethereos — verificação helper

```typescript
import { verifyWebhook } from '@aethereos/connectors';

app.post('/webhook/:provider', async (req, res) => {
  const provider = req.params.provider;
  const tenant_id = extractTenantId(req);
  
  try {
    const event = await verifyWebhook({
      provider,
      request: req,
      tenant_id,
      raw_body: req.rawBody,  // body original, não parsed
    });
    
    // Evento validado; processa
    await processWebhookEvent(provider, tenant_id, event);
    res.status(200).send('ok');
  } catch (err) {
    if (err.code === 'SIGNATURE_INVALID') {
      return res.status(401).send('invalid signature');
    }
    if (err.code === 'TIMESTAMP_TOO_OLD') {
      return res.status(401).send('timestamp out of tolerance');
    }
    res.status(500).send('error');
  }
});
```

### IP allowlist quando provider publica lista estável

Providers como Stripe publicam lista estável de IPs. Connectors podem adicionar verificação:

```typescript
const STRIPE_IPS = [/* lista publicada */];
if (!STRIPE_IPS.includes(clientIp)) {
  return res.status(403).send('IP not allowed');
}
```

Fallback caso provider tenha rotação — não é substituto de HMAC.

### Providers sem assinatura

[INV] Connector cuja fonte **não suporta assinatura** (raro, mas existe) deve **pelo menos**:
1. Usar IP allowlist
2. Usar HTTPS obrigatório
3. Alertar em variações suspeitas de volume
4. Documentar no manifest do connector que falta assinatura (usuário vê warning no install)

## 5. Staff access — acesso de funcionários da Aethereos Inc aos dados de tenants

### Princípio

Staff não tem acesso automático a dados de tenants. Todo acesso é **JIT (Just-In-Time)** com justificativa, duração limitada, audit completo.

### Roles de staff

| Role | Escopo | Acesso default |
|---|---|---|
| `staff:support-l1` | Suporte nível 1 | Metadata de tenant (config, status), não dados |
| `staff:support-l2` | Suporte nível 2 | Metadata + leitura de eventos SCP dos últimos 7 dias quando JIT concedido |
| `staff:engineering` | Engenharia | Staging environments; produção só via break-glass |
| `staff:security` | Security team | Audit logs completos; dados de tenant via break-glass |
| `staff:finance` | Financeiro | Dados de billing/plans; sem acesso a dados de domínio |
| `staff:dpo` | Data Protection Officer | LGPD requests; acesso a dados de titular via LGPD flow |

### JIT access flow

1. Staff abre solicitação no sistema interno: tenant_id + justificativa textual + duração desejada (máx 4h)
2. Sistema envia notificação ao owner do tenant: "Staff X (role: Y) solicitou acesso para: [justificativa]. Duração: 4h. Você pode aprovar ou negar."
3. Owner aprova ou nega. Sem aprovação explícita em 30min, acesso é **negado por default**.
4. Se aprovado: staff recebe role temporário válido pelo tempo solicitado
5. Toda query feita pelo staff gera evento `platform.staff.tenant_accessed` com:
   - staff_id, role, tenant_id, justification
   - timestamp_start, timestamp_end
   - queries executadas (hash + classificação: read/write)
   - aprovador
6. Após TTL, role é automaticamente revogado
7. Audit report é visível ao owner do tenant em tempo real e retido por 7 anos

### Regra invariante

[INV] **Nenhum staff pode bypassar JIT access em condições normais.** Único caminho para acesso sem aprovação do tenant é break-glass (seção 6).

## 6. Break-glass procedure

### Quando é usado

Apenas em situações que:
- Não podem esperar aprovação do owner (owner não responde; emergência genuína)
- São justificáveis retroativamente a auditoria externa
- Têm indicador de severidade acima de ALTO

Exemplos legítimos:
- Tenant reportou incidente de segurança e está offline
- Vazamento de dados detectado; contenção exige acesso imediato
- Emergência regulatória (ordem judicial, LGPD breach mandatory notification)

### Procedimento

1. Staff inicia break-glass via endpoint dedicado com justificativa obrigatória (2+ parágrafos)
2. **Notificação IMEDIATA** a três canais:
   - Owner do tenant (email + SMS)
   - Security Lead da Aethereos Inc
   - DPO da Aethereos Inc
3. Acesso é concedido sem esperar aprovação, com TTL **máximo de 1 hora**
4. Toda operação gera audit detalhado (como JIT, mas marcado `break_glass: true`)
5. **Review obrigatório dentro de 24h** por comitê (Security Lead + DPO + CTO)
6. Se review concluir que break-glass foi inadequado: consequências disciplinares + reembolso ao tenant se aplicável

### Alertas obrigatórios

Break-glass **sempre** dispara alerta em PagerDuty para time de security. Não há exceção. Uso frequente de break-glass por mesmo staff é sinal de alerta per se.

### Tentativa de coerção

Break-glass com justificativa "cliente X me pediu urgência" é vermelho. Cliente genuíno passa pelo JIT normal (30min SLA é adequado).

## 7. Service-role scoping

### Problema

Service-role Postgres bypassa RLS. Uso inadvertido é vetor número 1 de vazamento cross-tenant (vetor 4.11 do THREAT_MODEL).

### Princípio

[INV] Service-role usado **apenas** em contextos explicitamente marcados. Toda query service-role inclui `tenant_id` no WHERE.

### Padrões obrigatórios

**Edge Functions com operação de plataforma (não-tenant-scoped):**

```typescript
// Ex: job que limpa capability tokens expirados globalmente
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // NÃO para uso em contexto de tenant!
);

async function cleanExpiredTokens() {
  // Operação global legítima
  await supabaseAdmin
    .from('capability_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
}
```

**Jobs tenant-scoped (quando service-role é genuinamente necessário):**

```typescript
// Tenant context deve ser explícito no query
async function processPendingEventsForTenant(tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from('scp_events_raw')
    .select('*')
    .eq('tenant_id', tenantId)   // SEMPRE explícito
    .eq('status', 'pending')
    .order('created_at');
  
  // ... processar
}
```

### Code review obrigatório

Todo PR que importa service-role key passa por code review de Security Lead ou equivalente. Check automatizado em CI:
- Busca por `SUPABASE_SERVICE_ROLE_KEY` ou equivalente
- Marca PR para review obrigatório
- Bloqueia merge sem approval explícito

### Preferência por alternativas

Sempre que possível, usar autenticação normal com JWT do usuário + RLS. Service-role é ultima ratio — reservado para:
- Jobs de housekeeping platform-wide (não tenant-scoped)
- Operações de sistema que realmente precisam atravessar tenants (raríssimo)
- Bootstrap de tenant (criação inicial)

## 8. Isolamento de segredos OAuth por tenant

Detalhado em KEY_MANAGEMENT.md seção 4. Resumo das garantias:

- Tokens OAuth armazenados criptografados com KMS (AES-256)
- Chave de criptografia nunca em plaintext em aplicação
- Descriptografia em tempo de uso apenas (não pré-carregada)
- RLS obrigatória em `connector_tokens` — tenant A nunca acessa tokens de tenant B
- Service-role para descriptografia requer `tenant_id` explícito
- Tokens plaintext nunca em logs, nunca em audit events, nunca em telemetria

## 9. Headers HTTP obrigatórios

Todo response do shell e APIs inclui:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY  (exceto endpoints que servem iframe de app, que usam frame-ancestors CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp  (em shell de apps, para habilitar SharedArrayBuffer isolado)
```

## 10. Gestão de cookies e sessão

### Cookies obrigatoriamente

```
Set-Cookie: session=...;
  HttpOnly;
  Secure;
  SameSite=Strict;
  Path=/;
  Domain=.aethereos.com;
  Max-Age=3600
```

- `HttpOnly` — impede JavaScript (defesa XSS)
- `Secure` — só em HTTPS
- `SameSite=Strict` — não enviado em cross-site requests
- `Max-Age` curto (1h); renovação via refresh token com rotação

### Session fixation prevention

Após login bem-sucedido, session ID **sempre** é regenerado (session_id pré-login é descartado; novo ID emitido).

### Logout completo

Logout invalida sessão no servidor (não apenas remove cookie client-side). Invalidação propaga em < 5s para todos os nós.

## 11. Supply chain e dependências

### Lockfile obrigatório

`package-lock.json` ou `pnpm-lock.yaml` commitado. PR sem lockfile atualizado é rejeitado.

### Audit automatizado em CI

```bash
# Pipeline CI
pnpm audit --audit-level=high  # fail on high/critical vulnerabilities
```

Vulnerabilidades críticas bloqueiam merge. Vulnerabilidades high exigem justificativa (em comentário do PR) ou upgrade.

### SBOM (Software Bill of Materials)

Build gera SBOM em formato CycloneDX. Publicado junto com release.

### Minimização de dependências

Cada nova dependência requer justificativa no PR. Prefere-se:
- Standard library quando possível
- Libraries maduras (>1k stars, mantidas nos últimos 6 meses, >3 mantenedores)
- Código próprio para utilitários pequenos

### Apps third-party — requisitos adicionais

Apps publicados na Magic Store requerem:
- Lockfile commitado
- Scan de malware automatizado antes de aceitação
- Revisão manual para dependências com alertas
- Re-scan em cada nova versão

Detalhes operacionais do processo de publicação em ADR-005 (pendente).

## 12. Logging e telemetria — o que NÃO pode ir para logs

[INV] **Nunca em logs:**

- Tokens OAuth (access, refresh)
- API keys
- Senhas (duh, mas bom estar explícito)
- Content de mensagens privadas
- Valores de formulários com PII
- Headers Authorization completos (apenas `Bearer ***hash_prefix***`)
- Parâmetros de URL com `token=`, `key=`, `password=` (normalizar para `***`)

Logger wrapper obrigatório:

```typescript
import { sanitizedLogger as log } from '@aethereos/logger';

log.info('User logged in', {
  user_id: user.id,
  session_id: session.id,
  // NUNCA: token: session.token
});
```

Wrapper normaliza campos sensíveis automaticamente.

## 13. Runbooks referenciados

Runbooks específicos de segurança:
- `runbook_security_incident_response.md`
- `runbook_credential_leak_response.md`
- `runbook_suspected_compromise.md`
- `runbook_break_glass_review.md`
- `runbook_staff_offboarding.md`

Produzidos conforme cenários emergem.

## 14. Revisão

Documento revisado:
- A cada incidente de segurança que revele lacuna
- Trimestralmente em revisão rotineira
- A cada atualização major de dependências de segurança (libs de crypto, etc.)
- Quando provedor de cloud/KMS muda

Owner: Security Lead da Aethereos Inc (a designar).

## 15. Histórico

- v1.0 (2026) — versão inicial, consolidada a partir de elementos dispersos da Fundamentação v4.3, THREAT_MODEL.md, KEY_MANAGEMENT.md, e preenchimento do escopo que estava pendente no preâmbulo da Fundamentação v4.3
