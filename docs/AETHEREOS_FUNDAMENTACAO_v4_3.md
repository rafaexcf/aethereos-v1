# AETHEREOS

## Fundamentação Constitucional · Arquitetura · Tese Técnica · Roadmap de Execução

**Versão 4.3 — Blindagem do SCP contra Acoplamento, Capability Tokens, Precedência sobre Whitepaper e Correções Documentais**

*Uma plataforma-base source-available para sistemas operacionais B2B modulares no navegador. Um framework para construção de distribuições verticais especializadas. Um substrato técnico sobre o qual produtos SaaS integrados podem ser construídos — pela Aethereos Inc, por parceiros certificados ou pela comunidade. Uma arquitetura preparada desde o primeiro commit para operação progressivamente autônoma por agentes de inteligência artificial, sob governança humana.*

---

## Preâmbulo

Este documento é a constituição técnica e conceitual do Aethereos. Define a **plataforma-base** — o kernel source-available, os frameworks que ele oferece, os princípios invariantes que governam sua evolução, as garantias invioláveis que ele entrega a qualquer distribuição construída sobre ele.

Não descreve produtos SaaS específicos que rodam sobre o Aethereos. Não descreve distribuições verticais específicas além de usar **B2B AI OS Brazil** — a primeira distribuição em construção pela Aethereos Inc — como exemplo canônico ilustrativo. A Aethereos Inc, como empresa, pode construir produtos e distribuições próprias, mas esses produtos são artefatos **construídos sobre** o Aethereos, não **parte do** Aethereos-plataforma.

Decisões de go-to-market, ICP, escolha de primeiro conector ERP, workflow matador comercial, narrativa de venda e posicionamento de mercado **não pertencem a este documento**. Pertencem ao documento MVP v1.0 e aos documentos comerciais de cada distribuição.

### Precedência sobre outros documentos [INV]

Quando houver conflito entre este documento e qualquer outro (incluindo o **SCP Whitepaper v4.0** ou anteriores), **prevalece este documento**. Em particular:

- **SCP Whitepaper v4.0** é documento de **posicionamento e visão**, não compromisso de entrega. Descreve a progressão conceitual plena do SCP em um horizonte de múltiplos anos, incluindo capacidades que a v4.3 da Fundamentação classifica como deferidas ou experimentais (simulação cross-tenant avançada, relationship gravity, emergent patterns, autonomia adaptativa ampla, collective intelligence profunda). Essas capacidades permanecem válidas como direção — mas **não** como backlog do ano 1.
- **Qualquer documento operacional** (manuais, guidelines, ADRs) deve ser compatível com esta Fundamentação. Incompatibilidade detectada exige revisão do documento operacional, não da Fundamentação, exceto quando a incompatibilidade expor erro constitucional — caso em que nova versão desta Fundamentação é emitida com ADR explícito.

Essa cláusula de precedência é invariante e existe para evitar que times, sob pressão de entrega ou marketing, puxem execução para direções conflitantes com o contrato arquitetural fundamental.

### Ecossistema documental companheiro

Este documento constitucional é complementado por documentos operacionais companheiros, cada um com escopo próprio e governança própria, todos subordinados a esta Fundamentação:

- **THREAT_MODEL.md** — modelo de ameaças com atores, trust boundaries, vetores de ataque, controles
- **NO_GO_YEAR1.md** — documento assinável listando o que explicitamente não entra no primeiro ano, consolidando a seção 17.8 como contrato assinável entre engenharia, produto e liderança
- **SCP_OPERATIONS.md** — operação do SCP em produção: Dead Letter Queues, poison event quarantine, replay seguro, backfill, deduplicação por janela, monitoramento de consumers
- **KEY_MANAGEMENT.md** — gestão de chaves: geração, rotação, revogação, recuperação de Ed25519, segredos OAuth, tokens de connectors, chaves de webhooks
- **SLO_TARGETS.md** — SLOs quantitativos: p95 de leitura, p95 de emissão de evento, lag aceitável, RTO/RPO, throughput esperado, retenção e arquivamento
- **ADR_BACKLOG.md** — lista rastreável dos 8 ADRs estruturantes pendentes (Runtime Topology, Tenant Context Propagation, Event Pipeline and Replay, Public Data Contracts, Third-Party App Security Model, Connector Security Model, AI Data Access Model, Thresholds for Backbone Extraction); ADRs são publicados conforme decisões são tomadas em código real
- **DATA_LIFECYCLE.md** — retenção, legal hold, tombstones, backups, purga de embeddings, exportação do titular/tenant
- **SECURITY_GUIDELINES.md** — CSP policies, sandbox, postMessage allowlists, validação de webhooks inbound, isolamento de segredos OAuth
- **LLM_OPEX_GUIDELINES.md** — orçamento de embeddings, cache semântico, custo por insight útil, guardrails contra explosão de OPEX
- **VERSIONING_CONTRACT.md** — compatibilidade entre versões de kernel, SDK cliente, manifesto .aeth, apps publicados
- **ECOSYSTEM_README.md** — mapa de navegação do corpus documental com ordem de leitura por papel

Substitui, em autoridade, os documentos anteriores: Fundamentos v1.0, AETHEREOS_FOUNDATIONS.md v1, SCP Whitepaper v7 (como compromisso; mantido como visão), Consolidação v2, versões v3.0, v3.1, v4.0, v4.1, v4.2 deste próprio documento.

Não é manual operacional. Não é registro de decisão granular. Não é regra do dia a dia. É o tecido conceitual sobre o qual todos os outros documentos se apoiam.

## Sistema de Tricotomia de Rigidez

Esta versão mantém a correção estrutural introduzida na v4.0: **nem toda afirmação neste documento tem o mesmo peso**. Confundir isso é erro de engenharia que mata projetos — decisões de implementação tratadas como invariantes viram dogma; hipóteses de mercado tratadas como arquitetura viram trilha de retrabalho.

Toda decisão significativa neste documento é classificada em três categorias, com notação explícita:

**[INV] — Invariante arquitetural.** Não muda sem ruptura da tese do projeto. Se mudar, o resultado não é mais Aethereos — é outro sistema. Exemplos: RLS multi-tenant, SCP como barramento universal, separação kernel/services, humano como autoridade final sobre IA, Modo Degenerado obrigatório. Revisar invariante exige ADR específico + consenso arquitetural documentado.

**[DEC] — Decisão atual.** Vale agora, sustentada por evidência e rationale declarado. Pode ser revista quando evidência contrária surgir.

**[HIP] — Hipótese a validar.** Aposta sobre como o mercado, a regulação, a UX ou a tecnologia vão se comportar. Permanece aposta até ser provada ou desmentida por uso real.

Ao longo do texto, afirmações relevantes aparecem com a marcação correspondente. Quando conflito entre decisões surgir, a rigidez é o primeiro critério: **[INV] prevalece sobre [DEC], que prevalece sobre [HIP]**.

## Correções Introduzidas na v4.3

Esta versão incorpora feedback externo pragmático e sênior que identificou problemas documentais reais (inconsistência HMAC/Ed25519, desalinhamento v4.2 vs whitepaper) e lacunas operacionais (ausência de threat model, SLOs quantitativos, documentos de governança de segurança). Em vez de adicionar capabilities novas, **corrige erros cirúrgicos, blinda invariantes contra erosão em produção, e explicita o ecossistema documental companheiro**. Cinco mudanças estruturais:

**1. Invariante de blindagem do SCP: payload bruto como contrato mínimo.** Consumidores críticos do SCP **não podem depender de enriquecimento assíncrono para funcionar**. Enriquecimento é camada de melhoria, não dependência transacional. Sem essa blindagem, a tentação natural em produção é criar apps que só funcionam quando Context Engine está saudável — transformando o SCP em "monólito distribuído" acoplado via contexto. Novo invariante explícito na Parte 8.3.

**2. Capability tokens por app como modelo arquitetural.** Cada app recebe do kernel um conjunto explícito de capability tokens declarando quais operações ele pode executar, sobre quais recursos, em quais tenants. Substitui o modelo implícito de "app tem acesso ao que o tenant tem acesso" por modelo explícito de "app tem acesso ao que foi explicitamente concedido". Princípio de segurança fundamental; detalhes operacionais em KEY_MANAGEMENT.md companheiro. Nova seção 4.9.

**3. Correção Ed25519/HMAC.** Linha 3705 da v4.2 ainda mencionava HMAC em "Stack Técnico Cravado" (14.3). Corrigido para Ed25519 com referência à Parte V.3 onde o rationale completo está documentado. Inconsistência documental eliminada.

**4. Precedência explícita sobre SCP Whitepaper.** Declaração formal no preâmbulo de que a Fundamentação v4.3 prevalece sobre o SCP Whitepaper v4.0 e anteriores. Whitepaper continua válido como posicionamento e visão, mas não como compromisso de entrega. Evita que times puxem execução para direções conflitantes com o contrato arquitetural.

**5. Ecossistema documental companheiro declarado.** Preâmbulo agora lista os documentos operacionais companheiros obrigatórios (threat model, no-go, operações SCP, gestão de chaves, SLOs, data lifecycle, security, LLM OPEX, versionamento). Separação formal entre constitucional (esta Fundamentação) e operacional (companheiros). Times que operam o sistema consultam companheiros para "como fazer"; consultam a Fundamentação para "o quê e por quê".

## Como ler

## Como ler

O texto segue progressão em espiral. Cada parte pode ser lida isoladamente, mas foi escrita para ser atravessada em sequência na primeira leitura. As primeiras partes estabelecem a tese e a identidade. As centrais dissecam a arquitetura. As finais projetam execução, monetização, proteção legal e horizonte de longo prazo.

Partes I a III são tese e estrutura conceitual. Partes IV a X são arquiteturais. Parte XI é o coração AI-native. Parte XII codifica garantias invioláveis. Partes XIII a XVI são execução técnica e licenciamento. Partes XVII a XX são roadmap, posicionamento, ecossistema documental e tarefas concretas. O glossário e o histórico de revisões fecham.

---

## ÍNDICE

- Preâmbulo
- Como ler
- **Parte I** — Identidade, Tripla Natureza e Tese
- **Parte II** — Os Dez Princípios Fundadores
- **Parte III** — Hierarquia de Cinco Camadas
- **Parte IV** — Aethereos Core: o Kernel
- **Parte V** — Magic Store e Catálogo Universal
- **Parte VI** — Verticais como Manifesto de Distribuição
- **Parte VII** — As Três Categorias de Apps
- **Parte VIII** — Software Context Protocol (SCP)
- **Parte IX** — Connector Apps e Integração com Sistemas Externos
- **Parte X** — Multi-Tenancy como Invariante
- **Parte XI** — AI-Native e Governance-as-Code
- **Parte XII** — Garantias Invioláveis
- **Parte XIII** — Onboarding e Provisionamento
- **Parte XIV** — Stack Técnico Cravado
- **Parte XV** — Licenciamento, Proteção Legal e Estratégia Anti-Fork
- **Parte XVI** — Modelo de Monetização
- **Parte XVII** — Roadmap Estratégico e MVP Blocks
- **Parte XVIII** — Posicionamento Competitivo
- **Parte XIX** — Ecossistema Documental
- **Parte XX** — Tarefas, Certificações e Próximos Passos
- **Parte XXI** — Capabilities Operacionais Complementares
- **Parte XXII** — Construção Agêntica do Aethereos (Meta-Arquitetura de Desenvolvimento)
- **Parte XXIII** — Unit Economics por Fase
- Glossário Fundacional
- Histórico de Revisões
- Epílogo

---

# PARTE I — IDENTIDADE, TRIPLA NATUREZA E TESE

## 1.1 O que é o Aethereos

O Aethereos é, simultaneamente e sem contradição, três coisas:

**Uma plataforma-base source-available** para a construção de sistemas operacionais B2B modulares, nativos de navegador, multi-tenant, preparados por design para operação progressivamente autônoma por agentes de inteligência artificial. Essa camada é o kernel público, licenciado sob BUSL v1.1, disponível para que qualquer desenvolvedor, comunidade ou empresa o adote, estude, modifique e construa distribuições próprias.

**Um conjunto de frameworks** que esse kernel oferece: framework para construção de distribuições verticais via manifestos declarativos e hooks versionados, framework para construção de apps (nativos, iframe, connectors), framework de Governance-as-Code para governança de agentes, framework de integração fiscal e financeira pluggable, framework de observabilidade de negócio, entre outros.

**Um substrato técnico sobre o qual produtos SaaS e distribuições especializadas podem ser construídos** — pela Aethereos Inc (a empresa mantenedora), por parceiros certificados sob o Aethereos Compatible Program, ou pela comunidade. Esses produtos não são parte do Aethereos-plataforma; são artefatos construídos usando o Aethereos-plataforma.

As três identidades não são concorrentes — são complementares, como na Google coexistem AOSP (kernel aberto), Google Workspace (família de produtos SaaS construídos sobre tecnologias Google) e ChromeOS (OS integrador). A Aethereos Inc pode operar os três papéis simultaneamente, mas este documento descreve apenas o kernel e os frameworks; os produtos específicos da Aethereos Inc pertencem a documentação comercial separada.

## 1.2 Aethereos-plataforma versus distribuições

Distinção fundamental que este documento mantém com rigor:

**Aethereos OS (o que este documento descreve)** — o kernel source-available, os apps invariantes genéricos (Drive, RH, Magic Store, Configurações, Dashboard, Chat, Notificações, Aether AI Copilot), os serviços programáticos do kernel, os frameworks para extensão. Invariante através de qualquer uso específico.

**Distribuições** — empacotamentos opinionated do Aethereos-plataforma para um mercado, setor ou propósito específico. Cada distribuição é identidade visual própria, seleção de apps bundled, fluxo de onboarding próprio, frameworks de compliance específicos da jurisdição/setor, políticas pré-configuradas. **Não são parte deste documento**; são exemplos de aplicação.

Distribuições podem ser construídas por:

- **Aethereos Inc** (a empresa mantenedora) — como produto comercial de primeira parte
- **Parceiros certificados** — sob o Aethereos Compatible Program
- **Empresas internamente** — para uso próprio (ex: multinacional criando distribuição privada para suas subsidiárias)
- **Comunidade** — como projeto paralelo, sujeito à licença BUSL

### B2B AI OS Brazil — exemplo canônico

Como exemplo concreto ao longo deste documento, usaremos **B2B AI OS Brazil**, a primeira distribuição em construção pela Aethereos Inc. B2B AI OS Brazil é aplicação ilustrativa de como o framework Aethereos é usado na prática, não parte constitutiva do kernel.

Características da distribuição B2B AI OS Brazil:

- **Mercado alvo** — pequenas e médias empresas industriais e comerciais brasileiras
- **Identificador primário** — CNPJ (via framework de identificadores do kernel, Parte XXI.3)
- **Enriquecimento** — BrasilAPI e ReceitaWS como provedores de dados (pluggados via framework)
- **Frameworks de compliance** — LGPD, NF-e padrão nacional, NCM, SEFAZ, Reforma Tributária do Consumo
- **Frameworks financeiros** — Pix (incluindo Pix Automático), boleto, TED, cartão de crédito via adquirentes brasileiros
- **Integração Open Finance Brasil** — conciliação bancária, previsão de caixa baseada em dados reais, iniciação de pagamento onde autorizada
- **Apps bundled potenciais** — produtos first-party da Aethereos Inc ou parceiros que fizerem sentido para o mercado (marketplace B2B, ERP simplificado, logística, CRM, copiloto fiscal)

**Essas características são da distribuição**, não do kernel. Uma distribuição construída para outro mercado teria outros identificadores, outros frameworks financeiros, outras integrações — reutilizando exatamente o mesmo kernel.

Nada impede que a Aethereos Inc, parceiros ou comunidade construam distribuições para outros contextos (mercados geográficos distintos, verticais setoriais especializadas, uso interno corporativo). A decisão sobre quais distribuições construir e em que ordem é comercial e pertence a documento separado — não a este.

## 1.3 Produtos SaaS construídos sobre o Aethereos

De forma análoga, **produtos SaaS específicos** (um CRM, um ERP, um gestor de estoque, um marketplace B2B) são construídos sobre o Aethereos mas não são parte do kernel. Podem existir como:

- **App first-party** — produto SaaS da Aethereos Inc ou de parceiro estratégico, com domínio próprio e vida comercial independente, que também roda embebido no Aethereos como app nativo
- **App third-party market** — publicado via Magic Store por desenvolvedor externo
- **App interno** — construído pela empresa cliente para uso próprio

O padrão arquitetural (variante dupla de build, SCP events sempre emitidos, backend compartilhado via schema separation) é descrito na Parte VII.1. Produtos concretos que a Aethereos Inc ou parceiros possam construir são documentados separadamente.

## 1.4 Adoção não-disruptiva via SCP Bridge

[DEC] Entre as capabilities do kernel, destaque merecido para o **SCP Bridge on-premise** (detalhado na Parte IX.7): serviço containerizado que roda na infraestrutura do cliente, lê banco de sistemas legados (SAP, Totvs, Sankhya, Protheus, outros) via Change Data Capture e traduz em eventos SCP consumíveis pelo Aethereos.

Importância arquitetural: o Aethereos não exige substituição de sistemas existentes como pré-requisito de adoção. Cliente pode manter ERP legado funcionando como fonte de verdade transacional e usar o Aethereos como camada de inteligência operacional, copiloto, observabilidade de negócio e automação assistida sobre os eventos gerados pelo legado. Substituição gradual de módulos do legado pode vir depois, se fizer sentido comercialmente para o cliente — mas não é condição necessária.

Essa capacidade arquitetural habilita estratégias comerciais diversas: distribuição pode ser vendida como substituição integral de ERP, como camada de inteligência sobre ERP existente, ou como modelo híbrido. A arquitetura não prescreve estratégia; habilita múltiplas.

## 1.5 A tese em três proposições

### Proposição 1 — Contexto supera dado

A unidade de valor em operações B2B não é o dado cru, é o dado enriquecido com contexto operacional. Um pedido de R$ 125.000 é um número; o 12º pedido desse cliente em 12 meses, com preço 4,6% abaixo do histórico e 2,7% abaixo da mediana de mercado para a classificação do produto, de um fornecedor com pontualidade 98% nos últimos 90 dias, é uma decisão.

Toda a arquitetura do Aethereos existe para transformar dados em contexto. O SCP padroniza o transporte em quatro camadas explícitas (Parte VIII), o Context Engine (federado em mesh) enriquece com quantificação explícita de incerteza, o Event Store preserva para consulta futura, o Aether AI Copilot apresenta para consumo humano e agêntico. O dado nunca é fim — é matéria-prima.

### Proposição 2 — Inteligência escala com ecossistema

Uma plataforma proprietária de uma empresa gera inteligência limitada pelos dados daquela empresa. Uma plataforma compartilhada por um ecossistema gera inteligência qualitativamente diferente: benchmarks anonimizados, propagação de risco, detecção de padrões coletivos, orquestração multi-empresa. Nenhuma empresa isoladamente consegue produzir esse tipo de sinal.

O Aethereos é desenhado para crescer em duas dimensões independentes:

**Profundidade** — mais dados de um tenant tornam o sistema mais inteligente para aquele tenant, via RAG pessoal, Context Engine local, padrões temporais.

**Amplitude** — mais tenants tornam o sistema coletivamente mais inteligente, com k-anonimidade matematicamente garantida (k ≥ 10, ruído ±3-5%, supressão de outliers, defasagem temporal de 7 dias, opt-in explícito). Evolução prevista: Differential Privacy formal e Federated Learning em horizontes posteriores.

A segunda dimensão é o fosso competitivo. Competidores que operam em modelo um-cliente-por-vez estão, por definição, impedidos de acessá-la.

### Proposição 3 — O futuro do software B2B é operado por IA

Entre 2023 e 2026, a sofisticação dos modelos de linguagem cruzou um limiar qualitativo: agentes autônomos deixaram de ser curiosidade acadêmica para se tornar capacidade executável. Claude Code, Claude Computer Use, function calling, ReAct, Constitutional AI, Model Context Protocol — a pilha técnica para agentes autônomos se consolidou rapidamente.

Sistemas desenhados exclusivamente para humanos não sobreviverão essa transição sem refatoração estrutural cara. Sistemas desenhados desde o início para ambos — humanos e agentes como cidadãos de primeira classe — são o futuro.

O Aethereos não é "pensado para humanos com IA como complemento"; é "pensado como substrato onde humanos e agentes são cidadãos de primeira classe, com humano retendo autoridade final". [INV] **Essa distinção é o tema central da Parte XI — e crítico: ela é sobre a arquitetura, não sobre o ritmo de liberação. O primeiro ano comercial de qualquer distribuição construída sobre o Aethereos opera em modo read-only + suggestion-first + human approval. Autonomia de escrita por agentes só entra após maturidade operacional comprovada.**

## 1.6 As analogias que esclarecem

Três analogias compostas descrevem o Aethereos com precisão. Nenhuma isolada é suficiente.

### Analogia da plataforma-base: Android AOSP

O kernel Aethereos está para as distribuições assim como o Android Open Source Project está para Samsung OneUI, Xiaomi MIUI e Pixel Experience. Mesmo código-base, mesma arquitetura, mesmas APIs — mas cada OEM empacota apps próprios, tema próprio, loja própria. Usuário final experimenta um sistema coeso e customizado; por baixo, é o mesmo AOSP.

Samsung Galaxy é hardware Android com OneUI. Xiaomi Mi é hardware Android com MIUI. Pixel é hardware Android com Android puro. No Aethereos: uma distribuição para o mercado industrial brasileiro seria "Aethereos com distribuição B2B industrial BR". Outra distribuição seria "Aethereos com distribuição imobiliária". Aethereos puro (vanilla) é o kernel sem distribuição — existe, funciona, atende quem quer customizar do zero.

### Analogia da família de produtos: Google Workspace e Atlassian Cloud

Gmail, Calendar, Drive, Docs, Meet, Keep — cada um é um produto autônomo com domínio próprio (`gmail.com`, `calendar.google.com`, `drive.google.com`), equipes próprias, marcas próprias, pode ser usado isoladamente. Dentro do Google Workspace, os mesmos produtos convivem integrados: email linka evento no Calendar, anexo puxa do Drive, documento compartilhado via Gmail, reunião no Meet agendada automaticamente.

O mesmo padrão aplica-se a produtos construídos sobre o Aethereos. Um produto de marketplace B2B pode viver em domínio próprio como produto autônomo, integrado com Aethereos via SCP quando cliente também usa Aethereos. Um produto de ERP simplificado, idem. Cada um tem vida comercial independente; o Aethereos é o substrato integrador quando múltiplos convivem.

O mesmo modelo funciona na Atlassian (Jira, Confluence, Bitbucket, Trello), na Microsoft 365 (Word, Excel, PowerPoint, Outlook, Teams), na Salesforce (Sales Cloud, Service Cloud, Marketing Cloud). É padrão consolidado.

### Analogia da experiência integradora: ChromeOS no navegador

ChromeOS rodando sobre Linux prova que um sistema operacional inteiro — com janelas, aplicativos, configurações, arquivos, notificações — cabe no navegador. Usuários de Chromebook realizam trabalho complexo sem jamais instalar aplicações no sentido tradicional.

Aethereos adota essa tese como fundamento. A diferença central é que ChromeOS opera sobre hardware físico, enquanto Aethereos opera dentro do navegador já existente. É um OS sobre OS: sistema operacional lógico de operações B2B, executando dentro do navegador que executa dentro do ChromeOS, Windows ou macOS do usuário. Longe de ser redundância, essa dupla camada permite adoção universal sem dependência de hardware.

O OS Desktop do Aethereos — Dock, Top Bar, Tab Bar, Mesa, App Frame — inspira-se diretamente no shell do ChromeOS, adaptado para uso B2B multi-tenant.

### As três juntas

Estas três analogias não são escolhas de marketing — são verdades arquiteturais simultâneas.

| Camada Aethereos | Analogia | Exemplo na indústria |
|---|---|---|
| Kernel source-available | Android AOSP | Samsung, Xiaomi, OnePlus reutilizam o mesmo AOSP |
| Produtos construídos sobre a plataforma | Google Workspace / Atlassian / Microsoft 365 | Gmail + Calendar + Drive + Docs |
| Sistema operacional integrador | ChromeOS / macOS | Shell visual que unifica apps heterogêneos |

A Google consegue ser AOSP, Workspace e ChromeOS simultaneamente. A Microsoft consegue ser Windows, 365 e Surface simultaneamente. Aethereos pode ser Kernel, Produtos e OS simultaneamente. O modelo está provado; a execução é da Aethereos Inc e de seus parceiros.

---

# PARTE II — OS PRINCÍPIOS FUNDADORES

Toda arquitetura de longo prazo repousa sobre princípios invariantes. Conflitos entre requisitos são resolvidos a favor deles. Pedidos que os violam são questionados antes de atendidos. Estes dez princípios são a constituição operacional do projeto.

## P1 — Kernel é invariante

O kernel Aethereos não muda para acomodar distribuição específica. Muda apenas se a mudança for genericamente útil para ao menos duas verticais potenciais. Exceções exigem aprovação arquitetural formal registrada em ADR.

## P2 — Verticais são isoladas entre si

Distribuições não compartilham código de negócio, tabelas próprias, eventos específicos ou UI entre si. Compartilham apenas o kernel. Uma vertical jamais importa código de outra vertical.

## P3 — Configuração supera código customizado

Quando uma vertical precisa de comportamento diferente, a preferência é expor configuração no kernel antes de duplicar lógica. Código customizado é último recurso, sempre com justificativa em ADR.

## P4 — Dados são multi-tenant por empresa, não por vertical

Isolamento por `company_id` via Row Level Security no Postgres é invariante do kernel. Separação entre verticais é ortogonal — por manifesto e por filtragem — não por banco separado. O mecanismo multi-tenant é o mesmo em toda vertical.

## P5 — SCP é o barramento universal obrigatório

Todo evento de negócio, de qualquer vertical, qualquer app, passa pelo Software Context Protocol. Verticais não criam sistemas próprios de eventos. Apps não se comunicam diretamente entre si — sempre via SCP mediando.

## P6 — O core existe para proteger-se de si mesmo

A maior ameaça à plataforma é drift progressivo: pequenas exceções, atalhos temporários, acoplamentos inadvertidos. Guardrails mecânicos (não apenas documentais) são obrigatórios. Exemplos: dependency-cruiser bloqueando imports entre camadas, CI falhando em violações, linters enforced em pre-commit.

## P7 — Desenvolvimento é assistido por IA, arquitetura é humana

IA executa, testa, propõe, implementa, refatora. Decisões arquiteturais são registradas em ADR aprovado por humano. IA pode sugerir ADRs; humano aprova, rejeita ou pede revisão.

## P8 — Honestidade de cronograma

Mudanças arquiteturais têm custo real. Nenhum prompt, nenhuma IA acelera o tempo de validação com clientes reais, de aplicar migrations em produção sem risco, de evoluir documentação que outros consomem. Estimativas respeitam a física do mundo.

## P9 — AI-native é estrutural, não decorativo

Toda decisão arquitetural considera como agentes autônomos consumirão o sistema. Interfaces pensadas só para humanos são dívida técnica futura. Endpoints expõem intents nomeados, não ações ad-hoc. Permissões incluem `actor_type` distinguindo humano de agente.

## P10 — Protocolos abertos, plataformas proprietárias

O SCP é especificação aberta que qualquer sistema pode implementar. A plataforma Aethereos Services (Aether AI Copilot, Magic Store oficial, auth federada, inteligência coletiva, billing) é proprietária. Essa separação preserva interoperabilidade sem destruir modelo de negócio.

## P11 — Eventos são auto-certificáveis

[INV] Todo evento SCP de categoria crítica pode ser criptograficamente assinado pelo emissor e encadeado por hash ao evento anterior da mesma entidade. Sem essa fundação, auditoria forense depende da boa-fé do banco; com ela, integridade é matematicamente provável independentemente da plataforma. Esse princípio emerge de revisão que identificou assinatura HMAC (simétrica) como insuficiente para distribuição de apps e eventos em ecossistema multi-empresa.

Corolários operacionais: manifestos `.aeth` usam Ed25519 (chave pública/privada), não HMAC. Eventos SCP de classes marcadas como `notarizable` incluem hash encadeado. Provas de integridade podem ser publicadas em OpenTimestamps, ICP-Brasil ou blockchain privado conforme exigência do setor.

## P12 — Humano e agente compartilham cidadania, não autoridade

[INV] Humanos e agentes de IA operam sobre os mesmos mecanismos de autenticação, autorização, audit trail e governança — são cidadãos equivalentes no sistema. Mas em qualquer disputa sobre uma decisão, o humano detém autoridade final. Agentes não sobrescrevem humanos, não bloqueiam humanos, não modificam políticas autonomamente.

Esse princípio complementa P7 (desenvolvimento assistido por IA, arquitetura humana) estendendo-o à operação: não só a arquitetura é humana, toda a cadeia de responsabilidade terminal é humana. Consequência técnica: em qualquer fluxo onde agente e humano divergem, a ação humana prevalece e o agente recebe atualização de estado sem questionar.

## P13 — Dados de domínio pertencem ao domínio

[DEC, tendendo a INV] Dentro de um tenant, cada domínio de negócio (financeiro, RH, logística, vendas) tem autonomia sobre schema, storage e contratos de interface. O kernel não atua como dono dos dados de domínio; atua como mediador de eventos e garantia de isolamento. Domínios expõem capacidades via eventos SCP emitidos e queries contratadas consumidas.

Esse princípio preserva independência de equipes, permite escolhas técnicas localizadas (app X pode usar pgvector, app Y pode usar Postgres full-text, app Z pode usar storage externo se justificável), e impede o anti-padrão "banco único fofo" onde todo app faz JOIN cross-schema sem contrato formal.

## P14 — Modo Degenerado é obrigatório

[INV] Todo componente arquitetural sofisticado do kernel (Context Engine, Policy Engine, Company Graph, Process Radar, Trust Center, Business Observability, etc.) deve declarar explicitamente sua **versão mínima viável que funciona sem a sofisticação**. O sistema precisa operar com qualquer subconjunto dos componentes implementados, sem quebra funcional — apenas com menos inteligência.

Exemplos de modos degenerados:

| Componente sofisticado | Modo degenerado |
|---|---|
| Policy Engine com YAML, simulação, diff | Lista hardcoded de denies em código |
| Context Engine com histórico + external signals + embeddings | Payload vazio, sem enriquecimento |
| Company Graph com traversal e impact analysis | Não existe; queries usam JOINs tradicionais |
| Process Radar com mining automático | Relatório mensal manual extraído por query SQL |
| Trust Center com dataset curado e regressão | Métricas básicas em spreadsheet |
| Aether AI Copilot Fase 1 | Chatbot rule-based respondendo perguntas comuns |
| Mesh federado de Context Engines | Context Engine único centralizado |
| Audit Trail Dual | Audit log único com campo `actor_type` |
| Shadow Mode | Toda ação de agente requer aprovação humana |
| Circuit Breaker | Owner monitora métricas manualmente |

Esse princípio resolve o paradoxo "arquitetura sofisticada vs prazo de execução": permite que o sistema entre em produção com modos degenerados de 70% dos componentes, evoluindo para modo pleno apenas onde ROI justifica. Sem ele, a integração de componentes sofisticados vira projeto impossível — cada componente depende do próximo, nenhum pode entrar antes dos demais.

Implementação prática: cada componente do kernel declara duas implementações registradas no container de injeção de dependência — `<Component>Degraded` e `<Component>Full`. Configuração escolhe qual ativar. Modo degenerado é default em tenants Free e ambientes de dev; modo pleno é licenciado.

## P15 — Features que usam LLM declaram orçamento técnico

[INV] Toda feature que invoca modelo de linguagem (Claude API, SLM local, embedding model, qualquer chamada que consuma tokens) declara explicitamente, antes de entrar em produção:

- **Custo estimado por invocação** (USD) baseado em tokens médios de input e output
- **Latência alvo** (p50, p95) e timeout máximo
- **Fallback disponível** — o que acontece quando o LLM falha ou retorna resultado insatisfatório
- **Kill switch** — como desligar a feature sem desligar o sistema
- **Quota por tenant** (e por plano, quando aplicável) para prevenir abuso e custo descontrolado
- **Métricas de qualidade** registradas no Trust Center

Sem essa declaração, feature que usa LLM não é aprovada para merge. ADR obrigatório.

Rationale: modelos de linguagem têm custo variável alto e imprevisível. Feature que parece trivial pode consumir milhares de dólares por mês quando escala. Disciplina econômica em nível de feature é a única forma de manter unit economics viáveis conforme uso cresce.

Esse princípio é consequência direta da Parte XXIII (Unit Economics): quando arquitetura toca dinheiro real continuamente, cada decisão de feature é decisão econômica também.

## Como aplicar os princípios em conflitos

Quando dois requisitos entram em conflito, resolva pela ordem de precedência:

- **Absolutos [INV]**: P4 (RLS multi-tenant), P5 (SCP obrigatório), P11 (eventos auto-certificáveis para categorias críticas), P12 (humano como autoridade final sobre agentes), P14 (Modo Degenerado obrigatório), P15 (orçamento LLM).
- **Quase absolutos**: P1 (kernel invariante), P2 (verticais isoladas), P6 (guardrails mecânicos), P13 (soberania de domínio). Exceções exigem ADR formal.
- **Preferências fortes**: P3 (configuração supera código), P7 (IA executa, humano decide arquitetura), P9 (AI-native estrutural), P10 (protocolos abertos, plataformas proprietárias).
- **Regra ética**: P8 (honestidade de cronograma) — não se quebra por pressão comercial.

Em dúvida, escolha sempre a opção que preserva mais princípios simultaneamente. Quando a decisão em questão é marcada [HIP] (hipótese), prefira manter opção reversível até evidência conclusiva; quando é [DEC], exija justificativa explícita para mudar; quando é [INV], trate revisão como decisão constitucional com peso proporcional.

---

# PARTE III — HIERARQUIA DE CINCO CAMADAS

A compreensão correta do Aethereos exige cinco camadas, não duas. Cada camada tem responsabilidades claras e fronteiras rígidas. Confundir camadas é fonte de bugs, débito técnico e deterioração arquitetural.

## 3.1 As cinco camadas

```
┌──── 1. CORE (Aethereos base) ──────────────────────────┐
│   Runtime, OS shell, auth, VFS, SCP bus,                │
│   permission engine, Magic Store client,                │
│   apps invariantes do kernel, Aether AI Copilot base    │
└─────────────────────────────────────────────────────────┘
                        ▼
┌──── 2. CATALOG (Magic Store global) ────────────────────┐
│   Registro único de todos os apps publicados:           │
│   first-party SaaS, third-party market, connectors      │
└─────────────────────────────────────────────────────────┘
                        ▼
┌──── 3. VERTICAL (manifesto de distribuição) ────────────┐
│   Branding + apps bundled + storefront filter +         │
│   onboarding específico + políticas + compliance        │
│   Ex: B2B AI OS Brazil, Imobiliário OS, Incubadora OS   │
└─────────────────────────────────────────────────────────┘
                        ▼
┌──── 4. TENANT (empresa provisionada) ───────────────────┐
│   Instância real de empresa: apps instalados,          │
│   dados isolados via RLS, entitlements do plano,       │
│   VFS montada, overrides sobre vertical                │
└─────────────────────────────────────────────────────────┘
                        ▼
┌──── 5. USER (preferências individuais) ─────────────────┐
│   Mesa personalizada, apps fixados na dock,             │
│   atalhos, notificações, layout pessoal                 │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Responsabilidades e fronteiras

**Camada 1 — Core.** O Aethereos puro. Código sob BUSL v1.1. Existe como produto funcional mesmo sem nenhuma vertical instalada (equivalente ao AOSP puro rodando em Pixel). Usuários avançados podem operar no Core vanilla, baixar apps diretamente da Magic Store e construir experiência do zero.

**Camada 2 — Catalog.** A Magic Store como registro central de todos os apps publicados em qualquer canal. Não existem múltiplas Magic Stores. Existe uma, filtrada em runtime por vertical, plano, país e tenant. Apps de terceiros publicam aqui mediante revisão; apps first-party da família Aethereos também estão registrados aqui.

**Camada 3 — Vertical.** Manifesto JSON no banco (não código, não pacote do monorepo) que declara: branding, apps bundled, storefront filter, onboarding, políticas, compliance. Uma vertical é configuração declarativa. Criar nova vertical é INSERT na tabela `verticals` mais registro de assets visuais. Não exige rebuild, não exige deploy.

**Camada 4 — Tenant.** Empresa cadastrada no sistema. É aqui que dados vivem, apps são efetivamente instalados, entitlements do plano são aplicados. Um tenant pertence a exatamente uma vertical ativa. Isolamento via RLS com `company_id`. Overrides locais sobre a vertical são permitidos via tabela `tenant_package_overrides`.

**Camada 5 — User.** Preferências individuais dentro do tenant. Layout da Mesa, apps pinados na Dock, atalhos, notificações, temas pessoais. Persistidas por (user_id, company_id) — o mesmo user pode ter preferências diferentes em empresas diferentes.

## 3.3 Resolução do conflito: vertical como dado, não código

Esta hierarquia resolve explicitamente um conflito que emergiu na evolução do projeto. Documentos anteriores descreviam verticais como "vertical packs" com código próprio, `vertical.manifest.ts` compilado. Essa formulação é rejeitada em favor da formulação declarativa.

**Rationale.** Verticais como código exigem rebuild e deploy do kernel a cada alteração. Verticais como dado permitem que operação diária (ajustar branding, adicionar app bundled, mudar filter) seja feita por não-desenvolvedores via painel administrativo. É análogo à diferença entre Samsung precisar fazer fork do AOSP para cada lançamento versus Samsung pegar AOSP estável e aplicar configuração declarativa.

First-party apps (Comércio Digital, Kwix, Logitix, Imova) têm código próprio em repositórios autônomos — isso não muda. O que muda é que a vertical em si, enquanto distribuição, é dado. A vertical não é código; ela lista apps cujos códigos vivem em outros lugares.

---

# PARTE IV — AETHEREOS CORE: O KERNEL

## 4.1 Apps invariantes do kernel

Oito apps são invariantes do kernel. Instalados por default em qualquer distribuição, não podem ser desinstalados, não podem ser substituídos por apps de terceiros equivalentes. São o equivalente ao Settings, Phone, Camera e Files do Android — garantem experiência mínima consistente entre verticais.

### Drive

Sistema de arquivos virtual do Aethereos. Backend híbrido (Supabase Storage para arquivos pequenos, backup em R2/S3 para grandes). Cada app instalado ganha pasta própria em `/apps/{app_id}/`. Hierarquia: `/home/` (arquivos pessoais do user), `/company/` (arquivos compartilhados da empresa), `/apps/{app_id}/` (arquivos específicos de cada app), `/system/` (config do sistema), `/mnt/` (integrações externas montadas). Suporta signed URLs, share links protegidos, versionamento, lixeira, busca full-text.

### Recursos Humanos (RH)

Registro unificado de pessoas relacionadas à empresa: funcionários CLT, prestadores de serviço, parceiros, contatos externos. Cada registro tem tipo, cargo, departamento, datas relevantes, documentos anexados (via Drive), histórico de eventos. Integra com Chat para notificações, com Aether AI Copilot para consultas naturais ("quando expira o contrato do João?"), com Drive para arquivos. Invariante mesmo para empresas solo porque mantém prestadores e parceiros.

### Magic Store

Cliente da Magic Store global. Exibe catálogo filtrado por vertical+plano+país+tenant. Permite instalação, atualização, desinstalação de apps. Gerencia permissões declaradas no manifest. Showroom inicial destaca apps bundled da vertical; showroom expandido mostra catálogo compatível completo.

### Configurações

Painel central de configuração. Quatro áreas principais: **Perfil** (quem é você, foto, contatos, preferências pessoais, tema, notificações), **Empresa** (nome, CNPJ, logo, endereço, equipe, planos de assinatura, faturamento), **Distribuição** (qual vertical está instalada, como fazer upgrade de plano, como mudar vertical, integração com Aethereos Services), **Sistema** (idioma, timezone, acessibilidade, sobre o Aethereos, versão instalada).

### Dashboard

Visão consolidada da operação. Arquitetura plug-in: cada app nativo pode contribuir widgets/panels ao dashboard central. RH contribui painel de "aniversariantes + contratos vencendo + solicitações pendentes". Comércio Digital contribui painel de "pedidos do dia + RFQs ativos + novos matches". Logitix contribui painel de "entregas em trânsito + cotações aguardando + incidentes". O Dashboard compõe esses widgets em layout responsivo personalizável por user. Filosofia: o Dashboard não é um app — é janela central para todos os apps, vista pela lente do que está acontecendo agora.

### Chat

Comunicação interna entre equipe da mesma empresa. Feature set básico: conversas diretas 1-a-1 (DMs) e canais de time (multi-participante), envio de texto e anexos via Drive, menções (@), presença online, indicador de leitura, histórico persistido. **Não é Slack clonado.** Threads aninhadas, huddles, integrações avançadas, workflows — tudo isso fica para depois (Horizonte 3+). Por enquanto é o suficiente para um time operar sem precisar sair do Aethereos para comunicar.

### Notificações

Central unificada. Todos os apps emitem notificações via API do kernel, que persiste em `notifications`, aplica regras de prioridade, agrupa por contexto, entrega em-tempo-real via Supabase Realtime (Top Bar bell + toast), gera digest diário/semanal por email quando configurado. Aether AI Copilot pode resumir e priorizar notificações acumuladas ("você tem 23 novas; três são urgentes").

### Aether AI Copilot

Copiloto de IA nativo do Aethereos. Acessível em qualquer app via atalho global (Cmd+K ou botão persistente na Top Bar). Tem acesso leitura a: todos os dados do tenant via RLS, todos os eventos SCP do Event Store, todos os arquivos do Drive com permissão adequada, histórico de chat, contatos do RH. Pode: responder perguntas naturais ("qual a situação do pedido X?"), sumarizar contextos ("o que aconteceu esta semana?"), sugerir próximas ações, executar Action Intents sob governança (quando autorizado).

Nomenclatura cravada: **Aether AI Copilot** (não mais "AE AI" dos documentos anteriores). Se em verificação de trademark houver conflito com Microsoft Copilot ou GitHub Copilot, migra-se para **Aether AI** como nome oficial.

## 4.2 OS Shell elements

Componentes visuais invariantes do kernel. Não customizados por vertical. Branding é parametrizável (cores, logo, nome da empresa exibido), mas a estrutura é invariante.

### Top Bar

Barra superior, altura 48-64px. Contém: identidade da empresa ativa (nome + logo), relógio digital, indicador de conexão (online/offline), notificações (sino com badge de contagem), atalho Aether AI Copilot (botão persistente), menu de usuário (perfil, configurações, logout, switch de empresa se usuário pertence a múltiplas). Consome `BrandingProvider` para renderizar cores e logo, mas estrutura é invariante.

### Tab Bar

Barra de abas logo abaixo da Top Bar. Cada app aberto é uma aba. Abas podem ser fechadas, reordenadas. A Mesa é aba pinada que nunca fecha. Comportamento espelha o Chrome: clique em aba ativa; clique no X fecha; arrasto reordena; hover mostra preview; Cmd+W fecha; Cmd+Tab alterna. Limite prático de 15-20 abas simultâneas.

### Dock

Barra inferior, altura 64-80px. Ícones dos apps pinados (sempre visíveis) e running (aberto no momento). Efeito de magnificação no hover inspirado no macOS. Consome `App Registry` dinâmico — lista derivada de `getRegisteredApps()`, não hardcoded. User escolhe quais apps pinar; apps não pinados aparecem na Dock enquanto estão abertos.

### Mesa

Área de trabalho principal. Aba padrão, sempre pinada. Renderiza: wallpaper personalizável por user, ícones de atalho a apps (equivalente a ícones no desktop tradicional), widgets (cards de informação persistente atualizados em tempo real). Layout persistido em `mesa_layouts` por (user_id, company_id). Drag-and-drop via `@dnd-kit`.

Widgets da Mesa são conceitualmente **superfícies de agência** (*surfaces of agency*): pontos onde humano — ou agente autônomo — toma ação imediata com contexto mínimo. Tipos: widgets do kernel (relógio, notas rápidas, notificações recentes), widgets de vertical (câmbio e commodities para B2B BR, agenda do dia para ClinicaOS, audiências da semana para JuridicoOS), widgets de app específico (RFQs ativas do Comércio Digital, fluxo de caixa do Kwix).

### App Frame

Container genérico onde apps renderizam. Abstrai: loading state (Suspense fallback), error boundary, state de bloqueio (app desabilitado, plano insuficiente, permissão ausente, app em manutenção). Consome componente do app via `registry.get(appId).component`, respeitando lazy loading com `React.lazy` + `Suspense`.

## 4.3 Serviços do kernel

Para além dos apps e do shell visual, o Core fornece serviços programáticos consumidos por todos os apps via SDK interno:

- **Authentication engine** — Supabase Auth via wrapper. JWT, refresh tokens, MFA opcional, magic links, OAuth 2.1 providers.
- **Multi-tenant RLS enforcement** — políticas Postgres ativas. Middleware de aplicação reforça mas Postgres garante em última instância.
- **SCP event bus** — roteamento, enriquecimento via Context Engine, persistência em Event Store.
- **Virtual File System (VFS)** — hierarquia unificada sobre Supabase Storage + R2.
- **Permission engine** — capability-based, declarado no manifest do app, aprovado em runtime.
- **Notification center** — pub/sub via Supabase Realtime.
- **Settings engine** — persistência por user e por tenant.
- **Magic Store client** — discovery, instalação, updates de apps.
- **AI Context Bridge** — RAG sobre Event Store com embeddings pgvector.
- **Drive API** — abstração sobre VFS com signed URLs, shares, versionamento.

## 4.4 Navegação híbrida: URL para identidade, estado para sessão

[DEC] Navegação entre apps é gerenciada por combinação de Zustand store (para estado efêmero da sessão) e URL routing (para identidade restaurável de recurso). A versão anterior deste documento apresentava "navegação sem URL" como invariante, o que foi revisto como excesso de rigidez dogmática.

### A divisão de responsabilidades

**URL representa identidade do recurso observado.** O path encoda "qual app, qual entidade, qual modo de visualização". Exemplos: `/app/comercio-digital/pedidos/abc-123`, `/app/drive/folder/contracts`, `/app/kwix/financeiro/contas-pagar`. Basta copiar-colar a URL e o destinatário chega exatamente no mesmo lugar.

**Zustand store representa estado efêmero da sessão.** Quais abas estão abertas, qual a ordem, qual está ativa, filtros temporários, layout da Mesa, configurações locais de cada aba. Esse estado não pertence à URL porque não é recurso — é contexto do usuário. Persiste entre sessões via localStorage (com limpeza conforme preferência do user).

### O que isso preserva

**Deep-linking funciona.** Vendedor compartilha link do pedido por WhatsApp; destinatário (autenticado) chega direto no pedido na aba correta.

**Suporte técnico melhora.** Usuário reporta problema enviando URL; suporte vê exatamente o que o usuário viu.

**Histórico do browser e acessibilidade preservados.** Leitor de tela anuncia página, botões voltar/avançar funcionam, bookmarks são possíveis, analytics naturais.

**QA e automação facilitados.** Playwright E2E pode navegar via URL diretamente, sem precisar simular cliques em sequência para atingir estado.

### O que preserva a metáfora de desktop

**Múltiplas abas sem conflito de rotas.** Cada aba tem sua própria URL ativa; trocar de aba muda a URL exibida na barra mas não re-monta o app (a instância fica em memória no Zustand).

**Estado local preservado em switches.** Você estava no meio de um formulário; troca de aba, volta, o formulário está intacto. Porque o estado é Zustand, não URL params.

**Performance instantânea.** Troca de aba é re-render local, não navegação de rota com unmount/mount completo.

### Implementação técnica

React Router (ou TanStack Router) para URL routing. Zustand para estado de sessão. Integração via adapter: quando URL muda (user navega manualmente), Zustand é notificado; quando Zustand muda estado relevante (user seleciona entidade em uma aba), URL é atualizada via `navigate` sem re-mount.

URLs válidas em todos escopos: landing pública, auth (login/register/reset), links públicos de share (`/s/<token>`), rotas de sistema (webhooks, API), e rotas internas de cada app aberto (`/app/<app_id>/<entity_type>/<entity_id>`).

[HIP] A hipótese restante é que usuários aceitarão naturalmente essa dualidade (URL como "onde estou", abas como "o que tenho aberto"). Teste de usabilidade dedicado no Bloco 1 confirmará ou motivará ajuste.

## 4.5 Lazy loading como invariante

Apps não são carregados eagerly. `React.lazy` + `Suspense` carregam o bundle JavaScript do app quando o ícone é clicado pela primeira vez. Bundle inicial do Core é mínimo (< 500KB), apps carregados sob demanda. Service Worker + Workbox cacheiam apps já carregados para acesso offline e re-abertura instantânea.

## 4.6 Aethereos CLI e SDK públicos

Interfaces programáticas são cidadãos de primeira classe, não afterthought. Toda operação executável via UI deve ser executável via CLI e via SDK, com paridade de features.

### CLI oficial (`aethereos`)

Binário distribuído via npm, brew, apt, chocolatey. Autenticação via `aethereos login` (OAuth browser-based com PKCE, token salvo em keychain do OS).

Comandos de primeira classe:

```bash
# Tenants
aethereos tenants create --vertical=b2b-ai-os-brazil --cnpj=00.000.000/0001-00
aethereos tenants list
aethereos tenants switch <tenant_id>

# Apps
aethereos apps install <package_id>
aethereos apps list
aethereos apps publish ./my-app/     # empacota, assina, publica na Magic Store

# Events
aethereos events tail --tenant=X --filter="comercio_digital.*"
aethereos events emit --type="dev.test.event" --payload='{...}'
aethereos events replay <event_id>

# Agents
aethereos agents list
aethereos agents deploy policy.yaml
aethereos agents suspend <agent_id>

# Dev
aethereos dev:new-app                  # scaffold de app .aeth novo
aethereos dev:new-connector            # scaffold de connector
aethereos dev:new-vertical             # scaffold de manifesto de vertical

# Deploy
aethereos deploy canary --percentage=5
aethereos deploy rollback
```

Desenho inspirado em `gcloud`, `aws`, `supabase`, `stripe` — CLIs bem executadas têm estrutura verbo-substantivo previsível, outputs formatáveis (JSON/YAML/table), e suportam scripting.

### SDK TypeScript (`@aethereos/sdk`)

Biblioteca oficial consumida por:

- **First-party apps** (Comércio Digital, Kwix, Logitix) — acesso total ao kernel via SDK interno
- **Third-party apps .aeth** — acesso parametrizado pelas permissões do manifest
- **Connectors** — API especializada para webhooks, OAuth vault, tradução SCP
- **Integradores externos** — orquestrar tenants programaticamente (provisioning, billing, user management)

Exemplo de uso:

```typescript
import { createAethereosClient } from '@aethereos/sdk';

const aeth = createAethereosClient({
  apiKey: process.env.AETHEREOS_API_KEY,
  tenantId: 'abc-123'
});

// Emit SCP event
await aeth.scp.emit({
  event_type: 'comercio_digital.order.created',
  payload: { order_id: '...', amount: 1500 }
});

// Subscribe to events
aeth.scp.subscribe('comercio_digital.order.*', (event) => {
  console.log('Order event received:', event);
});

// Drive API
const fileUrl = await aeth.drive.upload('/company/contracts/', file);

// Aether AI Copilot
const response = await aeth.ai.ask("Qual a situação do pedido X?");

// Policy evaluation (dry-run)
const decision = await aeth.policy.evaluate({
  intent: 'erp.accounts_payable.schedule_payment',
  parameters: { amount: 10000 }
});
```

SDK exposto também em Python (`@aethereos/sdk-py`) no Horizonte 2 para facilitar integração com pipelines de dados e workflows de IA em ambientes mais orientados a dados.

### Por que CLI e SDK são estratégicos

Três razões que vão além de conveniência:

**Dev experience**. Devs adotam plataformas via CLI/SDK antes de UI. "Hello world" em 5 minutos via CLI é métrica de adoção.

**Automação**. Enterprise não cria 500 tenants via cliques — cria via script. Sem CLI robusta, perde contratos enterprise grandes.

**Base para agentes**. Agentes de IA (internos e externos) consomem o sistema via SDK/CLI. Se a interface programática é de primeira classe, agentes naturalmente herdam capability. Se é afterthought, agentes trombam em limitações.

## 4.7 Driver Model — abstração dos backends externos

[INV] Toda dependência do kernel em backend externo (Supabase, R2, pgvector, provider de email, etc.) é mediada por interface de Driver. O kernel chama `StorageDriver.read()` em vez de `supabase.storage.from('bucket').download()`. Essa camada parece custosa inicialmente (2-3 semanas extras no início) e se paga cinquenta vezes ao longo da vida do projeto.

### As interfaces principais

```typescript
// packages/kernel/drivers/storage.driver.ts
interface StorageDriver {
  read(path: string): Promise<Blob>;
  write(path: string, data: Blob, opts?: WriteOptions): Promise<void>;
  delete(path: string): Promise<void>;
  list(prefix: string, opts?: ListOptions): Promise<StorageItem[]>;
  signedUrl(path: string, expiresIn: number): Promise<string>;
}

// packages/kernel/drivers/auth.driver.ts
interface AuthDriver {
  signIn(credentials: Credentials): Promise<Session>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  createOAuthChallenge(provider: OAuthProvider): Promise<OAuthChallenge>;
  handleOAuthCallback(code: string): Promise<Session>;
  refreshToken(refresh: string): Promise<Session>;
}

// packages/kernel/drivers/realtime.driver.ts
interface RealtimeDriver {
  subscribe(topic: string, handler: EventHandler): Subscription;
  publish(topic: string, event: Event): Promise<void>;
  presence(topic: string): Presence;
}

// packages/kernel/drivers/vector.driver.ts
interface VectorDriver {
  upsert(collection: string, items: VectorItem[]): Promise<void>;
  query(collection: string, embedding: number[], opts: QueryOpts): Promise<VectorMatch[]>;
  delete(collection: string, ids: string[]): Promise<void>;
}

// packages/kernel/drivers/eventbus.driver.ts
interface EventBusDriver {
  publish(event: SCPEvent): Promise<{ event_id: string; accepted_at: string }>;
  subscribe(filter: EventFilter, handler: EventHandler): Subscription;
  replay(from: Timestamp, to: Timestamp, filter: EventFilter): AsyncIterator<SCPEvent>;
}
```

### As implementações hoje e amanhã

Hoje todas as implementações apontam para Supabase ou equivalente atual. Amanhã, quando limites de Supabase Realtime baterem (conexões simultâneas), Edge Functions não suportarem Context Engine completo, ou cliente enterprise exigir S3 on-premise — a troca é localizada na implementação do Driver, não espalhada em 200 pontos do kernel.

| Interface | Hoje [DEC] | Futuro possível [HIP] |
|---|---|---|
| `StorageDriver` | `SupabaseStorageDriver` | `S3Driver`, `R2Driver`, `AzureBlobDriver`, `OnPremMinIODriver` |
| `AuthDriver` | `SupabaseAuthDriver` | `Auth0Driver`, `KeycloakDriver`, `CustomSAMLDriver` |
| `RealtimeDriver` | `SupabaseRealtimeDriver` | `RedisStreamsDriver`, `NATSDriver`, `AblyDriver` |
| `VectorDriver` | `PgVectorDriver` | `PineconeDriver`, `WeaviateDriver`, `QdrantDriver` |
| `EventBusDriver` | `PostgresEventBusDriver` | `KafkaDriver`, `NATSDriver`, `RabbitMQDriver` |

### Por que isto operacionaliza P10

P10 diz "protocolos abertos, plataformas proprietárias". Sem Driver Model, a afirmação é discursiva — na prática o kernel estaria colado ao Supabase, e mover para outro backend exigiria refatoração massiva. Com Driver Model, o princípio vira código: o kernel define a forma; a implementação é plugável. Fornecedores de backend competem para implementar Drivers do Aethereos, não ao contrário.

## 4.8 Aethereos Client SDK — `@aethereos/client`

[INV] Todo app third-party (formato iframe ou Module Federation) consome o kernel através do pacote `@aethereos/client`, que abstrai totalmente o protocolo de IPC (postMessage no caso iframe, direct call no caso federado) atrás de API TypeScript tipada.

Sem esse SDK, cada desenvolvedor third-party inventa seu próprio dialeto de postMessage, cada app interpreta mensagens de forma ligeiramente diferente, o ecossistema vira Torre de Babel. Com SDK oficial, a experiência de desenvolvimento é previsível, versionada, testável, documentada.

### API de referência

```typescript
import { createAethereosClient } from '@aethereos/client';

const aeth = createAethereosClient();  // descobre contexto automaticamente

// Storage
const blob = await aeth.drive.read('/app/my-app/config.json');
await aeth.drive.write('/app/my-app/output.csv', csvBlob);

// SCP events
await aeth.scp.emit({
  event_type: 'my_app.entity.action',
  payload: { ... }
});

aeth.scp.subscribe('comercio_digital.order.*', (event) => {
  // handler
});

// Aether AI Copilot
const answer = await aeth.ai.ask('Qual a situação do pedido X?');

// Drive signed share
const shareUrl = await aeth.drive.createShareLink('/path', { expiresInDays: 7 });

// User and tenant context
const user = aeth.context.currentUser();
const tenant = aeth.context.currentTenant();
const permissions = aeth.context.permissions();

// Notifications
await aeth.notifications.send({
  title: 'Task complete',
  body: 'Your report is ready',
  action: { app: 'my-app', entity: 'report-123' }
});
```

### Benefícios estruturais

**Segurança**: SDK valida respostas conforme schema antes de entregar ao app; manipulação de postMessage malicioso é bloqueada na fronteira.

**Versionamento**: SDK é semver. Apps declaram compatibilidade (`"@aethereos/client": "^2.0"`); kernel garante compatibilidade forward através da versão major.

**DX superior**: autocomplete em IDE, tipos em TypeScript, docs inline, erros claros. Desenvolvedor third-party não precisa ler especificação de postMessage para começar.

**Testabilidade**: mock do SDK trivial para testes unitários do app third-party.

**Evolução independente**: kernel pode evoluir protocolo interno de IPC sem quebrar apps; basta o SDK manter API estável e adaptar internamente.

## 4.9 Capability Tokens — modelo de permissões por app

[INV] O Aethereos adota **capability-based security** como modelo fundamental de permissões para apps: cada app recebe do kernel um conjunto explícito de **capability tokens** declarando quais operações pode executar, sobre quais recursos, em quais tenants, por qual janela de tempo.

### Por que capability tokens

Modelo alternativo (ambiente hierárquico de permissões "app tem acesso ao que o tenant tem acesso") gera três problemas operacionais conhecidos:

**Permissões implícitas amplificam dano.** App comprometido ou bugado acessa tudo que o usuário acessa, independentemente de necessidade. Supply chain attack em app third-party vira violação do tenant inteiro.

**Auditabilidade frágil.** "App X leu dado Y" é confuso porque não é claro se app tinha direito de ler. Auditoria depende de reconstrução cara de intent a posteriori.

**Revogação granular impossível.** Para revogar uma permissão específica sem afetar outras, precisa renegociar ambiente inteiro. Na prática, revogações viram all-or-nothing.

Capability tokens resolvem esses três problemas explicitando permissões como credenciais denotáveis, escopadas, revogáveis, auditáveis.

### Modelo conceitual

Cada app, ao ser instalado em um tenant, recebe conjunto de tokens. Token tem estrutura:

```typescript
interface CapabilityToken {
  token_id: string;
  app_id: string;
  tenant_id: string;
  
  capability: {
    resource: string;           // "scp.events", "storage.drive", "kwix.v1_accounts_payable"
    actions: string[];          // ["read", "write", "subscribe"]
    constraints?: object;       // filtros adicionais conforme recurso
  };
  
  scope: {
    expires_at?: string;        // TTL opcional
    max_invocations?: number;   // quota opcional
    origin_restrictions?: string[];  // onde token pode ser usado
  };
  
  granted_by: {
    actor_type: "kernel" | "tenant_owner" | "another_app_delegation";
    actor_id: string;
    granted_at: string;
    justification?: string;
  };
  
  revocable: boolean;           // true para tokens de permissões; false para identity
}
```

### Operações governadas por capability tokens

- **Leitura de views canônicas** — app só lê view se tem capability token correspondente
- **Emissão de eventos SCP** — app só emite event_type se tem capability `scp.emit:<event_type>`
- **Subscrição a tópicos SCP** — subscrição filtrada pela capability `scp.subscribe:<topic>`
- **Chamada a serviços do kernel** — cada endpoint programático exige capability específica
- **Invocação de hooks de outros apps** — cross-app interactions são tokens explícitos

### Derivação de capabilities do manifesto do app

Manifesto `.aeth` declara capabilities **solicitadas**; instalação gera prompt explícito ao owner do tenant para aprovar antes de emitir tokens. Manifest define o máximo que o app pode pedir; tokens emitidos podem ser subconjunto se owner restringiu.

```typescript
// No manifest do app third-party
{
  "requested_capabilities": [
    {
      "resource": "scp.events",
      "actions": ["subscribe"],
      "constraints": {
        "event_types": ["crm.opportunity.*", "crm.contact.*"]
      },
      "justification": "App sincroniza oportunidades com CRM externo"
    },
    {
      "resource": "scp.events",
      "actions": ["emit"],
      "constraints": {
        "event_types": ["integration.external_crm.*"]
      },
      "justification": "App emite eventos ao receber webhooks do CRM externo"
    }
  ]
}
```

### Revogação dinâmica

[INV] Toda capability é revogável (exceto capabilities de identity fundamentais). Owner do tenant pode revogar qualquer capability a qualquer momento via Configurações. Revogação propaga em ≤ 60 segundos para todos os nós. App que tentar usar token revogado recebe erro explícito com código `capability_revoked`.

### Detalhes operacionais deslocados

A mecânica operacional completa (formato exato do token, algoritmo de assinatura, chave de emissão, renovação, cache de verificação, revogação distribuída, emissão on-behalf-of, delegação transitiva) é documentada em **KEY_MANAGEMENT.md** companheiro. Esta Fundamentação estabelece o **modelo**; o documento operacional estabelece a **implementação**.

### Relação com outros invariantes

- **P4 (RLS multi-tenant)** — capability tokens operam DENTRO do tenant ao qual foram emitidos. Nunca cruzam tenant.
- **P11 (eventos auto-certificáveis)** — capability tokens de emissão integram com assinatura Ed25519 do evento. Emissor precisa ter capability + chave privada.
- **P13 (soberania de domínio)** — apps declaram capabilities sobre views canônicas próprias e de outros; consumo cross-domain só com capability explícita.
- **11.5 (Governance-as-Code)** — Policy Engine avalia Action Intents considerando tanto política YAML quanto capability tokens possuídos pelo agente/app.

---

# PARTE V — MAGIC STORE E CATÁLOGO UNIVERSAL

## 5.1 Princípio arquitetural

**Um catálogo único, múltiplas storefronts filtradas.** Não existem Magic Stores separadas por vertical. Existe uma registry central (tabela `packages`) e queries com filtros compostos que retornam visões diferentes conforme o contexto do solicitante.

O usuário final da vertical B2B AI OS Brazil vê a "Magic Store B2B" com apps relevantes para indústria brasileira. O usuário final da vertical Imobiliário OS vê a "Magic Store Imobiliária" com apps relevantes para imóveis. Mas por baixo é o mesmo banco, mesmo catálogo, mesma infraestrutura.

Isso reduz custo de manutenção, preserva governança central, permite lançar nova vertical sem replicar infraestrutura de loja.

## 5.2 Três tipos de app suportados

Três formatos de primeira classe. Cada app declara seu tipo no manifest.

### Native apps

Apps construídos especificamente para o shell do Aethereos, com acesso completo à API do kernel (SCP bus, VFS, AI Context Bridge, permission engine, etc). No MVP, apps nativos ficam incluídos no bundle do Core. Na Fase 2, refatorados para Module Federation 2.0 e carregados em runtime como os demais. Exemplos: Drive, RH, Dashboard, Configurações, Aether AI Copilot (todos do kernel).

### Iframe apps

Formato padrão para apps de terceiros no MVP. Bundle `.aeth` — zip contendo `manifest.json`, `index.html`, assets, service worker opcional — hospedado em Cloudflare R2 + CDN. Roda em iframe sandboxed com origin própria por app (`{app_id}.{tenant_id}.aethereos.io`) para isolamento via Same-Origin Policy nativa do navegador. IPC com o kernel via `postMessage` estruturado. Permissões declaradas no manifest, aprovadas em runtime estilo Android.

### Connector apps

Formato especial para integrar sistemas externos (Trello, Gmail, Salesforce, GitHub). Ver Parte IX para detalhamento completo. Em resumo: app que atua como ponte bidirecional entre sistema externo e SCP via OAuth + API + webhooks, traduzindo eventos externos em eventos SCP e vice-versa.

## 5.3 Formato .aeth e manifest

Um app publicado na Magic Store é um arquivo `.aeth` — zip contendo:

```
app.aeth/
├── manifest.json          ← contrato declarativo
├── index.html             ← entry para iframe apps
├── bundle.js              ← bundle federado para native apps
├── icon.svg               ← ícone 512x512
├── screenshots/           ← para listagem na store
├── assets/                ← imagens, fontes, traduções
└── service-worker.js      ← opcional, para offline
```

Manifest schema completo (TypeScript):

```typescript
interface AppManifest {
  // Identidade
  id: string;                     // reverse-DNS: "br.aethereos.comercio-digital"
  name: string;
  description: string;
  version: string;                // semver
  developer: {
    name: string;
    url?: string;
    email: string;
    trademark_policy_url?: string;
  };
  icon: string;                   // path relativo no zip
  category: string;
  screenshots?: string[];
  
  // Tipo e entry
  type: "native" | "iframe" | "connector";
  entry: string;                  // "index.html" ou "bundle.js"
  
  // Permissões e eventos
  permissions: string[];          // ["read:orders", "write:drive", "call:ae_ai"]
  emits_events?: string[];        // ["integrations.trello.card.*"]
  consumes_events?: string[];     // ["comercio_digital.order.*"]
  
  // Visibilidade
  visibility: "public" | "vertical-exclusive" | "tenant-private" | "beta";
  compatible_verticals: string[]; // ["*"] universais, ou lista específica
  compatible_countries: string[]; // ["BR"] ou ["*"]
  minimum_plan: "free" | "pro" | "enterprise";
  
  // Pricing
  pricing?: {
    model: "free" | "freemium" | "subscription" | "one-time";
    price_brl?: number;
    revenue_share_percent?: number;  // Aethereos revenue share
  };
  
  // Específico para connector apps
  connector?: {
    external_system: string;        // "trello", "google-calendar"
    auth_method: "oauth2" | "apikey" | "mcp";
    oauth_config?: {
      authorization_url: string;
      token_url: string;
      scopes: string[];
    };
    webhooks?: {
      inbound_path: string;         // "/webhooks/{connector_id}/{tenant_id}"
    };
    mcp_server_url?: string;
  };
  
  // Integridade e autenticidade
  signature: {
    algorithm: "Ed25519";
    signer_public_key_fingerprint: string;  // hash SHA-256 da chave pública do assinante
    signature_value: string;                 // base64 da assinatura Ed25519 do manifest + bundle hash
  };
  bundle_hash: string;                       // SHA-256 do conteúdo completo do bundle
  published_at: string;
  published_by: string;                      // developer_id registrado
}
```

Manifest é validado por schema Zod no kernel antes de instalação. Assinatura Ed25519 é verificada contra chave pública registrada do desenvolvedor (ou chave oficial da Aethereos para first-party apps). Fail-closed — se manifest inválido ou assinatura não confere, app rejeitado.

### Por que Ed25519, não HMAC

[INV] HMAC (hash-based message authentication code) usa chave simétrica — o mesmo segredo que assina é o que verifica. Para distribuição de apps em ecossistema multi-desenvolvedor, isso é inadequado: ou todos compartilham o segredo (inviável para segurança), ou cada um tem seu próprio segredo mas o kernel precisa guardar todas as cópias (inviável operacionalmente).

Ed25519 (Edwards-curve Digital Signature Algorithm sobre Curve25519) usa par de chaves assimétricas:
- Desenvolvedor gera chave privada (guardada por ele) e chave pública (compartilhada com Aethereos no registro como developer).
- Assina manifest + bundle hash com chave privada.
- Kernel verifica com chave pública pré-registrada.
- Se chave privada vaza, desenvolvedor gera novo par e atualiza — apps antigos ainda válidos se assinados antes do vazamento.

Mesmo modelo usado por Apple App Store (code signing), Google Play Store (APK signing), Linux package managers (PGP signing). Padrão consolidado, sem inovação necessária.

## 5.4 Policy de visibilidade composta

A regra de visibilidade é expressão booleana composta, implementada como query SQL com filtros:

```sql
SELECT p.*, pv.version, pv.download_url
FROM packages p
JOIN package_versions pv ON pv.package_id = p.id AND pv.is_latest = true
WHERE 
  -- Publicação válida
  p.status = 'published'
  AND p.visibility IN ('public', 'vertical-exclusive')
  
  -- Compatibilidade de vertical
  AND (
    :vertical_id = ANY(p.compatible_verticals)
    OR '*' = ANY(p.compatible_verticals)
  )
  
  -- Compatibilidade de país
  AND (
    :tenant_country = ANY(p.compatible_countries)
    OR '*' = ANY(p.compatible_countries)
  )
  
  -- Compatibilidade de plano
  AND (
    p.minimum_plan = 'free'
    OR (p.minimum_plan = 'pro' AND :tenant_plan IN ('pro', 'enterprise'))
    OR (p.minimum_plan = 'enterprise' AND :tenant_plan = 'enterprise')
  )
  
  -- Exclusões específicas do tenant
  AND NOT EXISTS (
    SELECT 1 FROM tenant_package_exclusions tpe
    WHERE tpe.tenant_id = :tenant_id 
    AND tpe.package_id = p.id
  )
ORDER BY 
  CASE WHEN p.id = ANY(:vertical_featured_apps) THEN 0 ELSE 1 END,
  p.install_count DESC;
```

Essa é a policy engine de catálogo. Não é lógica de aplicação — é SQL, executado no banco com RLS ativo.

## 5.5 Revenue share e publicação

Apps third-party publicados na Magic Store seguem precedente consolidado de Apple App Store e Google Play:

- **Gratuitos**: publicação livre, zero revenue share.
- **Pagos / assinatura**: Aethereos retém 15% do primeiro ano de assinatura por cliente, 10% em anos seguintes. Compara-se favoravelmente ao 30/15% da Apple e ao 30/15% da Google.
- **Apps Enterprise com venda direta**: revenue share negociado caso a caso, tipicamente 5-10%.

Processo de publicação: desenvolvedor cria conta, assina Developer Agreement, submete `.aeth` via portal, passa por revisão (verificação de manifest, teste automatizado, revisão manual de conteúdo inapropriado), aprovação ou rejeição com feedback. Apps aprovados ficam listados após propagação no CDN.

First-party apps da família Aethereos são publicados diretamente pela equipe interna sem revisão externa, mas passam pelo mesmo pipeline técnico.

## 5.6 Marketplace de Templates de Governance-as-Code

Além de apps executáveis, a Magic Store hospeda uma segunda categoria de artefato distribuível: **templates de Governance-as-Code**. Políticas YAML validadas que empresas podem importar, parametrizar e ativar em minutos, em vez de escrever do zero.

Essa extensão emerge de observação prática: toda empresa nova do Aethereos começa com zero políticas e precisa escrever as primeiras. Depois de 12-24 meses de operação do ecossistema, haverá corpo acumulado de políticas refinadas por casos reais — "Policy conservadora para contas a pagar industrial", "Policy agressiva para cobrança B2B de inadimplência leve", "Policy LGPD-strict para dados de saúde sob TISS", "Policy de aprovação financeira para startups em fase Series A".

### Estrutura de um template

```yaml
template:
  id: "gov-template/ap-conservative-industrial-br"
  name: "Contas a Pagar Conservadora (Industrial BR)"
  category: "financial"
  author: "Aethereos Team"
  version: "1.2"
  rating: 4.7
  installations: 342
  
  description: |
    Política de contas a pagar otimizada para empresas industriais
    brasileiras. Limites conservadores, aprovação humana obrigatória
    acima de R$ 20.000. Validado em 342 empresas por 18 meses.
  
  applicable_to:
    verticals: ["b2b-ai-os-brazil"]
    industries: ["manufacturing", "industrial"]
    company_size: ["small", "medium"]
  
  parameters:
    - name: "auto_approval_limit_brl"
      type: "integer"
      default: 20000
      min: 1000
      max: 100000
      description: "Limite de aprovação automática em BRL"
    - name: "minimum_supplier_score"
      type: "float"
      default: 4.0
      min: 3.0
      max: 5.0
  
  policy_yaml: |
    policy:
      id: "ap-agent-policy"
      allow:
        - intent: "erp.accounts_payable.schedule_payment"
          when:
            amount: { max: "${auto_approval_limit_brl}" }
            supplier_score: { min: "${minimum_supplier_score}" }
      require_approval_if:
        amount: { above: "${auto_approval_limit_brl}" }
```

### Fluxo de uso

Empresa abre Configurações → Agentes → Políticas → "Browse Templates". Filtra por vertical e categoria. Instala template. Ajusta parâmetros via wizard (sliders e inputs). Sistema gera a policy YAML substituindo parâmetros. Empresa revisa (com help do Aether AI Copilot explicando cada regra). Ativa.

Templates publicados pela Aethereos oficial são gratuitos. Templates de terceiros (consultores, especialistas verticais) podem ser gratuitos ou pagos, mesmo modelo de revenue share dos apps.

### Por que é estratégico

Três razões:

**Reduz fricção de adoção da IA-native**. Empresa que não sabia como começar com agentes recebe "receita testada" e começa com configuração validada em outras empresas similares.

**Gera efeito de rede de conhecimento operacional**. Quanto mais empresas usam o Aethereos, mais templates emergem e se refinam. Cada template bem-classificado vira padrão de facto daquele domínio.

**Cria barreira contra imitadores**. Concorrente pode copiar arquitetura; não copia o corpus acumulado de políticas validadas em produção real.

---

# PARTE VI — VERTICAIS COMO MANIFESTO DE DISTRIBUIÇÃO

## 6.1 Vertical como dado, não código

Decisão arquitetural cravada definitivamente: uma vertical é linha na tabela `verticals` com JSON de configuração + registro de assets visuais em Supabase Storage. Não é package do monorepo, não é código, não é deploy separado.

## 6.2 Estrutura do manifesto de vertical

```typescript
interface VerticalManifest {
  id: string;                    // "b2b-ai-os-brazil", "imobiliario-os"
  name: string;
  slug: string;                  // para URLs: "b2b", "imobiliario"
  version: string;
  status: "active" | "beta" | "deprecated";
  
  // Branding
  branding: {
    display_name: string;        // "B2B AI OS Brazil"
    tagline: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;       // hex
    secondary_color: string;
    wallpaper_urls: string[];    // múltiplos para usuários escolherem
    meta_title: string;
    meta_description: string;
    domain?: string;             // "b2b.aethereos.com" se subdomínio próprio
  };
  
  // Apps pré-instalados
  bundled_apps: Array<{
    app_id: string;              // "aethereos.comercio-digital"
    version_constraint: string;  // "^1.0"
    pinned_in_dock: boolean;
    featured_in_mesa: boolean;
    default_config?: Record<string, any>;
  }>;
  
  // Filtro da storefront
  storefront_filter: {
    featured_categories: string[];
    featured_apps: string[];
    recommended_apps: string[];
    excluded_apps: string[];     // apps que não fazem sentido para essa vertical
  };
  
  // Onboarding específico
  onboarding: {
    identifier_type: "cnpj" | "cnes" | "oab" | "creci" | "cpf";
    enrichment_providers: string[];    // ["brasilapi", "receitaws"]
    required_fields: string[];
    optional_fields: string[];
    steps: OnboardingStep[];
  };
  
  // Políticas
  policies: {
    allow_sideload: boolean;
    require_2fa_for_roles: string[];
    compliance_frameworks: string[];   // ["LGPD", "NF-e", "NCM"]
    data_residency?: string;           // "BR"
    audit_retention_years: number;
  };
  
  // Localização
  language_default: string;      // "pt-BR"
  country: string;               // "BR"
  currency: string;              // "BRL"
  timezone_default: string;      // "America/Sao_Paulo"
  
  // Comercial
  available_plans: Plan[];
  trial_days: number;
  
  // Governança
  created_by: string;
  created_at: string;
  approved_by: string;           // staff Aethereos
  approval_date: string;
}
```

## 6.3 B2B AI OS Brazil como exemplo canônico de distribuição

Este documento fundacional **não compromete** a Aethereos Inc (ou qualquer outro construtor) a construir distribuições específicas. Para dar concretude ao padrão arquitetural, este documento usa a distribuição **B2B AI OS Brazil** — a primeira em construção pela Aethereos Inc — como exemplo canônico ilustrativo.

Reforço: B2B AI OS Brazil **não é parte do kernel**. É aplicação concreta dos frameworks do kernel para um contexto específico. Nada do que é descrito abaixo pertence ao Aethereos-plataforma; tudo pertence à distribuição.

### Manifesto conceitual de B2B AI OS Brazil

```typescript
{
  vertical_id: "aethereos-b2b-brazil",
  display_name: "B2B AI OS Brazil",
  
  branding: {
    primary_color: "#...",
    logo_url: "...",
    typography: { ... }
  },
  
  target_market: {
    description: "PMEs industriais e comerciais brasileiras",
    primary_identifier: {
      framework: "br-cnpj",  // ver Parte XXI.3 — framework de identificadores
      required: true
    },
    secondary_identifiers: ["br-cpf"],
    enrichment_providers: ["brasilapi", "receitaws"]
  },
  
  compliance_frameworks: [
    "lgpd",
    "nfe-nacional",      // NF-e padrão nacional
    "ncm",               // classificação fiscal
    "sefaz",             // integração estadual
    "reforma-tributaria" // adaptação à Reforma Tributária do Consumo
  ],
  
  financial_rails: [
    "pix",               // incluindo Pix Automático
    "boleto",
    "ted",
    "credit-card-br"     // via adquirentes brasileiros
  ],
  
  open_finance: {
    framework: "open-finance-brasil",
    capabilities: [
      "bank-reconciliation",
      "cashflow-forecast",
      "payment-initiation",
      "credit-inquiry"
    ]
  },
  
  bundled_apps: [
    // Apps específicos que a Aethereos Inc ou parceiros construam
    // para atender ao mercado brasileiro. Decisão comercial, não arquitetural.
  ],
  
  onboarding_flow: "br-cnpj-wizard",  // usando framework de onboarding do kernel
  
  hooks: {
    enrichOrderEvent: {
      package_id: "@aethereos-distro-br/industrial@1.0.0",
      export_name: "enrichWithNCMClassification"
    },
    validateFiscalDocument: {
      package_id: "@aethereos-distro-br/fiscal@1.0.0", 
      export_name: "validateNFe"
    }
    // hooks adicionais conforme necessidade
  }
}
```

### Como a distribuição consome frameworks do kernel

Observe que tudo específico do mercado brasileiro é **configuração** via frameworks pluggable do kernel:

- **CNPJ** é registrado no framework de identificadores (Parte XXI.3)
- **Pix, boleto, Pix Automático** são implementações do framework de rails financeiros (Parte XXI.1)
- **NCM, NF-e, Reforma Tributária** são implementações do framework fiscal (Parte XXI.2)
- **Open Finance Brasil** é implementação do framework de Open Banking/Finance
- **BrasilAPI, ReceitaWS** são provedores de enriquecimento pluggados no framework de identificadores

Nada no kernel conhece "CNPJ" ou "Pix". Kernel conhece as abstrações (`EntityIdentifier`, `FinancialRail`, `TaxRegime`). Distribuição brasileira plug as implementações específicas.

### Distribuições adicionais

Nada impede que outras distribuições sejam construídas pela Aethereos Inc, parceiros ou comunidade — para outros mercados geográficos, outros setores verticais, ou uso corporativo interno. Cada distribuição reutiliza 100% do kernel Aethereos e adiciona apenas o que é específico do seu contexto via manifesto JSON + hooks executáveis versionados (ver 6.6).

A decisão sobre quais distribuições construir, em que ordem e com que escopo comercial é **decisão de negócio** que pertence a documentação comercial separada. Este documento constitucional preocupa-se apenas com garantir que o kernel suporte múltiplas distribuições sem violar invariantes.

## 6.4 Storefront filtrada, não loja separada

Reforço do princípio: a "Magic Store da distribuição X" que o usuário vê é **visão filtrada** do catálogo universal único, não banco separado. Mesmos apps third-party podem aparecer em várias distribuições se assim declararem (`compatible_verticals: ["*"]`). Apps específicos da distribuição só aparecem onde fazem sentido.

No exemplo de B2B AI OS Brazil: apps genéricos (produtividade, project management, comunicação) aparecem com `compatible_verticals: ["*"]`. Apps específicos brasileiros (emissor NF-e especializado, conector SEFAZ estadual) declaram `compatible_verticals: ["aethereos-b2b-brazil"]` e só aparecem na visão dessa distribuição.

Isso reduz custo operacional, preserva governança central, permite lançar nova distribuição sem replicar infraestrutura de loja.

## 6.5 Compliance-as-Code por distribuição

Cada distribuição declara no manifesto os frameworks de compliance que governam aquela operação. O Core aplica validação automática antes de instalar apps e em runtime durante operação.

### Declaração no manifesto

```typescript
interface VerticalComplianceFrameworks {
  compliance_frameworks: Array<{
    id: string;                        // "lgpd", "nfe", "tiss", "cfm"
    name: string;
    enforcement_level: "advisory" | "required" | "invariant";
    validation_rules: string;          // URL para rulebook da Aethereos
    certifier?: string;                // org que audita (se aplicável)
  }>;
}
```

### Frameworks pré-validados pela Aethereos

| Framework | Vertical aplicável | O que valida |
|---|---|---|
| LGPD | Todas (obrigatório BR) | Consentimento, direitos do titular, retenção, minimização |
| NF-e + NCM | B2B AI OS Brazil | Emissão fiscal, classificação, SEFAZ integração |
| TISS + CFM | Clínica OS | Prontuário eletrônico, sigilo médico, troca de dados |
| ANS | Clínica OS (convênios) | Guias, autorizações, faturamento |
| OAB | Jurídico OS | Sigilo profissional, confidencialidade processos |
| CVM | Financ OS | Alocação, reporting, governance de fundos |
| LGPD-Saúde | Clínica OS | Extensão estrita de LGPD para dados sensíveis |
| PCI-DSS | Qualquer que processe cartão | Tokenização, isolamento, audit |

### Validação automática pré-install

Ao tentar instalar app na Magic Store, o Core avalia:

```
Para cada framework da vertical ativa:
  Para cada regra do framework:
    App passa na regra? 
      Sim → continua
      Não → bloqueia instalação, reporta violação
```

Exemplo: framework LGPD exige "consentimento explícito antes de processar dados pessoais". App que não declara essa capability no manifest é bloqueado. App que declara mas não implementa é detectado por teste automatizado.

### Validação em runtime

Durante operação, Policy Engine avalia ações contra frameworks ativos. Ação que viola framework é bloqueada + auditada. Exemplo: agente tenta exportar dados de paciente sem consentimento explícito → bloqueado por LGPD-Saúde.

### Vantagem estratégica

Certificação automatizada vs manual. ERPs tradicionais exigem auditoria manual cara para entrar em Saúde (TISS) ou Financeiro (CVM). Aethereos entrega compliance pré-validado no framework. Barreira de entrada para competidores, aceleração massiva de adoção em verticais reguladas.

Evolução: no Horizonte 3, parceria com órgãos certificadores (CFM, CVM, ANS) para que selo "Aethereos Compatible + Compliant" substitua auditoria manual em operações padrão. No Horizonte 4, Differential Privacy e ZKPs permitem compliance mais forte que o exigido pela regulação atual.

## 6.6 Hooks executáveis versionados — complemento ao manifesto JSON

[DEC] Manifesto JSON resolve aproximadamente 80% dos casos de customização em distribuições (branding, bundles, filtros, onboarding linear, políticas declarativas simples). Os 20% restantes em setores regulados ou com lógica verdadeiramente complexa exigem **hooks executáveis versionados** — funções TypeScript publicadas como packages e registradas no manifesto via referência versionada, que o kernel invoca em pontos específicos do ciclo de vida.

Reconhecimento honesto: admitir que JSON puro não basta para toda customização evita dois anti-padrões opostos. Sem hooks, ou a distribuição fica simplista demais (imprópria para setores regulados), ou lógica de distribuição vaza para o kernel (violando P1 — kernel invariante). Hooks com disciplina rigorosa resolvem ambos.

### Pontos de extensão oferecidos pelo kernel

```typescript
// Estrutura do manifesto expandida com hooks
interface VerticalManifest {
  // ... campos declarativos existentes ...
  
  hooks?: {
    // Enriquecimento customizado de eventos SCP específicos da distribuição
    // Invocado pelo Context Engine no pipeline assíncrono
    enrichEvent?: HookReference;
    
    // Validação de compliance pré-transação (ex: verificação fiscal)
    // Invocado pelo Policy Engine
    validateTransaction?: HookReference;
    
    // Computação de scores ou métricas específicas da vertical
    // Invocado por apps que consomem "supplier_score" ou equivalentes
    computeScore?: HookReference;
    
    // Transformação de inputs de onboarding (ex: consulta a órgão regulador)
    // Invocado pelo wizard de primeira inicialização
    enrichOnboarding?: HookReference;
    
    // Formatação específica de documentos (ex: NFe, guias médicas)
    // Invocado ao gerar documentos via apps
    formatDocument?: HookReference;
  };
}

interface HookReference {
  package_id: string;           // ex: "@some-distro/industrial-br@1.2.3"
  export_name: string;          // função exportada
  version_constraint: string;   // semver
  signature: string;            // Ed25519 da package + export
}
```

### Disciplina obrigatória sobre hooks

- **Versionamento semver rigoroso** — hooks são deployáveis independentemente, mas mudança major requer migration
- **Sandbox de execução** — hooks rodam em Web Workers isolados, sem acesso direto ao DOM ou Service Worker
- **Timeouts estritos** — hook que leva mais de N ms é abortado; fallback para Modo Degenerado (P14)
- **Testes obrigatórios** — hook é rejeitado no registry se não tiver testes unitários cobrindo seus casos
- **Observabilidade** — toda invocação de hook emite evento interno `platform.hook.invoked` com duração e outcome
- **Assinatura Ed25519** — hook não registrado com chave pública do autor é recusado

### Quando NÃO usar hooks

Se a customização pode ser expressa em JSON declarativo, expressa em JSON. Hooks são escape hatch, não ferramenta padrão. Uma distribuição que tem 50 hooks está fazendo algo errado — provavelmente deveria ser produto separado, não distribuição. Se uma distribuição tem mais hooks do que entradas declarativas no manifesto, revisão arquitetural é necessária.

### Fallback ao Modo Degenerado

Se hook falha ou timeout, distribuição continua funcional em modo degenerado: kernel aplica lógica básica equivalente, registra falha no audit trail, notifica mantenedor da distribuição. Sistema não quebra porque hook quebrou — honra do princípio P14.

---

# PARTE VII — AS TRÊS CATEGORIAS DE APPS

## 7.1 First-party SaaS apps

[DEC] Apps construídos pela Aethereos Inc (a empresa mantenedora) ou por parceiros estratégicos que têm vida comercial autônoma — domínio próprio, marca própria, mercado standalone, clientes que podem usar o produto sem conhecer o Aethereos — e que, quando um cliente também usa o Aethereos, rodam integrados como apps nativos via SCP.

Esta categoria de app não é parte do kernel. Qualquer empresa com recursos pode construir apps first-party do Aethereos seguindo o Aethereos Compatible Program. Este documento descreve o **padrão arquitetural**; produtos específicos construídos pela Aethereos Inc são tratados em documentação comercial separada.

### Padrão arquitetural de apps first-party

**Variante dupla de build** — mesma codebase, dois builds: `standalone` (app acessível em domínio próprio, shell próprio, auth própria) e `embed` (app acessível dentro do Aethereos como aba nativa, shell do Aethereos, auth delegada).

```
exemplo-produto/
├── packages/
│   ├── core/                 ← lógica de negócio, hooks, API client, componentes
│   ├── features/             ← módulos funcionais
│   └── design-system/        ← primitives visuais
├── apps/
│   ├── standalone/           ← build para www.exemplo-produto.com
│   │   ├── shell/            ← landing, auth UI, dashboard
│   │   └── index.tsx
│   └── embed/                ← build para execução no Aethereos
│       ├── manifest.json     ← .aeth manifest (ver Parte V.3)
│       └── index.tsx         ← sem shell, Aethereos provê
└── package.json
```

**SCP events sempre emitidos.** Variante standalone emite events para histórico próprio e analytics internos; variante embed emite para Event Store do tenant Aethereos. Cliente que usa standalone e depois adota Aethereos não perde histórico — events do passado ficam disponíveis para Aether AI Copilot fazer RAG.

**Backend compartilhado.** Mesmo banco de dados, mesmas tabelas (com schema separation conforme Parte X.5). O app não "migra" quando cliente adota Aethereos — já está no mesmo banco, apenas ganha interface integrada.

### SSO entre produtos first-party em domínios distintos

[INV] Quando múltiplos produtos first-party existem em domínios comerciais distintos (por exemplo, produto-A.com, produto-B.com, produto-C.com) e compartilham identidade do usuário, o mecanismo **não é cookies cross-domain** (que não funcionam para domínios distintos) mas sim **Identity Provider (IdP) central com OIDC/OAuth 2.1**.

Arquitetura correta:

```
┌──────────────────────────────────────────────┐
│   Aethereos Identity Provider (IdP central)  │
│   idp.aethereos.com                          │
│   OAuth 2.1 + OIDC + PKCE + MFA opcional     │
└──────────────────────────────────────────────┘
        ↑          ↑          ↑          ↑
        │          │          │          │
   produto-A   produto-B   produto-C   Aethereos OS
   .com         .com         .com      (app.aethereos.com)
```

Fluxo de SSO silencioso:

1. Usuário loga em `produto-a.com`. Auth redireciona para `idp.aethereos.com` via OAuth 2.1 com PKCE.
2. IdP autentica. Retorna ao `produto-a.com` com authorization code. Produto troca code por tokens (access + refresh + ID).
3. Sessão estabelecida em `produto-a.com` com cookie first-party de `produto-a.com` (não cross-domain).
4. Usuário acessa `produto-b.com`. Auth tenta SSO silencioso: redirect para `idp.aethereos.com` com `prompt=none`.
5. IdP verifica sessão ativa (cookie first-party em `idp.aethereos.com` de login anterior). Retorna novo authorization code para produto-b sem exigir credenciais.
6. Produto-b estabelece sessão sem fricção.

**Token exchange** (RFC 8693) para cenários onde produto-a precisa agir em nome do usuário em produto-b sem exigir re-autenticação.

[DEC] Implementação inicial: Supabase Auth como IdP central via OAuth 2.1 customizado; migração para Keycloak/Auth0/Ory quando requisitos enterprise (SAML, SCIM, custom claims) exigirem, via Driver Model (Parte IV.7).

### Modelo comercial

Três modalidades [HIP] sujeitas a validação de mercado:

- **Produto standalone** — cliente paga apenas pelo produto específico, menor fricção, porta de entrada
- **Aethereos Bundle Pro** — cliente paga por múltiplos produtos integrados + Aethereos OS, com desconto versus soma dos standalones, upsell natural
- **Aethereos Enterprise** — bundle + agentes customizados + compliance + SLA + consultoria

Preço, características exatas e progressão entre tiers são decisões comerciais documentadas separadamente. Arquitetonicamente, o kernel suporta qualquer modelo que os produtos e a Aethereos Inc escolherem.

### Implicação comercial profunda

Empresa entra pela porta de produto único standalone (menor fricção, menor custo) e cresce naturalmente para o Bundle. Cada produto individual é porta de entrada; o ecossistema é upsell. Esse é o playbook Google Workspace / Microsoft 365 exato — a Aethereos Inc e parceiros podem adotá-lo, mas o kernel não prescreve isso.

## 7.2 Third-party market apps

Apps construídos por desenvolvedores terceiros, existem apenas no formato `.aeth` dentro do Aethereos, distribuídos via Magic Store. Seguem o padrão Android tradicional: sem produto standalone, sem domínio próprio, vivem e respiram dentro do OS.

Podem ser gratuitos, freemium, pagos por assinatura ou one-time. Aethereos retém revenue share conforme Parte V.5. Publicação exige conta de desenvolvedor, acordo Developer Agreement, revisão automática e manual.

Exemplo hipotético: um dev cria "Kanban Simples" como app `.aeth`. Publica na Magic Store. Qualquer tenant compatível pode instalar. Roda em iframe sandboxed, emite eventos SCP próprios (`kanban_simples.card.moved`, `kanban_simples.board.created`), consome eventos de outros apps (opcional), monetiza via assinatura mensal com 15% de revenue share ao Aethereos.

## 7.3 Connector apps

Bridges bidirecionais para sistemas externos que não são Aethereos nem foram feitos para o Aethereos (Trello, Google Calendar, Salesforce, Slack, GitHub, Notion). Usam OAuth + API + webhooks (ou MCP quando disponível) para traduzir eventos entre o sistema externo e o SCP.

Detalhamento completo na Parte IX.

---

# PARTE VIII — SOFTWARE CONTEXT PROTOCOL (SCP)

## 8.1 Natureza: protocolo aberto

SCP é especificação aberta versionada semanticamente, publicável como RFC. Qualquer sistema pode implementar — emitir ou consumir eventos SCP — sem acoplamento ao Aethereos. O Aethereos é uma implementação de referência, não a única concebível.

Analogia exata: SMTP para email. Anyone pode implementar SMTP e operar servidor de email próprio. Mas Gmail é implementação de referência comercial da Google. SCP assume esse mesmo papel para eventos B2B contextualizados.

## 8.2 Anatomia completa do evento

```typescript
interface SCPEvent {
  // Versionamento
  scp_version: "1.0";
  
  // Identificação
  event_id: string;                      // UUID v7 (sortable por tempo)
  timestamp: string;                     // ISO 8601 UTC
  event_type: string;                    // "module.entity.action"
                                         // ex: "comercio_digital.order.created"
  
  // Origem
  source_module: string;                 // "comercio_digital"
  tenant_id: string;                     // UUID — RLS enforcement
  actor_id: string | null;               // user_id ou agent_id
  actor_type: "human" | "agent" | "system";
  
  // Carga
  payload: Record<string, any>;          // preenchido pelo emissor
  
  // Contexto (preenchido pela PLATAFORMA no trânsito)
  context: {
    historical_comparisons: Record<string, any>;  // histórico relevante
    related_events: string[];                     // event_ids relacionados
    external_signals: Record<string, any>;        // câmbio, commodities, etc
    derived_metrics: Record<string, number>;      // métricas calculadas
    semantic_embedding: number[];                 // vetor 1536-dim
  };
  
  // Roteamento
  routing: {
    target_modules: string[];            // quem consome
    priority: "low" | "normal" | "high" | "urgent";
    retention_days?: number;             // override de Context Decay
  };
  
  // Causalidade
  metadata: {
    correlation_id: string;              // ID para tracing cross-event
    causation_id?: string;               // event_id que causou este
    session_id?: string;                 // sessão do ator
    trace_id?: string;                   // OpenTelemetry trace
    source_ip?: string;
    user_agent?: string;
  };
  
  // Processamento
  processed: boolean;
  processed_at?: string;
  processed_by?: string[];
}
```

## 8.3 Quatro camadas do SCP — contrato formal

[INV] O SCP opera em **quatro camadas explicitamente separadas**, não em uma só. Esta seção estabelece o contrato formal que nenhuma implementação pode violar sem ferir a tese do projeto.

### Regra de ouro do SCP

> **Evento bruto é sagrado. Enriquecimento é assíncrono. Insight é derivado. Ação é opt-in e governada.**

Cada uma dessas quatro propriedades tem implicação técnica concreta descrita abaixo. Violação de qualquer uma transforma o SCP em barramento acoplado tradicional e desmonta as garantias de auditabilidade, evolutibilidade e governance.

### Invariante de blindagem — payload bruto como contrato mínimo

[INV] **Consumidores críticos do SCP não podem depender de enriquecimento assíncrono para funcionar.** Enriquecimento (camada 2) e insight (camada 3) são camadas de **melhoria**, não **dependências transacionais**.

Esse invariante é blindagem contra o modo de falha mais provável do SCP em produção: transformar-se em "monólito distribuído" acoplado via contexto. Sem disciplina explícita, a tentação natural é criar apps que só funcionam quando Context Engine está saudável, Policy Engine respondendo, insights materializados — e o sistema inteiro fica refém da saúde da camada 2 para operações básicas.

**Regras práticas decorrentes:**

- **Emissão não pode depender de enriquecimento.** App que cria pedido não espera context record para completar. Operação de negócio conclui com evento bruto persistido; enriquecimento vem depois sem bloquear.
- **Consumidores críticos operam com payload bruto + views canônicas.** App de contas a pagar que precisa exibir lista de títulos em aberto usa payload bruto + view canônica da tabela de referência, não aguarda insight derivado do Context Engine para renderizar.
- **Degradação graceful.** Context Engine indisponível por 4 horas não pode derrubar apps críticos. Apps detectam ausência de context records e operam em modo degenerado (P14) — menos inteligência, zero quebra.
- **Insight é opcional, não obrigatório.** UI pode mostrar dados com ou sem insight ao lado. Quando insight disponível, enriquece UX; quando ausente, dados básicos continuam completos e úteis.
- **Agentes críticos não dependem de camada 2 para decisões mínimas.** Agente que precisa atuar sobre payload bruto (ex: classificação simples por regras) opera sem esperar context record disponível.

**O que isso NÃO significa:** apps que fazem uso de camada 2 ou 3 são perfeitamente válidos. O invariante apenas exige que a dependência seja **graceful**: se camada 2 indisponível, app degrada mas não quebra.

**Enforcement mecânico via review de arquitetura.** Todo PR que introduz dependência transacional de context record ou insight é recusado em CI com check estático — "dependência de camada 2/3 sem fallback para payload bruto". Apps third-party que violam o invariante em Magic Store são rejeitados em certificação.

Esse invariante é a diferença entre SCP como protocolo saudável e SCP como camada de acoplamento universal disfarçada.

### Camada 1 — Domain Event Bruto (sagrado)

Fato imutável emitido pelo app quando algo acontece no domínio. Contém apenas o que o emissor sabe no momento da emissão: `pedido foi criado`, `nota fiscal foi aprovada`, `pagamento foi agendado`. Schema mínimo, validação canônica, persistência append-only em `scp_events_raw`.

**Invariantes da camada 1:**
- [INV] Imutável após persistência. Nenhuma operação jamais altera evento bruto.
- [INV] Schema canônico valida antes de aceitar; fail-closed se inválido.
- [INV] Não contém enriquecimento — apenas fatos diretos do emissor.
- [INV] Latência objetivo: < 50ms do `emit()` ao `acknowledge`.
- [INV] Persistência é pré-requisito para confirmação ao emissor; sem append, sem ack.

### Camada 2 — Derived Context Record (assíncrono)

Registro derivado, calculado assincronamente pelo Context Engine (kernel ou especializado em domínio, ver 8.8) a partir do evento bruto. Contém histórico comparativo, external signals (câmbio, commodities, dados de mercado), métricas derivadas (variação percentual, z-score), relacionamentos identificados, embedding semântico, quantificação explícita de incerteza (ver 8.9).

**Invariantes da camada 2:**
- [INV] Calculado assincronamente; emissor nunca espera enriquecimento.
- [INV] Versionado — um evento bruto pode ter múltiplos context records ao longo do tempo conforme nova informação emerge ou algoritmos melhoram.
- [INV] Persiste em `scp_context_records` com `raw_event_id` apontando para camada 1 e `version` incrementável.
- [INV] Nenhum context record substitui a camada 1; são camadas separadas.
- [DEC] Latência aceitável: segundos a minutos após emit, sem bloquear emissor.

### Camada 3 — Actionable Insight (derivado)

Saída processada pronta para consumo imediato por UI, agente ou notificação. Exemplos: "Este pedido está 4,6% abaixo do histórico — atenção recomendada", "Agente sugere aprovar conforme política X com 87% de confiança", "Três fornecedores similares aumentaram preço 6% na última semana — revisar tabela?".

**Invariantes da camada 3:**
- [INV] Derivado de context records + embeddings + aplicação de política; não de eventos brutos.
- [INV] Contém incerteza explícita (confiança, intervalo, discordância entre fontes).
- [INV] Persiste em `scp_insights` com TTL curto (horas a dias) — não é histórico permanente.
- [INV] Cada insight referencia os `context_record_id`s que o geraram, permitindo auditoria.
- [INV] Insight jamais executa ação autonomamente. Insight é proposição, não comando.

### Camada 4 — Governed Action (opt-in e governada)

[INV] **Ação é camada separada, não consequência automática de insight.** Esta é a distinção mais importante do contrato do SCP v4.2, tornada explícita.

Quando um insight sugere uma ação (humano ou agente decide executá-la), essa ação não é consequência direta do insight — é decisão separada, passada pelo Policy Engine, com audit trail próprio. O caminho completo é: insight → decisão → intent → política avaliada → allow/deny → execução governada → audit trail dual.

**Invariantes da camada 4:**
- [INV] Toda ação passa por Policy Engine antes de executar. Sem exceção.
- [INV] Action Intent estruturado declara: o que, por quem (`actor_type`, `on_behalf_of_id`), sob qual política, com qual autonomia.
- [INV] Audit trail dual registra: quem propôs (agente ou humano), quem aprovou (se necessário), qual política avaliou, qual foi o resultado, referência ao insight origem.
- [INV] Classe de risco da feature (A/B/C, ver 11.16) determina quais mecanismos de governança são obrigatórios.
- [INV] Ações de classe A (alto risco) exigem aprovação humana adicional mesmo que política permita.
- [INV] Ação persiste em `scp_governed_actions` com referência ao insight origem, política avaliada, decisão final e outcome.

### Fluxo completo canônico

```
1. App emissor chama scpClient.emit({ event_type, payload })
   ↓
2. Kernel valida schema canônico do event_type (Zod) — fail-closed se inválido
   ↓
3. Evento bruto persistido em scp_events_raw (append-only) — CAMADA 1
   ↓
4. Emissor recebe { event_id, accepted_at } sincronamente (< 50ms)
   ↓
5. Evento bruto publicado em tópico scp.raw.<event_type> via RealtimeDriver
   │
   ├─→ Subscribers síncronos recebem evento bruto imediatamente
   │   (apps que reagem direto, fazem contextualização própria)
   │
   └─→ Context Engine Worker consome em background (job queue)
       ↓
       6. Worker enriquece: histórico, external signals, métricas, embedding, incerteza
       ↓
       7. Context Record persistido em scp_context_records com version — CAMADA 2
       ↓
       8. Evento enriquecido publicado em tópico scp.context.<event_type>
           │
           └─→ Subscribers de contexto recebem enriquecido
               ↓
               9. Aether AI Copilot e agentes geram insights quando necessário
               ↓
               10. Insight persistido em scp_insights com TTL — CAMADA 3
               ↓
               11. UI/notificação apresenta insight ao humano ou agente
                   │
                   └─→ Humano ou agente DECIDE executar ação
                       ↓
                       12. Action Intent estruturado é criado
                       ↓
                       13. Policy Engine avalia intent contra políticas ativas
                       ↓
                       14. Classe de risco determina mecanismos obrigatórios
                       ↓
                       15. Se classe A, aprovação humana adicional requerida
                       ↓
                       16. Execução da ação (via app apropriado)
                       ↓
                       17. Governed Action persiste em scp_governed_actions — CAMADA 4
                       ↓
                       18. Audit trail dual registra toda a cadeia
```

### Por que quatro, não três

Versões anteriores descreviam três camadas. A prática mostra que sem camada 4 explicitada, times tendem a tratar ação como consequência automática de insight — gera ações disparadas direto do pipeline de enriquecimento, sem passagem por Policy Engine, sem audit apropriado. Sob pressão de entrega, é o caminho natural de menor resistência.

Explicitar a quarta camada formaliza que **ação é decisão separada que exige mecanismos próprios de governança**. Remove ambiguidade. Torna violação visível na revisão de código. É a mesma lógica que CQRS aplica entre comando e query: separar por natureza facilita operação.

### Benefícios arquiteturais do desacoplamento

**Emissor nunca bloqueia.** Operação de negócio (criar pedido, aprovar fatura) completa em dezenas de milissegundos, não espera enriquecimento pesado.

**Context Engine escala independentemente.** Worker scalar horizontal; não afeta emitters nem subscribers síncronos.

**Reprocessamento idempotente.** Se Context Engine crashar, reprocessa o backlog — evento bruto intacto. Context records são versionados; podem ser recalculados quando algoritmo melhora.

**Auditoria preservada em camadas.** O que o emissor disse (C1) nunca é modificado. O que a plataforma inferiu (C2) é versionado. O que o copilot sugeriu (C3) é efêmero. O que foi executado (C4) tem audit trail completo com referência a C3, C2, C1.

**Schema drift isolado.** Mudança em enriquecimento não afeta eventos brutos. Mudança em insight não afeta context records. Mudança em política não afeta insights anteriores. Camadas evoluem independentemente.

**Governança mecânica.** Ação sem passar por Policy Engine é impossível mecanicamente; não existe caminho código para executar sem criar Action Intent e passar por avaliação. Enforcement em nível de arquitetura, não de disciplina.

## 8.4 Context Decay

Relevância decai exponencialmente com o tempo. Meia-vida por tipo de sinal:

| Tipo de sinal | Meia-vida | Justificativa |
|---|---|---|
| Preço de mercado | 23 dias | Commodities voláteis |
| Score de fornecedor | 138 dias | Muda lentamente com muitas interações |
| Alerta de anomalia | 7 dias | Alta urgência, perde valor rápido |
| Padrão de compra | 90 dias | Sazonalidade relevante |
| Cláusula contratual | ∞ | Mantém força enquanto vigente |
| Relacionamento cliente-fornecedor | 365 dias | Histórico de ano inteiro |

Queries do Event Store retornam dados com peso por relevância temporal. Aether AI Copilot aplica Context Decay automaticamente ao fazer RAG — eventos antigos ainda aparecem mas com pontuação menor.

## 8.5 Event Store

Tabela `scp_events` particionada por mês (partition por `created_at`), append-only, com índices em `tenant_id`, `event_type`, `actor_id`, `correlation_id`, `causation_id`. Embeddings em coluna `semantic_embedding vector(1536)` com índice IVFFlat para busca aproximada.

Retenção por default 24 meses; configurável por evento via `retention_days`. Eventos com retenção expirada movem para arquivo frio (R2) antes de deletar. Auditoria de operações críticas tem retenção 10 anos (tabela separada `audit_logs`).

## 8.6 Company Graph — a empresa como grafo vivo

[DEC] O SCP alimenta naturalmente uma segunda estrutura de dados além do Event Store: um **grafo vivo da empresa**, onde nós são entidades de negócio e arestas são relações contextualizadas e versionadas. Esse grafo é derivação gratuita dos eventos e desbloqueia capabilities que tabelas relacionais não expressam bem.

### Estrutura conceitual

```
Nós (entidades):
  company, business_unit, person, agent, customer, supplier,
  product, category, contract, order, shipment, invoice,
  receivable, payable, asset, risk, policy, document

Arestas (relações com tempo e contexto):
  aprova, depende_de, fornece_para, substitui, é_dono_de,
  está_atrasado_em, tem_risco_com, subcontrata, integra,
  é_responsável_por, bloqueia, desbloqueia, autoriza
```

Cada aresta carrega metadata: `since`, `until`, `strength` (0-1), `source_event_ids` (rastreabilidade), `confidence` (derivado vs declarado).

### Como é construído

Projeção SQL materializada a partir do Event Store + declarações explícitas:

- Evento `comercio_digital.order.created` cria/atualiza arestas `customer → order`, `supplier → order`, `product → order`
- Evento `rh.employee.promoted` cria aresta `employee --responsible_for--> department`
- Cadastro manual pelo usuário cria arestas explícitas (`person --reports_to--> person`)

Materialização via views Postgres refrescadas incrementalmente, ou via banco de grafos específico (Neo4j, Memgraph) como implementação de `GraphDriver` conforme escala exigir.

### Capabilities habilitadas

**Mapa operacional da empresa.** Visualização da rede de relações como tela navegável. Clicar em "Fornecedor X" mostra: contratos ativos, pedidos em aberto, histórico de atrasos, score, dependentes downstream.

**Impact analysis.** Query: "se esse fornecedor parar, quais pedidos, clientes e contratos são afetados?" vira traversal de grafo, não investigação manual. Relevante para gestão de risco e continuidade operacional.

**Memória organizacional consultável.** Aether AI Copilot consulta grafo para responder perguntas estruturais ("quem aprovou essa política?", "que fornecedores atendem a classe NCM X?", "que riscos sabidos envolvem o cliente Y?").

**Propagação de alertas.** Quando um nó do grafo muda estado (fornecedor com pagamentos atrasados), todos os nós conectados por arestas relevantes são notificados com contexto.

### Por que é consequência natural do SCP

Competidores que tentam adicionar "grafo da empresa" a sistemas ERP tradicionais precisam instrumentar observabilidade do zero — tabelas mutáveis perderam causalidade. SCP append-only com enrichment já registra toda mudança relacional com contexto. Grafo é projeção, não infraestrutura adicional cara.

## 8.7 Process Radar — mineração de processos nativa

[DEC] Consequência similar: como todos os eventos de operação passam pelo SCP, descobrir automaticamente como processos reais acontecem (vs. como foram desenhados) é capability emergente. Celonis construiu empresa bilionária fazendo exatamente isso sobre logs de ERPs caros de instrumentar. No Aethereos é nativo porque a instrumentação já existe por design.

### O que Process Radar descobre

- **Como os processos realmente acontecem.** A partir de eventos SCP, reconstrói fluxos reais: "pedido é criado → espera média 3h → aprovação financeira → espera 8h → envio para logística → etc."
- **Onde estão os gargalos.** Etapas com maior tempo de espera, handoffs com maior incidência de erro, aprovações com maior taxa de rejeição.
- **Retrabalho e loops.** Eventos que voltam para estados anteriores (pedido editado após aprovação, fatura emitida e cancelada, etc.).
- **Desvios vs processo desenhado.** Se a empresa tem processo documentado "A → B → C", Process Radar identifica quando na prática acontece "A → B → D → B → C" e quantifica.
- **Variabilidade por vertical/região/equipe.** Comparação entre unidades de negócio ou filiais.

### Interface

App nativo do kernel (ou subseção do Dashboard) que renderiza processos como grafos direcionados com métricas anotadas em cada aresta. Filtros por período, por tipo de evento, por entidade. Recomendações automáticas do Aether AI Copilot sobre onde automatizar ou revisar.

### Por que é valor imediato

Para empresa que adota o Aethereos, Process Radar gera ROI na primeira semana: mostra, com dados reais (não entrevistas), onde estão as perdas operacionais. Esse é o tipo de insight que hoje exige consultoria de R$ 100-500k; no Aethereos vira relatório automático.

## 8.8 Mesh federado de Context Engines

[DEC] O Context Engine descrito na seção 8.3 não é componente monolítico centralizado. É **mesh federado** onde cada domínio pode ter seu Context Engine local especializado, com insights derivados publicados via SCP para outros consumirem.

### Por que federação, não centralização

Um Context Engine único centralizado vira gargalo quando:

- Múltiplos apps com domínios especializados profundos existem (app logístico entende contexto logístico, app financeiro entende contexto financeiro, app fiscal entende contexto fiscal)
- Volume de eventos cresce e processamento central trava
- Latência de enriquecimento degrada para consumidores que precisam de resposta rápida
- Lógica de enriquecimento de domínios diferentes se acumula em uma única base de código difícil de manter

### Arquitetura federada

```
                  ┌──────────────────────────────┐
                  │   Kernel Context Engine      │
                  │   (enriquecimento genérico:  │
                  │    semantic embedding,       │
                  │    temporal comparisons,     │
                  │    entity relationships)     │
                  └──────────────┬───────────────┘
                                 │
                                 │ eventos SCP brutos
                                 ↓
        ┌────────────────────────┼────────────────────────┐
        ↓                        ↓                        ↓
┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
│ Context Engine   │   │ Context Engine   │    │ Context Engine   │
│ Logístico        │   │ Financeiro       │    │ Fiscal           │
│ (do app X)       │   │ (do app Y)       │    │ (do app Z)       │
│                  │   │                  │    │                  │
│ Enriquece com:   │   │ Enriquece com:   │    │ Enriquece com:   │
│ - rotas típicas  │   │ - fluxo de caixa │    │ - alíquotas NCM  │
│ - incidents      │   │ - sazonalidade   │    │ - validações UF  │
│ - performance    │   │ - DRE projetado  │    │ - mudanças lei   │
│   transportadora │   │                  │    │                  │
└────────┬─────────┘   └────────┬─────────┘    └────────┬─────────┘
         │                      │                       │
         └──────────────────────┴───────────────────────┘
                                ↓
                     Context Records publicados
                     de volta ao mesh SCP
                     (outros consumidores recebem)
```

### Responsabilidades por camada

**Kernel Context Engine** — enriquecimento genérico independente de domínio (embedding semântico, comparações temporais universais, descoberta de relacionamentos entre entidades).

**Context Engine de domínio** — enriquecimento especializado do vocabulário e regras daquele domínio. Implementado por app que possui o domínio. Publica Context Records de volta ao SCP com prefixo `context.<domain>.*` para que outros apps consumam insights já processados pelo especialista.

### Benefícios

**Escalabilidade horizontal.** Cada Context Engine de domínio escala independentemente conforme volume do seu domínio.

**Expertise localizada.** Código de enriquecimento logístico vive no app logístico; código fiscal no app fiscal. Manutenção fica próxima a quem entende.

**Extensibilidade.** Quando novo app com domínio especializado é instalado, ele registra seu Context Engine no mesh. Outros apps começam automaticamente a receber insights do novo domínio via SCP.

**Modo degenerado.** Se Context Engine de domínio falha ou não existe, kernel aplica enriquecimento genérico. Sistema funciona sem enriquecimento especializado, apenas com menos inteligência.

### Disciplina de publicação

Context Engine de domínio X não publica arbitrariamente. Publica apenas:

- Context Records com prefixo de evento `context.<domain>.*` (namespace próprio)
- Insights sobre eventos emitidos pelo próprio domínio ou eventos que foram explicitamente inscritos para enriquecimento cross-domain
- Campos declarados em contrato público consumível via SDK

## 8.9 Quantificação de incerteza como saída padrão

[INV] Todo insight derivado pelo Context Engine (kernel ou de domínio) é acompanhado de **quantificação explícita de incerteza**. Saída pura sem incerteza é violação.

### Padrões de incerteza

Dependendo do tipo de insight, incerteza aparece em forma apropriada:

**Intervalos de confiança** para previsões numéricas:
```json
{
  "demand_forecast_30d": {
    "value": 1200,
    "confidence_interval_90": [900, 1500],
    "method": "ARIMA on last 12 months",
    "data_points": 12
  }
}
```

**Confiança explícita** para classificações e scores:
```json
{
  "supplier_score": {
    "value": 4.2,
    "confidence": "low",
    "reason": "only 3 interactions in base; default score until 10+ interactions",
    "stability": 0.3
  }
}
```

**Discordância entre fontes** quando múltiplos sinais divergem:
```json
{
  "anomaly_detected": {
    "value": true,
    "confidence": 0.65,
    "sources": {
      "statistical": { "detects": true, "confidence": 0.8 },
      "pattern_matching": { "detects": false, "confidence": 0.4 }
    },
    "recommendation": "investigate, but not urgent"
  }
}
```

### Por que é invariante

Decisão cega (baseada em número sem incerteza) é decisão frágil. "Fornecedor score 4.2" com 3 interações é qualitativamente diferente de "Fornecedor score 4.2" com 500 interações — mesmo número, confiabilidade radicalmente diferente.

Com incerteza explicitada, humanos e agentes tomam decisões robustas — prefere-se ação que é boa mesmo no pior cenário plausível, não apenas no valor esperado. Aether AI Copilot pode comunicar naturalmente: "com os dados disponíveis, estimo 4.2, mas tenho pouca confiança por ter apenas 3 interações — recomendo esperar mais dados antes de decisões grandes".

### Custo de implementação

Pequeno quando feito desde o início. Proibitivo quando tentado depois — exige re-arquitetura de toda lógica de enriquecimento. Esta é razão para marcar como [INV] desde v4.1.

## 8.10 SCP Core Profile — semântica de evento normatizada

[INV] O SCP não é apenas arquitetura de camadas — é contrato semântico que define **como eventos se comportam**. Sem normatização explícita desses comportamentos, o SCP permanece poderoso conceitualmente mas frágil operacionalmente. Esta seção estabelece o Core Profile: conjunto mínimo de decisões semânticas que toda implementação do SCP deve respeitar.

### 8.10.1 Taxonomia oficial de `event_type`

[INV] Event types seguem convenção hierárquica com três níveis mínimos:

```
<domain>.<entity>.<action>
```

Exemplos canônicos:

```
erp.order.created
erp.order.confirmed
erp.order.cancelled
erp.invoice.issued
erp.payment.scheduled
erp.payment.confirmed

logistics.shipment.dispatched
logistics.shipment.delivered
logistics.shipment.returned

crm.opportunity.created
crm.opportunity.won
crm.opportunity.lost

hr.employee.onboarded
hr.employee.offboarded
hr.timeoff.requested

platform.user.created
platform.tenant.provisioned
platform.staff.tenant_accessed

agent.decision.made
agent.circuit_breaker.triggered
agent.autonomy.elevated

context.erp.supplier_score_updated
context.logistics.delay_detected

integration.totvs.purchase_order_imported
integration.sap.invoice_posted

financial.pix.authorized
financial.pix.initiated
financial.pix.confirmed

fiscal.nfe.issued
fiscal.nfe.rejected
```

**Regras da taxonomia:**

- [INV] Três níveis mínimos: `domain`, `entity`, `action`. Quatro níveis permitidos quando necessário (`domain.entity.subentity.action`).
- [INV] Nomes em lowercase, separados por ponto.
- [INV] Action no particípio passado para eventos de fato (something **has happened**): `created`, `issued`, `confirmed`, `rejected`. Não no imperativo.
- [INV] Domain reservados pelo kernel: `platform.*`, `agent.*`, `context.*`. Apps não podem emitir events nesses domínios.
- [INV] Domain `integration.*` é reservado para eventos traduzidos de sistemas externos via connector apps (Parte IX).
- [INV] Domain `financial.*` e `fiscal.*` são consumidos pelos frameworks pluggable (Parte XXI.1 e XXI.2) — cada distribuição registra eventos específicos dentro desses domínios.

### 8.10.2 Versionamento de schemas

[INV] Cada `event_type` tem schema Zod registrado no Event Schema Registry. Schemas são versionados via campo `scp_version` no envelope + `schema_version` no payload.

**Regras de versionamento:**

- **Minor version (2.1 → 2.2)** — adiciona campos opcionais ao payload, ou torna campos previamente obrigatórios em opcionais. Consumidores existentes continuam funcionando sem alteração.
- **Major version (2.x → 3.0)** — breaking change: remove campos, renomeia campos, torna opcional em obrigatório, muda tipo. Consumidores antigos precisam migrar.
- **Depreciação** — major version antiga é marcada como deprecated por período mínimo de 6 meses antes de ser removida do Registry. Emissores recebem warning quando emitem em versão deprecated.

**Compatibilidade:**

- Emissor sempre emite na versão mais nova do schema do `event_type`.
- Context Engine e consumidores especializados podem aceitar múltiplas versões simultaneamente via migration functions registradas no Registry.
- [DEC] Event Store mantém eventos em sua versão original, sem migração retroativa. Leitura histórica consome versão em que foi escrito.

### 8.10.3 Idempotência por default

[INV] Todo handler de evento (Context Engine, subscriber, agent) **deve ser idempotente** — processar o mesmo evento duas vezes produz o mesmo resultado que processar uma vez.

**Mecanismos:**

- `event_id` é UUID v7 (sortable por tempo, globalmente único). Handlers registram eventos processados em `scp_processed_events` por `(subscriber_id, event_id)`.
- Re-entrega após crash é norma, não exceção. Kafka, Pulsar, Temporal, Supabase Realtime — todos podem re-entregar. Handler não-idempotente vira bug garantido.
- [DEC] Threshold padrão: handler pode ver o mesmo `event_id` até 3 vezes em operação normal (reentrega por timeout, rebalance, crash recovery). Após 3 ocorrências, evento entra em poison queue (ver 8.10.5).

### 8.10.4 Ordenação seletiva

[INV] SCP **não garante ordenação global** de eventos. Garantir ordenação global é caro (requer single partition ou consenso distribuído) e raramente necessário.

SCP garante ordenação **dentro de escopos declarados**:

- **Por entidade** — eventos com mesmo `scope_entity_id` (ex: `order_id`, `invoice_id`) são processados na ordem de emissão. Suficiente para maioria dos casos.
- **Por actor** — eventos do mesmo `actor_id` (humano ou agente) são ordenados. Útil para audit trails coerentes.
- **Por tenant** — eventos dentro do mesmo `tenant_id` podem ser ordenados se scope declarar, via partitioning por `tenant_id`.

Ordenação global (entre diferentes tenants, diferentes entidades) não é garantida e não deve ser assumida.

**Implementação:**

- Mensageria particiona por `scope_entity_id || actor_id || tenant_id` conforme declarado no tipo de evento.
- Schemas de event_type declaram escopo de ordenação no Registry. Ausência de declaração = sem garantia de ordenação.

### 8.10.5 Replay, deduplicação e poison events

[INV] Três cenários operacionais que o SCP trata explicitamente:

**Replay.** Context Engine precisa reprocessar eventos passados (algoritmo melhorou, bug corrigido). Mecanismo: Worker consulta `scp_events_raw` por janela temporal, re-emite para Context Engine pipeline. Context Records versionados acomodam reprocessamento sem conflito (novo version, velho version preservado).

**Deduplicação.** Emissor pode emitir mesmo evento duas vezes por erro de retry. Kernel deduplica por `(event_type, scope_entity_id, idempotency_key)` quando emissor provê `idempotency_key`. Sem chave, kernel aceita como evento distinto — responsabilidade do emissor.

**Poison events.** Evento que falha consistentemente em handler específico. Mecanismo:

- Handler tenta processar com backoff exponencial (1s, 5s, 30s, 5min).
- Após N tentativas (padrão 5), evento vai para `scp_poison_events` com erro registrado.
- Alerta automático para owner do handler.
- Evento pode ser reprocessado manualmente após diagnóstico ou descartado via operação administrativa com audit trail.

Sem esse tratamento formal, poison events travam pipelines silenciosamente e causam backlog crescente que só é descoberto tarde.

### 8.10.6 Event Sourcing vs Event Streaming — distinção semântica

[INV] SCP distingue duas naturezas de evento que têm semântica diferente:

**Event Sourcing (domínio interno).** Eventos representam mudanças de estado em entidades do domínio. `erp.order.created`, `erp.order.confirmed`, `erp.order.cancelled` são fatos imutáveis cuja sequência descreve a vida de um pedido. Event sourcing permite reconstruir estado em qualquer momento (Time Travel, 12.8).

**Event Streaming (integração externa).** Eventos traduzidos de sistemas externos via connector apps (Parte IX). `integration.totvs.purchase_order_imported` é dado importado; não representa fato primeiro do domínio Aethereos, representa reflexo de fato em sistema externo.

**Implicações:**

- Event sourcing eventos são **fonte de verdade** do domínio Aethereos. Agregados são reconstruídos a partir deles.
- Event streaming eventos são **reflexos derivados**. Agregados canônicos ficam no sistema externo; Aethereos tem projeção.
- Distinção aparece no campo `event_nature` do envelope: `"sourcing"` ou `"streaming"`.
- Context Engine pode enriquecer ambos, mas com cuidado diferente — streaming events podem ficar inconsistentes com o sistema externo se a ponte falha; sourcing events são autoritativos por definição.

### 8.10.7 Envelope canônico consolidado

O envelope de evento SCP, consolidando os elementos das seções anteriores:

```typescript
interface SCPEvent {
  scp_version: string;           // "4.2"
  event_id: string;              // UUID v7
  event_type: string;            // "erp.order.created"
  schema_version: string;        // "2.1"
  event_nature: "sourcing" | "streaming";
  
  timestamp: string;             // ISO 8601 do fato ocorrido
  emitted_at: string;            // ISO 8601 da emissão
  
  tenant_id: string;             // escopo de isolamento
  
  actor: {
    actor_type: "human" | "agent" | "system";
    actor_id: string;
    on_behalf_of_id?: string;    // humano a quem agente está delegado
  };
  
  scope: {
    entity_id?: string;          // para ordenação por entidade
    correlation_id?: string;     // agrupa cadeia de eventos relacionados
    causation_id?: string;       // aponta ao evento que causou este
  };
  
  idempotency_key?: string;      // para deduplicação emissor-provida
  
  payload: Record<string, unknown>;  // schema específico do event_type
  
  signature?: {                  // P11: auto-certificação (Ed25519)
    algorithm: "ed25519";
    signer_id: string;
    value: string;
    chain_prev_hash?: string;    // hash chain para categorias críticas
  };
}
```

### Por que essa formalização importa

SCP sem Core Profile é barramento de mensagens poderoso mas operacionalmente frágil. Implementações concorrentes divergem; schemas viram inconsistentes; handlers não-idempotentes causam duplicação; eventos ficam parados em filas por falta de política de poison; versionamento vira caos.

Com Core Profile normatizado, o SCP passa a ser protocolo no sentido estrito: contrato consumível por múltiplas implementações, testável por conformance suite, extensível sem quebra. É diferença entre "nosso barramento de eventos" e "protocolo aberto que outras empresas podem implementar e interoperar".

Alinhado com P10 (protocolos abertos, plataformas proprietárias): Core Profile é o que torna SCP um **protocolo** de fato, não apenas uma biblioteca.

---

# PARTE IX — CONNECTOR APPS E INTEGRAÇÃO EXTERNA

## 9.1 O problema resolvido

Um usuário do Aethereos usa Trello, Gmail, Salesforce, Slack, GitHub — sistemas externos que não "falam SCP". A tentação ingênua é abrir esses sistemas em iframes, mas duas barreiras tornam isso insuficiente:

**Same-Origin Policy** do navegador impede que o código do Aethereos leia o DOM do iframe externo, intercepte cliques do usuário, extraia dados visuais em tempo real. Essa restrição é garantia de segurança nativa da web e inviolável.

**X-Frame-Options** e **Content-Security-Policy** de muitos SaaS modernos bloqueiam embedding em iframe de origens diferentes. Trello, Gmail, muitos outros retornam tela branca se você tentar embutir.

A solução correta é o **connector app** como tipo de primeira classe no Aethereos.

## 9.2 Mecanismo de ponte bidirecional

Um connector é app do Aethereos que atua como tradutor entre sistema externo e SCP. Capacidades extras que apps comuns não têm:

- Endpoint de webhook inbound registrado no kernel (`/webhooks/{connector_id}/{tenant_id}`)
- Cofre de credenciais OAuth criptografadas por tenant (isolamento provido pelo kernel)
- Fila de jobs para chamadas API externas com retry exponencial e rate limiting
- Permissão especial para emitir eventos SCP com prefixo `integrations.*`
- Manifest declara `external_system`, `auth_method`, `oauth_config`, `webhooks`, `mcp_server_url`

**Sentido externo → Aethereos:**
1. Usuário autoriza connector via OAuth do sistema externo
2. Connector registra webhook na API do sistema externo
3. Evento externo (card movido no Trello) → POST para `/webhooks/trello/{tenant_id}`
4. Connector traduz em evento SCP com `event_type: "integrations.trello.card.moved"`
5. Context Engine enriquece normalmente
6. Outros apps consomem como eventos nativos

**Sentido Aethereos → externo:**
1. Connector inscreve-se em eventos SCP relevantes
2. Quando `comercio_digital.order.created` ocorre, connector recebe
3. Faz chamada REST para API do sistema externo (cria card no Trello)
4. Emite evento de confirmação (`integrations.trello.card.created`)

**Para os outros apps do Aethereos, eventos do connector são indistinguíveis de eventos nativos.** SCP não diferencia. Para o Kwix, um card movido no Trello gera mesmo tipo de consumo que um pedido criado no Comércio Digital. É o "nativo" prometido pela arquitetura.

## 9.3 Três modalidades de visualização

**Modo iframe puro** — sistema externo permite embedding (Google Calendar, YouTube, Jitsi). Aethereos renderiza iframe com chrome do OS ao redor. Dados fluem via connector em paralelo.

**Modo UI nativa** — sistema externo bloqueia iframe (Trello, Gmail). Connector tem UI custom construída com a API oficial no estilo do Aethereos. Mais trabalho, melhor UX.

**Modo híbrido** — popup/janela separada do browser, com barra de status do Aethereos sincronizando via connector.

A modalidade é declarada no manifest e pode ser configurável pelo usuário.

## 9.4 MCP como padrão emergente

Em vez de escrever connector artesanal para cada SaaS, o Aethereos converge para **Model Context Protocol** da Anthropic (lançado em 2024, consolidado em 2025-2026).

Dupla via:

**Aethereos expõe seu próprio servidor MCP** — agentes externos (Claude Code, Claude Desktop, qualquer cliente MCP-compatível) podem operar sistemas Aethereos como ferramentas.

**Aethereos inclui MCP Client App genérico** — consome qualquer servidor MCP. Usuário adiciona URL + OAuth, sistema externo fica integrado sem código novo. Trello MCP, Notion MCP, Linear MCP — todos se conectam instantaneamente.

Essa convergência alinha-se perfeitamente com a tese AI-native: o mesmo protocolo que agentes usam para operar serve para integrações de dados. O futuro é MCP-first; connectors ad-hoc permanecem como fallback para sistemas que ainda não expõem MCP.

## 9.5 Limites honestos

**Same-Origin Policy é inviolável.** Integração é via API/webhook, não via observação do iframe.

**Sistemas sem API pública não funcionam**, exceto via agentes de IA operando a UI (Claude Computer Use) — lento, caro, frágil.

**Latência não é zero.** Loop `card-movido → evento-SCP → outro-app-atualizado` tipicamente 500ms-3s. Aceitável quase sempre, requer UX otimista quando crítico.

## 9.6 Aethereos como servidor MCP (inversão da ponte)

A v3 original descreveu Aethereos consumindo MCPs externos. A direção oposta é igualmente estratégica: **Aethereos expõe seus próprios servidores MCP oficiais** que agentes externos consomem.

### O que isso significa

Qualquer cliente compatível com Model Context Protocol (Claude Desktop, Claude Code, ChatGPT Desktop quando expuser suporte MCP, agentes customizados via SDK Anthropic) pode conectar-se ao Aethereos e operar seus sistemas nativamente como ferramentas.

Fluxo de uso concreto: usuário abre Claude Desktop. Adiciona servidor MCP do Aethereos (`https://mcp.aethereos.com/<tenant_id>`). Autoriza via OAuth. A partir daí, faz perguntas em linguagem natural tipo "quais pedidos do Comércio Digital fecharam acima de R$ 50k esta semana?" — Claude Desktop usa ferramentas MCP do Aethereos para consultar, retorna resposta com citação dos eventos-fonte.

### Catálogo de MCP servers oficiais

Aethereos expõe múltiplos servidores MCP com escopos específicos:

| Servidor MCP | Escopo | Auth |
|---|---|---|
| `mcp.aethereos.com/read-only` | Queries, leitura de eventos, RAG | OAuth tenant + scope `read` |
| `mcp.aethereos.com/comercio-digital` | Operações no Comércio Digital | OAuth tenant + permissões específicas |
| `mcp.aethereos.com/kwix` | Operações financeiras no Kwix | OAuth tenant + permissões + policy |
| `mcp.aethereos.com/drive` | Operações em arquivos (leitura/escrita) | OAuth tenant + file scope |
| `mcp.aethereos.com/agents` | Gerenciar agentes e políticas | OAuth tenant + admin scope |

Cada servidor expõe ferramentas tipadas (Tools Description) que clientes MCP descobrem e invocam. Chamadas passam pelo Policy Engine normal: agente externo invocando `erp.accounts_payable.schedule_payment` passa pelos mesmos guardrails de agente interno.

### Por que é estratégico

**Interoperabilidade de primeira classe**. Em vez de Aethereos construir integrações para cada cliente de IA, clientes de IA integram Aethereos uma vez e trabalha com qualquer tenant. Efeito de rede externo.

**Curto-circuito para ecossistema Anthropic**. Claude Desktop / Claude Code já estão embarcando MCP como padrão. Expor MCP cedo garante menção e adoção natural no ecossistema.

**Futuros agentes third-party trivial**. Quando desenvolvedores quiserem construir "agentes para Aethereos", fazem via MCP padrão, não via SDK proprietário. Redução massiva de fricção de desenvolvimento.

**Complementaridade com connector apps**. Connectors trazem sistemas externos para dentro do Aethereos via SCP. MCP servers mandam capability do Aethereos para ferramentas externas. Dupla via total.

### Governança idêntica

Ferramentas MCP expostas passam pelos mesmos mecanismos de governança de agentes internos:
- Policy Engine avalia cada chamada antes de executar
- Action Intents registrados com `actor_type: 'agent'` + `agent_type: 'external_mcp'`
- Audit trail dual captura origem externa
- Rate limiting por OAuth application
- Permissões granulares por servidor + tool

Nenhuma atalho porque vem de fora. Um agente Claude Desktop tentando executar Intent sem aprovação vai cair na mesma fila de aprovação humana que um agente interno.

## 9.7 SCP Bridge — integração on-premise com sistemas legados

[DEC] Realismo comercial: empresas com SAP, Totvs, Sankhya, Protheus ou sistemas proprietários internos não vão substituí-los no dia em que adotam o Aethereos. Vão querer integração gradual, não ruptura. O **SCP Bridge** é o mecanismo que torna isso viável.

### O que é

Serviço leve (container Docker ou binário self-contained) que roda na infraestrutura do cliente e atua como ponte entre o sistema legado e o Aethereos Cloud. Lê mudanças no banco do ERP via Change Data Capture (CDC) ou APIs disponíveis, traduz em eventos SCP, e emite para o Aethereos através de túnel seguro.

```
┌──────────────────── Cliente on-premise ────────────────────┐
│                                                            │
│   ┌─────────────────┐       ┌──────────────────┐          │
│   │  SAP / Totvs /  │──CDC─→│   SCP Bridge     │          │
│   │  Sankhya etc.   │       │   (Docker)       │          │
│   └─────────────────┘       └────────┬─────────┘          │
│                                      │                     │
└──────────────────────────────────────┼─────────────────────┘
                                       │ TLS + OAuth
                                       ↓
┌──────────────────── Aethereos Cloud ───────────────────────┐
│                                                            │
│   ┌────────────────────────────────────────────┐           │
│   │   SCP Ingestion Endpoint (tenant-scoped)   │           │
│   └────────────────────┬───────────────────────┘           │
│                        │                                   │
│   ┌────────────────────▼───────────────────────┐           │
│   │   Event Store + Context Engine + apps     │           │
│   └────────────────────────────────────────────┘           │
└────────────────────────────────────────────────────────────┘
```

### Mapeamentos de primeira classe

Aethereos distribui mapeamentos pré-construídos para os sistemas mais comuns no mercado BR:

- `SCP-Bridge-Totvs-Protheus` — leitura de tabelas chave (SE1, SE2, SA1, SA2), CDC via triggers
- `SCP-Bridge-SAP-B1` — Service Layer + DI API
- `SCP-Bridge-Sankhya` — APIs públicas
- `SCP-Bridge-Generic-Postgres` — qualquer Postgres com schema mapeável
- `SCP-Bridge-Generic-Excel` — polling de planilhas em pasta compartilhada (para empresas muito simples)

Cada mapping traduz eventos do sistema origem em `event_type` canônicos SCP. Por exemplo: inserção na tabela SE1 do Protheus → `integrations.protheus.accounts_receivable.created` → Context Engine enriquece → disponível para apps Aethereos consumirem como `financial.receivable.created`.

### Benefícios arquiteturais

**Adoção gradual.** Empresa continua operando seu ERP atual. Aethereos começa consumindo os dados existentes, adicionando valor via Aether AI Copilot, Process Radar, Business Observability. Substituição de módulos por apps Aethereos pode acontecer app-a-app, sem big-bang.

**Sem migração de dados inicial.** Bridge funciona sobre o que já existe. Histórico do ERP permanece no ERP; futuro pode ou não migrar para schema Aethereos.

**Segurança preservada.** Bridge roda on-premise; dados sensíveis não saem do ambiente do cliente sem policy explícita. Envio ao Aethereos Cloud é opt-in por tipo de evento, com filtros de PII no bridge.

**Ponte bidirecional opcional.** Na configuração avançada, bridge também consome eventos SCP do Aethereos e escreve de volta no ERP (ex: agente do Aether AI Copilot sugere agendamento de pagamento → aprovação humana → bridge escreve no ERP como se fosse input manual). Mantém ERP legado como fonte de verdade enquanto Aethereos é camada de inteligência.

### Por que destrava o mercado

Sem o SCP Bridge, a venda do Aethereos é "substitua seu ERP atual por nós" — barreira altíssima. Com o SCP Bridge, a venda é "mantenha seu ERP, ganhe camada de inteligência em cima" — barreira mínima. Depois que o cliente está dentro e percebendo valor, migração opcional vira consequência natural, não pré-requisito.

Essa estratégia é exatamente o que tornou o Salesforce adjacente ao ERP possível: durante anos, ele não substituía SAP — complementava. Até virar referência.

---

# PARTE X — MULTI-TENANCY COMO INVARIANTE

## 10.1 Postgres RLS como invariante

Todas as tabelas com dados de tenant têm coluna `company_id NOT NULL` e RLS policy ativa. Isolamento é garantido pelo Postgres, não pela aplicação. Bug na query não vaza dados — a política do banco intercepta.

Template de política RLS:

```sql
CREATE POLICY tenant_isolation ON <table_name>
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

Aplicação seta `app.current_company_id` no início de cada request via middleware. Qualquer query sem contexto ativo retorna zero rows — fail-closed.

## 10.2 Usuários multi-empresa

Um `user_id` pode pertencer a múltiplas `companies` via tabela `company_users`. Em cada sessão opera como ator de uma `active_company`. Switch explícito via UI da Top Bar.

```sql
CREATE TABLE company_users (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE (user_id, company_id)
);
```

Permissões são resolvidas contra `(user_id, active_company_id)`. Roles padrão do kernel: `owner`, `admin`, `manager`, `member`, `viewer`. Verticais podem estender com permissões granulares, nunca criar roles novos.

## 10.3 Multi-tenant e multi-vertical são ortogonais

Duas dimensões independentes:

**Multi-tenant** = isolamento **por empresa** via RLS. Mecanismo invariante.

**Multi-vertical** = separação **por produto** via campo `vertical_id` na company. Uma empresa pertence a exatamente uma vertical.

Uma instalação pode ter múltiplas verticais (deploy único servindo B2B + Imobiliário + Incubadora) ou uma só (deploy dedicado). A arquitetura suporta ambos.

## 10.4 Staff Aethereos

Staff da empresa desenvolvedora (suporte, comercial, engenharia, finance) tem papéis separados em tabela `staff_roles`, ortogonais aos roles de empresa. Staff pode, com autorização explícita e auditada, acessar dados de empresas clientes para suporte técnico.

Todo acesso staff gera evento SCP `platform.staff.tenant_accessed` com justificativa obrigatória e notificação ao owner da empresa. Meta-auditoria presente.

## 10.5 Schema separation e contratos de dados formalizados

[INV] Dentro do mesmo Postgres, cada app first-party e apps third-party maduros têm schema Postgres próprio, não misturam tabelas no schema público. O kernel fica em schema `core`; cada app tem seu schema próprio. RLS policies cruzam schemas apenas quando absolutamente necessário e via contratos explícitos.

Essa decisão operacionaliza P13 (soberania de domínio) no nível do banco. A formalização dos contratos de dados (abaixo) é a operacionalização completa desse princípio — separando explicitamente implementação privada de interface pública consumível.

### 10.5.1 Isolamento operacional

**Migrações independentes.** Time de um app pode aplicar migration na sua schema sem tocar em nada de outro app. Risco localizado, rollback localizado, testes localizados.

**Deploy independente.** App pode ir para produção sem esperar janela de deploy compartilhada. Kernel continua invariante; apps evoluem em cadência própria.

**Permissões granulares.** Roles Postgres por schema (ex: `app_kwix` com GRANT apenas em `kwix.*`). Vazamento de credencial de um app não compromete dados de outros.

**Backup seletivo.** Backup/restore por schema. Útil para migração de tenant para outro cluster ou recovery pontual.

### 10.5.2 Contratos de dados formalizados

[INV] Apps **nunca** fazem JOIN direto em tabelas de outros apps. Toda comunicação entre apps acontece via:

1. **SCP events** (preferencial para fluxo de negócio)
2. **Views canônicas publicadas** (para consultas de estado)
3. **APIs explícitas via Client SDK** (para interações síncronas)

Cada app expõe um conjunto de **views canônicas públicas** como seu contrato de dados. Outros apps (e agentes, e o Aether AI Copilot) consomem **apenas essas views**, nunca as tabelas internas. Tabelas internas podem mudar sem breaking change para consumidores; views públicas só mudam com disciplina de versionamento.

**Convenção de nomenclatura:**

```sql
-- Schema do app (exemplo genérico para app de ERP)
CREATE SCHEMA erp_accounting;

-- Tabelas internas (PRIVADAS — não consumidas por outros apps)
CREATE TABLE erp_accounting._internal_payable_drafts (...);
CREATE TABLE erp_accounting._internal_reconciliation_state (...);
CREATE TABLE erp_accounting.accounts_payable (...);
CREATE TABLE erp_accounting.accounts_receivable (...);

-- Views canônicas PÚBLICAS (consumíveis por outros apps)
CREATE VIEW erp_accounting.v1_accounts_payable AS
SELECT 
  id,
  tenant_id,
  supplier_id,
  amount_cents,
  currency,
  due_date,
  status,              -- 'open' | 'scheduled' | 'paid' | 'cancelled'
  created_at,
  updated_at
FROM erp_accounting.accounts_payable
WHERE status != 'draft';  -- drafts não são consumo público

CREATE VIEW erp_accounting.v1_accounts_receivable AS
SELECT 
  id,
  tenant_id,
  customer_id,
  amount_cents,
  currency,
  due_date,
  status,
  aging_days,          -- campo derivado seguro de expor
  created_at,
  updated_at
FROM erp_accounting.accounts_receivable;

-- RLS da view respeita RLS das tabelas-base
GRANT SELECT ON erp_accounting.v1_accounts_payable TO app_reader_role;
GRANT SELECT ON erp_accounting.v1_accounts_receivable TO app_reader_role;
```

### 10.5.3 Versionamento de views canônicas

[INV] Views canônicas são versionadas no nome: `v1_`, `v2_`, `v3_`. Breaking change cria nova versão; versão antiga permanece até deprecação formal.

**Regras:**

- **Nova coluna opcional** (não referenciada em queries existentes por posição) → pode ser adicionada à versão atual.
- **Remover coluna** → cria `v2_`, mantém `v1_` funcionando.
- **Renomear coluna** → cria `v2_`, mantém `v1_`.
- **Mudar semântica de coluna existente** (ex: `amount` agora em cents em vez de em reais) → cria `v2_`, mantém `v1_`.

**Deprecação:**

- Versão antiga marcada como deprecated via comment SQL no início do período.
- Consumidores recebem warning quando executam query em view deprecated (via trigger de SELECT que registra uso).
- Período mínimo de 6 meses antes de view deprecated ser removida.
- Catalog central lista todas as views publicadas com versão, status, consumidores registrados.

### 10.5.4 Registro de contrato

Cada view canônica tem **contrato documentado** em markdown versionado junto ao schema do app:

```markdown
# erp_accounting.v1_accounts_payable

**Versão:** 1.0
**Status:** active
**Última alteração:** 2026-03-15
**Mantenedor:** Time ERP

## Descrição

Expõe contas a pagar do módulo de contabilidade para consumo por
outros apps, agentes e Aether AI Copilot. Drafts não são expostos.

## Colunas

| Coluna | Tipo | Descrição | Estabilidade |
|---|---|---|---|
| id | uuid | Identificador único da conta | estável |
| tenant_id | uuid | Tenant owner | estável |
| supplier_id | uuid | Fornecedor (join com core.suppliers) | estável |
| amount_cents | bigint | Valor em centavos da moeda | estável |
| currency | varchar(3) | Código ISO 4217 | estável |
| due_date | date | Data de vencimento | estável |
| status | varchar(20) | 'open' \| 'scheduled' \| 'paid' \| 'cancelled' | estável |
| created_at | timestamptz | Criação | estável |
| updated_at | timestamptz | Última atualização | estável |

## Consumidores registrados

- Aether AI Copilot (RAG)
- Dashboard (Mesa widget "Contas a pagar esta semana")
- Agente de reconciliação
- Context Engine do domínio financeiro

## Mudanças planejadas

Nenhuma.

## Histórico de versões

- v1.0 (2026-03-15): versão inicial
```

### 10.5.5 Consumo no código

[DEC] Apps consomem via queries tipadas no Aethereos Client SDK:

```typescript
import { scpClient } from '@aethereos/client';

// Consumo de view canônica tipada
const payables = await scpClient.query
  .from('erp_accounting.v1_accounts_payable')
  .where({ status: 'open', due_date: { lte: thirtyDaysFromNow } })
  .orderBy('due_date');

// Types são auto-gerados a partir do schema SQL + contrato markdown
```

Consumo direto de tabelas internas (fora das views canônicas) é **bloqueado por permissões Postgres** — role do consumidor não tem GRANT. Enforcement mecânico, não baseado em disciplina.

### 10.5.6 Quando misturar schemas é aceitável

- Tabelas do kernel (`companies`, `profiles`, `audit_logs`) ficam em `core` e são consultáveis por todos os apps via views canônicas controladas.
- Apps podem compartilhar schema se forem parte de um mesmo produto composto (caso raro de sub-apps firmemente acoplados).
- Apps iframe third-party simples (widget de produtividade) não justificam schema próprio — usam `app_store_apps` schema compartilhado com prefixo em nome de tabela.

### 10.5.7 Gatilho de adoção

Na escala inicial do Aethereos (poucos apps, poucos clientes), tudo-no-public funciona. Mas o custo de separar schemas desde o início é pequeno comparado ao custo de separar depois (migração complexa com downtime). Recomendação: separar schemas e estabelecer contratos de views desde o Bloco 3 do MVP (quando múltiplos apps com domínios distintos entram como bundles separados).

### Por que essa formalização importa

Sem contratos de dados formalizados, "schema separation" vira apenas convenção de nomenclatura. Apps começam fazendo queries em tabelas de outros apps "só para esta pesquisa específica"; acoplamento implícito cresce; refatoração de um app quebra outros silenciosamente; migration fica impossível.

Com contratos formalizados, dependências são **explícitas e auditáveis**. Time do app X sabe exatamente quem consome qual view, pode mudar implementação interna com segurança, negocia breaking changes com consumidores registrados. Isso é diferença entre microsserviços maduros e "distributed monolith disfarçado".

## 10.6 Identity Provider central (IdP) para SSO cross-domain

[INV] Quando apps first-party vivem em domínios distintos e compartilham identidade (cenário descrito na seção 7.1), o mecanismo **não é cookies cross-domain** — que tecnicamente não funcionam para domínios distintos. O mecanismo é um Identity Provider central operando OAuth 2.1 + OIDC + PKCE.

### Arquitetura

```
                 ┌──────────────────────────────────────────┐
                 │  Aethereos Identity Provider (IdP)       │
                 │  idp.aethereos.com                       │
                 │                                          │
                 │  Features:                               │
                 │  - OAuth 2.1 + OIDC + PKCE               │
                 │  - MFA opcional (TOTP, WebAuthn)         │
                 │  - Passkey support (FIDO2)               │
                 │  - Magic link fallback                   │
                 │  - SAML (enterprise tier)                │
                 │  - SCIM (provisioning)                   │
                 │  - RFC 8693 Token Exchange               │
                 │  - RFC 9207 Authorization Server         │
                 │    Issuer Identification                 │
                 └─────────────┬────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ↓                    ↓                    ↓
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │ App-A.com     │   │ App-B.com     │   │ aethereos.com │
   │ (first-party) │   │ (first-party) │   │ (OS integrad.)│
   └───────────────┘   └───────────────┘   └───────────────┘
```

### Fluxo de autenticação inicial

1. Usuário acessa `app-a.com`, clica em "Login"
2. Redirect para `idp.aethereos.com/authorize` com parâmetros OAuth 2.1 + code_challenge (PKCE)
3. IdP apresenta tela de login (ou reconhece sessão anterior via cookie first-party em `idp.aethereos.com`)
4. Após autenticação (credenciais, passkey, MFA), IdP redireciona de volta para `app-a.com/callback` com `authorization_code`
5. `app-a.com` troca code + code_verifier por tokens (access_token + refresh_token + id_token) no endpoint `idp.aethereos.com/token`
6. Sessão em `app-a.com` estabelecida via cookie first-party de `app-a.com` (HttpOnly, Secure, SameSite=Lax)
7. Tokens guardam claims: user_id, tenant_id(s), roles, expiration

### Fluxo de SSO silencioso

Usuário autenticado em `app-a.com` acessa `app-b.com`:

1. `app-b.com` detecta ausência de sessão local, redireciona para `idp.aethereos.com/authorize?prompt=none`
2. IdP verifica cookie first-party em `idp.aethereos.com` (sessão do login em `app-a.com` estabeleceu esse cookie)
3. Se sessão ativa: IdP retorna authorization_code imediatamente sem tela de login
4. `app-b.com` troca code por tokens, estabelece sessão local
5. Usuário entra em `app-b.com` sem interação adicional

Se sessão não ativa ou expirada, usuário é apresentado à tela de login normal.

### Token Exchange para ações cross-app

Cenário: agente rodando em `app-a.com` precisa fazer chamada API para `app-b.com` em nome do usuário.

1. `app-a.com` chama `idp.aethereos.com/token` com grant_type=`urn:ietf:params:oauth:grant-type:token-exchange` (RFC 8693)
2. Subject token: access token do usuário em `app-a.com`
3. Audience: `app-b.com`
4. IdP valida, emite novo access token com audience apropriado e escopo reduzido para a ação
5. `app-a.com` usa esse token na chamada a `app-b.com`

### Implementação incremental

[DEC] Fase 1 (MVP): Supabase Auth como IdP central via OAuth 2.1 customizado, domínio `idp.aethereos.com`. Serve para primeiros 100-1000 clientes sem problemas.

[HIP] Fase 2 (enterprise): quando cliente enterprise exigir SAML, SCIM, custom claims complexos ou compliance específico (FedRAMP, por exemplo), migração para Keycloak self-hosted ou Auth0 via Driver Model (Parte IV.7). Nenhum código do kernel muda — apenas a implementação de `AuthDriver`.

### Por que cookies cross-domain não funcionam

Cookies são ligados estritamente ao domínio que os emitiu. Cookie emitido por `aethereos.com` não é lido por `kwix.com` nem `produto-a.com`. "Cookies de domínio compartilhado `.aethereos.com`" só funcionam entre subdomínios do mesmo domínio principal (`app.aethereos.com`, `api.aethereos.com`) — não entre domínios distintos.

Esta correção é técnica e necessária. Versões anteriores do documento, em descrição de apps first-party com domínios distintos, mencionavam "cookies de domínio compartilhado" como mecanismo de SSO — era erro técnico que seria caro descobrir durante implementação real. Correção aqui, antes de codificação, evita retrabalho.

---

# PARTE XI — AI-NATIVE E GOVERNANCE-AS-CODE

Este é o coração conceitual do projeto. A Parte mais importante do documento.

## 11.1 Níveis 0-5 de autonomia — e o freio agêntico do ano 1

Escala análoga à direção autônoma, explicitando progressão:

| Nível | Descrição | Exemplo |
|---|---|---|
| 0 | Sem IA | Sistema puramente humano |
| 1 | IA sugere, humano executa | "Sugiro aprovar este pedido" → humano clica aprovar |
| 2 | IA executa simples dentro de limites | Classificação automática de emails via regras |
| 3 | IA executa complexo, humano intervém se pedido | Reconcilia 90% das faturas; pergunta nos 10% dúbios |
| 4 | IA autônoma em domínios definidos | Gestão completa de contas a receber rotineiras |
| 5 | Autonomia total | Hipotético 2030+ |

Arquitetura sustenta progressão gradual sem refatoração estrutural. Nível é configurável por (tenant, agente, domínio) via Governance-as-Code.

### [INV] Freio agêntico obrigatório no primeiro ano comercial

Independente da sofisticação arquitetural, **qualquer distribuição comercial do Aethereos opera no primeiro ano em modo restrito**:

- Agentes de IA operam exclusivamente em **níveis 0 e 1** (sem IA, ou sugere-e-humano-executa)
- Nenhum agente tem permissão de escrita em banco, emissão de documentos fiscais, transações financeiras, alterações trabalhistas, ou qualquer operação irreversível
- Modo padrão é **read-only + suggestion-first + human approval**
- Shadow Mode (11.8) pode coletar dados de comportamento que agentes *teriam* tomado, mas não aplica essas ações
- Circuit Breaker (11.13) permanece ativo como segurança adicional, mas não como justificativa para autonomia maior

Esse freio é regulatório, reputacional e operacional. Regulatório porque AI Act europeia está em aplicação progressiva e exigirá evidência de governança antes de autonomia. Reputacional porque primeira notícia negativa sobre "agente da IA fez X sem pedir" destrói anos de construção de confiança. Operacional porque primeiro ano de qualquer sistema produtivo revela edge cases imprevistos — deixar agentes autônomos durante esse período é negligência gerencial.

A arquitetura está pronta para autonomia maior. **O lançamento comercial não está**. A distinção é importante e deve ser respeitada por quaisquer distribuições construídas sobre o Aethereos.

A partir do segundo ano, com evidência de qualidade do Trust Center (11.15), políticas bem-testadas no Policy Studio (11.14), e Shadow Mode tendo demonstrado acurácia > 95% por período prolongado, tenants podem, por decisão explícita do owner, elevar autonomia de agentes específicos para nível 2 ou superior em domínios específicos. Nunca autonomia ampla; sempre escopo declarado.

## 11.2 Aether AI Copilot em três fases

Evolução planejada do copiloto nativo:

**Fase 1 — Claude API + RAG sobre SCP (2026-2027).** Wrapper que chama Claude via API Anthropic, injeta contexto do tenant (anonimizado), executa RAG sobre Event Store com pgvector, retorna resposta com citação clicável dos eventos-fonte. Custo: R$ 500 a R$ 2.000/mês por cliente conforme uso. Nível de autonomia: 1-2.

**Fase 2 — SLM fine-tuned local (2027-2028).** Modelo de 7-13 bilhões de parâmetros (Phi-3, Llama-3 ou equivalente) fine-tuned em dados B2B industrial brasileiro. Hospedado em infraestrutura Aethereos. Vantagens: dados não saem do ambiente, latência menor, custo fixo previsível, especialização em domínio (NCM, tributação BR, rotas logísticas). Nível de autonomia: 2-3.

**Fase 3 — Modelo proprietário (2028+).** Treinado no ecossistema Aethereos acumulado. Diferenciador competitivo estrutural. Nível de autonomia: 3-4 em domínios maduros.

## 11.3 Agentes como cidadãos de primeira classe

Agentes têm identidade autenticada no sistema com as mesmas garantias de um humano, e capacidades restringidas por política.

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,                        -- "aether-copilot", "custom"
  supervising_user_id UUID REFERENCES profiles(id),
  allowed_tools TEXT[],                      -- ["scp.emit", "drive.read", "ae_ai.call"]
  allowed_event_prefixes TEXT[],             -- ["comercio_digital.*", "kwix.*"]
  autonomy_level SMALLINT DEFAULT 1,         -- 0-5
  status TEXT DEFAULT 'active',              -- 'active', 'paused', 'revoked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

Agentes autenticam via JWT com claims específicos: `actor_type: 'agent'`, `agent_id`, `supervising_user_id`, `policy_ids: []`. Todo evento emitido por agente tem `actor_type: 'agent'` + `metadata.agent_session_id` preenchido.

## 11.4 Action Intents como vocabulário estruturado

Agentes declaram intenção antes de executar via **Action Intents** — vocabulário estruturado de ações nomeadas com schema.

Exemplo concreto:

```typescript
// Definição do Intent (declarativo)
{
  id: "erp.accounts_payable.schedule_payment",
  description: "Agenda pagamento de conta a pagar",
  parameters: {
    account_payable_id: { type: "uuid", required: true },
    scheduled_date: { type: "date", required: true },
    payment_method: { type: "enum", values: ["ted", "boleto", "pix"] }
  },
  effects: ["financial_transaction", "state_change"],
  reversibility: {
    window_minutes: 60,
    inverse_intent: "erp.accounts_payable.cancel_schedule"
  }
}

// Uso pelo agente (runtime)
agent.declareIntent({
  intent_id: "erp.accounts_payable.schedule_payment",
  parameters: {
    account_payable_id: "abc-123",
    scheduled_date: "2026-05-15",
    payment_method: "pix"
  },
  reasoning: "Fatura de R$ 3.200 do fornecedor X, vencimento em 20/05, aprovado para pagamento conforme política Y"
});

// Policy Engine avalia → allow | deny | require_human_approval
// Se allow: executa, emite evento SCP com causation_id = intent_id
// Se require_human_approval: insere em fila, agente aguarda
```

Biblioteca de Intents cresce incrementalmente. Começa pequena (Horizonte 2) com Intents críticos, cresce em cobertura ao longo dos Horizontes 3-4. Meta de longo prazo: todo fluxo operacional importante tem Intent correspondente.

Vantagens:
- **Discoverability via MCP** — agente consulta catálogo de Intents e entende exatamente o que pode fazer
- **Governança granular** — políticas referenciam Intents pelo nome
- **Auditoria estruturada** — evento SCP emitido registra Intent executado
- **Evolução controlada** — novos Intents adicionados; Intents existentes depreciados sem quebra

## 11.5 Governance-as-Code

Políticas codificadas como documentos declarativos legíveis por máquina e por humano, versionadas, auditadas. Policy Engine avalia ações contra políticas em runtime.

Schema de política (YAML):

```yaml
policy:
  id: "ap-agent-default-policy"
  version: "1.0"
  company_id: "empresa_xyz"
  applies_to:
    actor_type: agent
    agent_ids: ["aether-copilot-default"]
  
  allow:
    - intent: "erp.accounts_payable.schedule_payment"
      when:
        amount: { max: 50000 }                  # até R$ 50.000
        scheduled_date: { min: "T+1", max: "T+30" }
        supplier_score: { min: 4.0 }
        hour_of_day: { min: "09:00", max: "18:00" }
      
      require_approval_if:
        amount: { above: 20000 }
        supplier_score: { below: 4.5 }
  
  deny:
    - intent: "hr.employee.terminate"           # invariante
    - intent: "erp.chart_of_accounts.modify"    # invariante
  
  audit:
    retention_days: 365
    review_frequency: "monthly"
    notify_on_execution: ["owner@empresa.com"]
```

Fluxo de execução:

1. Agente declara Intent
2. Policy Engine consulta políticas aplicáveis (tenant, agente, Intent)
3. Engine avalia condições (`when`, `allow`, `deny`, `require_approval_if`)
4. Resultado: `allow` / `deny` / `require_human_approval`
5. Se `require_human_approval`: notificação enviada, ação pendente aguarda
6. Humano aprova ou nega; resultado aplicado; agente notificado

**Sugestão assistida por IA:** Aether AI Copilot pode analisar estatísticas de execução e sugerir ajustes. "Nos últimos 3 meses, 87% dos pagamentos entre R$ 20k-50k foram aprovados sem modificação. Sugiro aumentar limite de aprovação automática para R$ 35k". Humano decide: aceitar, ajustar, rejeitar. Se aceito, política versionada e atualizada.

**Princípio inviolável**: IA sugere, humano decide. Agentes jamais alteram políticas autonomamente.

## 11.6 Audit trail dual

Sistemas tradicionais auditam ações humanas. Sistemas AI-native auditam ações humanas **e** de agentes, com rigor equivalente e distinção explícita.

Schema completo:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID NOT NULL,
  
  -- Quem
  actor_type TEXT CHECK (actor_type IN ('human', 'agent', 'system')),
  actor_id UUID,
  actor_name TEXT,                    -- snapshot denormalizado
  on_behalf_of_id UUID,              -- humano que autorizou agente
  
  -- O quê
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  -- Contexto
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  
  -- Se foi agente
  agent_intent_id UUID,
  policy_id UUID,
  autonomy_level SMALLINT,
  reasoning TEXT,                     -- raciocínio do agente
  
  -- Reversibilidade
  reversible BOOLEAN,
  reversal_window_end TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID
) PARTITION BY RANGE (timestamp);
```

Tabelas complementares: `agent_sessions` (sessão completa do agente) e `agent_decisions` (cada decisão com contexto).

Consultas naturais habilitadas:
- "Todas ações do usuário X no último mês" → `WHERE actor_type='human' AND actor_id=X`
- "Todas ações automatizadas ontem" → `WHERE actor_type='agent' AND timestamp > NOW() - INTERVAL '1 day'`
- "Quando política Y foi aplicada" → `WHERE policy_id=Y`
- "Quem aprovou esta ação?" → `WHERE entity_id=Z AND action='approved'`

Audit trail dual é precondição para compliance em operação AI-native. Sem ele, responder "esta ação foi humana ou automática?" vira investigação forense. Com ele, é query SQL simples.

## 11.7 RAG nativo sobre SCP

Embeddings pré-calculados em `scp_events.context.semantic_embedding` (vetor 1536-dim via text-embedding-3-small inicialmente, possivelmente modelo fine-tuned no Horizonte 4).

Fluxo de consulta:

1. Usuário pergunta em linguagem natural ao Aether AI Copilot
2. Query embedada (mesmo modelo)
3. Busca vetorial no Event Store filtrada por RLS (`tenant_id`) + Context Decay (peso temporal)
4. Top-N eventos retornados
5. Claude API (Fase 1) gera resposta com citação clicável dos eventos-fonte
6. UI renderiza resposta + links para os eventos originais

Diferente de RAG sobre documentos (caso comum): dados estruturados, temporalidade explícita, contextualização única, RLS automática.

Evolução em 4 horizontes:
- **H1**: indexação básica, busca vetorial simples
- **H2**: hybrid search (vector + full-text), re-ranking por Context Decay, integração com Drive
- **H3**: multi-query planning (LLM decompõe pergunta complexa), agentic RAG (agente decide iterativamente o que buscar)
- **H4**: fine-tuning de modelo de embedding próprio em dados Aethereos

## 11.8 Shadow Mode — a rampa para autonomia

Agentes não saem de nível 1 para nível 3 por clique de botão. Empresas não confiam assim. **Shadow Mode** é o mecanismo estrutural de graduação progressiva de autonomia, baseado em métricas objetivas.

### Mecânica

Agente em Shadow Mode executa seu raciocínio completo — processa contexto, avalia opções, toma decisão — mas **não aplica a ação**. Apenas registra em `shadow_decisions` o que teria feito. Humano recebe digest (diário ou semanal) com propostas do agente.

Formato do digest:
```
Agente: "Financeiro AP"
Período: 15-21 abril 2026

Propostas (72 total):
  Aprovadas automaticamente se live: 58 (80%)
  Aguardariam aprovação humana: 14 (20%)

Amostra:
  ✓ "Agendaria pagamento de R$ 3.200 para Fornecedor X em 25/04"
    Rationale: vencimento 27/04, supplier_score 4.7, histórico OK
    Você teria aprovado? [Sim] [Não] [Condicional]
  
  ✗ "Recomendaria reagendar R$ 45.000 de Fornecedor Y para 02/05"
    Rationale: caixa previsto pressionado entre 25-30/04
    Você teria aprovado? [Sim] [Não] [Condicional]
```

### Critério de graduação

Agente em shadow_mode avança para autonomia ativa quando atinge:

- Mínimo de 200 decisões shadow
- Acurácia ≥ 95% (humano concordaria com decisão do agente)
- Zero decisões catastróficas (que teriam causado dano grande)
- Latência de decisão aceitável
- Tempo mínimo em shadow: 30 dias (mesmo se atingir número rápido)

Limites configuráveis pela empresa. Defaults conservadores.

### Schema técnico

```sql
CREATE TABLE shadow_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  agent_id UUID NOT NULL,
  company_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  proposed_intent TEXT NOT NULL,
  proposed_parameters JSONB,
  reasoning TEXT,
  context_snapshot JSONB,
  
  human_review_status TEXT,      -- 'pending', 'approved', 'rejected', 'conditional'
  human_reviewer_id UUID,
  human_feedback TEXT,
  would_have_executed BOOLEAN,
  
  graduated_to_production BOOLEAN DEFAULT FALSE
);
```

### Inspiração de mercado

Tesla fez shadow mode durante anos antes de liberar FSD. Waymo faz. GitHub Copilot faz implicitamente (sugere, não executa). É padrão comprovado de transição IA→autonomia. Aethereos adota explicitamente para toda operação agêntica.

## 11.9 Digital Twin operacional

O Aether AI Copilot raciocina sobre eventos passados via RAG sobre Event Store. Próximo salto qualitativo é raciocinar sobre **simulações** do estado atual + futuros projetados.

### Conceito

Digital Twin é representação viva e projetável do estado da empresa. Não é snapshot estático — é modelo que permite perguntas contrafactuais:

- "Se eu der desconto de 10% para este cliente, qual impacto no fluxo de caixa projetado dos próximos 90 dias?"
- "Se cancelarmos o pedido X de R$ 80k, como fica a relação com o Fornecedor Y?"
- "Se contratarmos 3 pessoas para o time de produção, quando atingimos break-even?"
- "Qual seria o cenário se perdêssemos nosso maior cliente?"

### Arquitetura técnica

```
Event Store (passado)
    ↓
Context Engine (presente enriquecido)
    ↓
Simulation Engine (futuro projetado)
    ↓
Aether AI Copilot (resposta com cenários)
```

O Simulation Engine usa:
- Modelos estatísticos paramétricos (ARIMA, Prophet) para séries temporais
- Regras de domínio codificadas (ex: fórmulas de cálculo de impostos, prazos contratuais)
- Cenários Monte Carlo para variabilidade
- Agentes simulados para comportamento projetado de clientes/fornecedores (H4)

### Entregas de produto

Três modalidades consumíveis:

**Chat contrafactual**. Usuário pergunta "e se..." ao Aether AI Copilot, que invoca Digital Twin, gera cenários, apresenta visualmente.

**Widgets na Mesa**. "Fluxo de Caixa: Projeção 90 dias com cenários otimista/base/pessimista". Atualizados automaticamente conforme estado evolui.

**Triggers em Agentes**. Agentes podem consultar Digital Twin antes de agir. "Este pagamento pressionaria caixa abaixo de limite em 60 dias?" → espera ou escalona.

### Por que é diferenciador

ERP tradicional registra passado. BI mostra presente. Decision Intelligence faz recomendações. Digital Twin deixa o usuário **experimentar o futuro antes de tomar decisão**. Qualitativamente diferente. Defensável.

## 11.10 SCP Choreography — orquestração multi-agente declarativa

A v3 original trata agentes individualmente. Mas operações reais envolvem coordenação: "quando Agente de Vendas fecha deal acima de 50k, notifica Agente de Contratos que gera minuta, que notifica Agente Jurídico que revisa, que notifica Agente Financeiro que agenda cobrança".

Isso é **coreografia de agentes** — e cabe como extensão do próprio SCP.

### DSL declarativa

```yaml
choreography:
  id: "b2b-sales-to-cash"
  version: "1.0"
  trigger:
    event_type: "crm_vendas.deal.closed"
    condition: "amount > 50000"
  
  steps:
    - id: "generate_contract"
      agent: "contracts-agent"
      intent: "legal.contract.generate_draft"
      inputs_from: "$trigger.payload"
      emit: "contracts.draft.ready"
    
    - id: "legal_review"
      trigger_event: "contracts.draft.ready"
      agent: "legal-agent"
      intent: "legal.contract.review"
      max_duration: "2h"
      on_timeout: "notify_human:legal_team"
      emit: "contracts.review.complete"
    
    - id: "schedule_invoice"
      trigger_event: "contracts.review.complete"
      condition: "$event.payload.review_status == 'approved'"
      agent: "financial-agent"
      intent: "finance.invoice.schedule"
      emit: "finance.invoice.scheduled"
  
  error_handling:
    on_agent_failure: "escalate_to_human"
    on_timeout: "alert_process_owner"
  
  audit_tag: "sales_operations"
```

### Mecânica de execução

Choreography Engine observa eventos SCP, casa com triggers, ativa steps em ordem, passa dados entre steps via SCP events, aplica políticas em cada passo via Policy Engine normal, trata falhas/timeouts com escalonamento humano.

Cada step é execução normal de agente — passa por validação de intent, avaliação de política, audit trail. Choreography adiciona apenas a coordenação **entre** steps.

### Publicação como extensão do SCP

SCP Choreography é publicada como extensão formal do protocolo SCP, não como feature proprietária. Qualquer sistema que implementa SCP pode implementar choreography. Isso preserva o Princípio P10 (protocolos abertos).

### Por que resolve no nível do protocolo

LangGraph, CrewAI, AutoGen resolvem orquestração multi-agente no nível de **framework Python**. Cada um escolhe um, fica preso. SCP Choreography resolve no nível de **protocolo aberto**. Qualquer framework que emite eventos SCP participa. Mais poderoso, mais defensável.

## 11.11 Observabilidade agêntica nativa

Audit trail dual (Parte 11.6) registra o que agentes fizeram. Observabilidade agêntica mostra **como estão operando agregadamente**.

### Métricas de primeira classe

```
Agente: "Financeiro AP"
Período: últimos 30 dias

Volume
  Intents declarados: 847
  Intents executados: 721 (85%)
  Escalados para humano: 126 (15%)
  Rejeitados por política: 0

Performance
  Latência média (intent → decisão): 1.2s
  Latência p95: 3.8s
  Tokens consumidos: 12.4M ($186 USD)
  Custo por intent: $0.22

Qualidade
  Decisões revertidas: 3 (0.4%)
  Aprovação humana concedida: 98% dos escalonamentos
  Tempo médio de aprovação humana: 2h14min

Intents mais frequentes
  erp.accounts_payable.schedule_payment  422
  erp.accounts_payable.cancel_schedule    31
  ...

Anomalias detectadas
  Pico de 47 intents em 18/04 14:30 (3x média)
  Taxa de rejeição do "Fornecedor X" acima do esperado
```

### Dashboard como produto

Produto de primeira classe, acessível por:
- Admin da empresa (métricas dos agentes dele)
- Staff Aethereos com autorização (métricas agregadas anonimizadas)
- Próprios agentes (auto-observabilidade para aprendizado)

### Por que é estratégico

Observabilidade de agentes é pré-requisito para o Horizonte 3, quando Magic Store aceitar agentes de terceiros. Ninguém vai instalar agente third-party sem ver métricas operacionais ("este agente tem 97% de acurácia em 2.4M decisões nos últimos 12 meses").

LangFuse, LangSmith e Helicone resolvem observabilidade para devs de IA. Ninguém resolve para operações B2B. Aethereos nasce com essa capability embutida.

### Inspiração de arquitetura

Influência direta de Datadog APM, OpenTelemetry traces, Snowflake Query Profile. Cada intent declarado vira um span observável. Aggregations via SQL sobre `audit_logs` particionado. UI com filtros temporais, por agente, por intent, por outcome.

## 11.12 Workforce híbrida — humanos e agentes no mesmo organograma

[DEC] Agentes são tratados como cidadãos de primeira classe na arquitetura (ver 11.3). Extensão natural: também são tratados como cidadãos de primeira classe no **modelo organizacional** da empresa. Cada agente tem cargo, escopo, custo operacional, meta, SLA, supervisor humano — mesma gramática usada para funcionários.

### Modelo

```typescript
interface WorkforceMember {
  id: string;
  type: 'human' | 'agent';
  
  // Campos comuns
  name: string;
  role: string;                    // "Analista Financeiro", "Agente de Cobrança"
  department: string;
  reports_to_id: string;           // sempre humano, mesmo para agente
  cost_center: string;
  
  // Métricas (calculadas, não inseridas)
  operational_capacity: number;    // carga de trabalho unitária
  performance_score: number;       // 0-1, baseado em KPIs
  
  // Específico de agente
  agent_specifics?: {
    autonomy_level: 0 | 1 | 2 | 3 | 4 | 5;
    cost_per_1000_intents_brl: number;
    tokens_consumed_month: number;
    acceptance_rate: number;       // % de ações não revertidas pelo humano
    escalation_rate: number;       // % de intents que escalonaram para humano
    monthly_cost_brl: number;      // baseline fixo + variável
  };
  
  // Específico de humano
  human_specifics?: {
    contract_type: 'CLT' | 'PJ' | 'stagiario' | 'terceirizado';
    monthly_salary_brl: number;
  };
}
```

### Capabilities habilitadas

**Quadro de equipe consolidado.** Interface no app RH mostra humanos e agentes juntos, filtráveis por departamento. "Equipe financeira" tem 4 analistas humanos + Agente de Contas a Pagar + Agente de Cobrança. Todos visíveis na mesma tela.

**Folha de agentes por centro de custo.** O CFO vê contabilmente quanto cada agente consumiu em tokens, quanto gerou em eficiência estimada, quanto custou em infraestrutura. Agentes viram linha de despesa operacional reconhecida, não "gasto em IA" abstrato.

**Headcount planning híbrido.** Ao planejar expansão, gestor compara: "Contratar mais 2 analistas humanos ou expandir autonomia do Agente de Contas a Pagar e adicionar mais 1 analista?". O sistema ajuda a modelar trade-offs baseado em dados reais.

**Performance comparável.** Taxa de erro, tempo de processamento, custo por transação — mesmas métricas aplicadas a humanos e agentes, respeitando que humanos executam tarefas qualitativamente diferentes. Não é "quem é melhor", é "qual a divisão ótima".

### Por que resolve um problema real

Empresas conservadoras resistem a adotar IA porque não sabem **contabilizar** o investimento. Está no CAPEX? Num OPEX genérico de "tecnologia"? Como justificar aumento de consumo de API para o conselho? Workforce Híbrida transforma agentes em entidades contabilizáveis com métricas claras — exatamente a linguagem que o CFO entende.

### Limitação honesta

Agentes não ocupam vagas formais da CLT nem de contratos de PJ. Workforce Híbrida é abstração **gerencial**, não abstração legal. Para fins trabalhistas, agentes são software; para fins de gestão de capacidade operacional, são participantes.

## 11.13 Circuit Breaker Humano — pausa automática de autonomia

[INV] Agentes com autonomia nível 3+ operam sob vigilância estatística contínua. Quando padrão de reversão ou divergência humana excede thresholds configurados, autonomia é **automaticamente pausada** até revisão humana. É o complemento operacional do Shadow Mode (11.8): Shadow Mode é a rampa para cima; Circuit Breaker é o paraquedas para baixo.

### Quando aciona

Triggers configuráveis por tenant, com defaults conservadores:

```yaml
circuit_breaker:
  - id: "high_reversal_rate"
    condition: "agent_reversals_in_24h >= 3"
    action: "pause_autonomy_above_level_1"
    notify: [owner, admin, supervising_user]
    resume: "requires_human_review"
  
  - id: "divergence_spike"
    condition: "policy_decisions_overridden_by_human > 5 in 24h"
    action: "pause_autonomy_above_level_2"
    notify: [owner, admin]
    resume: "requires_policy_recalibration"
  
  - id: "cost_anomaly"
    condition: "tokens_consumed > 3x_daily_baseline"
    action: "pause_all_autonomy"
    notify: [owner, admin, finance]
    resume: "requires_explicit_unlock"
  
  - id: "audit_anomaly"
    condition: "action_outside_normal_pattern_cluster"
    action: "pause_autonomy_above_level_1"
    notify: [owner, admin, security]
    resume: "requires_security_review"
```

### Diferença de políticas normais

Policy Engine (11.5) avalia ação **antes** de executar. Circuit Breaker avalia **padrões de comportamento agregado** depois de múltiplas execuções. Policy impede decisão ruim individual; Circuit Breaker impede deriva coletiva (modelo degradado, contexto mudou, bug sutil).

### Por que é invariante

Sem Circuit Breaker, uma degradação gradual de qualidade do agente (drift de modelo, mudança de padrão no mercado, ataque adversarial sutil) pode causar dano significativo antes de ser notada. Com Circuit Breaker, o sistema se protege automaticamente. Esse é exatamente o tipo de proteção que regulação vindoura de IA vai exigir — NIST AI RMF já recomenda, AI Act europeia vai formalizar.

## 11.14 Policy Studio — editor visual de Governance-as-Code

[DEC] Governance-as-Code (11.5) é arquiteturalmente correta com YAML declarativo. Mas YAML cru é barreira de adoção para gestor não-técnico. **Policy Studio** é o produto visual que torna políticas acessíveis a compliance officers, CFOs, heads de área — quem precisa definir as regras de governança mas não programa.

### Features principais

**Editor visual com preview de YAML.** Usuário arrasta condições (`quando amount > X`), ações (`require approval_if`) e constraints (`deny if ...`). O YAML correspondente é gerado e exibido para validação por desenvolvedor, mas usuário não precisa editá-lo manualmente.

**Simulação antes de publicar.** Antes de ativar uma nova política, Studio executa simulação sobre histórico de decisões do último trimestre: "esta política, se estivesse ativa, teria bloqueado 47 ações, escalado 12 para aprovação, e aprovado automaticamente 156. Aqui está o detalhe." Usuário vê impacto antes de comprometer produção.

**Diff entre versões.** Mudanças são versionadas como código. Visualização tipo GitHub: linhas adicionadas em verde, removidas em vermelho. Histórico completo de quem mudou o quê e quando.

**Modo "explicar decisão".** Quando usuário vê no audit trail que ação foi bloqueada, click em "Por quê?" mostra cadeia de avaliação: qual política aplicou, qual condição disparou, qual rationale. Torna governança auditável em UX.

**Biblioteca de políticas pré-construídas.** Templates por vertical (ver 5.6) importáveis via Studio. Usuário começa com modelo validado e customiza.

**Testes automatizados de política.** Studio gera testes unitários para cada política: "dado intent X com params Y, deveria ser allowed". Testes ficam em repo e rodam em CI; políticas não quebram silenciosamente ao longo do tempo.

### Preservação da intenção original em linguagem natural

[INV] Quando usuário define política, Studio registra **dois artefatos complementares**: a política YAML executável (que o Policy Engine avalia) E a **intenção original em linguagem natural** declarada pelo usuário no momento da criação.

Exemplo concreto:

```yaml
# Política YAML executável (o que o Policy Engine avalia)
policy:
  id: "ap-high-value-approvals"
  version: "3"
  allow:
    - intent: "erp.accounts_payable.schedule_payment"
      when:
        amount: { max: 50000 }
        supplier_score: { min: 4.5 }
        runway_days: { min: 30 }
      require_approval_if:
        amount: { above: 50000 }
  # ...

# Intenção original em linguagem natural
original_intent:
  declared_by: "CFO Maria Silva"
  declared_at: "2026-05-10T14:32:00Z"
  text: |
    "Aprovações financeiras acima de R$ 50k precisam de duas assinaturas,
    exceto para fornecedores com score > 4.5 e histórico de 3+ anos, onde
    R$ 100k é ok. Em emergências (definidas como caixa < 30 dias de runway),
    o CEO pode aprovar até R$ 200k com notificação ao conselho em 24h."
  
  conversion_notes: |
    - Limite de 30 dias de runway mapeado para condição runway_days
    - Histórico de 3+ anos não pôde ser mapeado (falta capability do Kernel);
      apenas supplier_score foi incluído como proxy
    - Regra de R$ 200k emergencial exige second YAML policy (ap-emergency-ceo)
    - Notificação ao conselho em 24h implementada via hook post-approval
```

### Por que isso importa

Quando edge case emerge em produção — política executa corretamente por literal do YAML mas humanos sentem que contradiz a intenção — a reconciliação passa a ter base auditável. "Em 10/05/2026, CFO declarou que emergências seriam definidas como 'caixa < 30 dias'. A ação X executou corretamente conforme YAML, mas o cenário não se encaixa no espírito da regra — revisar política."

Sem esse registro, reconciliação é investigação. Com esse registro, é comparação direta entre literal do código e intenção humana registrada.

### Implementação técnica

Audit trail dual (11.6) ganha campo adicional `policy_original_intent` referenciando texto declarado. Quando política é aplicada a um caso, audit registra: YAML versão X foi avaliada, produziu allow/deny, e a intenção humana original era "...". Dashboard de reconciliação permite auditor revisar casos onde execução literal e intenção declarada estão em tensão.

### Papel no ecossistema regulatório

AI Act europeia exige explicabilidade e auditabilidade de decisões de IA — Policy Studio entrega isso em UX acessível. LGPD exige demonstrabilidade do cumprimento dos princípios — políticas no Studio são documentação viva do esforço de compliance. NIST AI RMF recomenda governance como função contínua — Policy Studio é a interface operacional desse esforço.

## 11.15 Trust Center — AI Evals como produto de primeira classe

[INV] Observabilidade Agêntica (11.11) mostra comportamento operacional. **Trust Center** expande para **qualidade da IA** com metodologia formal de AI Evals: dataset de referência, benchmark de precisão, taxa de alucinação, grounded citation rate, task success rate, human override rate, rollback rate. Sem isso, observabilidade vira cosmético — sabemos quanto o agente fez, não sabemos o quão bem.

### Estrutura

```
Trust Center
├── Evals por vertical
│   ├── Dataset de perguntas reais (curado + ampliado com uso)
│   ├── Respostas esperadas ou critérios de aceitação
│   └── Execução recorrente (diária, semanal, por deploy)
│
├── Métricas de qualidade
│   ├── Accuracy (resposta correta vs esperada)
│   ├── Groundedness (resposta ancora em eventos reais via citação?)
│   ├── Hallucination rate (percentual de fatos inventados)
│   ├── Refusal rate (percentual de respostas "não sei" apropriadas)
│   ├── Latency (p50, p95, p99)
│   ├── Cost per query (USD)
│   └── Human override rate (% de respostas que humano corrigiu)
│
├── Regressão automática
│   └── Quando deploy novo baixa acurácia > X%, rollback automático
│
└── Relatório público de confiança
    └── Métricas agregadas anonimizadas exibidas em trust.aethereos.com
```

### Dataset curado por vertical

Para B2B AI OS Brazil, dataset inicial com 200-500 perguntas reais coletadas de empresas piloto: "qual o fluxo de caixa projetado?", "quais pedidos estão atrasados?", "qual fornecedor teve mais problemas este trimestre?", "consulte NCM X". Cada pergunta tem resposta esperada e critérios de aceite.

Dataset cresce com uso: queries reais de produção que foram corrigidas por humano entram no eval, garantindo que regressões não se repitam.

### Por que é produto, não só infraestrutura

**Cliente enterprise exige.** Ao vender para empresa grande, a pergunta "qual a acurácia da IA?" deixa de ser dispensável. Trust Center entrega resposta com dados, não opiniões.

**Regulação exige.** AI Act europeia classifica sistemas de IA por risco; B2B operacional pode se enquadrar como "limited risk" exigindo transparência. Trust Center é a transparência operacionalizada.

**Diferencial de mercado.** LangSmith, Langfuse, Helicone fazem isso para desenvolvedores de IA. Ninguém faz para operadores de negócio. Aethereos entrega tanto para o dev quanto para o CEO que precisa aprovar a IA rodando em produção.

### Alimentação cruzada com outras partes

Evals que reprovam viram tarefas em backlog. Policy Studio (11.14) pode referenciar métricas do Trust Center (ex: "enquanto acurácia do agente de classificação fiscal < 95%, exigir aprovação humana sempre"). Circuit Breaker (11.13) dispara quando métricas degradam. Shadow Mode (11.8) usa dataset do Trust Center para validar graduação de autonomia.

## 11.16 Classe de risco operacional por feature (A/B/C)

[INV] Operacionalização complementar ao P15 (orçamento LLM). Toda feature que envolve IA ou agente recebe **classificação de risco** explícita que determina quais mecanismos de governança são **obrigatórios** para aquela feature. Remove ambiguidade sobre o que é necessário por tipo.

A classe é declarada no mesmo ADR onde o orçamento LLM é declarado (ver Parte XXIII.5). Feature não é aprovada para merge sem classe declarada.

### 11.16.1 Classe A — Alto risco, ação irreversível

Features cujo resultado tem impacto material e não pode ser desfeito trivialmente. Exemplos: pagamento financeiro, emissão de nota fiscal, demissão de colaborador, alteração de cadastro crítico (fornecedor, cliente, plano de contas), transferência entre contas, revogação de acesso privilegiado.

**Mecanismos obrigatórios:**

- [INV] Shadow Mode prolongado mínimo de 90 dias com precisão > 99% antes de permitir autonomia
- [INV] Aprovação humana sempre, mesmo que política allow
- [INV] Circuit Breaker agressivo (thresholds de reversão/divergência mais apertados)
- [INV] Audit trail expandido com screenshot ou snapshot do estado ao momento da decisão
- [INV] Notificação imediata a responsável humano designado
- [INV] Ciclo de revisão mensal com comitê de risco
- [INV] Throttling por tenant (N ações/dia máximo; excede → aprovação adicional)
- [INV] Autonomia máxima: nível 1 (sugere; humano executa). Nunca autonomia de escrita autônoma.
- [INV] **Rollout por tenant piloto obrigatório.** Feature Classe A nunca é ativada simultaneamente para toda a base. Ativação começa com 1-3 tenants piloto selecionados (com consentimento e acompanhamento direto), janela mínima de 30 dias em piloto antes de expansão, ondas subsequentes de 5-10% da base com janela mínima de 14 dias entre ondas. Feature flags por tenant são invariante operacional, não opcional.

Essas features correspondem às **8 operações invariantes** descritas na seção 11.5.2 (Governance-as-Code).

### 11.16.2 Classe B — Risco médio, ação reversível

Features cujo resultado tem impacto operacional mas pode ser desfeito com esforço razoável. Exemplos: agendamento de reunião, classificação documental, sumarização com ação sugerida, roteamento de email, ajuste de prioridade em pipeline, sugestão de resposta enviada ao cliente após revisão.

**Mecanismos obrigatórios:**

- [INV] Shadow Mode mínimo de 30 dias com precisão > 90% antes de permitir autonomia
- [INV] Aprovação humana no primeiro uso por tenant; opt-in explícito para automação subsequente
- [INV] Circuit Breaker padrão
- [INV] Audit trail padrão (Parte 11.6)
- [INV] Revisão trimestral de performance e desvios
- [DEC] Autonomia máxima: nível 2-3 (executa dentro de limites; pergunta em casos dúbios) após maturidade comprovada

### 11.16.3 Classe C — Baixo risco, consulta ou leitura

Features que consultam, resumem ou sugerem sem executar ações. Exemplos: busca, extração de dados, resumo de documentos, explicação contextual, relatórios automatizados, recomendações para consumo humano.

**Mecanismos obrigatórios:**

- [INV] Métricas de qualidade no Trust Center (Parte 11.15)
- [INV] Kill switch funcional
- [INV] Quota por tenant/plano
- [DEC] Shadow Mode opcional
- [DEC] Aprovação humana opcional
- [DEC] Autonomia: qualquer nível conforme política do tenant permite

### 11.16.4 Declaração da classe

Declarada no ADR junto aos seis campos do P15:

```yaml
feature: "aether-copilot.fiscal.nfe-rejection-resolution"
description: "Copilot analisa rejeição de NF-e e sugere correção"

risk_class: "B"   # reversível: correção sugerida, humano aplica
risk_rationale: |
  Correção sugerida não altera estado automaticamente; humano revisa e aplica.
  Se sugestão incorreta, humano rejeita — nenhum dano operacional.
  Alternativa (sem IA) é consulta manual a documentação fiscal, que já está
  sujeita a erro humano similar.

llm_budget:
  model: "claude-sonnet"
  # ... seis campos do P15 ...

mandatory_mechanisms:
  shadow_mode_duration_days: 30
  shadow_mode_min_accuracy: 0.90
  first_use_approval: true
  circuit_breaker: "standard"
  audit_trail: "standard"
  review_cadence: "quarterly"
  max_autonomy_level: 2
```

### 11.16.5 Re-classificação

Feature pode ter classe alterada conforme evidência acumulada:

- **Upgrade de risco** (B → A, C → B) — quando observação mostra que consequências reais são mais graves que assumido. Nova classificação entra em vigor imediatamente; mecanismos adicionais ficam obrigatórios a partir da próxima release.
- **Downgrade de risco** (A → B, B → C) — quando Shadow Mode acumula evidência de precisão e reversibilidade. Downgrade exige aprovação do comitê de risco e período de 60 dias observando estabilidade na classe atual antes de mudar.

### 11.16.6 Por que classes explicitas importam

Sem classificação obrigatória, equipes de produto decidem ad hoc quais mecanismos de governança aplicar. Sob pressão de entrega, "apenas desta vez" acumula — feature de classe A sai sem Shadow Mode porque "era urgente", feature de classe B sai sem aprovação humana porque "o time já entende".

Com classes explícitas como invariante, decisão é mecânica: declara classe → mecanismos obrigatórios por classe são checados no CI → merge bloqueado se ausentes. Disciplina em nível arquitetural, não em nível de vontade individual.

Essa é a extensão natural do princípio P7 (guardrails mecânicos, não disciplina): classificação + enforcement mecânico substituem bom senso situacional.

---

# PARTE XII — GARANTIAS INVIOLÁVEIS

Um sistema que opera dados críticos de empresas, com crescente autonomia de IA, precisa estabelecer garantias explícitas e invioláveis — não como política, mas como arquitetura.

## 12.1 Segurança em cinco camadas

**Camada 1: Transporte.** HTTPS obrigatório (TLS 1.3+). Sem exceção. HSTS ativo em produção. Certificados via Let's Encrypt ou ACM.

**Camada 2: Autenticação.** Supabase Auth com OAuth 2.1. JWT com expiração curta (1h). Refresh tokens rotacionados. Senhas via bcrypt cost 12. MFA encorajado, configurável por empresa, obrigatório para roles sensíveis em verticais reguladas.

**Camada 3: Autorização.** RLS no banco (defesa definitiva). RBAC na aplicação (defesa primária). Policy Engine para ações sensíveis (defesa adicional para agentes).

**Camada 4: Aplicação.** Validação de input via Zod obrigatória em todas as rotas. Proteção contra SQL injection via queries parametrizadas (Drizzle). Proteção contra XSS (React escape nativo + sanitização específica). Proteção contra CSRF (tokens em ações state-changing). Rate limiting por IP e por user. Headers de segurança (CSP, X-Frame-Options, X-Content-Type-Options).

**Camada 5: Dados.** Criptografia at-rest via Supabase (AES-256). Signed URLs com expiração curta para downloads. Share links protegidos por bcrypt. Sensitive fields (CPF, cartão de crédito) considerados para encryption at application level.

## 12.2 LGPD integral

Cumprimento total da Lei 13.709/2018. Princípios aplicados:

- **Finalidade** — consentimento explícito por finalidade
- **Necessidade** — apenas dados necessários coletados
- **Adequação** — uso restrito à finalidade
- **Qualidade** — mecanismos de correção pelo titular
- **Transparência** — consulta pelo titular
- **Segurança** — medidas técnicas e organizacionais
- **Prevenção** — mecanismos anti-dano
- **Não-discriminação** — sem uso para discriminação
- **Responsabilização** — demonstração de cumprimento

Direitos do titular implementados via tabela `lgpd_requests`:
- Confirmação de tratamento
- Acesso aos dados
- Correção
- Anonimização/bloqueio/eliminação
- Portabilidade
- Eliminação com consentimento
- Informação sobre compartilhamentos
- Revogação do consentimento

SLA de 15 dias para resposta. DPO designado. Política de privacidade pública e versionada.

## 12.3 K-anonimidade como critério

Qualquer funcionalidade de dados agregados cross-tenant respeita k-anonimidade com **k=10 mínimo**.

Implementação:
- Consulta com menos de 10 empresas contribuintes retorna "amostra insuficiente"
- Supressão de outliers (remove maior e menor valores antes de agregar)
- Ruído gaussiano ±3-5% aplicado em métricas
- Defasagem temporal de 7 dias
- Opt-in explícito por empresa
- Auditoria de consultas a dados agregados (meta-auditoria)

Evolução:
- **Horizonte 3**: Differential Privacy formal (substituindo ruído gaussiano ad-hoc)
- **Horizonte 4+**: Zero-Knowledge Proofs para consultas que provam propriedade sem revelar dado

## 12.4 As oito operações invariantes

Princípio inviolável e estrutural: **nenhum agente de IA executa autonomamente, em qualquer circunstância**:

1. **Demissão de colaborador**
2. **Alteração estrutural de cadastro de fornecedores/clientes** (bloqueio, remoção)
3. **Alteração de plano de contas**
4. **Transferência financeira acima de limite configurado**
5. **Alteração de políticas de governança** (IA apenas sugere)
6. **Concessão ou revogação de acesso privilegiado**
7. **Exclusão de dados**
8. **Alteração de informações fiscais** (regime tributário, cadastros SEFAZ)

Em todos os casos, ação de agente gera **solicitação de aprovação humana** dirigida a usuário com role apropriado, SLA para resposta, escalonamento em timeout. Agente prossegue apenas após aprovação explícita.

Esta lista é **invariante do kernel**. Verticais podem estender (adicionar mais operações críticas), **nunca reduzir**. Violações são bloqueadas em runtime pelo Policy Engine com rejeição `INVARIANT_VIOLATION`.

## 12.5 Humano como autoridade final

Corolário: em qualquer disputa entre decisão humana e decisão de agente, prevalece a humana.

Cenários:
- Humano sobrescreve ação de agente → ação revertida (se possível); override registrado; agente informado
- Humano define política que agente desaprovaria → política prevalece; agente opera dentro dela
- Humano comete erro aparente → agente pode alertar, sugerir revisão, mas não pode bloquear

Razão filosófica: responsabilidade legal e moral, em 2026 e por longo período, permanece humana. Tecnicamente agente pode estar certo; legalmente humano responde. Arquitetura preserva responsabilidade humana.

## 12.6 Auditabilidade total

Toda ação — humana, agente, sistema, leitura, escrita, alto ou baixo nível — gera rastro auditável.

Princípios:
- **Append-only** — logs imutáveis; correções geram novos registros
- **Cronológicos** — ordem preservada via UUID v7 + timestamp
- **Atribuídos** — user_id, agent_id ou system
- **Contextualizados** — metadata suficiente (IP, user_agent, session, trace_id)
- **Retidos** — mínimo 2 anos para operações normais, 10 anos para críticas
- **Consultáveis** — painel admin com filtros avançados, exportação externa

Operações auditadas obrigatoriamente:
- Criação, modificação, deleção de empresa
- Convite, modificação, remoção de usuário
- Modificação de permissões/roles
- Aprovação/rejeição acima de threshold
- Mudança de política
- Criação, pausa, revogação de agente
- Exportação LGPD
- Acesso a dados agregados cross-tenant

## 12.7 Reversibilidade

Operações devem ser reversíveis quando viável:

- **Soft-delete por default** (`deleted_at` preenchido). Hard-delete exige opt-in explícito
- **Atualizações preservam histórico** via eventos SCP (estado anterior reconstituível)
- **Ações de agente** têm ação inversa documentada (`reversibility.inverseIntent`) quando aplicável
- **Pagamentos agendados** cancelados até 1h antes da execução
- **Configurações** mantêm histórico de versões

Não aplicável a eventos naturalmente irreversíveis (envio de email, SMS, transações com terceiros). Nesses casos, **confirmação explícita human-in-the-loop** antes da execução.

## 12.8 Time Travel sobre o Event Store

Consequência cósmica do Event Sourcing append-only: o estado de qualquer entidade em qualquer momento do passado é matematicamente reconstituível. Aethereos expõe isso como capability de primeira classe.

### Operações habilitadas

```sql
-- Estado do tenant na data X
SELECT state_at('company:abc-123', '2026-03-15T14:00:00Z');

-- Evolução de uma entidade ao longo do tempo  
SELECT timeline('order:xyz-789', '2026-01-01', '2026-04-01');

-- "E se" replay: executar agente em estado passado
SELECT agent_replay(
  agent_id: 'financial-ap',
  state_at: '2026-02-15',
  intents: [...],
  mode: 'dry-run'
);
```

### Casos de uso

**Debug forense**. "Como estava o pedido X antes daquela alteração? Quem alterou? Com que justificativa?". Um click, não uma investigação.

**Compliance e auditoria**. "Prove que esta decisão financeira foi tomada com base nestes dados." Consulta ao Event Store reconstitui exatamente o estado disponível no momento da decisão, incluindo contexto enriquecido e políticas vigentes.

**Treinamento de agentes**. "Rode este agente contra o estado de 6 meses atrás para ver se teria decidido igual com dados da época." Validação contrafactual de agentes sem arriscar produção.

**Análise de regressão**. "Antes desta mudança de política, agentes executavam X com frequência Y; depois, executam com frequência Z". A/B testing temporal.

**Disputas comerciais**. Cliente questiona pedido. Consulta exato estado no momento da transação. Evidência imutável.

### Implementação

Event Store já provê os dados. Time Travel é camada de apresentação:
- Função `state_at(entity_id, timestamp)` agrega todos eventos anteriores
- UI de "timeline viewer" para entidades específicas
- Widget opcional na Mesa "Ver estado em [date picker]"
- API exposta via SDK para agentes

### Por que é quase exclusivo do Aethereos

ERP tradicional perdeu essa capability no momento em que criou estado mutável. Dados sobrescritos perdem causalidade. Aethereos nasceu com Event Sourcing; Time Travel é consequência natural, não retrofit.

## 12.9 Federated Learning + Consent Receipts

Evolução da inteligência coletiva anunciada na Parte 12.3. Em vez de enviar dados anonimizados para agregação central, treina modelos localmente e agrega apenas os gradientes.

### Modelo operacional

**Treino local.** Dados do tenant ficam no tenant. Modelo local é treinado com dados locais, produzindo pesos/gradientes.

**Agregação federada.** Gradientes anonimizados enviados para servidor central Aethereos. Agregação cruza 10k+ tenants (k-anonimidade preservada, com ruído Differential Privacy).

**Modelo global atualizado.** Servidor central redistribui modelo global melhorado para tenants. Ciclo repete.

Vantagens vs agregação tradicional:
- Dados brutos **nunca saem** do tenant
- Gradientes são matematicamente incapazes de reconstruir dados originais individuais (diferentemente de dados agregados que podem sofrer ataques de re-identificação)
- LGPD compliance avançado — resposta cristalina: "não, a Aethereos nunca viu seus dados"

### Consent Receipts (padrão Kantara)

Quando tenant opta por participar de federated learning, recebe **recibo criptográfico** auditável:

```json
{
  "receipt_id": "cr_abc123",
  "tenant_id": "xxx",
  "timestamp": "2026-04-18T...",
  "consent_to": "federated-learning:inteligencia-coletiva-comercio-digital",
  "duration": "12-months",
  "data_categories": ["orders-metadata-anonymized"],
  "purposes": ["model-improvement-supplier-scoring"],
  "revocation_url": "...",
  "signature": "<ECDSA signature>"
}
```

Empresa pode consultar, auditar, revogar a qualquer momento. Portabilidade do recibo.

### Por que enterprise paga prêmio

Empresas grandes com dados sensíveis (saúde, financeiro, jurídico) frequentemente rejeitam SaaS multi-tenant exatamente pelo medo de "dados misturados". Federated Learning + Consent Receipts respondem o medo com garantia matemática + prova auditável.

Isso abre segmento enterprise premium que competidores sem essas features não acessam.

### Cronograma

- **Horizonte 2**: base técnica (infra federada, primeiro caso de uso piloto)
- **Horizonte 3**: produto geral para toda inteligência coletiva
- **Horizonte 4**: Differential Privacy formal + ZKPs para queries específicas

## 12.10 Notarização imutável de eventos críticos

Para classes de eventos de altíssima criticidade (decisões financeiras acima de N, aprovações trabalhistas, assinatura de contratos, mudanças de política crítica), o Aethereos gera **prova criptográfica de timestamping** em infraestrutura independente do próprio sistema.

### Mecânica

Cada evento SCP da classe "notarizable" tem seu hash SHA-256 publicado em:
- **OpenTimestamps** (usando Bitcoin blockchain como ancoragem temporal) — opção default, custo trivial
- **Certificado digital ICP-Brasil** — opção para requisitos fiscais brasileiros
- **Blockchain privado** (Hyperledger) — opção para enterprise que quer controle total

### O que isso prova

"Este evento **existia exatamente como está** no Event Store neste momento específico. Ninguém alterou retroativamente." Essa prova é independente do Aethereos — se um advogado questionar a integridade, pode verificar hash contra OpenTimestamps sem depender da boa-fé do Aethereos.

### Casos de uso

- Auditoria fiscal retroativa ("prove que este pagamento foi decidido em 15/03, não inserido depois")
- Disputas trabalhistas ("prove que a demissão foi registrada na data que diz")
- Contratos ("prove que a cláusula X estava no texto aprovado")
- Conformidade regulatória (ANS, CVM, BACEN) que exigem provas de integridade

### Custo trivial, barreira alta

Custo de notarização via OpenTimestamps: centavos por milhar de eventos. Custo para competidor replicar: zero técnico, mas alto operacional — precisam rearquitetar event handling. Barreira mais regulatória que técnica.

### Configuração por vertical

Verticais declaram no manifesto quais event_types são notarizable:

```yaml
vertical: b2b-ai-os-brazil
notarizable_events:
  - "erp.accounts_payable.payment_scheduled"      # above 50k BRL
  - "hr.employee.terminated"
  - "crm_vendas.contract.signed"
```

## 12.11 PII Vault — gateway de dados pessoais

Centralização de dados pessoais em cofre dedicado do kernel. Apps não armazenam dados pessoais em suas tabelas — referenciam via tokens opacos.

### Arquitetura

```
┌─────────────────────────────────────────┐
│         PII Vault (kernel service)      │
│  ┌───────────────────────────────────┐  │
│  │  pii_records                      │  │
│  │  - id (UUID)                      │  │
│  │  - tenant_id                      │  │
│  │  - data (encrypted)               │  │
│  │  - consent_records[]              │  │
│  │  - retention_until                │  │
│  │  - deleted_at                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↑                ↑
           │                │
    ┌──────┴──┐        ┌────┴────┐
    │ App A   │        │ App B   │
    │ usa     │        │ usa     │
    │ token X │        │ token X │
    └─────────┘        └─────────┘
```

Apps guardam `pii_token: "pii_abc123"` em vez de `cpf: "123.456.789-00"`. Para exibir/usar o dado, chamam `piiVault.resolve(token)` que retorna valor descriptografado apenas se caller tem permissão válida + consentimento ativo.

### Benefícios

**Exercício do direito de eliminação LGPD trivial**. Titular solicita eliminação → delete em `pii_records` → todos apps automaticamente perdem acesso. Sem necessidade de caçar referências em N tabelas.

**Blast radius limitado em vazamento**. Se app for comprometido, o invasor ganha tokens opacos, não dados. Descriptografia exige acesso ao Vault + políticas adequadas.

**Auditoria centralizada**. Todo acesso a dado pessoal passa pelo Vault. Log unificado mostra quem acessou o quê, quando, sob qual consentimento.

**Rotação de criptografia**. Chaves podem ser rotacionadas no Vault sem tocar em nenhum app.

### Categorias de PII

```typescript
type PIICategory = 
  | 'identification'    // nome, CPF, RG, CNH
  | 'contact'           // email, telefone, endereço
  | 'financial'         // cartões, contas bancárias
  | 'health'            // dados de saúde (sensível LGPD-Saúde)
  | 'biometric'         // digitais, facial
  | 'behavioral'        // comportamento de navegação detalhado
```

Categorias sensíveis (health, biometric) têm rules extras: double-encryption, audit reforçado, consent granular.

### Inspiração

Piton Capital experimenta PII Vault como produto standalone. Privitar, BigID oferecem soluções similares para enterprise. Aethereos incorpora como feature core, não produto separado.

## 12.12 Business Observability — rastreio técnico + rastreio de negócio

[DEC] Sistemas sérios têm observabilidade técnica (OpenTelemetry com traces, metrics, logs correlacionados). O Aethereos vai além com **Business Observability**: cada entidade de negócio (pedido, fatura, contrato, envio) gera uma *business trace* com spans em cada etapa da jornada. No mesmo painel onde o dev vê latência de API, o gestor vê onde o processo parou operacionalmente.

### Modelo conceitual

Uma entidade de negócio que atravessa múltiplos apps e estados é uma *business trace*. Cada transição de estado é um span. Spans carregam:

- Timestamps de início e fim
- App que executou
- Ator (humano ou agente)
- Resultado (sucesso, erro, timeout)
- Métrica de negócio relevante (valor da transação, SLA do contrato, etc.)
- Relações com outros spans (causation)

Exemplo de business trace para um pedido:

```
Pedido ABC-123 (business trace)
├── span: criação (Comércio Digital, user Maria, 0.3s)
├── span: validação fiscal (Kwix, agente AE-AI, 1.2s)
├── span: aprovação financeira (Kwix, user CFO, 3h14min ← WAIT TIME)
├── span: geração de NFe (Kwix, sistema, 0.8s)
├── span: agendamento logístico (Logitix, agente Logix, 0.4s)
├── span: embarque (Logitix, terceiro via webhook, 2 dias ← WAIT TIME)
└── span: entrega confirmada (Logitix, user receptor cliente, final)

Total lifecycle: 2d 11h 47min
SLA target: 2d 0h 0min
SLA status: MISSED (-11h 47min)
Bottleneck identified: aprovação financeira (3h14min > baseline 45min)
```

### Interface

**Para dev**: painel técnico com traces OpenTelemetry, latência de API, erros por endpoint.

**Para gestor**: painel business com traces de entidades, tempo gasto em cada estado, SLAs de processo, identificação automática de gargalos.

**Para ambos**: correlação explícita. Click no span "validação fiscal" do pedido mostra a stack técnica que executou (API calls, queries, eventos SCP emitidos). Dev diagnostica problema técnico que está causando atraso em pedidos; gestor identifica onde processo trava antes do problema virar outage.

### Alimentação do dataset

OpenTelemetry como infraestrutura base (padrão aberto, implementações maduras). Spans de negócio são customizados via atributos OTel padronizados (`business.entity.type`, `business.entity.id`, `business.step.name`). Apps nativos do Aethereos emitem essas convenções por default via SDK.

### Por que é diferenciador

**ERP tradicional** mostra estado atual do pedido, mas não conta a jornada. Quando pedido atrasa, investigação manual é necessária.

**Sistemas de APM tradicionais** mostram jornada técnica (HTTP requests, database calls), mas não contam a jornada de negócio.

**Aethereos une os dois**. É o tipo de visibilidade que hoje exige configuração custosa de Datadog + Splunk + dashboards customizados; aqui vem por design.

---

# PARTE XIII — ONBOARDING E PROVISIONAMENTO

## 13.1 Wizard de primeira inicialização

Fluxo estilo "primeira inicialização do Android":

```
1. Usuário acessa aethereos.com (ou subdomínio de vertical)
   │
2. Escolhe nome do workspace/empresa
   │
3. Seleciona vertical de cards visuais
   │ (B2B AI OS Brazil, Imobiliário OS, Incubadora OS, etc.)
   │
4. Fornece identificador específico da vertical
   │ (CNPJ para B2B BR, CRECI+CNPJ para Imobiliário, etc.)
   │
5. Sistema enriquece automaticamente
   │ (BrasilAPI/ReceitaWS para CNPJ: razão social, CNAE, endereço)
   │
6. Seleciona plano (Free / Pro / Enterprise)
   │
7. Provisionamento automático:
   ├── Cria company com vertical_id + plan
   ├── Aplica manifesto da vertical (branding, políticas)
   ├── Pré-instala apps bundled no tenant
   ├── Gera storefront filtrada
   ├── Monta VFS inicial (/home/, /system/, /apps/, /mnt/)
   ├── Cria Mesa padrão com widgets da vertical
   ├── Emite evento platform.tenant.provisioned
   └── Configura Aether AI Copilot com contexto inicial
   │
8. Loga usuário no OS Desktop customizado
```

Tempo total esperado: 60-90 segundos do início ao desktop funcional.

## 13.2 Identificadores por vertical

Cada vertical tem identificador próprio para enriquecimento:

| Vertical | Identificador primário | Providers de enriquecimento |
|---|---|---|
| B2B AI OS Brazil | CNPJ | BrasilAPI, ReceitaWS |
| Imobiliário OS | CRECI + CNPJ | BrasilAPI + ReceitaWS + consulta CRECI |
| Incubadora OS | CNPJ | BrasilAPI + ReceitaWS |
| Clínica OS | CNES + CNPJ | CNES DataSUS + BrasilAPI |
| Jurídico OS | OAB + CNPJ | Consulta OAB + BrasilAPI |

Enriquecimento retorna razão social, endereço, CNAE/CBO, status cadastral, data de abertura, sócios (quando público). Dados pré-preenchidos no wizard, user apenas confirma/ajusta.

---

# PARTE XIV — STACK TÉCNICO CRAVADO

## 14.1 Frontend

[DEC] **React 19** — concurrent rendering, Suspense, Server Components opcionais, ecossistema dominante, pool máximo de devs. Versão anterior do documento citava React 18; atualizado para refletir estado atual da documentação oficial.

[DEC] **Vite 8+** — build e dev-server de nova geração, HMR instantâneo. Requer Node.js 20.19+ ou 22.12+ conforme documentação oficial. Crítico para iteração assistida por IA pelo ciclo de feedback rápido.

[INV] **TypeScript strict** — tipagem estrutural, previne bugs, torna código legível por agentes. Strict mode desde primeiro commit.

[DEC] **Tailwind CSS v4** — utility-first, performance de build moderna, CSS variables nativas. Requer navegadores modernos (compatibilidade mínima documentada oficialmente).

[DEC] **shadcn/ui** — componentes copyáveis (não dependência), customizável sem fork, baseado em Radix UI primitives (state-of-the-art em acessibilidade).

[DEC] **Zustand** — state management minimalista, múltiplos stores, sem boilerplate, dev-tools. Combinado com **React Router** ou **TanStack Router** para URL routing (modelo híbrido; ver 4.4).

[DEC] **Framer Motion** — animações do OS shell, transições de janela/aba.

[DEC] **Service Worker + Workbox** — PWA offline-first, cacheamento de apps.

**Alternativas rejeitadas [DEC com rationale documentado]:**
- Next.js — SSR desnecessário para app autenticado; custo adicional de infraestrutura de roteamento não justificado para este caso (reavaliável se demanda de SEO em landing pages crescer muito)
- Solid/Svelte/Qwik — ecossistema menor; custo de adoção supera ganho marginal
- Angular — verboso, pesado, menor pool de devs
- Redux — over-engineering para este caso
- Material-UI/Ant Design/Chakra — visualmente opinativos demais

## 14.2 Backend

**Node.js + Express + TypeScript** — consistência de linguagem com frontend, pool de devs, ecossistema NPM.

**Drizzle ORM** — schema em TS, queries tipadas, migrations versionadas. Leve, não esconde SQL, escape hatches explícitos.

**Supabase** — Postgres gerenciado (RLS nativo, pgvector, pg_cron), Auth integrado, Storage S3-compatible, Realtime via WebSocket, Edge Functions. Cobre 80% do backend sem código próprio.

**pgvector** — busca vetorial para RAG. Substitui necessidade de Pinecone/Weaviate externo.

**Alternativas rejeitadas:**
- Prisma — mais pesado que Drizzle, tenta esconder SQL
- Firebase — auth proprietário, vendor lock-in pior, RLS menos robusto
- PostgREST standalone — Supabase já empacota
- MongoDB — falta RLS verdadeira, tooling fraco para multi-tenant sério

## 14.3 Distribuição de apps

**MVP (Fase 1):** iframe apps com `.aeth` packages hospedados em Cloudflare R2 + CDN, origin própria por (app, tenant) para Same-Origin isolation, postMessage IPC estruturado.

**Fase 2:** Module Federation 2.0 via Rspack para apps nativos maduros. Mantém iframe para terceiros e para apps simples.

**Assinatura de bundles:** [INV] Assinatura Ed25519 (assimétrica) no manifest, validada pelo kernel contra chave pública registrada do desenvolvedor antes de carregar. Bundles não assinados ou com assinatura inválida são rejeitados. HMAC não é aceito — ver Parte V.3 para rationale completo sobre a escolha entre assinatura simétrica e assimétrica em ecossistema multi-desenvolvedor.

## 14.4 Infraestrutura

**Hosting do kernel:** Vercel ou Cloudflare Pages (edge deploy, CDN global, zero-config).

**CDN de apps:** Cloudflare R2 (S3-compatible, sem egress fees) + Cloudflare CDN.

**Backend API:** Supabase Edge Functions para jobs leves, Node.js em Railway/Fly.io para jobs pesados.

**Jobs assíncronos:** pg_cron para jobs simples agendados; Supabase Queues ou BullMQ para jobs complexos.

**Observability:** Sentry (errors), PostHog (analytics), OpenTelemetry (traces).

## 14.5 Enforcement mecânico

**dependency-cruiser** configurado em CI. Regras:
- `packages/kernel/**` não importa de `packages/verticals/**` (viola P1)
- `packages/verticals/*/**` não importa de `packages/verticals/other/**` (viola P2)
- Apps isolados de terceiros não importam nada do kernel diretamente (comunicam via SDK)

Build falha se violação detectada. Impossível violar por engano.

**Outras guardrails:**
- Pre-commit hooks com lint + format + type check
- PR requer code review humano
- Commits assinados via GPG/SSH
- Dependabot para dependências
- FOSSA/Snyk para audit de licenças (nenhuma AGPL/GPL viral)

---

# PARTE XV — LICENCIAMENTO, PROTEÇÃO LEGAL E ESTRATÉGIA ANTI-FORK

Esta Parte é crítica. O histórico recente mostra que toda plataforma source-available ou open-core bem-sucedida eventualmente enfrenta tentativa de hyperscaler ou comunidade hostil de forkar e oferecer como concorrente. MongoDB, Elastic, HashiCorp, Redis — todos passaram por isso. Aethereos precisa ser protegida desde o primeiro commit.

## 15.1 A licença BUSL v1.1 para o kernel

**Business Source License v1.1** aplicada ao kernel Aethereos. Escolha baseada em:

- **Defensável legalmente** — licença pública, redação profissional por MariaDB Corporation, uso comprovado por HashiCorp (Terraform 2023), CockroachDB, Sentry (antes de migrar para FSL)
- **Source-available, não open source pela definição OSI** pela definição OSI — mas funcionalmente equivalente para maioria dos usos
- **Qualquer um pode ler, modificar, usar internamente, distribuir** — sem fricção para devs e empresas
- **Additional Use Grant** customizado restringe uso específico — no nosso caso, **proibido oferecer como hosted/managed SaaS concorrente ao Aethereos Cloud**
- **Conversão automática em Apache 2.0 após 4 anos** — cada release de código vira totalmente livre após período. Tranquiliza a comunidade de que eventualmente tudo fica aberto

Texto exato do Additional Use Grant (rascunho para revisão jurídica):

```
Additional Use Grant: You may make production use of the Licensed Work, 
provided such use does not include offering the Licensed Work to third 
parties on a hosted or managed basis that competes with Aethereos Cloud 
or any Aethereos-branded commercial offering.

A "competing hosted or managed service" is one where a third party 
provides users with access to substantial features of the Licensed Work 
in a manner that those users would otherwise seek from Aethereos Inc.
```

Change License: Apache License 2.0.
Change Date: Four years from the date the Licensed Work is published.

## 15.2 Aethereos Services como produto proprietário

Separação mecânica crítica:

**Repo público (kernel BUSL):**
```
aethereos/
├── packages/kernel/*         # OS shell, SCP, VFS, RLS, etc.
├── packages/kernel-apps/*    # Apps invariantes (Drive, RH, Chat, etc.)
├── LICENSE                   # BUSL v1.1
├── README.md
└── ... (docs, CI, etc.)
```

**Repo privado (Aethereos Services):**
```
aethereos-services/
├── services/aether-ai-copilot/     # Copiloto LLM proprietário
├── services/magic-store-official/  # Backend oficial da Magic Store
├── services/auth-federated/        # Auth federada cross-tenant
├── services/inteligencia-coletiva/ # Benchmarks anonimizados
├── services/billing/               # Cobrança, planos, revenue share
├── services/compliance-tools/      # LGPD, SOC 2, auditorias
├── LICENSE                         # Commercial (proprietária)
└── ...
```

O kernel público importa Services via SDK público + chave de licença. Chave é validada contra servidor Aethereos. Sem chave válida, Services retornam erro; kernel degrada graciosamente (alguns apps mostram placeholder "requer Aethereos Services" no lugar de conteúdo).

**Distribuições oficiais** (B2B AI OS Brazil, Imobiliário OS, Incubadora OS) recebem chave válida como parte do contrato comercial. **Forks independentes** não recebem chave. É a arquitetura que força o uso dos Services, não a licença.

Esse padrão é exatamente Google AOSP + Google Mobile Services. Amazon tentou fugir disso com Fire OS (Android forkado sem GMS) e virou irrelevância.

## 15.3 Trademark portfolio

Registros obrigatórios antes do lançamento público:

- **"Aethereos"** no INPI (Brasil) classes 9 (software) e 42 (serviços de TI). Custo ~R$ 500.
- **"Aethereos"** no USPTO (EUA) classes 9 e 42. Custo ~US$ 350.
- **"Aether AI Copilot"** mesmos procedimentos. Verificar conflito com GitHub Copilot antes.
- **"Magic Store"** — verificar disponibilidade, pode conflitar com marcas existentes.
- **"SCP" / "Software Context Protocol"** — tentar registro; pode ser difícil por ser descritivo.
- Domínios: aethereos.com, .io, .dev, .ai, .org, .br, .app, .cloud (comprar todos).

**Política agressiva de marca:** forks podem existir (BUSL permite) mas **não podem usar o nome Aethereos**. Se surgir "OpenAethereos" ou "Aethereos Community Edition", cease-and-desist imediato. Terceiros precisam rebatizar. Esse foi exatamente o destino frustrado do Elastic — OpenSearch teve que rebatizar, não pôde continuar como "Elasticsearch".

## 15.4 CLA obrigatório

**Contributor License Agreement** obrigatório para toda contribuição externa. Sem CLA, PR não é merged.

Opções:
- **CLA tradicional via CLA Assistant bot** — signature eletrônica ao abrir PR pela primeira vez
- **DCO (Developer Certificate of Origin)** — sign-off simples em cada commit via `git commit -s`

Recomendação: CLA tradicional, porque dá mais proteção legal explícita, permite relicenciamento futuro se necessário.

O CLA transfere licença ampla ao Aethereos Inc, incluindo direito de relicenciar. Isso protege capacidade futura de mudar licença (ex: migrar de BUSL para Apache mais cedo, ou vice-versa se necessário) sem precisar rastrear cada contribuidor individualmente.

## 15.5 A estratégia anti-fork completa

Três camadas de proteção combinadas formam fortaleza defensável:

**Camada 1 — Licença BUSL com Additional Use Grant.** Qualquer um pode forkar, modificar, usar. **Não pode** oferecer como SaaS hospedado concorrente. Qualquer tentativa cai em cláusula contratual explícita — litígio claro, não cinzento.

**Camada 2 — Aethereos Services proprietário separado.** O kernel forkado funciona mas é carcaça. Magic Store oficial, Aether AI Copilot, inteligência coletiva, billing — tudo isso está em repo privado. Forkador precisa reimplementar do zero (anos de trabalho) ou conviver com produto mutilado.

**Camada 3 — Trademark "Aethereos" registrado.** Fork não pode usar o nome. Precisa rebatizar. Usuários procurando Aethereos não encontrarão o fork.

**Cenário de ataque analisado:** AWS decide lançar "Aethereos on AWS". Barreiras:
- Licença BUSL impede oferta como SaaS concorrente → litígio jurídico
- Services proprietário não está disponível → produto mutilado
- Marca Aethereos impede uso do nome → precisa ser "AWS Business OS" ou algo assim
- Reimplementação dos Services levaria 2-3 anos de engenharia pesada
- No fim das contas, AWS teria produto mutilado, com nome diferente, e risco jurídico. Economicamente não compensa.

Esse é o fosso defensável.

---

# PARTE XVI — MODELO DE MONETIZAÇÃO

## 16.1 Tiers de assinatura

### Produto individual standalone

Empresa paga por acesso a um produto da família (Comércio Digital, Logitix, Kwix, Imova). Preço próprio do produto. Sem Aethereos OS, sem integração via SCP com outros apps. Porta de entrada de menor fricção.

### Aethereos Bundle Pro

Empresa paga assinatura única que dá acesso a **todos os apps nativos da vertical** + **Aethereos OS integrado** + **SCP bus ativo** + **Aether AI Copilot com quotas padrão** + **Magic Store filtrada completa**. Preço com desconto significativo versus comprar cada produto individualmente. Upsell natural.

### Aethereos Bundle Enterprise

Bundle Pro + **agentes customizados** + **Governance-as-Code avançada** + **SLA dedicado** + **suporte prioritário** + **custom SSO** + **audit logs customizados** + **compliance consultoria (LGPD, SOC 2)** + **inteligência coletiva priorizada**. Para empresas grandes, tipicamente precificação customizada por conta/faturamento.

## 16.2 Magic Store revenue share

- Apps gratuitos: zero revenue share
- Apps pagos/assinatura: 15% primeiro ano, 10% anos seguintes
- Apps enterprise com venda direta: negociado, tipicamente 5-10%

Compara favoravelmente com Apple (30/15%) e Google Play (30/15%). Diferencial competitivo para atrair desenvolvedores third-party.

## 16.3 Aethereos Services para distribuições

Distribuições oficiais (B2B AI OS Brazil, Imobiliário OS, Incubadora OS) operadas pela Aethereos Inc — monetização direta de assinaturas.

Distribuições criadas por terceiros (futuro, quando programa de parceiros estiver maduro) — modelo de licenciamento:
- **Licença de uso do Aethereos Core** — gratuita
- **Licença de uso dos Aethereos Services** — percentual do MRR gerado pela distribuição (tipicamente 20-30%) ou fee fixo mensal por tenant ativo
- **Selo "Aethereos Compatible"** — requer conformidade com Aethereos Compatibility Definition, testes automatizados do Aethereos Compatibility Test Suite, pagamento de certificação

Modelo inspirado diretamente no Android + Google Mobile Services.

## 16.4 Aethereos Compatible Program

Programa de certificação oficial para distribuições terceiras (médio-longo prazo, quando ecossistema crescer):

- **ACD (Aethereos Compatibility Definition)** — documento técnico de requisitos mínimos
- **ACTS (Aethereos Compatibility Test Suite)** — testes automatizados executáveis
- **Selo oficial** — licenciado via contrato, renovação anual
- **Fee structure**: gratuito para OSS/educacional, pago para comercial (escalonado por tamanho)
- **Aethereos Services** — acesso concedido apenas a distribuições certificadas

## 16.5 Aethereos Academy

Sistema de aprendizado e certificação estruturado. Quinto pilar de monetização e, estrategicamente, reforçador de defensibilidade do ecossistema.

### Estrutura

**Trilhas para operadores finais** (usuários de empresas que operam no Aethereos):
- Trilha básica por vertical (ex: "Operador Aethereos B2B AI OS Brazil", "Operador Aethereos Imobiliário OS")
- Módulos interativos rodando dentro do próprio OS (usuário aprende cada app clicando em cenários reais, com Aether AI Copilot como tutor contextual)
- Certificação após exame prático
- Duração típica: 8-20 horas por trilha

**Trilhas para desenvolvedores**:
- "Aethereos Developer Fundamentals" — SDK, CLI, primeiro app
- "Aethereos App Architecture" — padrões de apps nativos, SCP events, permissions
- "Aethereos Connector Development" — bridges com sistemas externos, MCP
- "Aethereos Agents Development" — Action Intents, políticas, autonomia
- "Aethereos Vertical Creation" — criar manifesto de vertical (Horizonte 3+)

**Trilhas para parceiros**:
- "Aethereos Compatible Integrator" — criar distribuições certificadas
- "Aethereos Enterprise Deployment" — para consultores que implementam em clientes grandes

### Formato

Plataforma própria em `academy.aethereos.com`. Usa o próprio Aethereos como plataforma (dogfood). Certificados emitidos via Open Badges (padrão W3C), verificáveis externamente. Integração com LinkedIn para exibição de credenciais.

### Monetização

- **Trilhas básicas de operador**: gratuitas (reduz fricção de adoção em empresas clientes)
- **Certificações profissionais**: pagas (R$ 200-1.500 conforme complexidade)
- **Trilhas de desenvolvedor**: freemium (módulos básicos grátis, avançados pagos)
- **Trilhas de parceiro**: pagas + contrato comercial (parceiros certificados pagam anuidade)
- **Academia enterprise**: contratos corporativos para treinar times inteiros

### Precedente comprovado

Analogia direta: AWS Training & Certification, Salesforce Trailhead, HubSpot Academy, Databricks Academy. Cada uma é unidade lucrativa standalone que, mais importante, **reforça defensibilidade do ecossistema**: uma empresa que treinou 50 pessoas em Salesforce não vai trocar facilmente por competidor. Mesma dinâmica aplica.

### Conexão com Magic Store

Desenvolvedores certificados ganham selo no perfil da Magic Store. Apps publicados por devs certificados recebem destaque. Empresas clientes veem claramente quem passou por formação oficial. Cria tiering de qualidade explícito.

---

# PARTE XVII — ROADMAP ESTRATÉGICO E MVP BLOCKS

## 17.1 Bloco 1 — Kernel mínimo (8-10 semanas)

**Objetivo:** provar pipeline end-to-end de kernel + app remoto + SCP + auth + RLS.

**Entregas:**
- OS Shell completo (Dock, TopBar, TabBar, Mesa, AppFrame)
- Supabase Auth + Zustand store de navegação + RLS em tabelas core
- Magic Store client básico (listagem, instalação manual)
- **Crítico**: primeiro iframe app carregado remotamente via manifest
- SCP bus básico (sem Context Engine ainda)
- Aether AI Copilot Fase 1 em modo mínimo (chat)

**Critério de aceite:** primeiro app third-party hipotético carrega via bundle remoto, autentica, emite evento SCP, aparece no audit log.

## 17.2 Bloco 2 — Vertical system (4-6 semanas)

**Objetivo:** primeira vertical completa operacional.

**Entregas:**
- Tabela `verticals` + schema de manifesto
- Aplicação de branding em runtime
- Setup wizard completo para B2B AI OS Brazil
- Onboarding com CNPJ + enriquecimento BrasilAPI
- Tenant provisioning automatizado
- Pré-instalação de apps bundled
- Mesa padrão com widgets da vertical

**Critério de aceite:** empresa nova cadastra via wizard em <90s, chega ao desktop customizado com branding B2B AI OS Brazil e apps pré-instalados.

## 17.3 Bloco 3 — Magic Store + primeiros apps nativos (6-8 semanas)

**Objetivo:** primeiros apps nativos da família funcionando embebidos.

**Entregas:**
- Magic Store completa com policy engine de visibilidade composta
- UI da Magic Store com filtros, busca, categorias
- Comércio Digital e Kwix publicados como bundles `.aeth` separados
- Instalação/desinstalação por tenant
- Primeiros eventos SCP emitidos por apps nativos

**Critério de aceite:** tenant B2B instala Comércio Digital da Magic Store, cria pedido, evento aparece em Event Store, Kwix (também instalado) consome e cria conta a receber automaticamente.

## 17.4 Bloco 4 — SCP + Context Engine + AI completos (4-6 semanas)

**Objetivo:** AI-native genuíno em operação.

**Entregas:**
- Context Engine completo (Enrichment-at-Transport)
- Event Store particionado com pgvector
- Aether AI Copilot Fase 1 integrado (Claude API + RAG sobre SCP)
- External Signals de câmbio e commodities BR

**Critério de aceite:** Aether AI Copilot responde pergunta natural sobre histórico da empresa com citação clicável dos eventos-fonte. Pedido criado no Comércio Digital aparece no SCP já enriquecido com histórico comparativo e benchmark.

## 17.5 Bloco 5 — Connectors + MCP (4-6 semanas)

**Objetivo:** integração com sistemas externos via connectors e MCP.

**Entregas:**
- Connector app infrastructure (webhooks, OAuth vault, API job queue)
- Trello connector como primeiro caso de referência
- MCP Client App genérico
- Primeiros servidores MCP integrados (Google Calendar, GitHub)

**Critério de aceite:** card movido no Trello gera evento SCP `integrations.trello.card.moved`. Pedido no Comércio Digital pode criar card automaticamente no Trello via SCP → connector → API.

## 17.6 Bloco 6 — Governance + Agents (6-8 semanas)

**Objetivo:** primeiros agentes autônomos operando sob Governance-as-Code.

**Entregas:**
- Tabela `agents` em produção, agentes criáveis pelos clientes
- Action Intents iniciais (20-30 mais importantes da vertical B2B AI OS Brazil)
- Policy Engine com schema YAML
- Audit trail dual completo
- Primeiro agente operando: **"Agente de Classificação Documental"** — classifica automaticamente arquivos no Drive por tipo (contrato, fatura, guia, proposta), extrai metadados relevantes, sugere pasta destino. Autonomia nível 2 (executa classificação automática; pede confirmação humana para arquivamento).

**Critério de aceite:** cliente configura agente com política YAML no Policy Studio, agente classifica 100+ documentos com precisão > 90%, audit trail mostra ações com distinção `actor_type='agent'`, Trust Center exibe acurácia medida.

**Rationale da escolha:** versão anterior deste documento propunha "Agente Financeiro que reconcilia pagamentos automaticamente" como critério. Revisão crítica identificou que reconciliação bancária autônoma é produto inteiro (integração multi-banco, matching fuzzy, tratamento de juros/multas/estornos, validação LGPD de dados bancários) — não é escopo de 6-8 semanas. Classificação documental é problema tratável nesse prazo, entrega valor demonstrável para qualquer tenant, e exercita toda a arquitetura (Intents, Policy, Audit, Trust Center) sem depender de integrações complexas com terceiros.

Agentes mais ambiciosos (reconciliação financeira, cobrança automática, gestão de estoque) ficam para Horizontes 2-3, depois da arquitetura estar comprovada e da Workforce Híbrida estar operacional.

## 17.7 Horizontes estratégicos de longo prazo

**Horizonte 1 (meses 1-12):** Consolidação com primeira distribuição em construção (B2B AI OS Brazil como exemplo). AE AI Fase 1.

**Horizonte 2 (ano 2):** Validação de arquitetura em mais de uma distribuição. Magic Store começa abertura parcial a third-party certificados. AE AI Fase 2 (SLM local quando economicamente viável).

**Horizonte 3 (ano 3):** Maturidade AI-native. Agentes em autonomia nível 2-3 em domínios específicos com maturidade comprovada. MCP server exposto. SDK público para connectors.

**Horizonte 4 (ano 4+):** Ecossistema consolidado. Múltiplas distribuições em produção. SCP publicado como RFC aberta. Modelo proprietário de IA. Inteligência coletiva cross-tenant federada.

## 17.8 No-Go List do ano 1

[INV] Lista explícita do que **não entra** no primeiro ano de qualquer distribuição comercial construída sobre o Aethereos. Consolidação de decisões que estão espalhadas em outras partes do documento, aqui como contrato inequívoco. Esta lista elimina a tentação natural de cada responsável arrastar sua pet-feature para o MVP.

### Não entra no ano 1

**Marketplace aberto a publicação third-party.** Magic Store no ano 1 é catálogo privado curado — apps first-party da empresa mantenedora da distribuição + poucos parceiros certificados em Aethereos Compatible Program. Publicação aberta exige infraestrutura (revisão de segurança, sandbox, assinatura Ed25519 operacional, suporte a desenvolvedores externos, resolução de disputas, billing de parceiros) que é frente de produto independente. Entra apenas após PMF comprovado.

**Autonomia de escrita por agentes.** Agentes operam exclusivamente em níveis 0-1 (sem IA, ou sugere-e-humano-executa). Nenhum agente executa ação irreversível sem aprovação humana explícita. Shadow Mode coleta dados comportamentais mas não aplica ações. Freio agêntico (11.1) é invariante do primeiro ano.

**Offline-first completo (Aethereos Local).** IndexedDB + OPFS + fila offline + resolução de conflitos + criptografia local + replicação ordenada é frente de produto quase independente. Deferido até prova de demanda comprovada por clientes pagantes que justifiquem investimento (Parte 21.5).

**Múltiplas distribuições simultâneas.** Uma distribuição apenas no primeiro ano. Pluralidade de distribuições é promessa arquitetural validada quando a primeira está madura, não antes. Segunda distribuição só faz sentido após primeira gerar receita recorrente e ter base instalada estável.

**Collective intelligence cross-tenant avançada.** K-anonimidade básica (k ≥ 10, ruído ±3-5%, opt-in) pode existir para benchmarks simples, mas Federated Learning, Differential Privacy formal e simulação cross-tenant são deferidos para Horizonte 3+. No ano 1, inteligência é por tenant apenas.

**Simulation graph pesado (Digital Twin operacional avançado).** Simulação what-if de impactos operacionais é capability poderosa mas cara em desenvolvimento e computação. No ano 1, Digital Twin opera em modo degenerado (Parte XXI.4) — snapshot de estado atual, sem simulação.

**MCP server exposto publicamente.** Expor Aethereos como servidor MCP consumível por IAs de terceiros é direção correta no Horizonte 3. No ano 1, MCP é apenas consumido internamente pelo Aether AI Copilot, não exposto.

**Agentes complexos multi-step com planejamento profundo.** Agentes no ano 1 são assistivos, não planejadores. "Organize meu trabalho na próxima semana" não é caso de uso do ano 1. "Me ajude a entender essas 50 faturas e sugira quais priorizar" é caso de uso válido.

**Federated Context Engine com sincronização cross-tenant.** Mesh federado dentro de um tenant (Parte 8.8) é válido. Federação entre tenants fica para Horizonte 3+.

**Differential Privacy formal.** K-anonimidade simples é suficiente para ano 1. DP formal com privacy budget gerenciado fica para Horizonte 3-4.

### O que isso significa operacionalmente

Backlog do ano 1 tem bloqueio automático para qualquer história que toque em item desta lista. PRs que adicionam código de suporte a esses items são recusados no CI. Discussões em planning sobre "mas seria ótimo se também fizéssemos X" têm resposta pronta: "X está na No-Go List do ano 1; revisamos após H1".

Essa disciplina preserva foco. Arquitetura do Aethereos suporta todos esses items — é parte do seu diferencial. Mas implementar todos simultaneamente é caminho conhecido de falha. Timing é parte da estratégia.

## 17.9 Tabela de criticidade por capability

[DEC] Consolidação tabular classificando cada capability significativa do kernel por **prioridade temporal** de execução. Tricotomia [INV]/[DEC]/[HIP] é ortogonal a esta tabela — uma capability pode ser [INV] (invariante arquitetural) e ainda assim "deferida" (não entra no MVP).

Classificação usada:

- **MVP Obrigatório** — entra no primeiro lançamento comercial. Implementação em modo pleno.
- **MVP Degenerado** — entra no primeiro lançamento em modo degenerado (Parte XXI.4). Evolui para modo pleno depois.
- **Pós-MVP Importante** — entra nos 6-12 meses seguintes ao primeiro lançamento.
- **Deferido** — entra somente após demanda comprovada ou evidência de necessidade.
- **Experimental** — capability em estudo, sem compromisso de implementação.

### Kernel

| Capability | Criticidade | Referência |
|---|---|---|
| OS Shell (Top Bar, Dock, Tab Bar, Mesa) | MVP Obrigatório | Parte IV |
| Virtual File System (VFS) | MVP Obrigatório | Parte IV |
| RLS multi-tenant | MVP Obrigatório | Parte X |
| Identidade e auth básica | MVP Obrigatório | Parte IV |
| IdP central com OIDC (SSO cross-domain) | Pós-MVP Importante (Bloco 3+) | Parte X.6 |
| Driver Model | MVP Obrigatório | Parte IV.7 |
| Client SDK `@aethereos/client` | MVP Obrigatório | Parte IV.8 |
| Apps invariantes (Drive, RH, Configurações, Dashboard, Chat, Notificações) | MVP Degenerado (versões mínimas) | Parte IV |
| Schema separation por app | MVP Obrigatório (partir do Bloco 3) | Parte X.5 |
| Contratos de dados (views canônicas versionadas) | MVP Obrigatório (partir do Bloco 3) | Parte X.5.2 |

### Magic Store e apps

| Capability | Criticidade | Referência |
|---|---|---|
| Magic Store como catálogo curado de first-party | MVP Obrigatório | Parte V |
| Apps first-party primeiros (definidos por distribuição) | MVP Obrigatório | Parte VII.1 |
| Formato `.aeth` com Ed25519 para apps third-party | Pós-MVP Importante | Parte V.3 |
| Marketplace third-party aberto à publicação pública | **Deferido (No-Go ano 1)** | Parte V |
| Module Federation 2.0 via Rspack para apps nativos | Pós-MVP Importante (Fase 2) | Parte IV |

### SCP

| Capability | Criticidade | Referência |
|---|---|---|
| Quatro camadas do SCP (bruto, contexto, insight, ação governada) | MVP Obrigatório | Parte 8.3 |
| SCP Core Profile (taxonomia, versionamento, idempotência, etc.) | MVP Obrigatório | Parte 8.10 |
| Event Store append-only | MVP Obrigatório | Parte 8.5 |
| Context Engine kernel (enriquecimento genérico) | MVP Degenerado | Parte 8.3, 8.8 |
| Context Engines de domínio especializado (mesh federado) | Pós-MVP Importante | Parte 8.8 |
| Quantificação de incerteza como saída padrão | MVP Obrigatório | Parte 8.9 |
| Context Decay com meia-vida configurável | Pós-MVP Importante | Parte 8.4 |
| Time Travel sobre Event Store | Pós-MVP Importante | Parte 12.8 |
| Company Graph materializado | MVP Degenerado | Parte 8.6 |
| Process Radar com process mining | Pós-MVP Importante | Parte 8.7 |

### AI-Native

| Capability | Criticidade | Referência |
|---|---|---|
| Aether AI Copilot Fase 1 (Claude API + RAG) | MVP Obrigatório | Parte 11.2 |
| Agentes em níveis 0-1 (read-only + suggestion-first) | MVP Obrigatório | Parte 11.1 |
| Agentes em níveis 2+ (autonomia de escrita) | **Deferido (No-Go ano 1)** | Parte 11.1 |
| Action Intents + Policy Engine avaliação | MVP Obrigatório | Parte 11.4, 11.5 |
| Audit trail dual | MVP Obrigatório | Parte 11.6 |
| Governance-as-Code (YAML) | MVP Obrigatório | Parte 11.5 |
| Policy Studio (editor visual) | Pós-MVP Importante | Parte 11.14 |
| Preservação de intenção original em linguagem natural | Pós-MVP Importante | Parte 11.14 |
| Shadow Mode | MVP Degenerado (logging apenas, sem graduação) | Parte 11.8 |
| Circuit Breaker Humano | MVP Obrigatório (modo simples) | Parte 11.13 |
| Classe de risco A/B/C por feature | MVP Obrigatório | Parte 11.16 |
| Trust Center com AI Evals formais | Pós-MVP Importante | Parte 11.15 |
| Workforce Híbrida (agentes no organograma) | Pós-MVP Importante | Parte 11.12 |
| Digital Twin operacional | MVP Degenerado | Parte 11.9 |
| SCP Choreography multi-agente | Deferido | Parte 11.10 |
| Observabilidade agêntica nativa (LLM tracing) | MVP Obrigatório | Parte 11.11 |
| Aether AI Fase 2 (SLM local) | Deferido (quando ~100M tokens/mês) | Parte 11.2 |
| Aether AI Fase 3 (modelo proprietário) | Experimental | Parte 11.2 |

### Connectors e integração

| Capability | Criticidade | Referência |
|---|---|---|
| Framework de connectors (abstração genérica) | MVP Obrigatório | Parte IX |
| Primeiros connectors específicos (decisão da distribuição) | MVP Obrigatório | Parte IX |
| SCP Bridge on-premise (CDC de ERPs legados) | Pós-MVP Importante | Parte IX.7 |
| MCP consumido pelo Aether AI Copilot | MVP Obrigatório | Parte IX.6 |
| MCP exposto publicamente (Aethereos como servidor MCP) | Deferido | Parte IX.6 |

### Verticais

| Capability | Criticidade | Referência |
|---|---|---|
| Manifesto JSON de distribuição | MVP Obrigatório | Parte VI |
| Storefront filtrada | MVP Obrigatório | Parte 6.4 |
| Compliance-as-Code por distribuição | MVP Obrigatório | Parte 6.5 |
| Hooks executáveis versionados | Pós-MVP Importante | Parte 6.6 |
| Frameworks pluggable (financial, tax, identifier) | MVP Obrigatório (interfaces); MVP Degenerado (implementações da primeira distribuição) | Parte XXI.1-3 |
| Segunda distribuição simultânea | **Deferido (No-Go ano 1)** | — |

### Garantias

| Capability | Criticidade | Referência |
|---|---|---|
| Segurança em 5 camadas | MVP Obrigatório | Parte 12.1 |
| LGPD integral com direitos do titular instrumentados | MVP Obrigatório | Parte 12.2 |
| Criptografia AES-256 at rest + TLS 1.3 | MVP Obrigatório | Parte 12.1 |
| k-anonimidade (k ≥ 10, ruído, opt-in) | Pós-MVP Importante | Parte 12.3 |
| Differential Privacy formal | Deferido (H3-H4) | Parte 12.3 |
| Federated Learning + Consent Receipts | Deferido | Parte 12.9 |
| Notarização imutável (OpenTimestamps) | Pós-MVP Importante | Parte 12.10 |
| PII Vault | Pós-MVP Importante | Parte 12.11 |
| Business Observability (business traces) | Pós-MVP Importante | Parte 12.12 |
| Aethereos Local (offline-first completo) | **Deferido (No-Go ano 1)** | Parte 21.5 |
| Interface Adaptativa por Contexto | Pós-MVP Importante (modo restrito) | Parte 21.6 |

### Por que essa tabela importa

Listar criticidade explicitamente remove decisões ad hoc sobre escopo. Em planning, pergunta "isso entra no MVP?" tem resposta consultando a tabela. Mudanças de classificação exigem ADR explícito — não se movem capabilities para "MVP Obrigatório" em decisão de corredor.

A tabela também preserva a tricotomia de rigidez: uma capability [INV] (invariante arquitetural) pode ser "Deferida" (não entra no MVP). Exemplo: Modo Degenerado é [INV] (princípio P14), e por isso mesmo viabiliza que muitas capabilities entrem como "MVP Degenerado" em vez de "Deferido".

A tabela é viva — atualizada ao longo do tempo conforme evidência de mercado e operação acumula. Mudanças são ADRs versionados; histórico preservado.

---

# PARTE XVIII — POSICIONAMENTO COMPETITIVO

## 18.1 Mapa competitivo

| Categoria | Players | Limite em relação ao Aethereos |
|---|---|---|
| ERP tradicional | SAP, Totvs, Oracle, Sankhya | Sistema único de aplicação; não multi-vertical; UX envelhecida; não AI-native |
| Middleware / iPaaS | Kafka, MuleSoft, Zapier, n8n | Transporta dados crus; não enriquece; sem UI própria; multi-tenant fraco |
| BI / Analytics | Tableau, Power BI, Looker | Apenas visualização; não opera; não transacional |
| Decision Intelligence | FICO, SAS, IBM, Aera | Opera para uma empresa; não multi-vertical; não AI-native de fato |
| SaaS vertical tradicional | RD Station, Conta Azul, Pipefy | Monolito por vertical; não reutiliza infraestrutura |
| Plataformas de produtividade | Microsoft 365, Google Workspace | Não B2B-operacional; não source-available; não customizável por vertical |

Aethereos combina propriedades de cada categoria mas com diferenciais específicos:
- Como ERP: é sistema de registro com apps transacionais
- Como middleware: transporta eventos enriquecidos (não crus)
- Como BI: visualiza e analisa
- Como Decision Intelligence: produz insights e recomendações
- Como SaaS vertical: produto pronto por nicho
- Como plataforma produtividade: OS integrador de apps

Mas:
- **Transporta com enriquecimento** (vs middleware cru)
- **Opera em ecossistema** (vs single-client Decision Intelligence)
- **Multi-vertical** (vs SaaS verticais isolados)
- **AI-native por design** (vs IA adicionada a sistema legado)
- **Opensource com produto proprietário** (vs proprietário puro)

## 18.2 Cinco diferenciais defensáveis

**1. Rede de efeitos via ecossistema.** Empresas contribuem (opt-in) para inteligência coletiva. Quanto mais empresas, mais valor para cada uma. Competidor que chega depois tem menos dados, menos benchmarks. Vantagem que se aprofunda com tempo.

**2. Especialização no mercado brasileiro.** B2B AI OS Brazil tem conhecimento acumulado sobre NCM, SEFAZ, LGPD, BrasilAPI, rotas logísticas brasileiras, padrões culturais. Competidor internacional precisa replicar. Competidor nacional precisa acumular.

**3. Arquitetura multi-vertical validada.** Construir kernel multi-vertical corretamente é difícil. Rigor arquitetural (dependency-cruiser, manifests, contratos) é fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monolito disfarçado.

**4. AI-native genuíno.** Agentes, Action Intents, audit dual, Governance-as-Code — tudo estrutural. Retrofit em competidor levaria 2-3 anos.

**5. Protocolo SCP aberto.** Permite conectores de terceiros sem esforço próprio. Quanto mais conectores, mais abrangente. Competidor com protocolo fechado constrói cada conector do zero.

**6. Modelo de distribuição source-available + proprietário.** Kernel BUSL aberto atrai desenvolvedores e evita vendor lock-in percebido. Services proprietário gera receita e cria fosso. Trademark e marca protegem identidade. Essa combinação é rara (Supabase, HashiCorp, Elastic fazem parcialmente) e poderosa.

## 18.3 Nova categoria emergente

A aposta estratégica é que uma nova categoria Gartner emergirá em 2-3 anos — algo como "**Multi-Vertical AI-Native Business Operating Systems**" ou "**Context-First B2B Platforms**". Se emergir, Aethereos está posicionado como um dos criadores da categoria. Se não emergir, Aethereos compete dentro das categorias existentes, diferenciando-se pela combinação única de propriedades.

Em qualquer cenário, a arquitetura vale.

---

# PARTE XIX — ECOSSISTEMA DOCUMENTAL

## 19.1 Hierarquia de documentos

| Documento | Função | Estabilidade |
|---|---|---|
| **AETHEREOS_FUNDAMENTACAO_v3.md** (este) | Constituição. Tese, arquitetura, princípios, garantias. | Máxima. Muda apenas em grandes inflexões. |
| MANUAL_DESENVOLVIMENTO.md | Operacional. Como desenvolver. Regras, padrões, skills. | Alta. Revisado periodicamente. |
| docs/adr/*.md | Decisões específicas. Uma ADR por decisão arquitetural. | Permanente (imutável pós-aceite). |
| CLAUDE.md | Regras do dia-a-dia para IA agentica. | Baixa. Muda sprint a sprint. |
| docs/sessions/*.md | Histórico cronológico. Uma entrada por sessão. | Imutável (append-only). |
| TECH_DEBT.md + MANUAL_ACTIONS.md | Pendências. Dívida técnica, ações manuais aguardando. | Dinâmica. |
| HANDOFF.md + docs/MAP.md | Navegação. Estado atual. Pontos de entrada. | Semanal. |
| BRIEFING_*.md | Snapshots factuais do código. | Imutável pós-geração. |

## 19.2 Papel deste documento

Este whitepaper é **referência para consulta longa**. Não é lido no início de cada sprint (isso é função do CLAUDE.md). Não é memorizado. É consultado quando:

- Nova pessoa (ou agente) se junta ao projeto e precisa entender o todo
- Surge dúvida arquitetural profunda
- Decisão cotidiana parece violar algum princípio
- Pitch externo (investidor, candidato, parceiro)
- Revisão anual da estratégia

---

# PARTE XX — TAREFAS, CERTIFICAÇÕES E PRÓXIMOS PASSOS

## 20.1 Fase 1 — Pré-lançamento (crítico antes de tornar público)

**Jurídico e societário:**
1. Constituir empresa jurídica detentora de IP — "Aethereos Inc." (Delaware LLC) ou "Aethereos Tecnologia Ltda" (Brasil)
2. Registrar trademark "Aethereos" no INPI (Brasil) classes 9 + 42
3. Registrar trademark "Aethereos" no USPTO (EUA) classes 9 + 42
4. Registrar trademark "Aether AI Copilot" (após verificar conflito com Microsoft/GitHub)
5. Registrar trademark "Magic Store" (após verificar disponibilidade)
6. Comprar portfolio de domínios: aethereos.com, .io, .dev, .ai, .org, .br, .app, .cloud
7. Designar DPO (Data Protection Officer) — obrigatório LGPD
8. Redigir Termos de Uso
9. Redigir Política de Privacidade (LGPD + GDPR compliant)
10. Redigir Developer Agreement para Magic Store
11. Redigir contratos de distribuição oficial (para futuras verticais de terceiros)

**Documental no repositório:**
12. `LICENSE` — texto BUSL v1.1 com Additional Use Grant customizado
13. `README.md` — pitch, getting started, quickstart em <5 min
14. `CONTRIBUTING.md` — como contribuir, requisitos de PR, sign-off, style guide
15. `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1 adaptado
16. `SECURITY.md` — reporting responsável de vulnerabilidades (security@aethereos.com)
17. `TRADEMARK_POLICY.md` — regras de uso da marca (ver arquivo separado)
18. `GOVERNANCE.md` — como decisões arquiteturais são tomadas (ADR process)
19. `CLA.md` — Contributor License Agreement (ver arquivo separado)
20. `ARCHITECTURE.md` — overview técnico de alto nível
21. `FAQ.md` — antecipar perguntas comuns
22. CLA Assistant bot instalado no GitHub

**Infraestrutura técnica:**
23. Monorepo com duas árvores: `packages/kernel/*` (BUSL, público) e `packages/services/*` (proprietário, privado separado)
24. Build system que permite compilar kernel puro sem Services
25. Sistema de licenciamento de Services (API keys + validação server-side)
26. Assinatura GPG/SSH obrigatória em todos os commits
27. Dependabot + Renovate configurados
28. Audit de licenças de dependências (apenas MIT/Apache/BSD/ISC — nenhuma GPL/AGPL viral)
29. Signed releases via GitHub Releases + checksums SHA256
30. CI/CD completo (GitHub Actions) com testes + lint + type check + dependency-cruiser

## 20.2 Fase 2 — Lançamento (mês 0-6)

31. Launch público do repositório com todas as docs acima prontas
32. Landing page em aethereos.com com mensagem tripla (kernel OSS + produtos SaaS + OS integrador)
33. Docs públicos em docs.aethereos.com (Docusaurus ou Nextra)
34. Blog técnico em blog.aethereos.com
35. Discord/Slack da comunidade de desenvolvedores
36. Programa de early contributors (reconhecimento, swag, acesso antecipado)
37. Hacker News submission (aguardar momento certo — após ter produto demonstrável)
38. Posts técnicos no Dev.to, Medium, Lobsters
39. Apresentação em meetups técnicos brasileiros (Front-end BR, Node BR, etc.)

## 20.3 Fase 3 — Programa de Certificação (mês 6-18)

40. "Aethereos Compatible" program lançado publicamente
41. ACD (Aethereos Compatibility Definition) publicado
42. ACTS (Aethereos Compatibility Test Suite) publicado
43. Fee structure: gratuito OSS/educacional, pago comercial
44. Primeiras distribuições terceiras homologadas
45. Revenue share da Magic Store operacional

## 20.4 Certificações externas a conquistar

**Ano 1:**
46. LGPD compliance audit interno (DPO + assessoria jurídica)
47. Política de Segurança da Informação formalizada

**Ano 2:**
48. SOC 2 Type I — primeira auditoria formal (~US$ 15k)
49. ISO 27001 gap analysis

**Ano 3:**
50. SOC 2 Type II — auditoria de operação continuada (~US$ 30-50k)
51. ISO 27001 certificação formal

**Ano 4:**
52. ISO 27701 — extensão de privacidade
53. SOC 3 — versão pública das certificações
54. Se processar pagamentos: PCI-DSS compliance

## 20.5 Regras de disciplina open-core e source-available (inegociáveis)

- Nunca aceitar contribuição sem CLA assinado
- Código proprietário e código BUSL em repositórios rigorosamente separados
- Security issues sempre via canal privado primeiro (security@aethereos.com)
- Disclosure público só após fix disponível com janela coordenada
- Releases versionados por semver rigoroso com changelog
- Code review humano obrigatório em todo merge
- Nunca force-push em `main` ou branches de release
- Todos commits assinados com GPG/SSH
- Licenças de dependências auditadas (FOSSA ou Snyk)
- Nenhuma dependência AGPL ou GPL que contamine o kernel

## 20.6 Imediatos próximos passos

Em ordem de prioridade para os próximos 30 dias:

**Semanas 1-2 — Setup agêntico e fundacional** (ver Parte 21.9 para detalhamento dia a dia):

1. Setup do squad agêntico (Claude Code + sub-agents Architect, Coder, Reviewer + MCPs essenciais)
2. Monorepo skeleton (Turborepo + dependency-cruiser + ESLint custom + CI)
3. ADR-0001 fundadora escrita à mão
4. Supabase de dev + staging com Branching
5. Primeiro evento SCP end-to-end funcionando
6. Dogfood loop ativado no tenant interno "Aethereos Inc — Development Operations"

**Semanas 3-4 — Jurídico, marca e fundação comercial:**

7. Constituição jurídica da empresa (Aethereos Inc ou Tecnologia Ltda)
8. Registro de trademark no INPI — "Aethereos" como prioridade 1, "Aether AI Copilot" e "Magic Store" na sequência
9. Compra do portfolio de domínios (aethereos.com, .io, .dev, .ai, .org, .br, .app, .cloud)
10. Redação de LICENSE (BUSL v1.1 com Additional Use Grant customizado, revisado por advogado de PI)
11. Estrutura de monorepo estabelecida com separação rigorosa kernel público (BUSL) vs services privado (proprietário)
12. Primeiros commits com assinatura GPG
13. Landing page mínima em aethereos.com (teaser com mensagem tripla)
14. Início do Bloco 1 do MVP (OS Shell + auth + primeiro iframe app remoto)

**Em paralelo durante as 4 semanas:**

15. DPO (Data Protection Officer) designado
16. Política de privacidade + Termos de uso em rascunho
17. TRADEMARK_POLICY.md e CLA.md publicados no repo (já prontos, ver arquivos anexos)

---

# PARTE XXI — EXTENSÕES ARQUITETURAIS DO KERNEL

Esta Parte consolida **capabilities genéricas do kernel** que habilitam distribuições e produtos a serem construídos sobre o Aethereos, sem que estes sejam parte do kernel em si. São frameworks de extensão — infraestrutura que permite qualquer distribuição plugar suas próprias especialidades jurisdicionais, fiscais, financeiras ou de setor.

Distinção rigorosa mantida: o kernel **oferece os frameworks**; distribuições específicas (que não fazem parte deste documento fundacional) **usam os frameworks** para entregar experiências completas ao mercado. Versões anteriores desta Parte descreviam capabilities específicas de um mercado (Pix Automático, NFS-e nacional brasileira) como se fossem parte do kernel — essa confusão é corrigida aqui.

## 21.1 Framework de integração financeira pluggable

[INV] O kernel não conhece rails financeiros específicos (Pix, ACH, SEPA, SWIFT, cartões de crédito, carteiras digitais). O kernel oferece **abstrações pluggable** que distribuições e apps implementam conforme necessário.

### Interface

```typescript
// packages/kernel/frameworks/financial-rail.ts
interface FinancialRail {
  id: string;                      // "pix", "ach", "sepa", "swift", "card"
  country: string;                 // "BR", "US", "EU", "*"
  
  capabilities: {
    instant_transfer?: boolean;
    recurring_debit?: boolean;     // Pix Automático, débito automático, direct debit
    scheduled_payment?: boolean;
    international?: boolean;
  };
  
  initiate(params: PaymentInitiationParams): Promise<PaymentResult>;
  authorize_recurring(params: RecurringAuthorizationParams): Promise<Authorization>;
  reconcile(account_id: string, from: Date, to: Date): Promise<Transaction[]>;
  cancel(payment_id: string): Promise<CancellationResult>;
}
```

### Implementações oferecidas pelo kernel e por distribuições

**Kernel oferece** — registry de rails + abstração comum + contratos de eventos SCP (`financial.payment.initiated`, `financial.payment.confirmed`, etc.). Zero conhecimento de rails específicos.

**Distribuição para mercado brasileiro poderia implementar** — rails Pix (incluindo Pix Automático), TED, boleto, cartão via adquirentes brasileiros. Exposto como package `@aethereos-distro-br/financial-rails` ou similar.

**Distribuição para mercado americano poderia implementar** — rails ACH, Wire, Fedwire, cartão via Stripe/Adyen.

**Distribuição para mercado europeu poderia implementar** — rails SEPA Credit Transfer, SEPA Direct Debit, SEPA Instant.

Apps do Aethereos consomem via abstração. Mesmo app de contas a pagar funciona em qualquer jurisdição — apenas o rail implementado muda.

### Integração com Open Banking / Open Finance

Abstração similar para APIs de Open Banking/Finance. Distribuição brasileira pluga implementação Open Finance Brasil; distribuição americana pluga Plaid/Teller/Finicity; distribuição europeia pluga PSD2 providers.

## 21.2 Framework de integração fiscal pluggable

[INV] Mesmo padrão para obrigações fiscais. Kernel não conhece NCM, CFOP, NFS-e, Reforma Tributária — nem VAT europeu, sales tax americano, IVA latino. Oferece abstrações.

### Interface

```typescript
// packages/kernel/frameworks/tax-regime.ts
interface TaxRegime {
  id: string;                      // "br-industrial", "us-sales-tax", "eu-vat"
  jurisdiction: string;
  
  capabilities: {
    electronic_invoice?: boolean;  // NFS-e, NFe, e-invoice
    product_classification?: boolean; // NCM, HTS, combined_nomenclature
    tax_calculation?: boolean;
    reporting?: boolean;
  };
  
  classify_product(product: Product): ProductClassification;
  calculate_tax(transaction: Transaction): TaxCalculation;
  issue_document(params: DocumentIssuanceParams): Promise<FiscalDocument>;
  handle_rejection(document_id: string, rejection: RejectionDetails): Promise<Resolution>;
  generate_report(period: Period, report_type: string): Promise<Report>;
}
```

### Realismo regulatório

Distribuições podem evoluir rapidamente para acomodar mudanças regulatórias sem tocar no kernel. Quando Reforma Tributária do Consumo brasileira altera alíquotas em 2027, apenas a package `@aethereos-distro-br/tax-regime` atualiza — kernel e distribuições em outros países permanecem intactos.

## 21.3 Framework de identificadores fiscais e regulatórios

[INV] Kernel oferece abstração para identificação de pessoas jurídicas e pessoas físicas. Distribuições pluggam identificadores locais.

```typescript
// packages/kernel/frameworks/entity-identifier.ts
interface EntityIdentifier {
  id: string;                      // "br-cnpj", "us-ein", "eu-vat", "br-cpf"
  entity_type: "legal" | "natural";
  format_regex: string;
  
  validate(value: string): ValidationResult;
  enrich(value: string): Promise<EnrichedEntity>; // consulta a provedor de dados
  format(value: string): string;
}
```

Distribuições brasileiras pluggam CNPJ/CPF + enriquecedores (BrasilAPI, ReceitaWS). Distribuições americanas pluggam EIN/SSN + enriquecedores (Clearbit, equivalentes). Kernel permanece genérico.

## 21.4 Exemplos práticos de Modo Degenerado por componente

[INV] Concretizando o princípio P14 (Modo Degenerado obrigatório). Cada componente sofisticado do kernel é acompanhado de implementação degenerada mínima que permite o sistema rodar sem a sofisticação.

### Context Engine

| Componente | Modo pleno | Modo degenerado |
|---|---|---|
| Kernel Context Engine | Semantic embedding + comparações temporais + descoberta de relações | Apenas timestamp + correlation_id |
| Context Engine de domínio | Lógica especializada por domínio | Inexistente; kernel aplica apenas genérico |
| Context Decay | Meia-vida configurável por tipo de sinal | Sem decay; todos os eventos têm peso igual |

### Policy Engine

| Componente | Modo pleno | Modo degenerado |
|---|---|---|
| Avaliação YAML declarativa | Conjunto completo de condições, when, require_approval_if | Lista hardcoded de denies em código TypeScript |
| Simulação antes de publicar | Testa política contra histórico de 90 dias | Não existe; publicar é ativar direto |
| Diff entre versões | Visualização tipo GitHub | Apenas timestamp de modificação |
| Audit trail de decisão | Trilha completa com reasoning do Policy Engine | Apenas allow/deny + timestamp |

### Aether AI Copilot

| Componente | Modo pleno | Modo degenerado |
|---|---|---|
| Chat com RAG sobre SCP | Respostas contextualizadas com citação de eventos | Chatbot rule-based com FAQ |
| Integração com Trust Center | Métricas de qualidade por query | Sem métricas; uso "best effort" |
| Fallback entre modelos | Claude → SLM local se timeout | Sempre Claude API (sem fallback) |
| Quota por tenant | Configurável, throttling gradual | Quota rígida; cortar ao atingir |

### Company Graph

| Modo pleno | Modo degenerado |
|---|---|
| Grafo materializado com traversal eficiente | Não existe; queries relacionais tradicionais |
| Impact analysis via BFS/DFS sobre grafo | Relatório manual via SQL ad-hoc |
| Widget de visualização na Mesa | Lista textual simples |

### Process Radar

| Modo pleno | Modo degenerado |
|---|---|
| Process mining contínuo com visualização de fluxos reais | Relatório mensal gerado por query SQL e revisado manualmente |
| Detecção automática de desvios | Inexistente |
| Sugestões de otimização pelo Copilot | Inexistente |

### Trust Center

| Modo pleno | Modo degenerado |
|---|---|
| Dataset curado + regressão automática + painel público | Planilha manual de acurácia amostrada |
| Alertas de degradação | Checagem semanal manual |

### Shadow Mode e Circuit Breaker

| Modo pleno | Modo degenerado |
|---|---|
| Shadow Mode com digest e graduação automática | Toda ação de agente requer aprovação humana explícita; sem Shadow |
| Circuit Breaker com thresholds configuráveis | Owner monitora métricas manualmente em dashboard básico |

### Por que isso destrava execução

Sem Modo Degenerado, integração de 15 componentes sofisticados = projeto impossível. Cada componente depende do próximo; nenhum pode entrar antes dos demais. Com Modo Degenerado, o sistema sobe com qualquer subset implementado, evoluindo para modo pleno apenas onde ROI e dados justificam. Componentes "pulam" do degenerado para pleno quando estão prontos — não precisam esperar que todo o ecossistema esteja.

Esse princípio transforma a arquitetura sofisticada da v4.1 de "plano impossível" em "plano escalonado". É a contribuição mais importante da v4.1 para a viabilidade real da execução.

## 21.5 Aethereos Local — modo offline-first (capability deferida)

[HIP] Capability valiosa para mercados onde conectividade intermitente é norma (industrial remoto, construção civil, fábricas em zonas rurais). Reconhecimento honesto: é frente de produto quase independente que **não entra em primeiros lançamentos comerciais**.

### Por que é deferido

IndexedDB + OPFS + fila offline + resolução de conflitos + criptografia local + replicação ordenada formam camada complexa que drenaria time de engenharia durante períodos críticos de validação de mercado. Entra no roadmap apenas após:

- Prova de demanda comprovada por clientes pagantes que justificam desenvolvimento
- Arquitetura-base estável há ≥6 meses em produção
- Equipe com capacity dedicada para frente de produto dessa magnitude

### Descrição arquitetural para quando vier a ser construído

[DEC quando ativado] Cache completo do tenant localmente via IndexedDB + OPFS (Origin Private File System). Dados do tenant replicados para dispositivo com criptografia AES-256 at rest. Volume típico para PME industrial: centenas de MB a poucos GB — cabe em dispositivo moderno.

Event sourcing com replicação offline: usuário cria pedido offline, evento SCP bruto persistido em fila local (IndexedDB), UI atualiza otimisticamente, fila é drenada em ordem quando conexão retorna. Idempotência garantida via event_id UUID v7.

Conflitos resolvidos deterministicamente via CRDT-like resolution ou last-writer-wins conforme schema. Conflitos não resolvíveis automaticamente são enfileirados para resolução humana.

Service Worker + Workbox permanecem como infraestrutura, mas paradigma é "operate-fully-offline, sync-when-online", mais forte que "cache-first".

### Limite honesto

Viabilidade depende de volume de dados do tenant e capacidade do dispositivo. Empresas muito grandes (milhões de registros ativos) podem não caber em IndexedDB razoavelmente. Para esses casos, Aethereos Local opera em modo "dados críticos apenas" (últimos N dias + entidades principais); consulta histórica exige conexão.

## 21.6 Interface adaptativa por contexto (capability restrita)

[HIP] Interface que se adapta a papel, momento operacional, eventos ativos — com ressalvas explícitas. Capability marcada como hipótese por risco de mal uso: esconder features que usuário experiente precisa, "infantilizar" operadores, adaptação não-solicitada que quebra modelos mentais.

### Modalidades aceitáveis

**Modo operacional selecionável manualmente.** Empresa declara modos: Normal, Fechamento Mensal, Crise, Auditoria, Expansão. Cada modo é preset de widgets na Mesa, prioridade de notificações, políticas aplicadas. **Usuário escolhe manualmente** — sem IA decidindo por ele.

**Sugestão de próxima melhor ação.** Aether AI Copilot emite sugestões contextuais ("5 aprovações pendentes esperando você há mais de 2 horas", "faturamento mensal está 8% abaixo da meta, quer ver breakdown?"). Sugere visivelmente; não executa nem reorganiza UI silenciosamente.

**Resumo executivo automático.** Top Bar pode exibir, para roles apropriados, resumo diário gerado pelo Copilot: "Hoje: 47 pedidos fechados, 3 atrasos críticos, caixa projetado em linha."

### Modalidades proibidas

**Proibido** esconder features por "perfil inferido" sem controle manual explícito. **Proibido** reorganizar automaticamente a Mesa enquanto usuário trabalha. **Proibido** adaptar vocabulário ou linguagem com base em inferência de competência. Essas são armadilhas conhecidas de "UI inteligente" que causam frustração mensurável em estudos de UX.

### Princípio operacional

Adaptação é **sugestão visível**, nunca **reorganização invisível**. Usuário mantém autoridade final sobre sua experiência, alinhado com P12 (humano como autoridade final sobre agentes). Violações desse princípio em feature ship enviam produto de volta para revisão.

---

# PARTE XXII — CONSTRUÇÃO AGÊNTICA DO AETHEREOS

## Meta-arquitetura de desenvolvimento assistido por IA

Esta Parte é simultaneamente filosófica e operacional. Estabelece como o Aethereos é construído — não apenas o quê. A tese central é que um projeto da envergadura do Aethereos, construído por uma equipe enxuta em prazo agressivo, só é viável com equipe de agentes especializados orquestrados com disciplina.

E estabelece um princípio recursivo: **o Aethereos deve ser construído usando a mesma filosofia que entrega aos clientes**. Se a plataforma não serve para gerir o desenvolvimento do próprio Aethereos, não está pronta para nada.

## 22.1 O squad agêntico — não um Claude, mas sete

Um único Claude tentando fazer tudo é o anti-padrão. Performance cai, contexto se perde, decisões se contradizem. A solução é squad de agentes especializados, cada um com escopo, ferramentas e persona próprias.

### Composição mínima viável

**Architect Agent** — recebe requisitos de alto nível, decompõe em tarefas atômicas, escreve ADRs, consulta o Documento Fundacional (este mesmo documento) como constituição. Nunca escreve código de aplicação. Só decide. Trabalha em pareamento com o humano arquiteto para validação.

**Coder Agent** — recebe tarefa decomposta pelo Architect, implementa código conforme ADRs e padrões do Manual de Desenvolvimento. Roda testes localmente. Nunca toma decisões arquiteturais; se encontrar ambiguidade, para e pergunta ao Architect.

**Reviewer Agent** — revisa PRs contra os princípios P1-P10, checklist de segurança, padrões de código. Bloqueia merges que violam. Sugere refatorações pontuais.

**Tester Agent** — escreve testes de unidade, integração, E2E (Playwright). Valida cobertura. Roda test suite completo em cada PR.

**Security Agent** — audita RLS, permissões, input validation, dependências. Escaneia por vulnerabilidades conhecidas. Roda uma vez por sprint e em PRs que tocam autorização/autenticação.

**Doc Agent** — atualiza CLAUDE.md, docs/adr/, docs/sessions/ automaticamente quando código muda. Gera release notes. Mantém API reference.

**Refactor Agent** — roda periodicamente (mensal), identifica débito técnico via métricas, sugere refatorações em backlog específico. Nunca executa refatoração sem aprovação; apenas sugere.

### Orquestração via Claude Code sub-agents

Na prática concreta, a funcionalidade de sub-agents do Claude Code permite orquestrar esse squad sem infraestrutura custom. Cada sub-agent tem:

- `CLAUDE.md` próprio com sua persona + escopo + ferramentas permitidas
- Acesso apenas aos MCPs relevantes para sua função
- Contexto isolado (não poluído pelo trabalho dos outros)
- Um orquestrador principal (humano ou Claude top-level) que delega e integra resultados

Exemplo operacional:

```
Humano: "Preciso implementar o sistema de notificações push"
  ↓
Architect Agent: [lê v3 + CLAUDE.md + contexto atual]
                 "Proponho ADR-0042 com mecanismo de Web Push + 
                  Supabase Realtime. Aprova?"
  ↓
Humano: "Aprovado"
  ↓
Architect Agent: Decompõe em 8 tarefas atômicas e delega.
  ↓
Coder Agent: Implementa tarefas 1-3.
Tester Agent: Escreve testes para 1-3.
Reviewer Agent: Revisa PR.
Security Agent: Audita permissões.
Doc Agent: Atualiza CLAUDE.md e ADR.
  ↓
PR aprovada, merge.
```

Tempo de humano envolvido: aprovar ADR, responder perguntas de ambiguidade, aprovar merge final. Resto é agentic.

## 22.2 MCP como camada de ferramentas tipadas

Agentes não reinventam acesso ao sistema a cada tarefa. Eles consomem **ferramentas tipadas via MCP servers específicos do Aethereos**.

### Catálogo de MCPs internos do desenvolvimento

**`mcp-aethereos-dev-db`** — operações sobre banco Supabase de dev. Queries com RLS-aware. Inspect de schema. Snapshot/restore.

**`mcp-aethereos-scp`** — emitir eventos SCP em dry-run, replay de eventos históricos, inspecionar Event Store, validar schemas.

**`mcp-aethereos-policy`** — avaliar políticas contra intents propostos sem executar. Útil para Reviewer Agent e Security Agent.

**`mcp-aethereos-testing`** — rodar Playwright E2E contra tenant de teste isolado. Retorna screenshots de falhas.

**`mcp-aethereos-deploy`** — deploy canary automático com rollback em falha de métricas. Usado por Coder Agent apenas com aprovação humana.

**`mcp-aethereos-sandbox`** — executa código arbitrário em Docker isolado. Crítico para Security Agent rodar análises.

### Efeito secundário delicioso

Os **mesmos MCPs** que agentes de desenvolvimento usam são os que agentes de operação em produção (Aether AI Copilot e afins) consomem. A equipe de desenvolvimento dogfood a própria infraestrutura agêntica ao construí-la. Se um MCP é sofrido para Coder Agent usar, vai ser sofrido para um cliente também. Melhora intrínseca.

## 22.3 Feedback loops mecânicos, não documentais

Humanos esquecem princípios escritos. Mecânica não esquece. Investimento obrigatório desde o dia 1:

**dependency-cruiser em CI** bloqueia imports que violam P1 (kernel → vertical) ou P2 (vertical → vertical). Configuração uma vez, proteção perpétua.

**ESLint rules customizadas** impedem padrões anti-Aethereos: query SQL sem `company_id`, emit de SCP sem schema validation, app importando kernel interno direto em vez de via SDK público.

**Schema tests** verificam que todo event_type emitido tem schema Zod registrado no canonical schema registry.

**Contract tests** verificam que consumidores e emissores de eventos SCP estão alinhados.

**Snapshot tests** do shell UI impedem quebras visuais acidentais em componentes invariantes do kernel.

**Playwright E2E** roda fluxos críticos (onboarding, provisioning, install app, logout) em cada PR contra ambiente Supabase Branching dedicado.

**Migrations validadas** — toda migration passa por dry-run em snapshot do banco antes de aplicar. Rollback testado.

**Dependency audit** via FOSSA ou Snyk em CI. Nenhuma dependência com licença incompatível (AGPL/GPL) pode entrar. PRs com CVE conhecido em dependência são bloqueados até upgrade.

Cada mecanismo desses economiza uma classe inteira de bugs recorrentes. Com squad escrevendo código em paralelo, essa proteção mecânica é a diferença entre velocidade e caos.

## 22.4 Sistema de decisões agênticas versionadas (ADRs)

Toda decisão arquitetural gerada por IA vira ADR (Architecture Decision Record) imutável após aprovação.

### Fluxo

1. Architect Agent identifica necessidade de decisão (nova lib, novo padrão, mudança de abordagem)
2. Escreve ADR em `docs/adr/NNNN-<slug>.md` com: contexto, opções consideradas, decisão, consequências
3. Abre PR apenas para a ADR (sem código)
4. Humano (arquiteto, tipicamente o fundador) revisa em 5-10 minutos
5. Aprova, rejeita ou pede revisão
6. Se aprovado, merge. A partir desse momento, ADR é verdade operacional para todos os agentes
7. Contradição futura exige ADR novo que explicitamente supersede anterior com rationale

### Por que funciona

ADRs como documentos **imutáveis após aceite** criam base estável sobre a qual squad pode trabalhar. Architect Agent não precisa re-deliberar a cada sprint; consulta ADRs. Coder Agent não toma decisão arquitetural; segue ADRs. Reviewer Agent valida conformidade a ADRs.

Claude Code com MCP GitHub torna todo esse fluxo programático — PRs abertos por agentes, revisados por humanos em minutos, merged automaticamente.

### Estrutura recomendada de ADR

```markdown
# ADR-NNNN: Título Curto

## Status
Proposed | Accepted | Superseded by ADR-XXXX | Deprecated

## Context
Qual problema motiva essa decisão? O que estava em jogo?

## Decision
Qual decisão foi tomada? Em 2-5 frases claras.

## Alternatives Considered
- Opção A: rejeitada porque...
- Opção B: rejeitada porque...

## Consequences
Positivas: ...
Negativas ou compromissos: ...

## Related
- ADR-XXXX (se relacionado)
- Relates to Principle P#
```

## 22.5 Meta-observabilidade do próprio desenvolvimento

O processo de desenvolvimento com agentes precisa ser observável. Métricas semanais auditáveis pelo humano arquiteto:

- **Velocidade**: quantos PRs o squad produziu?
- **Qualidade bruta**: quantos merged sem alteração humana vs precisaram de push?
- **Áreas de dificuldade**: onde o squad trava mais? (geralmente UI delicada, bugs de concorrência, edge cases de integração)
- **Tempo humano**: quanto foi gasto em revisão, aprovação, correção? Está aumentando ou diminuindo ao longo das semanas?
- **Conformidade**: quais princípios P1-P10 foram mais violados em drafts? (indica onde CLAUDE.md precisa ser mais explícito)
- **Custo**: quantos tokens consumidos por task? Qual o custo em dólares por PR mergeado?

Com esses dados, o squad melhora iterativamente. O CLAUDE.md evolui com clarificações nos pontos mais fracos. Sub-agents são redefinidos quando patterns de falha emergem. Em 6 meses você tem squad especializado no Aethereos especificamente — algo que nenhum competidor tem.

### Dashboard da meta-observabilidade

Produto interno, mas com o mesmo padrão arquitetural do Aethereos: eventos SCP (`dev.pr.opened`, `dev.pr.merged`, `dev.review.blocked`, `dev.agent.failed`) emitidos pelos agentes sobre o próprio trabalho, persistidos no Event Store dedicado, visualizados em dashboard. **Os agentes de desenvolvimento operam sobre Aethereos**, não sobre ferramenta externa.

Isso é o dogfood máximo.

## 22.6 Ferramentas específicas da stack de desenvolvimento

Recomendação pragmática baseada em maturidade de 2026:

**Ambiente de desenvolvimento:**
- Claude Code como ambiente primário (substitui VS Code + Copilot)
- Sub-agents do Claude Code para o squad
- MCPs oficiais e community

**Infraestrutura de código:**
- Turborepo ou Nx para monorepo com caching incremental agressivo
- Changesets para versionamento de pacotes
- pnpm com workspaces

**CI/CD:**
- GitHub Actions para CI base
- Dagger.io para pipelines complexos como código TypeScript (agentes escrevem pipelines como escrevem apps)
- Vercel / Cloudflare Pages para deploy do kernel web

**Observabilidade de produção:**
- Sentry para erros
- PostHog (auto-hosted) para analytics de produto — alinha com filosofia source-available
- OpenTelemetry traces
- Langfuse (open source) para observabilidade dos agentes em produção — não reinvente

**Banco e dados:**
- Supabase Branching para ambientes por-PR com banco real
- pgvector nativo
- pg_cron para jobs agendados

**Manutenção:**
- Dependabot (nativo GitHub) + Renovate (mais sofisticado) rodando em paralelo
- FOSSA ou Snyk para compliance de licenças

**Containerização:**
- Docker sandboxes para execução isolada de código agêntico
- Ambientes reproduzíveis via devcontainers

## 22.7 Estrutura de repositório que facilita agentes

Agentes performam melhor quando estrutura é previsível, modular e contextualizada:

```
aethereos/
├── CLAUDE.md                        ← persona global, princípios P1-P10
├── docs/
│   ├── adr/                         ← decisões arquiteturais imutáveis
│   ├── sessions/                    ← histórico de desenvolvimento append-only
│   └── FUNDAMENTACAO_v3.md          ← ESTE documento
├── packages/
│   ├── kernel/                      ← BUSL v1.1
│   │   ├── core/
│   │   │   ├── CLAUDE.md            ← regras específicas para código core
│   │   │   └── src/
│   │   ├── apps-invariant/
│   │   │   ├── drive/
│   │   │   ├── rh/
│   │   │   ├── magic-store/
│   │   │   ├── settings/
│   │   │   ├── dashboard/
│   │   │   ├── chat/
│   │   │   ├── notifications/
│   │   │   └── aether-copilot/
│   │   └── sdk/                     ← SDK público consumido por apps
│   └── services/                    ← proprietário (repo privado linked via workspace)
├── apps/
│   ├── comercio-digital/            ← first-party SaaS com variant build
│   │   ├── packages/core/
│   │   ├── apps/standalone/
│   │   └── apps/embed/
│   ├── kwix/
│   ├── logitix/
│   ├── imova/
│   └── imova-business/
├── verticals/
│   ├── b2b-ai-os-brazil.json        ← manifesto vertical (dado, não código)
│   └── imobiliario-os.json
├── tooling/
│   ├── mcp-servers/                 ← MCPs específicos do Aethereos (internos + expostos)
│   │   ├── dev-db/
│   │   ├── scp/
│   │   ├── policy/
│   │   └── ...
│   ├── eslint-rules/                ← rules customizadas anti-drift
│   ├── dependency-cruiser/          ← regras de isolamento
│   └── scripts/
└── tests/
    ├── e2e/                         ← Playwright
    ├── contracts/                   ← SCP event contracts
    └── integration/
```

### CLAUDE.md hierárquico

Cada diretório relevante tem `CLAUDE.md` próprio que complementa o global. Agente navegando em `packages/kernel/core/` lê regras que dizem "este é código core — não importar de verticals, não importar de services, validação de schema obrigatória". Agente em `apps/comercio-digital/` lê "este é app first-party — variant build obrigatório, SCP events obrigatórios, consumir SDK público apenas".

Contextualização automática. O agente não precisa lembrar — ele lê o que é relevante para onde está trabalhando.

## 22.8 Aethereos construindo Aethereos — o dogfood máximo

O princípio recursivo mencionado na introdução desta Parte. Na prática:

Crie tenant interno no Aethereos-em-desenvolvimento chamado **"Aethereos Inc — Development Operations"**. Esse tenant é usado pela empresa para gerir o próprio desenvolvimento.

Agentes de desenvolvimento operam nesse tenant emitindo eventos SCP sobre seu trabalho:

- `dev.pr.opened` quando abrem PR
- `dev.architecture.decided` quando ADR é aceita
- `dev.test.failed` quando suite de testes quebra
- `dev.deploy.canary_started` quando deploy canary começa
- `dev.agent.decision` quando agente toma decisão relevante

Aether AI Copilot (rodando sobre o tenant de dev) resume o sprint para o humano fundador: "Esta semana, 47 PRs mergeados, 3 ADRs aprovadas, 1 deploy canary com rollback automático (bug em edge case de onboarding), tempo humano estimado: 6 horas, custo de tokens: $340."

Métricas de velocidade e qualidade emergem em dashboard natural do próprio Aethereos.

### Por que isso importa

**Primeira prova de conceito viva**. Antes de vender para cliente externo, o sistema já provou sua tese em uso real.

**Descoberta de problemas antes do cliente**. Qualquer deficiência na plataforma aparece primeiro para você. Friction points revelam-se com intensidade desproporcional.

**Cultura operacional alinhada**. A equipe constrói com a filosofia que entrega. Não há gap entre "como fazemos" e "como vendemos para outros fazerem".

**Testemunho mais credível do mercado**. Em pitch a investidor, cliente ou parceiro, a resposta a "funciona mesmo?" é "estamos rodando nossa operação nele há X meses, aqui estão as métricas".

Este é o teste brutal e honesto da arquitetura. Se o Aethereos não serve para gerir o desenvolvimento do próprio Aethereos, não serve para nada.

## 22.9 Recomendação prática: os primeiros 14 dias

Antes de tocar em código do kernel propriamente dito, faça nesta ordem:

**Dias 1-3 — Setup do ambiente agêntico.** Instalar Claude Code. Configurar MCPs necessários (GitHub, Supabase, Playwright, dev-db). Escrever primeiro esqueleto de `CLAUDE.md` global. Definir 3 sub-agents mínimos viáveis: Architect, Coder, Reviewer. Testar delegação simples.

**Dias 4-6 — Monorepo skeleton.** Turborepo configurado. Estrutura de diretórios conforme Parte 21.7. Dependency-cruiser rules para P1-P2. ESLint rules customizadas. Pre-commit hooks. CI pipeline básico em GitHub Actions.

**Dia 7 — ADR-0001 fundadora.** Escrever à mão (não confiar em agente ainda) a primeira ADR documentando tudo que está em `CLAUDE.md`. Isso ancora o squad. Todas ADRs subsequentes referenciam a primeira.

**Dias 8-9 — Infra Supabase.** Projeto Supabase de dev + staging. Branching por PR configurado. Primeiras tabelas do kernel com RLS já ativo. Seed data mínimo para testes.

**Dia 10 — Primeiro evento SCP end-to-end.** Emitir, persistir, consumir um evento dummy. É o "hello world" da plataforma. Se funciona, o resto flui. Se não funciona, pare e conserte antes de avançar.

**Dias 11-12 — Dogfood loop ativado.** Agentes de dev configurados para emitir eventos SCP sobre seu próprio trabalho no tenant interno. Dashboard mínimo (ainda que ugly) mostrando progresso do próprio desenvolvimento.

**Dias 13-14 — Primeira entrega real.** Pequena feature que valide pipeline: tenant criação via CLI, com RLS funcionando, com evento SCP emitido, com audit trail populado. Não é código bonito — é prova de que o pipeline todo funciona.

### Investimento e retorno

Esses 14 dias parecem "gasto com infraestrutura em vez de produto". Na verdade, economizam 4-6 meses de retrabalho subsequente. Porque a partir do dia 15, o squad pode trabalhar em paralelo com mecanismos de proteção automática. Bugs estruturais são bloqueados no momento em que tentam nascer. Velocidade se mantém consistente porque não há tempo gasto em recuperação de débito.

É o investimento mais alavancado possível na fase atual do projeto.

---

# PARTE XXIII — UNIT ECONOMICS POR FASE

Esta Parte emerge de lacuna identificada em revisão crítica: documento fundacional que não ancora arquitetura em economia básica fica incompleto. Não se trata de detalhar projeções financeiras — isso é trabalho de documento comercial separado, revisado periodicamente conforme evidência. Trata-se de documentar **as hipóteses de unit economics** que a arquitetura precisa suportar, para que engenharia e produto tomem decisões alinhadas à viabilidade comercial.

## 23.1 Por que unit economics importa à arquitetura

Cada decisão arquitetural tem custo por tenant por mês. Supabase Realtime cobra por conexão simultânea; pgvector consome CPU e RAM; Claude API cobra por milhão de tokens; Cloudflare R2 cobra por storage e egress. A soma disso é o **custo operacional por tenant**, que precisa ser menor que a receita por tenant com margem saudável.

Arquitetura que ignora unit economics é propensa a:

- Implementar feature cara em plano Free (drenando margem)
- Precificar abaixo do custo real (quebra em escala)
- Descobrir tarde que SLM local (Fase 2) é mais caro que API (Fase 1) para volume baixo-médio
- Implementar funcionalidade técnica elegante que nenhum segmento vai pagar pelo custo

Documentar as hipóteses força a disciplina. Decisões [HIP] em unit economics viram [DEC] quando validadas.

## 23.2 Estrutura de custos do Aethereos

### Custos fixos (independentes do número de tenants)

- **Infraestrutura base** (Supabase Pro, Cloudflare Pro, Vercel Pro, Sentry): aproximadamente US$ 500-1500/mês durante fase pré-produto, escalando conforme necessidade
- **Serviços auxiliares** (Langfuse self-hosted, PostHog self-hosted, domínios, trademark registration): ~US$ 100-300/mês
- **Certificações** (SOC 2, ISO 27001): investimentos pontuais de US$ 15-50k distribuídos nos Anos 2-4
- **Pessoal** (fundador + contratados + agentes de dev): variável conforme fase

### Custos variáveis por tenant

- **Storage por tenant** (Supabase + R2): depende do volume de documentos, média estimada 1-10 GB/tenant ativo
- **Compute por tenant** (Supabase DB + Edge Functions): proporcional ao volume de eventos SCP e queries
- **Aether AI Copilot por tenant** (Claude API tokens): **variável mais volátil e importante**
  - Uso leve (consultas ocasionais): US$ 2-10/mês
  - Uso moderado (copiloto ativo diário): US$ 20-80/mês
  - Uso intenso (agentes autônomos Nível 2+): US$ 100-500/mês
  - Uso enterprise (agentes em vários domínios, autonomia alta): US$ 500-2000/mês
- **Observabilidade** (Sentry events, PostHog events, OpenTelemetry traces): proporcional a volume de uso

### Receita por tenant

[HIP] Hipóteses iniciais de precificação a serem validadas com mercado real:

- **Free / Trial**: 30 dias com limitações em Aether AI Copilot queries, sem agentes, 1 usuário
- **Pro (produto individual)**: R$ 199-499/mês/empresa, depende do produto (Comércio Digital, Kwix, Logitix)
- **Bundle Pro**: R$ 999-2500/mês/empresa com todos os apps da vertical + Copilot com quotas generosas
- **Enterprise**: R$ 5.000-15.000+/mês/empresa com agentes customizados, SLA dedicado, compliance consultoria

## 23.3 Cenários de viabilidade por fase

### Fase Piloto (Ano 1, 0-50 tenants)

Situação: custos fixos de infra + pessoal superam receita. Queima saudável de capital seed em troca de validação de mercado.

- Custo fixo mensal: ~US$ 2k-5k infra + pessoal
- Receita esperada: R$ 50k-200k ARR do cliente Fase Piloto (com desconto de validação)
- Gross margin por tenant piloto: >70% (porque Aether AI tem quotas limitadas, uso ainda baixo)
- **Invariante econômico**: nenhum tenant piloto pode consumir mais que ~US$ 80/mês em custos variáveis, senão margem vira negativa

### Fase Crescimento (Anos 2-3, 50-500 tenants)

Situação: receita variável começa a cobrir custos fixos. Inflection crítico.

- Custo fixo mensal: ~US$ 10k-30k infra + pessoal ampliado
- Receita esperada: R$ 2M-10M ARR
- Gross margin alvo: >60% consolidado
- **Variável crítica**: custo de Aether AI Copilot por tenant. Se uso crescer linear com tenants, margem preservada. Se uso crescer quadraticamente (cada tenant usa mais + tenants maiores entram), precisa migrar para Fase 2 (SLM local) antes que margem colapse.

### Fase Escala (Ano 4+, 500-5000+ tenants)

Situação: gross margin consolidado saudável permite reinvestimento em R&D, expansão de vertical, programa de parceiros.

- Custo fixo mensal: US$ 50k-200k+ com time maior
- Receita esperada: R$ 20M+ ARR
- Gross margin alvo: >70% consolidado
- **Alavancas principais**: migração para SLM local reduz custo variável do Copilot em 60-80%; otimizações de infra (Driver Model facilita troca de backends); revenue share da Magic Store começa a contribuir.

### Fase Ecossistema (Ano 5+)

- Revenue share de apps third-party torna-se contribuinte relevante
- Aethereos Services licenciado a distribuições terceiras gera receita de licensing
- Inteligência coletiva com Federated Learning permite monetização de benchmarks
- Aethereos Academy gera receita adicional
- Targets de LTV:CAC >3x, payback <18 meses para segmento enterprise

## 23.4 Thresholds críticos que a arquitetura precisa respeitar

[INV] Todo recurso ofertado em tier gratuito precisa ter custo marginal próximo de zero para Aethereos. Storage tem custo; hosted model calls têm custo. Features gratuitas não podem depender de recursos caros.

[DEC] Aether AI Copilot em tier Free tem quota diária estrita (~5-20 queries/dia). Above quota, ou paga ou espera. Necessário para prevenir abuso.

[DEC] Aethereos Services (Aether AI backend, Magic Store oficial, inteligência coletiva) é gated por API key válida. Sem key, Core funciona mas Services retornam placeholder.

[HIP] Migração para SLM local (Fase 2 do Copilot) torna-se economicamente viável quando volume consolidado de tokens supera ~100M/mês. Abaixo disso, Claude API é mais econômica que operar SLM próprio.

## 23.5 Orçamento técnico por feature que consome LLM

[INV] Operacionalização do princípio P15. Toda feature que chama modelo de linguagem declara, em documento arquitetural (ADR ou equivalente) antes de ser aprovada para merge, **seis campos obrigatórios**:

### Campo 1 — Custo estimado por invocação

Baseado em tokens médios de input (system prompt + user context + retrieved documents) e output (resposta gerada). Cálculo usando preços vigentes dos modelos alvo.

Exemplo para uma feature de "resumir notificações":
```yaml
feature: "aether-copilot.notifications.summarize"
invocation_cost:
  model: "claude-sonnet"
  avg_input_tokens: 1200
  avg_output_tokens: 300
  cost_per_invocation_usd: 0.0048
  cost_per_1000_invocations_usd: 4.80
```

### Campo 2 — Latência alvo

Percentis 50 e 95 aceitáveis, com timeout máximo após o qual a feature aborta.

```yaml
latency:
  p50_target_ms: 1200
  p95_target_ms: 3500
  timeout_ms: 8000
  action_on_timeout: "fallback_to_rule_based"
```

### Campo 3 — Fallback disponível

O que acontece quando LLM falha, retorna erro, está indisponível ou retorna resultado insatisfatório. **Não pode ser "feature não funciona"** — precisa ter caminho alternativo.

```yaml
fallback:
  trigger: ["api_error", "timeout", "low_confidence_output"]
  mechanism: "rule_based_summary"
  degraded_quality: true
  user_notification: "Modo simplificado em uso"
```

### Campo 4 — Kill switch

Como desligar a feature operacionalmente sem deploy e sem desligar o resto do sistema.

```yaml
kill_switch:
  config_key: "features.aether-copilot.notifications.summarize.enabled"
  default: true
  fallback_when_disabled: "static_list_view"
  rollback_time_seconds: 60  # tempo para propagar desligamento
```

### Campo 5 — Quota por tenant e por plano

Prevenção contra abuso e contenção de custo descontrolado.

```yaml
quotas:
  - plan: "free"
    invocations_per_day: 5
    invocations_per_month: 50
  - plan: "pro"
    invocations_per_day: 100
    invocations_per_month: 2000
  - plan: "enterprise"
    invocations_per_day: "unlimited"
    invocations_per_month: "unlimited_with_billing_alert_above_50000"
overflow_behavior: "hard_stop_with_clear_message"
```

### Campo 6 — Métricas de qualidade

Quais metrics serão registradas no Trust Center (11.15), com thresholds mínimos aceitáveis para produção.

```yaml
quality:
  tracked_metrics:
    - "accuracy"         # via eval dataset
    - "grounded_citations"  # % de respostas com citação válida
    - "user_satisfaction"   # thumbs up/down
    - "regeneration_rate"   # % de vezes que usuário pede nova tentativa
  minimum_acceptable:
    accuracy: 0.85
    regeneration_rate: 0.15  # máximo 15% de regeneração
  review_cadence: "weekly"
  regression_threshold: "drop > 10% in 7 days triggers alert"
```

### Processo de revisão

ADR com esses seis campos entra em revisão arquitetural normal. Feature **não é aprovada para merge** se campos estão incompletos, inconsistentes ou violam thresholds conhecidos de unit economics.

Revisão trimestral de todas features com LLM ativas: custos reais vs estimados, qualidade real vs declarada, quotas ajustadas conforme uso observado. Features que consistentemente estouram orçamento são revisadas, migradas para fallback ou desativadas.

### Por que esse rigor

Modelos de linguagem têm custo variável alto e imprevisível. Feature que parece trivial em desenvolvimento ("só resume 300 tokens") pode consumir milhares de dólares por mês quando escala para 10k tenants × 50 invocações/dia × 30 dias. Disciplina em nível de feature é a única forma de manter unit economics viáveis conforme uso cresce.

Competidores que não aplicam esse rigor descobrem tarde que a camada de IA está drenando 60-80% de margem. Aethereos aplica desde o dia 1.

## 23.6 O que este documento NÃO faz

Explicitar: este documento **não contém**, propositalmente:

- Projeção detalhada de receita (vai em documento comercial)
- Análise de CAC por canal (vai em documento de go-to-market)
- Estrutura de capital / fundraising (vai em documentos apropriados)
- Breakdown contábil (vai em contabilidade real)
- Decisões comerciais sobre distribuições específicas (vão em documentos de cada distribuição)

A ausência é deliberada. Constituição técnica estabelece as hipóteses econômicas que a arquitetura precisa suportar; documento comercial desenvolve o negócio dentro dessas restrições. Separação de concerns.

---

# GLOSSÁRIO FUNDACIONAL

**Action Intent** — Declaração por agente de IA do que pretende fazer, com parâmetros estruturados, avaliada por Policy Engine antes da execução.

**Aether AI Copilot** — Copiloto de IA nativo do Aethereos. Nome oficial (substitui "AE AI" dos docs anteriores).

**Aethereos** — A plataforma-base. Kernel invariante consumido por verticais, família de produtos SaaS, OS integrador — três identidades simultâneas.

**Aethereos Compatible** — Programa de certificação oficial para distribuições e apps.

**Aethereos Services** — Módulo proprietário obrigatório (Aether AI Copilot backend, Magic Store oficial, auth federada, inteligência coletiva, billing).

**Agente** — Identidade de software autenticada, capaz de executar ações dentro de políticas, com níveis 0-5 de autonomia.

**AI-native** — Arquitetura desenhada desde o início para operação por agentes, não apenas humanos.

**App first-party** — Produto SaaS autônomo da família Aethereos (Comércio Digital, Logitix, Kwix, Imova, etc.), com domínio próprio e vida comercial independente, que também roda embebido no Aethereos.

**App third-party** — App criado por desenvolvedor externo, existe apenas como `.aeth` na Magic Store.

**App connector** — Bridge bidirecional para sistema externo via OAuth + API + webhooks + SCP translation.

**Audit trail dual** — Registro de ações com distinção explícita entre humanos e agentes, schema SQL específico.

**B2B AI OS Brazil** — Primeira vertical de referência. Sistema operacional B2B para mercado industrial brasileiro.

**BUSL** — Business Source License v1.1. Licença escolhida para o kernel Aethereos. Source-available com Additional Use Grant anti-concorrência e conversão automática em Apache 2.0 após 4 anos.

**Catalog** — Camada 2 da hierarquia de cinco camadas. Magic Store como registry global.

**CLA** — Contributor License Agreement. Obrigatório para contribuições externas.

**Context Decay** — Decaimento exponencial aplicado a dados por relevância temporal. Meia-vida configurada por tipo de sinal.

**Context Engine** — Componente do kernel que enriquece eventos SCP durante o trânsito (Enrichment-at-Transport).

**Core** — Camada 1 da hierarquia. Aethereos base: runtime, shell, serviços compartilhados.

**Dependency-cruiser** — Ferramenta de análise de import graph, usada para enforcement arquitetural em CI.

**Dock** — Elemento do OS Desktop — barra inferior com ícones de apps.

**Enrichment-at-Transport** — Princípio central do SCP. Enriquecimento ocorre na plataforma durante trânsito, não no emissor ou consumidor.

**Event Store** — Tabela `scp_events` particionada por mês, append-only, base para auditoria, RAG e analytics.

**Governance-as-Code** — Políticas codificadas em YAML declarativo, versionadas, avaliadas por Policy Engine em runtime.

**Hierarquia de cinco camadas** — Core → Catalog → Vertical → Tenant → User.

**K-anonimidade** — Garantia matemática (k≥10) para dados agregados cross-tenant, com supressão de outliers + ruído ±3-5% + defasagem 7 dias + opt-in.

**Magic Store** — Catálogo universal único de apps publicados. Storefronts são visões filtradas, não bancos separados.

**Manifesto de app (`.aeth`)** — Arquivo JSON com declaração de identidade, permissões, compatibilidade, pricing, etc.

**Manifesto de vertical** — JSON no banco declarando branding, apps bundled, storefront filter, políticas, onboarding.

**MCP** — Model Context Protocol (Anthropic). Padrão emergente para integrações agente-sistema. Aethereos consome E expõe servidores MCP.

**Mesa** — Área de trabalho principal do OS Desktop. Widgets como surfaces of agency.

**Módulo** — Sinônimo técnico de "app" dentro do Aethereos.

**Multi-tenant** — Isolamento por empresa via RLS. Invariante do kernel.

**Multi-vertical** — Separação por produto via vertical_id. Ortogonal a multi-tenant.

**Navegação por estado** — Decisão arquitetural de gerenciar navegação via Zustand, não URL routing.

**OS Desktop** — Metáfora estrutural do Aethereos: Dock + TopBar + TabBar + Mesa + AppFrame no navegador.

**pgvector** — Extensão Postgres para vetores de embedding, base da busca semântica e RAG.

**Policy Engine** — Componente que avalia Action Intents contra Governance-as-Code em runtime.

**Princípios fundadores P1-P10** — Constituição operacional do projeto. Dez princípios invariantes.

**RLS (Row Level Security)** — Mecanismo Postgres de enforcement multi-tenant. Invariante do kernel.

**SCP** — Software Context Protocol. Barramento universal de eventos contextualizados. Protocolo aberto.

**SCP event** — Evento estruturado com version, id, timestamp, type, tenant_id, actor_id, payload, context (enriched), routing, metadata.

**Semantic embedding** — Vetor de alta dimensão que representa significado semântico para busca vetorial.

**SLM** — Small Language Model. Modelo 7-13B parâmetros fine-tuned para domínio específico. Planejado para Fase 2 do Aether AI Copilot.

**Surface of agency** — Superfície onde humano ou agente toma decisão rápida com contexto mínimo. Widgets da Mesa são surfaces of agency.

**Tenant** — Camada 4 da hierarquia. Empresa provisionada a partir de uma vertical.

**Three-layer architecture** — Kernel + User Space + Apps, inspirado em microkernel design (Mach/XNU/Zircon-Fuchsia).

**Vertical** — Camada 3 da hierarquia. Distribuição opinada: branding + apps bundled + policies. Dados no banco, não código.

**Workspace** — Sinônimo de "empresa" em algumas interfaces. Tecnicamente corresponde a Tenant.

---

## Termos adicionais introduzidos em v3.1

**Aethereos Academy** — Plataforma oficial de aprendizado e certificação. Trilhas para operadores finais, desenvolvedores e parceiros. Certificados Open Badges. Quinto pilar de monetização.

**Aethereos CLI** — Binário oficial de linha de comando (`aethereos`) para todas operações sobre tenants, apps, eventos, agentes e deploy. Cidadão de primeira classe, com paridade de features com UI.

**Aethereos SDK** — Biblioteca TypeScript oficial (`@aethereos/sdk`) consumida por first-party apps, third-party apps, connectors e integradores externos.

**Compliance-as-Code por vertical** — Frameworks de compliance (LGPD, NF-e, TISS, CFM, CVM, etc.) declarados no manifesto de vertical e validados automaticamente pelo Core antes de instalar apps e em runtime.

**Consent Receipts** — Recibos criptográficos auditáveis (padrão Kantara) entregues ao tenant quando opta por participar de federated learning. Revogáveis, portáveis, prova de base legal LGPD.

**Digital Twin operacional** — Representação viva e projetável do estado da empresa. Permite ao Aether AI Copilot responder perguntas contrafactuais ("e se...") com cenários simulados.

**Federated Learning** — Evolução da inteligência coletiva. Dados ficam no tenant; apenas gradientes de modelos são agregados. Resposta matemática cristalina para "a Aethereos viu meus dados?".

**MCP Server do Aethereos** — Servidores MCP oficiais expostos pela Aethereos. Agentes externos (Claude Desktop, Claude Code, etc.) podem operar sistemas Aethereos nativamente como ferramentas tipadas.

**Marketplace de Governance Templates** — Extensão da Magic Store que hospeda templates de políticas YAML validadas, importáveis e parametrizáveis. Efeito de rede de conhecimento operacional codificado.

**Meta-observabilidade do desenvolvimento** — Métricas sobre o próprio processo de desenvolvimento agêntico do Aethereos: velocidade, qualidade, custo, áreas de dificuldade. Usadas para iterar no CLAUDE.md e refinamento do squad.

**Notarização imutável** — Hash criptográfico de eventos SCP de alta criticidade publicado em OpenTimestamps (Bitcoin), ICP-Brasil ou blockchain privado. Prova de integridade independente do Aethereos.

**Observabilidade agêntica nativa** — Métricas operacionais dos próprios agentes: volume de intents, latência, custo em tokens, taxa de reversão, anomalias. Pré-requisito para Magic Store aceitar agentes third-party.

**PII Vault** — Cofre centralizado de dados pessoais no kernel. Apps referenciam dados via tokens opacos, não valores brutos. Eliminação LGPD trivial. Blast radius limitado em vazamentos.

**SCP Choreography** — Extensão do protocolo SCP que permite coreografia declarativa multi-agente via DSL YAML. Orquestração de workflows entre agentes resolvida no nível de protocolo, não de framework.

**Shadow Mode** — Mecanismo de graduação progressiva de autonomia. Agente executa raciocínio mas não aplica ação; humano revisa propostas; agente gradua a nível mais autônomo após atingir acurácia e volume mínimos. Baseado em precedentes Tesla FSD e Waymo.

**Squad Agêntico** — Equipe de sub-agents do Claude Code especializados por papel (Architect, Coder, Reviewer, Tester, Security, Doc, Refactor). Cada um com escopo, ferramentas e persona próprias, orquestrados para construir o Aethereos.

**Time Travel sobre Event Store** — Capability de reconstruir matematicamente o estado de qualquer entidade em qualquer momento do passado. Consequência direta do Event Sourcing append-only. Habilita debug forense, auditoria retroativa, replay de agentes.

---

## Termos adicionais introduzidos em v4.0

**[INV] / [DEC] / [HIP] — Tricotomia de rigidez** — Sistema de notação que marca cada decisão significativa do documento como Invariante arquitetural (não muda sem ruptura de tese), Decisão atual (vale agora, pode mudar com evidência) ou Hipótese a validar (aposta ainda não comprovada). Precedência em conflitos: INV prevalece sobre DEC, que prevalece sobre HIP.

**Aethereos Client SDK** — Pacote `@aethereos/client` que abstrai totalmente o protocolo de IPC (postMessage em iframe, direct call em federado) atrás de API TypeScript tipada. Todo app third-party consome o kernel através dele, evitando proliferação de dialetos incompatíveis.

**Aethereos Local** — Modo offline-first real com cache completo do tenant via IndexedDB + OPFS, event sourcing com replicação quando conexão retorna, resolução determinística de conflitos. Adequado para operação em fábricas, canteiros, armazéns com conectividade intermitente.

**Backoffice Autônomo Brasileiro** — Conjunto integrado de capabilities específicas do mercado BR: Pix Automático para cobrança recorrente, Open Finance para conciliação e previsão de caixa, NFS-e padrão nacional obrigatória a partir de jan/2026, adaptação antecipada à Reforma Tributária do Consumo, copiloto fiscal especializado.

**Business Observability** — Camada que unifica rastreio técnico (OpenTelemetry spans, latência de API) com rastreio de negócio (business traces: jornada completa de uma entidade através dos apps, com tempo em cada estado e identificação automática de gargalos). No mesmo painel, dev vê erro técnico e gestor vê onde processo parou.

**Circuit Breaker Humano** — Mecanismo de pausa automática de autonomia de agentes quando padrões estatísticos de reversão, divergência ou anomalia excedem thresholds. Complementa Shadow Mode: Shadow é a rampa para subir autonomia, Circuit Breaker é o paraquedas para descer.

**Company Graph** — Representação derivada do SCP que modela a empresa como grafo vivo de entidades (nós) e relações temporais contextualizadas (arestas). Habilita mapa operacional navegável, impact analysis, memória organizacional consultável, propagação de alertas.

**Domain Event Bruto** — Camada 1 do SCP no modelo de três camadas. Fato imutável emitido pelo app quando algo acontece. Latência objetivo < 50ms, schema mínimo, persistência append-only.

**Derived Context Record** — Camada 2 do SCP. Registro derivado calculado assincronamente pelo Context Engine sobre evento bruto. Versionado — um evento bruto pode ter múltiplos context records ao longo do tempo.

**Actionable Insight** — Camada 3 do SCP. Saída processada pronta para UI, agente ou notificação. TTL curto (horas a dias). Gerado por consumidores especializados sobre context records.

**Driver Model** — Padrão arquitetural do kernel onde toda dependência em backend externo (Supabase, R2, pgvector, etc.) é mediada por interface TypeScript de Driver. Operacionaliza P10 (protocolos abertos, plataformas proprietárias) em nível de código.

**Ed25519** — Algoritmo de assinatura assimétrica sobre curva Edwards25519. Usado no Aethereos para assinatura de manifestos `.aeth` (substituindo HMAC identificado como insuficiente) e eventos SCP auto-certificáveis. Mesmo padrão usado por Apple, Google e package managers Linux.

**Navegação híbrida** — Modelo onde URL representa identidade restaurável de recurso (deep-linking, compartilhamento, bookmarks) e Zustand representa estado efêmero da sessão (abas abertas, filtros locais, layout). Substitui o dogma anterior de "navegação sem URL".

**P11 / P12 / P13** — Três princípios adicionados aos dez originais. P11: eventos são auto-certificáveis (Ed25519 + hash chain). P12: humano e agente compartilham cidadania, não autoridade. P13: dados de domínio pertencem ao domínio.

**Policy Studio** — Editor visual de Governance-as-Code. Permite que compliance officers, CFOs e heads de área definam políticas sem escrever YAML cru. Inclui simulação antes de publicar, diff entre versões, modo "explicar decisão", biblioteca de templates, testes automatizados.

**Process Radar** — Mineração de processos nativa sobre SCP. Descobre automaticamente como processos reais acontecem, identifica gargalos, retrabalho e desvios do processo desenhado. Capability emergente gratuita da arquitetura event-sourced; competidores sobre ERPs tradicionais pagam caro por isso via Celonis.

**Schema separation por app** — Decisão de que cada app first-party tem schema Postgres próprio (`comercio_digital`, `kwix`, `logitix`) em vez de compartilhar schema público. Habilita migrações independentes, deploy independente, permissões granulares. Comunicação cross-app via SCP events ou views contratadas.

**SCP Bridge on-premise** — Serviço containerizado que roda na infraestrutura do cliente, lê banco de sistemas legados (SAP, Totvs, Sankhya, Protheus) via Change Data Capture e traduz em eventos SCP. Permite adoção gradual sem substituição do ERP atual como pré-requisito.

**Trust Center** — Produto de AI Evals como cidadão de primeira classe. Dataset curado por vertical, métricas formais (accuracy, groundedness, hallucination rate, refusal rate, latency, cost per query, human override rate), regressão automática em deploy, relatório público de confiança.

**Unit Economics por Fase** — Documentação explícita das hipóteses de custo e receita que a arquitetura precisa suportar. Custos fixos vs variáveis por tenant, cenários de viabilidade por fase (Piloto, Crescimento, Escala, Ecossistema), thresholds invariantes que disciplinam decisões de produto e engenharia.

**Workforce Híbrida** — Modelo organizacional onde agentes de IA são tratados como participantes do organograma com cargo, escopo, custo, SLA e supervisor humano. Habilita folha de agentes por centro de custo, headcount planning híbrido, performance comparável com humanos. Abstração gerencial, não legal.

---

## Termos adicionais introduzidos em v4.1

**Distribuição** — Empacotamento opinionated do Aethereos-plataforma para um mercado, setor ou propósito específico. Cada distribuição é identidade visual própria, seleção de apps bundled, fluxo de onboarding próprio, frameworks de compliance específicos, políticas pré-configuradas. **Não é parte do kernel** — é aplicação construída sobre o kernel. Pode ser construída pela Aethereos Inc, por parceiros certificados, por empresas internamente ou pela comunidade.

**Framework de integração financeira pluggable** — Abstração TypeScript oferecida pelo kernel (`FinancialRail`) que distribuições e apps implementam para cada rail específico (Pix, ACH, SEPA, SWIFT, cartão). Kernel permanece agnóstico a rails; distribuições pluggam implementações jurisdicionais.

**Framework de integração fiscal pluggable** — Abstração TypeScript oferecida pelo kernel (`TaxRegime`) que distribuições implementam para cada regime tributário (NCM/NF-e brasileiro, sales tax americano, VAT europeu, etc.). Permite absorver mudanças regulatórias sem tocar no kernel.

**Framework de identificadores fiscais** — Abstração TypeScript oferecida pelo kernel (`EntityIdentifier`) para identificação de pessoas jurídicas e físicas. Distribuições pluggam identificadores locais (CNPJ, EIN, VAT, etc.) com validação e enriquecimento específicos.

**Freio agêntico do ano 1** — Invariante que impede qualquer distribuição comercial do Aethereos de liberar agentes de IA com autonomia de escrita no primeiro ano de operação. Nível máximo no primeiro ano é 1 (sugere-e-humano-executa). Regulatório, reputacional e operacional. Calibra o otimismo arquitetural à realidade operacional.

**Hooks executáveis versionados** — Funções TypeScript em packages versionados que o kernel invoca em pontos específicos do ciclo de vida (enrichEvent, validateTransaction, computeScore, enrichOnboarding, formatDocument). Complementam o manifesto JSON declarativo para ~20% dos casos que JSON puro não expressa. Sandboxed, com timeouts, testes obrigatórios, assinatura Ed25519, fallback para Modo Degenerado.

**IdP central com OIDC** — Identity Provider (`idp.aethereos.com`) operando OAuth 2.1 + OIDC + PKCE, com Token Exchange RFC 8693. Resolve SSO entre apps first-party em domínios distintos, substituindo o design errado de "cookies cross-domain" de versões anteriores. Evolutível para Keycloak/Auth0 via Driver Model.

**Mesh federado de Context Engines** — Arquitetura descentralizada do Context Engine: kernel oferece enriquecimento genérico; cada domínio especializado (logística, financeiro, fiscal, etc.) pode ter Context Engine próprio publicando insights com prefixo `context.<domain>.*` ao SCP. Substitui modelo centralizado em gargalo.

**Modo Degenerado** — Princípio P14: toda componente sofisticado do kernel declara versão mínima viável que funciona sem a sofisticação. Policy Engine degenerado é lista hardcoded de denies; Context Engine degenerado é payload vazio; Company Graph degenerado não existe. Permite o sistema rodar com qualquer subset implementado, evoluindo para modo pleno apenas onde ROI e dados justificam.

**Orçamento técnico por feature LLM** — Princípio P15: toda feature que invoca modelo de linguagem declara, em ADR antes do merge, seis campos obrigatórios: custo estimado por invocação, latência alvo, fallback disponível, kill switch, quota por tenant/plano, métricas de qualidade com thresholds. Previne drenagem silenciosa de margem conforme uso escala.

**Preservação de intenção original** — Feature do Policy Studio: quando usuário cria política, Studio registra dois artefatos complementares — YAML executável (que Policy Engine avalia) e intenção original em linguagem natural (palavras exatas do usuário no momento da criação, com notas de conversão). Permite auditoria de tensão entre execução literal e espírito da regra em edge cases.

**P14 — Modo Degenerado obrigatório** — Princípio fundador que exige versão degenerada de todo componente sofisticado do kernel. Ver Parte II.

**P15 — Orçamento LLM** — Princípio fundador que exige declaração de seis campos antes de feature com LLM ser aprovada para merge. Ver Parte II.

**Quantificação de Incerteza** — Invariante de saída do Context Engine: todo insight derivado inclui explicitação de confiança, intervalo ou discordância entre fontes. "Score 4.2 com confiança baixa por apenas 3 interações" é qualitativamente diferente de "Score 4.2" sem contexto. Habilita decisão robusta em vez de decisão cega.

**Source-available kernel** — Terminologia correta para o kernel Aethereos sob BUSL v1.1. Código aberto para leitura, modificação e uso; restrições específicas sobre oferta como SaaS concorrente; conversão automática em Apache 2.0 após 4 anos. **Não é opensource pela definição OSI** — distinção importante mantida com honestidade técnica para preservar credibilidade reputacional.

**Tricotomia [INV]/[DEC]/[HIP]** — Sistema de notação que classifica toda decisão significativa do documento como Invariante arquitetural, Decisão atual ou Hipótese a validar. Precedência em conflitos: INV prevalece sobre DEC, que prevalece sobre HIP. Introduzido em v4.0, mantido em v4.1 com aplicação mais rigorosa.

---

## Termos adicionais introduzidos em v4.2

**Classe de risco operacional (A/B/C)** — Classificação prescritiva de toda feature com IA, determinando quais mecanismos de governança são obrigatórios. Classe A: ação irreversível (pagamento, emissão fiscal, demissão) — exige Shadow Mode prolongado + aprovação humana + Circuit Breaker agressivo + audit expandido. Classe B: ação reversível (agendamento, classificação, sumarização) — exige Shadow Mode padrão + aprovação no primeiro uso. Classe C: consulta/leitura/sugestão — exige apenas métricas de qualidade + kill switch + quota. Operacionalização complementar ao P15.

**Contratos de dados formalizados (views canônicas)** — Formalização operacional do P13 (soberania de domínio). Cada app publica views versionadas (`v1_`, `v2_`) como contrato público; outros apps consomem **apenas essas views**, nunca as tabelas internas. Tabelas internas podem mudar sem breaking change para consumidores. Versionamento com deprecação mínima de 6 meses. Registro de contrato documentado em markdown com consumidores registrados.

**Event Sourcing vs Event Streaming** — Distinção semântica no SCP Core Profile. Event sourcing eventos (`event_nature: "sourcing"`) são fatos primeiros do domínio Aethereos, fonte de verdade para reconstrução de estado. Event streaming eventos (`event_nature: "streaming"`) são reflexos derivados de sistemas externos via connectors — agregado canônico fica no sistema externo, Aethereos tem projeção.

**Governed Action (Camada 4 do SCP)** — Quarta camada explicitada na v4.2. Ação não é consequência automática de insight — é decisão separada que passa por Policy Engine, com Action Intent estruturado, avaliação de política, classe de risco aplicada, audit trail dual. A separação entre Camada 3 (Insight: proposição) e Camada 4 (Ação: execução governada) é invariante arquitetural.

**Idempotência por default** — Invariante do SCP Core Profile: todo handler deve ser idempotente. Processar o mesmo evento duas vezes produz o mesmo resultado que processar uma vez. Implementado via `event_id` UUID v7 + registro de eventos processados por `(subscriber_id, event_id)`. Threshold padrão: até 3 reentregas em operação normal antes de poison.

**No-Go List do ano 1** — Lista explícita do que não entra no primeiro ano comercial de qualquer distribuição: marketplace aberto a third-party, autonomia de escrita de agentes, offline-first completo, múltiplas distribuições simultâneas, collective intelligence cross-tenant avançada, simulation graph pesado, MCP server exposto publicamente, agentes complexos multi-step, federação cross-tenant, Differential Privacy formal. Contrato inequívoco que elimina arraste de pet-features para o MVP.

**Ordenação seletiva** — Garantia do SCP: ordenação global não é garantida (caro, raramente necessária). Ordenação é garantida dentro de escopos declarados: por entidade (`scope_entity_id`), por ator (`actor_id`), por tenant (`tenant_id`). Event types declaram escopo de ordenação no Registry.

**Poison event** — Evento que falha consistentemente em handler específico após N tentativas (padrão 5 com backoff exponencial). Vai para tabela `scp_poison_events` com erro registrado. Alerta automático para owner do handler. Mecanismo formal que impede poison de travar pipelines silenciosamente.

**Regra de ouro do SCP** — "Evento bruto é sagrado. Enriquecimento é assíncrono. Insight é derivado. Ação é opt-in e governada." Contrato formalizado que nenhuma implementação pode violar sem ferir a tese do projeto. Cada propriedade tem implicação técnica concreta documentada na Parte 8.3.

**SCP Core Profile** — Conjunto mínimo de decisões semânticas que toda implementação do SCP deve respeitar: taxonomia oficial de `event_type` (três níveis hierárquicos), versionamento de schemas (minor/major/deprecação), idempotência por default, ordenação seletiva, tratamento de replay/deduplicação/poison events, distinção entre event sourcing e event streaming, envelope canônico consolidado. O que transforma SCP de "barramento de mensagens" em "protocolo consumível".

**Tabela de criticidade por capability** — Classificação consolidada de cada capability significativa do kernel por prioridade temporal: MVP Obrigatório (modo pleno no primeiro lançamento), MVP Degenerado (versão mínima conforme P14), Pós-MVP Importante (6-12 meses seguintes), Deferido (somente após demanda comprovada), Experimental. Ortogonal à tricotomia [INV]/[DEC]/[HIP] — capability [INV] pode ser "Deferida".

**Taxonomia de event_type** — Convenção `<domain>.<entity>.<action>` com três níveis mínimos. Action no particípio passado (`created`, `issued`). Domains reservados ao kernel: `platform.*`, `agent.*`, `context.*`, `integration.*`. Domains `financial.*` e `fiscal.*` consumidos pelos frameworks pluggable. Normatização que impede proliferação incontrolada de naming conventions.

**Versionamento de schemas SCP** — Política normativa: minor version adiciona campos opcionais (compatível); major version faz breaking change (consumidores migram); depreciação mínima de 6 meses antes de remover major version antiga. Event Store preserva eventos em versão original; migração retroativa não acontece.

---

## Termos adicionais introduzidos em v4.3

**Blindagem do SCP (payload bruto como contrato mínimo)** — Invariante que proíbe consumidores críticos de depender de enriquecimento assíncrono para funcionar. Emissão não bloqueia em context record; agentes críticos operam sobre payload bruto + views canônicas; insight é opcional, não obrigatório. Mecanismo que impede SCP de virar "monólito distribuído" acoplado via contexto. Reforço da camada 1 da Regra de Ouro.

**Capability token** — Credencial emitida pelo kernel a um app declarando explicitamente quais operações pode executar, sobre quais recursos, em quais tenants, por qual janela de tempo. Substitui modelo de permissão ambiente ("app tem acesso ao que o tenant tem acesso") por modelo explícito, escopado, revogável e auditável. Base da segurança de apps no Aethereos.

**Ecossistema documental companheiro** — Conjunto de documentos operacionais subordinados à Fundamentação, cada um com escopo próprio: THREAT_MODEL (ameaças), NO_GO_YEAR1 (limites de escopo), SCP_OPERATIONS (operação em produção), KEY_MANAGEMENT (chaves), SLO_TARGETS (metas quantitativas), DATA_LIFECYCLE (retenção), SECURITY_GUIDELINES (implementação de segurança), LLM_OPEX_GUIDELINES (orçamento de IA), VERSIONING_CONTRACT (compatibilidade). A Fundamentação diz "o quê e por quê"; companheiros dizem "como".

**Precedência sobre SCP Whitepaper** — Cláusula constitucional invariante declarando que Fundamentação v4.3 prevalece sobre SCP Whitepaper v4.0 e anteriores. Whitepaper permanece válido como visão e posicionamento; não é compromisso de entrega. Previne desalinhamento entre texto visionário e execução.

---

# HISTÓRICO DE REVISÕES

## v4.3 — Blindagem do SCP, Capability Tokens, Precedência Documental e Correções (2026)

Incorpora feedback externo pragmático e sênior que identificou problemas documentais reais e lacunas operacionais. Em vez de adicionar capabilities novas, **corrige erros cirúrgicos, blinda invariantes contra erosão em produção e explicita o ecossistema documental companheiro**. Cinco mudanças estruturais; crescimento modesto.

### Cinco mudanças estruturais

**1. Invariante de blindagem do SCP (Parte 8.3 expandida).** Consumidores críticos não podem depender de enriquecimento assíncrono para funcionar. Emissão não bloqueia em context record; agentes críticos operam sobre payload bruto + views canônicas; insight é opcional. Enforcement mecânico via CI detectando dependência de camada 2/3 sem fallback. Blindagem contra SCP virar "monólito distribuído".

**2. Capability tokens como modelo de permissões (Parte 4.9 nova).** Cada app recebe tokens explícitos declarando operações permitidas sobre recursos específicos. Substitui modelo ambiente por modelo escopado/revogável/auditável. Integra com P4, P11, P13, 11.5. Detalhes operacionais em KEY_MANAGEMENT.md companheiro.

**3. Precedência sobre SCP Whitepaper (preâmbulo).** Declaração explícita: Fundamentação v4.3 prevalece sobre Whitepaper v4.0. Whitepaper permanece válido como visão; não é compromisso de entrega. Elimina tensão entre texto visionário e backlog operacional.

**4. Correção Ed25519/HMAC (Parte 14.3).** Linha 3705 da v4.2 ainda mencionava HMAC como assinatura de bundles, contradizendo Ed25519 da Parte V.3. Corrigido para Ed25519 consistente em todo o documento.

**5. Ecossistema documental companheiro declarado (preâmbulo).** Lista formal de 9 documentos operacionais subordinados à Fundamentação, cada um com escopo declarado. Separação entre constitucional e operacional.

### Sugestões canalizadas para documentos operacionais companheiros

Para registro auditável, essas sugestões do feedback não entram na Fundamentação porque são operacionais:

- Gatilhos para migrar Supabase → Kafka/NATS → **SLO_TARGETS + SCP_OPERATIONS**
- Limites de eventos por tenant/minuto, conexões realtime, particionamento → **SLO_TARGETS**
- Política CSP, sandbox, postMessage allowlist → **SECURITY_GUIDELINES**
- Geração/rotação/revogação de chaves Ed25519, OAuth, webhooks → **KEY_MANAGEMENT**
- Staff access, break-glass, service-role scopes → **SECURITY_GUIDELINES**
- DLQ, poison event quarantine, replay, backfill → **SCP_OPERATIONS**
- Retenção, legal hold, tombstone, purga de embeddings → **DATA_LIFECYCLE**
- SLOs quantitativos (p95, RTO, RPO, throughput) → **SLO_TARGETS**
- Orçamento de embeddings, cache semântico, custo por insight → **LLM_OPEX_GUIDELINES**
- Threat model completo com atores/vetores/controles → **THREAT_MODEL**
- Compatibilidade entre versões → **VERSIONING_CONTRACT**

## v4.2 — Contrato Formal do SCP, Classe de Risco, No-Go List e Criticidade por Capability (2026)

Incorpora feedback externo maduro que identificou formalização necessária em pontos que a v4.1 deixou implícitos. Em vez de adicionar capabilities novas, **formaliza contratos e prioriza execução**. Seis mudanças estruturais; crescimento deliberadamente modesto.

### Seis mudanças estruturais

**1. Quatro camadas do SCP com contrato formal (Parte 8.3 reescrita).** O modelo de três camadas da v4.1 ganha quarta camada explícita: **Governed Action**. Regra de ouro formalizada: "evento bruto é sagrado, enriquecimento é assíncrono, insight é derivado, ação é opt-in e governada". Fluxo canônico completo descrito passo a passo, com invariantes por camada. Remove a tentação natural de tratar ação como consequência automática de insight, que sob pressão de entrega vira caminho de menor resistência.

**2. SCP Core Profile (Parte 8.10 nova).** Normatização explícita de: taxonomia oficial de `event_type` (três níveis hierárquicos com domains reservados), política de versionamento de schemas (minor/major/deprecação de 6 meses), idempotência por default (UUID v7 + registro de processados), ordenação seletiva (por entidade/ator/tenant, não global), tratamento explícito de replay/deduplicação/poison events, distinção semântica entre event sourcing (domínio interno) e event streaming (integração externa), envelope canônico consolidado. Sem isso, SCP é poderoso conceitualmente mas frágil operacionalmente.

**3. Contratos de dados formalizados (Parte 10.5 expandida).** Cada domínio publica views canônicas versionadas (`v1_`, `v2_`) como contrato público; outros domínios consomem **apenas essas views**, nunca tabelas internas. Tabelas internas podem mudar sem breaking change. Registro de contrato em markdown com consumidores registrados. Enforcement mecânico via permissões Postgres: consumidor não tem GRANT para tabelas internas de outros apps. Operacionaliza P13 (soberania de domínio) no nível mais concreto possível.

**4. Classe de risco operacional A/B/C por feature (Parte 11.16 nova).** Expansão do P15. Toda feature com IA declara classe no ADR:
- Classe A (irreversível): Shadow Mode prolongado ≥90 dias + precisão >99% + aprovação humana sempre + Circuit Breaker agressivo + audit expandido + revisão mensal + throttling
- Classe B (reversível): Shadow Mode ≥30 dias + precisão >90% + aprovação no primeiro uso + Circuit Breaker padrão + revisão trimestral
- Classe C (consulta): métricas no Trust Center + kill switch + quota

Enforcement mecânico: CI bloqueia merge sem mecanismos obrigatórios por classe. Re-classificação exige ADR + comitê de risco para downgrades (60 dias de estabilidade observados).

**5. No-Go List explícita do ano 1 (Parte 17.8 nova).** Lista inequívoca do que não entra no primeiro ano comercial de qualquer distribuição: marketplace aberto, autonomia de escrita de agentes, offline-first completo, múltiplas distribuições simultâneas, collective intelligence cross-tenant avançada, simulation graph pesado, MCP server exposto publicamente, agentes complexos multi-step, federated Context Engine cross-tenant, Differential Privacy formal. Backlog do ano 1 tem bloqueio automático para histórias que tocam esses items.

**6. Tabela de criticidade por capability (Parte 17.9 nova).** Consolidação tabular classificando cada capability significativa em cinco camadas arquiteturais (Kernel, Magic Store e apps, SCP, AI-Native, Connectors, Verticais, Garantias) por prioridade temporal: MVP Obrigatório, MVP Degenerado, Pós-MVP Importante, Deferido, Experimental. Ortogonal à tricotomia [INV]/[DEC]/[HIP]. Mudança de classificação exige ADR — não se movem capabilities para MVP em decisão de corredor.

### Ajustes menores

**B2B AI OS Brazil como exemplo canônico único.** Substitui a lista de distribuições hipotéticas (industrial brasileira, imobiliária, clínica, jurídica, americana, europeia) da v4.1 por um único exemplo detalhado que ilustra como os frameworks pluggable do kernel são usados. Reduz ruído conceitual e aumenta concretude. Outras possibilidades ficam como menção breve ("nada impede que outras distribuições sejam construídas"), sem detalhamento. Alterações aplicadas nas Partes I (1.2) e VI (6.3, 6.4).

**SCP Bridge on-premise elevado à Parte I (1.4).** Antes descrito apenas na Parte IX (seção técnica), agora recebe menção estrutural como possibilidade de adoção não-disruptiva. Importante porque habilita estratégias comerciais diversas (substituição integral, camada de inteligência sobre legado, modelo híbrido). A arquitetura não prescreve estratégia; habilita múltiplas.

### Sugestões explicitamente rejeitadas

Para registro auditável de decisões sobre o que não entrou:

- **ICP inicial em uma frase no documento fundacional** — decisão comercial da Aethereos Inc sobre seu primeiro mercado, não decisão constitucional. Pertence a documento MVP v1.0 ou comercial.
- **Primeiro workflow matador específico** — decisão comercial. Mesmo argumento.
- **Escolha de primeiro conector ERP (Totvs, Bling, Omie, Protheus)** — decisão comercial. Mesmo argumento.
- **Posicionamento comercial "camada de inteligência sobre sistemas existentes" como narrativa central** — posicionamento comercial específico é estratégia de entrada, não constituição. A arquitetura habilita múltiplos posicionamentos (OS completo, camada de inteligência, ERP integral); escolher apenas um no fundacional restringe opções futuras sem benefício arquitetural. Narrativa fica no documento comercial.

Misturar arquitetura com comercial contamina ambos — o arquitetural vira mal-priorizado, o comercial fica sem base estável. v4.2 mantém separação rigorosa.

**O que o feedback do mercado está correto em pedir, mas vai em outro documento:** MVP v1.0 separado, que absorve ICP + workflow matador + conector específico + posicionamento narrativo. Esse documento é trabalho separado, escrito quando Aethereos Inc decidir sua estratégia comercial concreta.

## v4.1 — Separação Plataforma/Distribuição, Modo Degenerado, Correções de Identidade e Freio Agêntico (2026)

Incorpora duas análises críticas externas que identificaram tensões reais na v4.0. Foco em **correções estruturais e calibrações**, não em capabilities novas. A v4.1 não cresce por adição — cresce por disciplina.

### Seis mudanças estruturais

**1. Separação rigorosa entre Aethereos-plataforma e distribuições específicas.** Versões anteriores apresentavam B2B AI OS Brazil, Imobiliário OS, Incubadora OS e produtos first-party (Comércio Digital, Logitix, Kwix) como parte constituinte do Aethereos. A v4.1 reposiciona rigorosamente:

- O **Aethereos-plataforma** (kernel + frameworks + apps invariantes) é o que este documento descreve
- Distribuições específicas são **exemplos de aplicação**, não roadmap da plataforma
- Produtos SaaS construíveis sobre o Aethereos são **possibilidades**, não parte do kernel
- Aethereos Inc (a empresa) pode construir produtos/distribuições próprias — mas isso é documentado separadamente

Impacto: Parte I reescrita, Parte VI completamente reposicionada, Parte VII.1 (first-party apps) reescrita como padrão arquitetural em vez de catálogo de produtos, Parte XXI substancialmente reescrita.

**2. Modo Degenerado como princípio invariante P14.** Todo componente arquitetural sofisticado declara sua versão mínima viável. Ver Parte II (P14) e Parte XXI.4 (exemplos práticos por componente). Esta é a contribuição mais importante da v4.1 para viabilidade real de execução.

**3. Orçamento técnico obrigatório para features com LLM (P15).** Seis campos declarados antes do merge: custo, latência, fallback, kill switch, quota, métricas de qualidade. Ver Parte II (P15) e Parte XXIII.5 (operacionalização).

**4. Correção de linguagem: "source-available", não "opensource".** BUSL v1.1 é source-available pela definição OSI, não open source puro. Todas as ocorrências revisadas ao longo do documento.

**5. Correção do design de SSO cross-domain.** IdP central com OIDC/OAuth 2.1 + PKCE + Token Exchange (RFC 8693) substitui a menção incorreta anterior a "cookies de domínio compartilhado" que tecnicamente não funcionariam para domínios distintos (`kwix.com`, `comerciodigital.com`, etc.). Ver Parte VII.1 (SSO entre produtos first-party) e Parte X.6 (implementação técnica completa).

**6. Freio agêntico obrigatório no primeiro ano comercial.** Qualquer distribuição do Aethereos opera no primeiro ano em modo `read-only + suggestion-first + human approval`. Autonomia de escrita por agentes só entra após maturidade operacional comprovada. Ver Parte XI.1.

### Ajustes técnicos menores

- **Mesh federado de Context Engines** (Parte 8.8) em vez de modelo centralizado
- **Quantificação de incerteza como saída padrão** do Context Engine (Parte 8.9, invariante)
- **Hooks executáveis versionados** como complemento ao manifesto JSON de verticais (Parte 6.6)
- **Preservação de intenção original em linguagem natural** no Policy Studio (Parte 11.14)
- Frameworks pluggable (financial rail, tax regime, entity identifier) explicitamente descritos como capabilities genéricas do kernel (Parte XXI.1-21.3), remover acoplamento a mercados específicos
- Aethereos Local e Interface Adaptativa reposicionados como capabilities **deferidas** (Parte 21.5 e 21.6), não parte do roadmap imediato
- Atualização da numeração interna: seção 21.1 (antes Backoffice BR) agora é framework financeiro; 21.2 (antes Aethereos Local) agora é framework fiscal; 21.3 (antes Interface Adaptativa) agora é framework de identificadores; 21.4 novo é Modo Degenerado operacionalizado; 21.5 e 21.6 são Aethereos Local e Interface Adaptativa deferidas

### Sugestões das análises explicitamente rejeitadas

Para registro auditável de decisões:

- **Tenant Federation com consórcios temporários + smart contracts**: complexidade de 2-3 anos para problema que pouquíssimos clientes terão em 4-5 anos. Deferido.
- **Capability Marketplace de equipes humanas "alugadas"**: mercado de serviços profissionais disfarçado de feature de plataforma. Não é batalha do Aethereos.
- **Sistema Imunológico Organizacional com "detecção de câncer organizacional"**: metáfora bonita, operacionalização frágil. Falso-positivos explodiriam. Fica como direção filosófica, não feature.
- **BCI / Interface Cérebro-Computador preparação**: hardware maduro 10-15 anos de distância. Preparação agora é distração.
- **Organizações Líquidas como tese central**: especulativo demais para documento fundacional. Se emergir, emergirá sobre o que já está construído.
- **Modelo Cognitivo Empresarial (ontologia/epistemologia/heurísticas/causais)**: conceito interessante mas vago operacionalmente. Fica como pesquisa.
- **CRDTs para colaboração multi-agente em tempo real como requisito central**: complexidade altíssima, caso de uso raro. Postgres com optimistic locking resolve 95% dos casos. CRDTs entram se e quando houver demanda comprovada (mencionados apenas no contexto de Aethereos Local deferido).
- **Governance-as-Prompt substituindo YAML**: como camada de entrada que gera YAML é aceitável (implícito em Policy Studio). Como substituição completa, não — introduz ambiguidade inaceitável.

## v4.0 — Tricotomia de Rigidez, Correções Arquiteturais e Capabilities Consolidadas (2026)

Incorpora três análises críticas externas que identificaram pontos de tensão real nas versões anteriores. Foco em correção estrutural (tricotomia, invariantes recalibrados) e em capabilities que endereçam necessidades operacionais concretas da gestão de empresas B2B 2026-2030.

**Correções arquiteturais cirúrgicas:**
- Introdução da tricotomia [INV] / [DEC] / [HIP] como sistema de notação ao longo de todo o documento, resolvendo a crítica central de que versões anteriores tratavam decisões de diferentes rigidezes como igualmente invariantes
- Seção 4.4 reescrita: navegação híbrida (URL + Zustand) substitui o dogma "navegação sem URL" identificado como excesso de rigidez com custos de ergonomia web
- Seção 5.3 corrigida: assinatura Ed25519 (assimétrica) substitui HMAC (simétrica) em manifestos `.aeth`, alinhada com padrão Apple/Google/package managers
- Seção 8.3 completamente reescrita: modelo de três camadas assíncronas (Domain Event Bruto → Derived Context Record → Actionable Insight) substitui "enrichment-at-transport" síncrono identificado como gargalo de latência e coupling implícito
- Seção 17.6 (Bloco 6) corrigida: critério de aceite mudou de "Agente Financeiro reconcilia pagamentos automaticamente" (irrealista em 6-8 semanas) para "Agente de Classificação Documental" proporcional
- Seção 14.1 atualizada: React 19, Vite 8+ com Node.js 20.19+/22.12+, refletindo documentação oficial atual

**Três novos princípios fundadores em Parte II:**
- P11 — Eventos são auto-certificáveis (Ed25519 + hash chain opcional)
- P12 — Humano e agente compartilham cidadania, não autoridade
- P13 — Dados de domínio pertencem ao domínio

**Novas capabilities arquiteturais integradas nas partes naturais:**
- Seção 4.7 — Driver Model (abstração de backends externos via interfaces TypeScript)
- Seção 4.8 — Aethereos Client SDK (`@aethereos/client`) como API tipada para apps
- Seção 8.6 — Company Graph (empresa como grafo vivo derivado do SCP)
- Seção 8.7 — Process Radar (mineração de processos nativa)
- Seção 9.7 — SCP Bridge on-premise (integração gradual com ERPs legados)
- Seção 10.5 — Schema separation por app no Postgres
- Seção 11.12 — Workforce Híbrida (agentes no organograma com cargo, custo, SLA)
- Seção 11.13 — Circuit Breaker Humano (pausa automática de autonomia)
- Seção 11.14 — Policy Studio (editor visual de Governance-as-Code)
- Seção 11.15 — Trust Center (AI Evals como produto de primeira classe)
- Seção 12.12 — Business Observability (traces técnicos + traces de negócio)

**Novas partes adicionadas:**
- Parte XXI — Capabilities Operacionais Complementares (Backoffice Autônomo BR com Pix Automático/Open Finance/NFS-e nacional/Reforma Tributária; Aethereos Local offline-first; Interface Adaptativa por Contexto)
- Parte XXII — Construção Agêntica do Aethereos (renumeração da antiga Parte XXI, com subseções renumeradas de 21.X para 22.X)
- Parte XXIII — Unit Economics por Fase (custos fixos/variáveis, cenários de viabilidade por fase, thresholds críticos)

**Sugestões explicitamente rejeitadas das análises externas:**
- Smart contracts blockchain para outcomes / SCP Federation com ZK-proofs: complexidade jurídica proibitiva, risco de distração
- Reputation Layer descentralizado via DID: resolve problema que não existe no B2B estabelecido
- Tokens "AETH" para Context Marketplace: hype Web3 sem ancoragem no mercado conservador
- Carbon-Aware Operations como camada estrutural: overengineering para fase atual; fica como extensão futura opcional via Context Enrichment
- Persona-Based UI com reorganização automática: risco de infantilizar usuários experientes ou esconder features; mantido apenas como sugestão explícita sob controle humano
- Rings estilo MINIX para apps: metáfora elegante sem benefício prático sobre a categorização atual
- Modelo de outcome-based pricing integral: complexidade de medição/contratos/disputas proibitiva antes de product-market fit provado

**Glossário expandido** com 20 novos termos fundacionais derivados das capabilities e correções desta versão.

## v3.1 — Extensões de Capabilities e Meta-Arquitetura (2026)

Integra sugestões estratégicas emergidas após revisão da v3 pela lente de "IA especialista em desenvolvimento agêntico autônomo":

**Novas capabilities incorporadas em partes existentes:**
- Seção 4.6 — Aethereos CLI e SDK públicos
- Seção 5.6 — Marketplace de Templates de Governance-as-Code
- Seção 6.5 — Compliance-as-Code por vertical
- Seção 9.6 — Aethereos como servidor MCP (inversão da ponte)
- Seção 11.8 — Shadow Mode como rampa para autonomia
- Seção 11.9 — Digital Twin operacional
- Seção 11.10 — SCP Choreography para orquestração multi-agente
- Seção 11.11 — Observabilidade agêntica nativa
- Seção 12.8 — Time Travel sobre Event Store
- Seção 12.9 — Federated Learning + Consent Receipts
- Seção 12.10 — Notarização imutável de eventos críticos
- Seção 12.11 — PII Vault como gateway de dados pessoais
- Seção 16.5 — Aethereos Academy como quinto pilar de monetização

**Nova parte adicionada:**
- Parte XXI — Construção Agêntica do Aethereos (meta-arquitetura de desenvolvimento)

Introduz squad de 7 sub-agents (Architect, Coder, Reviewer, Tester, Security, Doc, Refactor), MCPs internos de desenvolvimento, feedback loops mecânicos, sistema de ADRs agênticos versionados, meta-observabilidade do próprio desenvolvimento, estrutura de repositório otimizada para agentes, princípio recursivo "Aethereos construindo Aethereos", e roadmap prático dos primeiros 14 dias.

**Glossário estendido** com 17 novos termos fundacionais.

## v3.0 — Consolidação Fundacional (2026)

Integra todas as decisões emergidas ao longo das conversas de refinamento:
- Identidade tripla cravada (kernel OSS + família SaaS + OS integrador)
- Analogia composta Android AOSP + Google Workspace + ChromeOS
- Hierarquia de cinco camadas (Core → Catalog → Vertical → Tenant → User)
- Resolução do conflito: vertical como dado, não código
- Três categorias de apps (first-party SaaS, third-party market, connector)
- Apps invariantes do kernel explicitados
- Aether AI Copilot como nome oficial
- Connector app pattern completo com MCP
- BUSL v1.1 + Aethereos Services proprietário + trademark agressivo como tripla proteção
- Princípios fundadores P1-P10 como capítulo-âncora
- Lista de 8 operações invariantes onde IA nunca executa sozinha
- Action Intents + Governance-as-Code + Audit Trail Dual com schema SQL completo
- Stack técnico cravado com alternativas rejeitadas justificadas
- Roadmap em MVP blocks + horizontes
- Tarefas concretas para execução nos próximos 30/90/365 dias

Substitui em autoridade os documentos anteriores:
- Fundamentos v1.0 (tese original, genealogia técnica)
- AETHEREOS_FOUNDATIONS.md v1 (princípios, garantias, governance)
- SCP Whitepaper v7 (protocolo detalhado)
- AETHEREOS_FUNDAMENTACAO_v2.md (consolidação anterior)

Pontos preservados integralmente dos docs anteriores (como referência complementar):
- Precedentes técnicos (Chrome OS, Linux, WordPress, VS Code, Kubernetes, MCP)
- Genealogia da plataforma
- Detalhamento do SCP
- Mapeamento competitivo
- Riscos estratégicos

---

# EPÍLOGO

O Aethereos não é um produto. E também é. E é mais do que isso.

É simultaneamente uma plataforma source-available à disposição da comunidade, uma família de produtos SaaS que geram receita imediata e um sistema operacional no navegador que unifica ferramentas B2B. As três identidades não se contradizem — elas se reforçam. Como Google é simultaneamente AOSP, Workspace e ChromeOS, como Microsoft é Windows, 365 e Surface, Aethereos é Kernel, Família e OS.

É preparação para um horizonte onde operações B2B cotidianas são conduzidas por cooperação entre humanos e agentes de IA — com garantias, com auditabilidade, com eficiência que hoje parece exótica e amanhã será ordinária. Cada decisão técnica tomada agora (TypeScript strict, SCP em vez de Kafka cru, event-driven em vez de state-based, multi-vertical em vez de monolito, RLS em vez de autorização só em aplicação, Governance-as-Code em vez de permissões ad-hoc, BUSL em vez de MIT puro, Services proprietário em vez de tudo aberto) é preparação para esse horizonte.

A visão é longa. A implementação é progressiva. A disciplina começa hoje.

Este documento registra a tese para quem vier — humanos que se juntarão ao projeto, agentes de IA que ajudarão a construí-lo, investidores que apostarão nele, concorrentes que tentarão replicá-lo. Todos encontrarão, nessas páginas, a forma completa do que estamos construindo.

O Aethereos foi concebido assumindo o futuro. Este documento fixa esse futuro em texto, para que construí-lo não dependa de memória de quem concebeu.

---

**AETHEREOS**

*Plataforma-base source-available para Sistemas Operacionais B2B AI-Native.*
*Família de produtos SaaS integrados.*
*OS unificador no navegador.*

*Primeira vertical: B2B AI OS Brazil.*

*Kernel aberto. Services proprietários. Marca protegida.*

*Protocolo aberto. Plataforma proprietária. Experiência integrada. Inteligência progressiva. Autonomia governada.*

*Funciona com o que você tem. Fica melhor com o que nós temos. Preparado para o que vem.*

---

**Fim do Documento Fundacional v3.0.**
