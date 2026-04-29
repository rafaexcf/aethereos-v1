# ADR-0001 — Fundação do Aethereos

> ⚠️ **AVISO DE ORIGEM.** Esta ADR foi gerada por IA (Claude) em 2026-04-29 sob escolha consciente do humano fundador, registrada em `SPRINT_LOG.md` como decisão de bootstrap caminho B (Rápido). A Fundamentação Parte XXII recomenda autoria humana para ADRs fundadoras (Princípio P7). Esta exceção é registrada explicitamente para rastreabilidade.
>
> **Próxima revisão humana sugerida:** revisar este texto integralmente em até 30 dias após o bootstrap, ajustar tom autoral, completar onde a IA generalizou, e renomear para `0001-fundacao.md` definitivo (sem este aviso) **somente após** confirmação de que reflete a visão do fundador. Até lá, este arquivo é o registro válido mas reconhecidamente sub-ótimo.

**Status:** Aceito (provisório, pendente revisão humana)
**Data:** 2026-04-29
**Autor:** Claude (sob direção humana)
**Tipo:** Fundadora
**Subordinado a:** AETHEREOS_FUNDAMENTACAO v4.3
**Substitui:** —
**Substituído por:** —

---

## 1. Contexto

O ecossistema de software empresarial brasileiro (e em parte do mercado latino-americano) opera sob fragmentação crônica. Empresas adotam dezenas de SaaS verticais que não conversam entre si: ERP fala uma linguagem, CRM fala outra, ferramenta de logística fala uma terceira, sistema fiscal fala uma quarta. Cada novo sistema introduz silos de dados, custos de integração, treinamento duplicado e fricção operacional crescente. A inteligência artificial chegou nesse cenário fragmentado e foi adotada como mais uma ferramenta isolada — um copiloto por aplicação, sem visão sistêmica do que acontece na empresa.

O Aethereos nasce da hipótese de que a unidade certa de organização não é o aplicativo individual, mas o ambiente de trabalho como um todo. Da mesma forma que o Android organizou o caos de aplicativos móveis em uma camada base aberta + customizações de fabricantes + apps de loja, o Aethereos propõe organizar o software empresarial em três camadas: uma base aberta e local-first onde qualquer empresa pode operar sem depender de fornecedor; uma camada comercial multi-tenant proprietária com governança, agentes de IA com identidade e protocolo de contexto unificado; e distribuições verticais que bundlam a camada comercial com SaaS pré-instalados para nichos específicos como B2B AI OS Brazil, indústria, logística, saúde.

A tese central é que **o protocolo importa mais que o aplicativo**. Se todo evento de negócio passa por um barramento padronizado (Software Context Protocol), com identidade clara de quem agiu (humano ou agente), com governança declarativa e com auditoria imutável, então as aplicações deixam de ser silos e passam a ser participantes de um sistema vivo. A IA deixa de ser um chat preso em uma tela e passa a ser um observador legítimo do que acontece na empresa, com freios estruturais que impedem ações irreversíveis sem aprovação humana.

O projeto é construído por desenvolvedor solo assistido por IA, com horizonte de 18-24 meses para validação comercial. A escolha de stack (documentada em ADR-0014) reflete tensão deliberada entre velocidade de execução e robustez arquitetural: optou-se por componentes mais sofisticados que o estritamente necessário para MVP, porque a tese do produto exige que os invariantes (isolamento multi-tenant absoluto, eventos auto-certificáveis, governança como código, agentes com identidade auditável) estejam corretos desde o primeiro dia. Atalhos arquiteturais nessas dimensões custariam, mais tarde, mais do que economizam agora.

---

## 2. Decisão

Aethereos é construído conforme:

