# Política de Privacidade — Aethereos

> **Aviso:** este é o resumo técnico da política de privacidade aplicada ao
> produto. A versão jurídica oficial publicada em `https://aethereos.io/privacy`
> tem precedência em caso de divergência.

Última atualização: 2026-05-05
Aplicável a: `aethereos.io` (Camada 1) e distribuições verticais que a
bundlam.

---

## 1. Quem somos

**Controlador**: Aethereos Inc. (ou entidade legal sucessora).
**DPO**: configurável pelo gestor da empresa contratante. Para a operação
hospedada em `aethereos.io`, contato `dpo@aethereos.io`.

---

## 2. Dados que coletamos

### 2.1 De usuários autenticados

- Identificação: nome, email, foto de perfil (opcional).
- Empresariais: nome da empresa, CNPJ, slug, endereço (quando informados
  pelo gestor).
- Acesso: histórico de login (`kernel.login_history` — IP, user-agent,
  timestamp), MFA factors registrados, tokens de sessão.
- Atividade no produto: eventos SCP (`kernel.scp_outbox`), audit logs
  (`audit_log`), uso de apps, arquivos enviados, mensagens de chat
  internas, tarefas e notas criadas.
- Suporte: tickets, anexos, conversas com o time.

### 2.2 De visitantes não autenticados

- Logs HTTP do CDN (Cloudflare) e do edge (Vercel).
- Métricas anônimas de Web Analytics (sem cookies persistentes).

### 2.3 Que **não** coletamos

- Dados de cartão de crédito ou pagamento (delegado ao processador, ex:
  Stripe).
- Conteúdo de comunicações privadas fora do produto.
- Dados sensíveis (origem racial, opinião política, saúde) salvo quando
  explicitamente fornecidos pelo cliente em campo personalizado para sua
  operação — nesse caso, o controlador é o cliente, não a Aethereos.

---

## 3. Base legal (LGPD)

| Tratamento                        | Base legal (Lei 13.709/2018)    |
| --------------------------------- | ------------------------------- |
| Provimento do serviço contratado  | Art. 7º V — execução contrato   |
| Cobrança e financeiro             | Art. 7º V — execução contrato   |
| Logs de acesso e auditoria        | Art. 7º VI — obrigação legal    |
| Comunicações de produto e suporte | Art. 7º V — execução contrato   |
| Marketing e melhorias de produto  | Art. 7º I — consentimento       |
| Prevenção a fraude e segurança    | Art. 7º IX — legítimo interesse |

Em qualquer caso, prevalece o princípio da minimização: coletamos o
estritamente necessário para o propósito declarado.

---

## 4. Compartilhamento

Compartilhamos dados **apenas com**:

1. **Provedores de infraestrutura** (operadores de tratamento):
   - Supabase (Postgres, Auth, Edge Functions, Storage).
   - Vercel (hospedagem do shell e SaaS verticais).
   - Cloudflare (CDN, DNS, proteção).
   - LiteLLM gateway → provedores de LLM (OpenAI, Anthropic, Google etc.)
     com as garantias contratuais de não-treinamento sobre os dados.
   - Sentry / Langfuse (observabilidade), quando habilitados.
   - Stripe (gateway de pagamento), quando aplicável.
2. **Autoridades competentes**, quando exigido por ordem judicial ou lei.

**Não vendemos** dados pessoais, **não compartilhamos** com anunciantes e
**não treinamos modelos de IA** sobre conteúdo de clientes sem
consentimento explícito.

---

## 5. Transferência internacional

Alguns operadores (Supabase, Vercel, Cloudflare) processam dados em data
centers fora do Brasil. Aethereos exige cláusulas contratuais padrão e
adesão a frameworks de adequação (LGPD ↔ GDPR/SCCs) com cada operador.

Quando exigido contratualmente, ofereceremos região Brasil para tenants
enterprise. Detalhes em `docs/DATA_LIFECYCLE.md`.

---

## 6. Retenção

| Categoria                | Retenção padrão           |
| ------------------------ | ------------------------- |
| Conta ativa              | Enquanto durar o contrato |
| Logs de acesso (auth)    | 12 meses                  |
| Audit log de SCP         | 24 meses (configurável)   |
| Backups                  | 30 dias rolling           |
| Após cancelamento (soft) | 30 dias para reativação   |
| Após cancelamento (hard) | Exclusão em até 90 dias   |
| Logs de cobrança         | 5 anos (obrigação fiscal) |

Detalhes operacionais em `docs/DATA_LIFECYCLE.md`. Cada gestor pode
configurar valores específicos por empresa.

---

## 7. Direitos do titular (Art. 18 LGPD)

Como titular dos dados, você tem direito a:

1. **Confirmação** da existência de tratamento.
2. **Acesso** aos dados — disponível em **Gestor → LGPD → Exportar dados**
   (Edge Function `export-company-data`, gera JSON completo, owner-only,
   limite 3 exportações por hora).
3. **Correção** de dados incompletos, inexatos ou desatualizados — via
   perfil ou suporte.
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários ou
   excessivos.
5. **Portabilidade** — exportação JSON estruturado disponível.
6. **Eliminação** dos dados pessoais, ressalvadas obrigações legais.
7. **Informação sobre compartilhamento** — descrita nesta política.
8. **Revogação de consentimento** quando o tratamento for baseado em
   consentimento.

Solicite via `dpo@aethereos.io` ou pelo gestor da sua empresa.

---

## 8. Segurança

Detalhes em `SECURITY.md` e `docs/SECURITY_GUIDELINES.md`. Resumo:

- TLS 1.2+ em toda comunicação.
- RLS por `company_id` em todas as tabelas (isolamento multi-tenant).
- 2FA TOTP disponível e configurável como obrigatório pelo gestor.
- Service-role keys jamais expostas no frontend.
- Audit log imutável de mudanças sensíveis.
- Rate-limit em endpoints autenticados e de exportação.

---

## 9. Cookies

O produto usa cookies estritamente necessários para autenticação
(`sb-*` da Supabase Auth, `SameSite=Lax`, `Secure`, `HttpOnly`). Não
usamos cookies de tracking de terceiros nem fingerprinting.

---

## 10. Crianças

O produto é destinado a uso B2B por adultos. Não coletamos dados
intencionalmente de menores de 13 anos. Se identificar coleta indevida,
notifique `dpo@aethereos.io`.

---

## 11. Alterações

Mudanças materiais nesta política serão comunicadas com 30 dias de
antecedência via email do contato administrativo da empresa cliente e
notificação in-app no shell.

---

## 12. Contato

- DPO: `dpo@aethereos.io`
- Privacidade geral: `privacy@aethereos.io`
- Segurança: `security@aethereos.io`

Versão: 1.0.0
