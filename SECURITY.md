# Política de Segurança — Aethereos

A segurança dos usuários, dados e operações sobre o Aethereos é prioridade
**estrutural**. Esta política descreve como reportar vulnerabilidades e o
que esperar do nosso processo de resposta.

---

## 1. Como reportar uma vulnerabilidade

**Não abra issues públicas para vulnerabilidades.**

Envie um email para:

> **security@aethereos.io**

Inclua:

- Descrição clara do problema e impacto estimado.
- Passos reproduzíveis (PoC se possível).
- Versão / commit / URL afetada.
- Se já tentou contatar outro canal.

Nossa resposta inicial vem em **até 72 horas úteis**.

PGP: chave pública será publicada em `https://aethereos.io/.well-known/pgp-key.txt`
(em construção). Até lá, use TLS no email e evite anexar credenciais reais
em texto claro.

---

## 2. Disclosure responsável

Praticamos disclosure coordenado:

- **Triagem inicial**: até 72 h úteis.
- **Confirmação e severidade**: até 7 dias.
- **Fix em produção**: até 90 dias para issues high/critical, prazos negociáveis
  para casos complexos.
- **Disclosure público**: após fix em produção e janela razoável para upgrade
  de tenants. Crédito ao reporter, salvo pedido contrário.

Pesquisadores que sigam este processo de boa-fé não serão alvo de ação legal
(_safe harbor_).

---

## 3. Escopo

**Em escopo:**

- Kernel (`packages/kernel/*`) — autenticação, RLS, SCP, capability tokens.
- Edge Functions (`supabase/functions/*`).
- SDK e App Bridge (`@aethereos/client`).
- Shell-base (`apps/shell-base/`) e Shell-commercial (`apps/shell-commercial/`).
- Drivers oficiais (`packages/drivers*`).
- Distribuições verticais (`apps/comercio-digital/`, `apps/logitix/`,
  `apps/kwix/`, `apps/autergon/`).
- Sites institucionais sob `apps/sites/*` quando hospedam código com
  superfície interativa.

**Fora de escopo:**

- Vulnerabilidades em serviços de terceiros (Supabase Cloud, Vercel,
  Cloudflare). Reporte ao fornecedor; podemos coordenar.
- Infra cloud do tenant (instâncias self-hosted são responsabilidade de quem
  hospeda).
- Engenharia social ou phishing contra colaboradores.
- DoS volumétrico sem amplificação ou bypass de rate-limit.
- Findings de scanners automatizados sem PoC de impacto.

---

## 4. Vetores de alta prioridade

Damos máxima prioridade (severity _Critical_) a:

1. Bypass de RLS por `company_id` (vazamento cross-tenant).
2. Privilege escalation (member → admin/owner) sem aprovação.
3. Exposição de service-role key, capability tokens ou MFA secrets.
4. Auth bypass em Edge Function ou shell.
5. Iframe escape (sandbox de apps fugindo do shell).
6. SQL injection em qualquer caminho não parametrizado.

Detalhes do nosso modelo de ameaças: `docs/SECURITY_GUIDELINES.md` e
`docs/SECURITY_CHECKLIST.md`.

---

## 5. Recompensas

Ainda **não** mantemos um bug bounty pago. Reconhecimento público em
`SECURITY_THANKS.md` (em construção) e — para descobertas de impacto crítico
— créditos comerciais negociáveis caso a caso.

---

## 6. Versões suportadas

Apenas a versão `main` (HEAD) recebe patches de segurança até GA da Camada 1.
Após GA, suporte estendido por 12 meses para releases major.

| Versão | Suportada |
| ------ | --------- |
| main   | ✅        |
| < GA   | ❌        |

---

## 7. Contato e jurisdição

- Email principal: `security@aethereos.io`
- Email de emergência: `cto@aethereos.io`
- Jurisdição aplicável: Brasil (LGPD lei 13.709/2018).

Versão: 1.0.0
Última revisão: 2026-05-05