- **Constituição:** AETHEREOS_FUNDAMENTACAO v4.3 (e revisões posteriores via ADR de fundação).
- **Stack cravada:** ADR-0014 (Resolução de Stack vs Análise Externa) e Parte XIV da Fundamentação. Detalhamento em `docs/adr/0014-resolucao-stack-vs-analise-externa.md`.
- **Princípios fundadores:** P1 a P15 da Fundamentação Parte II.
- **Tricotomia de rigidez:** `[INV]` / `[DEC]` / `[HIP]` como notação obrigatória em todo documento técnico.
- **Modelo de agentes:** Interpretação A+. Agente tem identidade própria (`agent_id`, JWT TTL 15min, `actor.type=agent`) com `supervising_user_id` **obrigatório**. Capability tokens do agente são sempre subconjunto das do humano supervisor. Responsabilidade legal e billing recaem em humano + organização.
- **Ordem de construção das camadas:** Camada 0 (open source local-first sob BUSL v1.1) → Camada 1 (proprietária multi-tenant) → comercio.digital → logitix → kwix → autergon. Esta ordem não é negociável sem ADR de revisão fundamentada.
- **Freio agêntico no primeiro ano comercial:** autonomia 0-1 apenas (sugerir, humano executa). Ações irreversíveis sempre exigem aprovação humana explícita. As 8 operações invariantes definidas na Fundamentação 12.4 nunca executam autonomamente em qualquer circunstância.
- **Driver Model como invariante arquitetural:** desde o commit zero, toda dependência externa (banco, auth, storage, vetorial, event bus, LLM, secrets, cache, feature flags, observabilidade) é acessada via interface tipada. Implementações concretas são plugáveis por camada (LocalDrivers para Camada 0, CloudDrivers para Camada 1).
- **SCP como barramento universal:** todo evento de negócio passa pelo Software Context Protocol. Apps não se comunicam diretamente entre si. Eventos são auto-certificáveis (Ed25519 + opcionalmente hash chain). Schemas Zod centralizados em `packages/scp-registry/`. Outbox pattern PostgreSQL garante atomicidade entre transação de domínio e publicação de evento.
- **Isolamento multi-tenant:** RLS PostgreSQL por `company_id` é fail-closed. Query sem contexto de tenant retorna zero linhas. Bug na aplicação não vaza dados. Schemas Postgres separados por vertical (`kernel`, `comercio_digital`, `logitix`, `kwix`, `autergon`) operacionalizam soberania de domínio.
- **Honestidade de cronograma (P8):** IA não acelera validação com clientes reais. As métricas de sucesso do produto são humanas, não técnicas. Velocidade de geração de código não substitui descoberta de mercado.
- **Documentação como gate de mudança arquitetural:** modificações em arquivos `[INV]` exigem ADR aprovado por humano. Modificações em `[DEC]` exigem ADR de revisão. Hipóteses `[HIP]` podem evoluir conforme evidência operacional.

---

## 3. Consequências

### Positivas

- Squad de agentes operando dentro do repositório tem âncora documental (`CLAUDE.md` na raiz e hierárquicos nos subdiretórios) desde o primeiro commit. Drift arquitetural é reduzido por construção, não por revisão tardia.
- Toda decisão arquitetural subsequente referencia esta ADR como base, formando cadeia rastreável de raciocínio. Pessoa entrando no projeto daqui a 18 meses tem caminho claro para entender por quê das escolhas.
- Driver Model permite migração de qualquer dependência externa (Supabase para self-hosted, pgvector para Qdrant, Clerk no futuro se SAML enterprise exigir) sem refactor de negócio.
- Camada 0 sob BUSL v1.1 cria moat estratégico de adoção: desenvolvedores podem usar, modificar e aprender sem dependência comercial; empresas podem operar offline-first se preferirem; o pipeline de aquisição comercial é "experimente grátis, contrate quando precisar de multi-tenant ou suporte".
- SCP como barramento universal habilita observabilidade sistêmica: dashboards de saúde da empresa, copilotos com visão real do que acontece, auditoria forense quando necessária, treinamento de modelos próprios da plataforma sobre dados próprios (respeitando ciclo de vida e consentimento).

### Negativas e custos aceitos

- Curva de aprendizado da stack escolhida é mais alta que stack-Vercel-managed-padrão. Primeiras semanas envolvem familiarização com NATS JetStream, Drizzle, Pulumi, OpenTelemetry, Langfuse, Unleash, Lago, Temporal — componentes que cada um por si tem sua complexidade.
- Bootstrap exige 14 dias de investimento antes da primeira feature de produto entrar em desenvolvimento. Esse tempo é deliberado e seu valor só é percebido em 6-9 meses, quando dívida arquitetural não cobrada permite velocidade alta de feature delivery.
- Custo operacional inicial em algumas dimensões é maior que alternativas managed (NATS self-hosted vs Inngest free tier; OpenTelemetry stack vs Sentry+Logtail simples; Langfuse self-hosted vs LangSmith managed). Esses custos foram aceitos em troca de evitar lock-in e reter dados sensíveis sob controle próprio.
- Documentação volumosa (Fundamentação ~360KB, documentos companheiros somando ~250KB adicionais) impõe esforço de leitura para qualquer novo participante humano ou agente. Mitigação: hierarquia clara de autoridade documental e CLAUDE.md como porta de entrada.

### Mitigações

- Runbooks operacionais por componente self-hosted são mantidos em `docs/runbooks/` à medida que cada componente entra em uso.
- Templates de código para padrões repetitivos (emissão SCP via Outbox, RLS policy boilerplate, auth flow OAuth 2.1 + PKCE) são produzidos uma vez e reusados por agentes.
- Sub-agents especializados (Architect, Coder, Reviewer, Adversarial) reduzem sobrecarga cognitiva sobre o humano fundador, mas revisão humana de PRs continua obrigatória conforme P7.
- Bootstrap pack inicial (este monorepo) inclui guardrails mecânicos (`dependency-cruiser`, ESLint customizado, husky, CI gates) que bloqueiam violações de invariantes na origem, antes de virarem revisão humana de código já escrito.

---

## 4. Alternativas consideradas e rejeitadas

### 4.1 Forkar OS de navegador existente (Puter, daedalOS, ProzillaOS)

A análise técnica detalhada em ADR-0014 mostra que esses projetos entregam aproximadamente 5-15% do valor diferencial do Aethereos (camada visual de janelas e dock) e custariam semanas desmontando código de terceiros para reescrever o backend completo. Como o kernel arquitetural (SCP, RLS multi-tenant, governance, drivers) representa 85% do trabalho real e nada disso vem pronto, fork é armadilha de produtividade aparente.

### 4.2 Single-tenant em vez de multi-tenant

Modelo single-tenant simplifica RLS e isolamento, mas inviabiliza a tese comercial: não há "OS empresarial" sem multi-tenant; cada cliente exigir infraestrutura dedicada destrói economia unitária. Multi-tenant via RLS PostgreSQL é a única opção que preserva a tese de produto e a economia operacional.

### 4.3 Monolito em vez de monorepo

Monolito simplifica deploy mas cria acoplamento que impede evolução independente de Camada 0 (open source local-first), Camada 1 (proprietária cloud) e SaaS standalone (cada um Next.js independente em seu próprio domínio). Monorepo com Turbo permite isolamento lógico, deploy independente e compartilhamento controlado de pacotes.

### 4.4 Stack "managed barata" (Vercel + Supabase + Inngest + Clerk)

Atrativa no Mês 1 por velocidade de configuração e custo baixo. Rejeitada por seis razões cravadas em ADR-0014:
1. Inngest tem vendor lock-in significativo e modelo de billing por step que escala mal para volume previsto;
2. Clerk introduz vendor pago por MAU que escala mal e perde integração nativa com RLS;
3. Stack managed barata não atende invariantes do projeto (Camada 0 local-first, SSO cross-domain via OAuth 2.1, Driver Model);
4. Migração futura de provedor managed se torna refactor amplo;
5. Componentes critical-path (event bus, IdP) ficando em third-party é risco operacional não aceitável para um OS empresarial;
6. Componentes managed escolhidos não cobrem necessidades específicas (metered billing usage-based, observabilidade de LLM com custo por tenant, feature flags com rollout gradual).

A stack alternativa cravada (NATS JetStream + Supabase Auth como IdP central + Drizzle + LiteLLM + Langfuse + Unleash + Lago + OpenTelemetry + Pulumi) tem curva inicial mais alta mas honra os invariantes e permite operação self-hosted quando enterprise exigir.

### 4.5 Adiar Camada 0 open source para fase posterior

Tentação real: cortar 40% da complexidade inicial e validar o modelo B2B comercial primeiro. Rejeitada por dois motivos:
1. **Driver Model nunca testado:** sem dois backends reais (LocalDrivers vs CloudDrivers), o Driver Model degenera em vazamento de implementação Supabase em todo lugar. Construir Camada 1 antes de Camada 0 é construir uma abstração que nunca foi exercitada.
2. **Moat estratégico perdido:** Camada 0 sob BUSL v1.1 é o que estabelece a tese "Android para empresas". Sem ela, o Aethereos é apenas mais um SaaS multi-tenant. Com ela, atrai desenvolvedores, evita lock-in percebido, e o pipeline comercial é "experimente grátis local, contrate quando precisar de cloud". Adiar é abrir mão da diferenciação central.

### 4.6 Linguagens alternativas (Go, Rust, Python no backend)

TypeScript foi escolhido como linguagem única do monorepo por três motivos:
1. Reduz fricção cognitiva entre frontend e backend (mesmo modelo de tipos, mesmo ecossistema);
2. Agentes de IA (Claude, Cursor) produzem código de qualidade significativamente maior em TypeScript do que em alternativas, dado o volume de exemplos de treinamento;
3. Pulumi TS permite IaC na mesma linguagem, mantendo coerência total do stack.

Performance crítica em pontos específicos (hot paths de event processing, vector search) pode justificar serviços auxiliares em Rust ou Go no futuro, mas como exceção documentada via ADR, não como padrão.

---

## 5. Referências

- `docs/AETHEREOS_FUNDAMENTACAO_v4_3.md` — Constituição
- `docs/AETHEREOS_STACK_VALIDATION.md` — Cenários de validação por stack
- `docs/AETHEREOS_USER_STORIES.md` — Épicos e user stories
- `docs/SECURITY_GUIDELINES.md`
- `docs/DATA_LIFECYCLE.md`
- `docs/LLM_OPEX_GUIDELINES.md`
- `docs/VERSIONING_CONTRACT.md`
- `docs/ECOSYSTEM_README.md`
- `docs/adr/0014-resolucao-stack-vs-analise-externa.md` — Resolução de stack
- `CLAUDE.md` — Âncora operacional do squad

---

## 6. Como esta ADR é referenciada

Toda ADR subsequente começa com:

```
Subordinado a: ADR-0001 (Fundação do Aethereos), AETHEREOS_FUNDAMENTACAO v4.3
```

Sem essa cadeia de referência, ADR é solta e perde rastreabilidade arquitetural. CI deve validar presença dessa linha em ADRs novas.

---

## 7. Critérios de revisão

Esta ADR pode ser revisitada se:

- A Fundamentação for revisada em versão major (v5.0+).
- Houver inflexão estratégica do projeto que exija reformular a tese central.
- A ordem de construção das camadas mudar (exige justificativa robusta em ADR de revisão).
- Após revisão humana inicial dentro de 30 dias do bootstrap, conforme aviso no topo deste documento.

Revisão **não acontece** porque:

- Pressão de cronograma sugerir atalho temporário.
- Outro modelo de IA fizer análise mais simples.
- Componente managed equivalente ficar mais barato.

---

**Fim do ADR.**
