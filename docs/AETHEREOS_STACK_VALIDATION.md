# Aethereos — Validação da Stack Contra Cenários Concretos

> Documento complementar ao `AETHEREOS_USER_STORIES.md`. Aqui ficam os **pormenores operacionais e regras de negócio** extraídos dos 13 ADRs de stack, da Fundamentação v4.3, dos documentos companheiros e do histórico de conversas que **não** entraram no user stories porque tratam de limites, edge cases, migrações, custos e otimizações que precisam ser validados antes de cravar tecnologia.
>
> Cada cenário é um caso de negócio concreto. Para cada um a stack escolhida deve responder afirmativamente às verificações listadas. Quando os critérios trouxerem números, eles foram destilados das decisões operacionais já tomadas — não são hipóteses.

---

## Como usar este documento

Cada cenário tem três blocos:

- **Caso de negócio.** A situação real, descrita em termos do que acontece com clientes, usuários ou operação.
- **Certifique-se que a stack.** Verificações funcionais que precisam ser respondidas com "sim".
- **Analise se está otimizada para.** Critérios quantitativos ou qualitativos para julgar se a stack é apenas viável ou genuinamente bem-escolhida.
- **Sinais de stress (quando reavaliar).** Limites onde a decisão atual deixa de ser a melhor e exige revisão arquitetural.

A ausência de um "sim" em qualquer **certifique-se** é bloqueio. A ausência de otimização não é bloqueio mas é dívida técnica conhecida que precisa ser registrada.

---

## Sumário

1. [Modos de Cliente e Fluxo de Adoção](#1-modos-de-cliente-e-fluxo-de-adoção)
2. [Migração e Upgrade Indolor](#2-migração-e-upgrade-indolor)
3. [Custo e Unit Economics por Fase](#3-custo-e-unit-economics-por-fase)
4. [Escala e Capacidade](#4-escala-e-capacidade)
5. [Latência e Performance](#5-latência-e-performance)
6. [Disponibilidade, Resiliência e Modo Degenerado](#6-disponibilidade-resiliência-e-modo-degenerado)
7. [Multi-Tenant e Isolamento](#7-multi-tenant-e-isolamento)
8. [Cross-App e Protocolo de Contexto (SCP)](#8-cross-app-e-protocolo-de-contexto-scp)
9. [Identidade Cross-Domain e SSO](#9-identidade-cross-domain-e-sso)
10. [IA — Copilot, Agentes e Governance](#10-ia--copilot-agentes-e-governance)
11. [Compliance e Direitos do Titular](#11-compliance-e-direitos-do-titular)
12. [Segurança e Anti-Fraude](#12-segurança-e-anti-fraude)
13. [Camada 0 — Open Source Local-First](#13-camada-0--open-source-local-first)
14. [Conectores e Sistemas Externos](#14-conectores-e-sistemas-externos)
15. [Internacionalização e Múltiplas Distribuições](#15-internacionalização-e-múltiplas-distribuições)
16. [Marketplace e Apps Third-Party](#16-marketplace-e-apps-third-party)
17. [Desenvolvimento Agêntico (Squad de Agentes)](#17-desenvolvimento-agêntico-squad-de-agentes)
18. [Migração Futura de Backend](#18-migração-futura-de-backend)
19. [Memória de IA e RAG](#19-memória-de-ia-e-rag)
20. [Edge Cases e Limites Honestos](#20-edge-cases-e-limites-honestos)
21. [Continuidade e Saída do Cliente](#21-continuidade-e-saída-do-cliente)
22. [Dogfood e Auto-Operação](#22-dogfood-e-auto-operação)

---

## 1. Modos de Cliente e Fluxo de Adoção

### Cenário 1.1 — Cliente compra apenas um SaaS standalone

**Caso de negócio.** Uma empresa descobre o produto financeiro pelo domínio próprio dele, faz trial e assina apenas esse produto. Nunca ouviu falar da plataforma maior. Acessa pelo domínio do produto, vê landing pública otimizada para SEO, faz signup, chega a um dashboard que parece um SaaS qualquer.

**Certifique-se que a stack:**
- Suporta cada produto da família com **domínio próprio** independente, com landing pública SEO-first.
- Permite que cada produto tenha **três áreas distintas no mesmo projeto**: pública para SEO, autenticada standalone, modo embed para rodar dentro do shell quando o cliente migrar.
- Mantém o cliente standalone tecnicamente como tenant da mesma instalação da distribuição, mas com lista de apps instalados restrita a apenas o produto contratado.
- Permite que o cliente standalone **nunca veja branding, navegação ou referência ao ecossistema maior** se não optar por isso.
- Garante isolamento absoluto: bug em qualquer ponto não pode revelar dados de outras empresas, mesmo as que usam o pacote completo na mesma instalação.

**Analise se está otimizada para:**
- Tempo de primeiro carregamento da landing pública abaixo de **2 segundos** em conexões móveis de qualidade média (precisa ser SEO-friendly de verdade, não SPA pura).
- SEO técnico no topo (renderização do conteúdo na primeira resposta, schema markup, sitemap, meta tags por página).
- Signup standalone que não exija conhecer o ecossistema.

**Sinais de stress (quando reavaliar):**
- Tempo de carregamento da landing acima de 3s em qualquer dispositivo de mercado-alvo.
- Confusão de marca: cliente standalone vê elementos da distribuição que não deveriam aparecer.

---

### Cenário 1.2 — Cliente compra o pacote completo da distribuição

**Caso de negócio.** Empresa industrial brasileira de porte médio descobre o pacote vertical, decide assinar tudo. Acessa pelo domínio da distribuição, faz onboarding pelo CNPJ, chega ao desktop com todos os apps pré-instalados e o copiloto rodando.

**Certifique-se que a stack:**
- Provisiona uma empresa nova com a distribuição completa em **menos de 90 segundos** desde a primeira tela até o desktop funcional.
- Aplica branding da distribuição em runtime, sem rebuild ou redeploy.
- Pré-instala todos os apps declarados no manifesto da distribuição, com configurações default.
- Inicializa o copiloto com contexto da empresa.
- Monta a Mesa padrão com widgets relevantes ao setor.

**Analise se está otimizada para:**
- Onboarding completo (incluindo enriquecimento via consulta a APIs públicas de identificadores) em **60-90 segundos** medidos.
- Falha graciosa se a fonte de enriquecimento estiver indisponível (preenchimento manual sem bloqueio).
- Tela do desktop respondendo em até **1.5 segundos** após o último clique do onboarding.

**Sinais de stress (quando reavaliar):**
- Mais de 90 segundos para chegar ao desktop em qualquer conexão razoável.
- Bundle inicial do shell maior que **500 KB** depois de gzip (compromete o tempo de primeiro paint em conexões móveis).

---

### Cenário 1.3 — Cliente quer construir sua própria distribuição

**Caso de negócio.** Uma rede de clínicas quer um "ClinicaOS" interno, com identidade própria, apps específicos do setor saúde, compliance médico ativo. Não quer construir do zero; quer aproveitar o kernel.

**Certifique-se que a stack:**
- Permite que uma nova distribuição seja criada por **configuração declarativa apenas**, sem rebuild do kernel, sem redeploy.
- Permite que apps específicos do setor sejam declarados com restrição de visibilidade exclusiva à distribuição (`compatible_verticals`).
- Suporta extensões executáveis específicas para casos onde o JSON não basta (validação fiscal específica, formatação de documentos regulatórios), com sandbox, timeout e assinatura.
- Permite que a distribuição pluggue frameworks setoriais (compliance, identificadores, rails financeiros) sem que isso vaze para outras distribuições.

**Analise se está otimizada para:**
- Criação de uma nova distribuição em **horas, não semanas** (apenas configuração + curadoria de apps).
- Validação automática do manifesto da distribuição antes de ativar (campos obrigatórios, integridade de referências, frameworks declarados existentes).

**Sinais de stress (quando reavaliar):**
- Distribuição com mais de ~10 hooks executáveis (provavelmente é produto disfarçado, não distribuição).
- Pressão para "só desta vez" colocar lógica de distribuição no kernel.

---

### Cenário 1.4 — Cliente migra de standalone para pacote completo

**Caso de negócio.** Empresa que assinou apenas o produto financeiro standalone há 8 meses decide assinar o pacote completo. Quer ganhar os outros apps integrados sem perder histórico, sem refazer cadastros, sem migração de dados.

**Certifique-se que a stack:**
- A migração se resume a **alterar a lista de apps instalados** da empresa; nenhum dado é movido.
- O histórico de eventos do produto standalone fica imediatamente disponível para o copiloto e demais apps integrados (RAG enxerga tudo).
- Permissões existentes, usuários, configurações pessoais, layout da Mesa permanecem.
- A operação é instantânea, sem downtime perceptível.
- A migração reversa (downgrade) também não destrói dados, apenas restringe acesso.

**Analise se está otimizada para:**
- Migração executável **em segundos** (operação de configuração).
- Inserção do histórico no contexto do copiloto sem janela de "indisponibilidade de inteligência".

**Sinais de stress (quando reavaliar):**
- Qualquer caminho que exija exportar e importar dados entre instalações.
- Necessidade de conversão de schema entre standalone e pacote.

---

## 2. Migração e Upgrade Indolor

### Cenário 2.1 — Onboarding em ondas com tenants piloto

**Caso de negócio.** Uma feature de classe de risco alta (ex: agente que executa ação reversível) está pronta. Não pode ser ativada para todos de uma vez. Precisa entrar com 1-3 tenants piloto consentidos, observar 30 dias, expandir em ondas de 5-10% com janelas mínimas entre ondas.

**Certifique-se que a stack:**
- Suporta feature flags por tenant (não apenas globais).
- Permite definir **ondas de rollout** com critérios de avanço explícitos.
- Permite reverter (desligar) a feature em um tenant específico sem deploy.
- Registra histórico de ativação/desativação por tenant para auditoria.
- Integra-se com o painel de governança para que owner saiba qual feature está ativa em modo piloto.

**Analise se está otimizada para:**
- Mudança de flag propagando em **menos de 60 segundos** para todos os nós relevantes.
- Custo operacional de uma flag baixíssimo (não vale a pena evitar criar flag por preguiça operacional).

**Sinais de stress (quando reavaliar):**
- Necessidade de deploy para mudar flag.
- Mais de alguns minutos para uma flag se propagar.

---

### Cenário 2.2 — Versionamento entre kernel, SDK e apps publicados

**Caso de negócio.** O kernel evolui de versão major. Apps third-party assinados na versão anterior precisam continuar funcionando por uma janela razoável. SDK do app declara compatibilidade.

**Certifique-se que a stack:**
- Suporta o kernel atender SDK na **versão major atual + uma versão major anterior** (matriz N e N-1).
- Apps com manifesto a duas versões major à frente do SDK falham na instalação com mensagem clara.
- Quebra de compatibilidade dispara incremento de major; releases automation valida isso.
- Existe modo de compatibilidade documentado para a versão major anterior.

**Analise se está otimizada para:**
- Janela de aviso de deprecação de **6 meses no mínimo** antes de remover suporte a versão antiga.
- Catálogo central listando versões publicadas, status (ativa, deprecada, removida) e consumidores registrados.

**Sinais de stress (quando reavaliar):**
- Apps quebrando após upgrade de kernel sem aviso prévio.
- Mais de duas versões major coexistindo em produção (sinal de débito acumulado).

---

### Cenário 2.3 — Arquivamento progressivo do Event Store

**Caso de negócio.** Após meses de operação, o Event Store cresce muito. Eventos brutos antigos (mais de 3 meses) raramente são consultados em tempo real, mas precisam ficar disponíveis por anos para auditoria e compliance.

**Certifique-se que a stack:**
- O Event Store é **particionado por mês desde o dia 1**.
- Existe processo automatizado que move partições com mais de 3 meses para armazenamento frio.
- Consultas históricas continuam funcionais, mesmo que com latência maior, sobre dados arquivados.
- Embeddings vetoriais antigos podem ser purgados ou movidos para armazenamento mais barato sem quebrar busca recente.
- Retenção legal segue a política definida (dados fiscais até 5 anos, audit trail até 7 anos, etc.).

**Analise se está otimizada para:**
- Custo de armazenamento dos últimos 3 meses (acessados frequentemente) menor que o custo do arquivamento de longo prazo.
- Reprocessamento idempotente: arquivamento e desarquivamento não criam duplicações.

**Sinais de stress (quando reavaliar):**
- Custo de armazenamento crescendo linearmente com número de tenants ativos × tempo.
- Queries do copiloto degradando porque o RAG considera histórico longo demais sem decay temporal.

---

## 3. Custo e Unit Economics por Fase

### Cenário 3.1 — Custo fixo na Fase 1 (pré-receita)

**Caso de negócio.** Empresa solo entrepreneur lançando a Fase 1 (kernel puro, primeiros pilotos). Sem receita ainda. Não pode queimar capital de capital de giro com infraestrutura. Pressão para lançar com custo previsível e baixo.

**Certifique-se que a stack:**
- Custo total fixo mensal de infraestrutura na Fase 1 fica entre **US$ 155 e US$ 345/mês**, independente do número de PRs ou commits.
- Kubernetes ou orquestradores complexos não são exigidos na Fase 1.
- O custo de cada componente é declarado e auditável (ambiente de banco, hospedagem do backend, hospedagem do frontend, CDN, cache, observabilidade, gateway de IA).
- Free tiers utilizados são monitorados; alertas disparam quando 70% do limite é atingido.

**Analise se está otimizada para:**
- Custo por tenant ativo na Fase 1 abaixo de **US$ 5/mês marginal** (na Fase 1 com até 10 tenants).
- Curva de custo previsível: passar de 0 para 10 tenants não deve mais que dobrar o custo total.

**Sinais de stress (quando reavaliar):**
- Custo fixo passando de US$ 500/mês antes de receita.
- Free tier de qualquer componente atingindo 70% (sinal de upgrade próximo).

---

### Cenário 3.2 — Custo escalando com tenants na Fase 2

**Caso de negócio.** Operação atinge primeiros 5-10 tenants pagantes na Fase 2. Mais carga no banco, mais eventos, mais uso do copiloto. Custos sobem.

**Certifique-se que a stack:**
- Custo mensal de infraestrutura na Fase 2 fica entre **US$ 500 e US$ 1.500/mês**.
- Existe métrica clara de "custo por tenant ativo".
- Quotas de uso de IA por plano impedem explosão de custo de tokens.
- Cache semântico de IA reduz repetição de queries idênticas (hit rate alvo > 30%).

**Analise se está otimizada para:**
- Margem bruta saudável por tenant pagante (custo de infraestrutura não deve passar de 20-30% da assinatura).
- Roteador adaptativo de modelos de IA reduz custo médio em **30-50%** versus pipeline único caro.

**Sinais de stress (quando reavaliar):**
- Custo de banco passando de **US$ 1.000/mês** (sinal Fase 3 — migração próxima).
- p95 de latência de leitura passando de **200 ms** com carga de tenants pagantes ativos.
- Custo de tokens de IA crescendo mais rápido que receita de IA (margem invertendo).

---

### Cenário 3.3 — Orçamento técnico por feature de IA

**Caso de negócio.** Uma feature nova quer usar modelo de linguagem. Pode parecer trivial mas escala mal — milhares de invocações/dia podem virar milhares de dólares em tokens.

**Certifique-se que a stack:**
- Toda feature de IA, antes de merge, declara **seis campos obrigatórios**: custo estimado por invocação, latência alvo (p50, p95), fallback disponível, kill switch, quota por tenant, métricas de qualidade.
- Sem essa declaração, merge é bloqueado mecanicamente.
- Existe gateway de IA que mede custo por chamada por feature por tenant, em tempo real.
- Existe kill switch funcional para desligar a feature sem deploy se custo explodir.

**Analise se está otimizada para:**
- Visibilidade de custo de IA por feature em **dashboard atualizado em minutos**, não em fechamento de mês.
- Capacidade de trocar modelo de provider em **mudança de configuração**, não em refactor de código.

**Sinais de stress (quando reavaliar):**
- Feature com custo médio crescendo mês a mês sem motivo de aumento de uso real.
- Inviabilidade de medir custo por tenant.

---

## 4. Escala e Capacidade

### Cenário 4.1 — 50 tenants ativos com 40 funcionários cada

**Caso de negócio.** Distribuição madura tem 50 tenants ativos, cada um com cerca de 40 funcionários. Total de ~2.000 usuários ativos. 8 apps emitindo eventos. Volume típico: ~1.000 eventos/dia/tenant. Total: ~400 mil eventos/dia.

**Certifique-se que a stack:**
- Suporta confortavelmente **50-100 tenants ativos** com a arquitetura inicial.
- Conexões simultâneas ao banco escalam (com pooler quando necessário).
- Canais de tempo real (presença, notificações) suportam milhares de assinantes simultâneos.
- Event Store particionado mantém queries dos últimos 3 meses rápidas.
- Backups automáticos com janela de retenção compatível com plano enterprise.

**Analise se está otimizada para:**
- p95 de leitura de Event Store recente abaixo de **200 ms** com essa carga.
- p95 de emissão de evento (do `emit()` ao `acknowledge`) abaixo de **100 ms** (idealmente abaixo de **50 ms**).
- Disponibilidade acima de **99.5%** medida em janela de 30 dias em produção.

**Sinais de stress (quando reavaliar):**
- Custo do banco principal passando de US$ 1.000-3.000/mês.
- p95 de latência degradando consistentemente.
- Churn de tenants atribuível a problemas de performance.
- Ponto onde a Estratégia C de migração (banco self-hosted ou em outro provedor managed) começa a ser ativada.

---

### Cenário 4.2 — Tenant grande com milhões de eventos/mês

**Caso de negócio.** Um tenant enterprise tem alta atividade — milhões de eventos por mês (e-commerce de alto volume, indústria com IoT). Se a arquitetura não particionar, ele degrada o desempenho de todos os outros tenants.

**Certifique-se que a stack:**
- Particionamento por mês do Event Store mantém queries por janela curta rápidas, independente do tamanho histórico.
- Embeddings vetoriais escalam até pelo menos **10-20 milhões de vetores por tenant** sem degradação inaceitável.
- Tenant enterprise pode contratar retenção e arquivamento customizados sem afetar a operação dos demais.
- Limite operacional do banco compartilhado (~50-100 tenants ativos) considera tenants pequenos; tenants grandes podem exigir instância dedicada quando o sinal aparecer.

**Analise se está otimizada para:**
- Capacidade de mover um tenant grande para infraestrutura dedicada **sem migração custosa de dados** (graças ao Driver Model).
- Detecção precoce de tenant que está dominando recursos (métricas por tenant).

**Sinais de stress (quando reavaliar):**
- Um tenant consumindo desproporcionalmente recursos do banco compartilhado.
- Degradação de p95 visível para outros tenants quando o tenant grande está em pico.

---

### Cenário 4.3 — Volume de embeddings e RAG

**Caso de negócio.** Cada evento SCP gera embedding semântico. Documentos no gerenciador de arquivos também. RAG do copiloto consulta esse índice constantemente. Volume cresce com tempo.

**Certifique-se que a stack:**
- Índice vetorial inicial suporta **5-10 milhões de vetores por tenant** com latência de query aceitável.
- Existe abstração que permite trocar o backend vetorial (de pgvector para Qdrant ou equivalente) sem refactor de código de aplicação.
- Embeddings antigos podem ser arquivados ou recomputados quando modelo de embedding evolui.
- RAG aplica decay temporal: eventos mais recentes pesam mais que antigos, com meias-vidas declaradas por tipo de sinal.

**Analise se está otimizada para:**
- Latência p95 de query vetorial abaixo de **100 ms** para top-10 resultados.
- Custo de embeddings por tenant escalando linearmente com volume, não exponencialmente.

**Sinais de stress (quando reavaliar):**
- Volume vetorial passando de **10 milhões por tenant**, sinal para considerar índice vetorial dedicado.
- QPS sobre busca vetorial passando de **100 QPS** sustentado.

---

## 5. Latência e Performance

### Cenário 5.1 — SLOs definidos do kernel `[INV]`

**Caso de negócio.** SLOs declarados como contrato técnico interno: o sistema precisa atender certos limites de latência e disponibilidade ou perde clientes e credibilidade.

**Certifique-se que a stack:**
- p95 de **emissão de evento SCP** (do `emit()` ao `acknowledge`) abaixo de **100 ms**.
- p95 de **leitura de Event Store recente** (último mês) abaixo de **200 ms**.
- **Disponibilidade do shell e apps invariantes** acima de **99.5%** em janelas mensais.
- Bundle inicial do shell **abaixo de 500 KB** após gzip.
- Apps são carregados sob demanda (lazy loading): apps não usados não pesam no bundle inicial.

**Analise se está otimizada para:**
- Métricas observáveis em painel central, com alertas quando SLOs se aproximam de violação.
- Capacidade de traçar uma única operação (um pedido, uma transação) end-to-end com tempos por etapa.

**Sinais de stress (quando reavaliar):**
- Violação repetida de qualquer SLO em janela mensal.
- Bundle inicial passando de 500 KB.
- Tempo de primeiro paint em conexões móveis acima de 2 segundos.

---

### Cenário 5.2 — Troca de aba sem perder estado

**Caso de negócio.** Operador final está preenchendo formulário em um app, troca para outra aba para consultar algo, volta. O formulário precisa estar exatamente como estava, scroll, filtros, valores parciais, tudo.

**Certifique-se que a stack:**
- Trocar de aba **não desmonta** o app que ficou em segundo plano.
- Estado efêmero de sessão (formulários parciais, filtros) sobrevive a recarregamento dentro da mesma sessão.
- URL representa identidade (qual app, qual entidade); estado de aba (ordem, filtros) é separado.
- Compartilhar URL leva o destinatário (autenticado) ao mesmo lugar.
- Trocar de aba é re-render local instantâneo, não nova navegação.

**Analise se está otimizada para:**
- Tempo de troca de aba imperceptível para o usuário (idealmente < 50 ms).
- Estado preservado em refresh do navegador.

**Sinais de stress (quando reavaliar):**
- Usuários reclamando de perder estado ao trocar de aba.
- Tempo perceptível ao trocar entre apps abertos.

---

### Cenário 5.3 — Service Worker e cache de apps

**Caso de negócio.** Operador final abre o sistema diariamente. Apps já carregados anteriormente devem abrir instantaneamente. Acesso rápido à sessão recente é parte da expectativa.

**Certifique-se que a stack:**
- Existe Service Worker que cacheia apps já carregados.
- Apps abrem em re-acessos com **latência percebida zero**.
- Atualização de app invalida cache antigo de forma controlada.

**Analise se está otimizada para:**
- Operação resiliente a quedas curtas de conexão depois do primeiro carregamento.
- Estratégia de cache que não estoura cota do navegador em uso prolongado.

**Sinais de stress (quando reavaliar):**
- Usuários relatando "tela em branco" durante deploy de nova versão.
- Cota de armazenamento do navegador esgotando para usuários intensivos.

---

## 6. Disponibilidade, Resiliência e Modo Degenerado

### Cenário 6.1 — Engine de contexto indisponível por horas `[INV]`

**Caso de negócio.** O componente que enriquece eventos com contexto (histórico, sinais externos, métricas derivadas) falha ou fica lento por algumas horas. Operações de negócio críticas precisam continuar.

**Certifique-se que a stack:**
- Apps críticos operam com **payload bruto + visões canônicas**, não dependem de enriquecimento para funcionar.
- A emissão de evento bruto **nunca espera** enriquecimento para confirmar a operação ao usuário.
- A camada de enriquecimento pode ficar indisponível por horas sem derrubar apps críticos.
- A UI degrada graciosamente: mostra dados básicos quando contexto não chegou, enriquece à medida que chega.
- Insights são opcionais; quando ausentes, dados básicos continuam completos e úteis.

**Analise se está otimizada para:**
- Detecção mecânica de tentativa de criar dependência transacional de contexto enriquecido (verificação no CI/lint).
- Apps marcados como third-party que violem o invariante são rejeitados em certificação.

**Sinais de stress (quando reavaliar):**
- Time de produto pressionando por "só desta vez" deixar app dependente de contexto enriquecido para funcionar.
- Casos onde camada de enriquecimento indisponível causou parada de operação básica.

---

### Cenário 6.2 — Modo degenerado obrigatório por componente sofisticado `[INV]`

**Caso de negócio.** O sistema tem componentes sofisticados (motor de políticas com YAML, engine de contexto com embeddings, grafo da empresa, mineração de processos, central de confiança da IA, modo sombra, circuit breaker). Implementar todos em modo pleno simultaneamente é projeto impossível. Sob pressão de prazo, alguma capability sempre fica "para depois".

**Certifique-se que a stack:**
- **Todo componente sofisticado declara explicitamente seu modo degenerado mínimo viável.**
- O sistema entra em produção com qualquer subset em modo pleno; o resto opera em degenerado sem quebra funcional.
- Modos degenerados são default em planos básicos e ambientes de desenvolvimento; modo pleno é licenciado/contratado.
- Componentes "saltam" do degenerado para o pleno individualmente, sem precisar esperar todo o ecossistema estar pronto.
- Cada componente tem implementação degenerada e plena registradas em container de injeção; configuração escolhe qual ativar.

**Analise se está otimizada para:**
- Documentação clara, por componente, do que muda entre degenerado e pleno.
- Capacidade de rodar testes E2E em ambos os modos.

**Sinais de stress (quando reavaliar):**
- Pressure para "esperar tudo pronto" antes de lançar.
- Componente sofisticado sem modo degenerado declarado (bloqueio de merge).

---

### Cenário 6.3 — Backup, DR e RTO/RPO declarados

**Caso de negócio.** Falha catastrófica do banco principal. O cliente não pode perder mais que algumas horas de dados, nem ficar fora do ar por mais que algumas horas.

**Certifique-se que a stack:**
- Backups automáticos diários, com retenção de pelo menos 30 dias.
- RTO (tempo máximo para restaurar serviço) e RPO (perda máxima aceitável de dados) declarados explicitamente em SLO_TARGETS.
- Procedimento de restauração testado periodicamente (não apenas documentado).
- Planos de continuidade testados via tabletop exercise antes de GA.

**Analise se está otimizada para:**
- RTO realista compatível com expectativa de cliente B2B (poucas horas, idealmente menos de 4 horas).
- Capacidade de restauração por schema/módulo, não só restauração full do banco inteiro.

**Sinais de stress (quando reavaliar):**
- Tentativa de restauração nunca testada em ambiente real.
- RTO/RPO indeclarados ou impossíveis de cumprir com a stack atual.

---

## 7. Multi-Tenant e Isolamento

### Cenário 7.1 — Bug em código tenta vazar dados entre empresas `[INV]`

**Caso de negócio.** Um desenvolvedor comete erro em uma query: esqueceu de filtrar por empresa. Em sistemas tradicionais, isso vaza dados. Aqui não pode vazar — o filtro precisa ser aplicado pela camada de banco em última instância.

**Certifique-se que a stack:**
- Toda tabela com dados de tenant tem coluna obrigatória de identidade da empresa.
- Política de segurança em nível de linha (RLS) está ativa em toda tabela com dados de tenant.
- Aplicação seta contexto da empresa ativa no início de cada request.
- Query sem contexto ativo retorna **zero linhas** (fail-closed), não erro que entregue informação.
- Existem testes automatizados que tentam cross-tenant access e validam que retornam zero resultados em **100% dos casos**.

**Analise se está otimizada para:**
- Penalty insignificante de performance pela camada de RLS (idealmente < 5% de overhead).
- Suite de testes de isolamento sendo executada em cada PR que toca em qualquer tabela com dados de tenant.

**Sinais de stress (quando reavaliar):**
- Pressão para "desligar RLS para essa tabela específica para ganhar performance".
- Endpoints administrativos contornando contexto de empresa sem auditoria explícita.

---

### Cenário 7.2 — Equipe interna acessando dados de cliente `[INV]`

**Caso de negócio.** Cliente reporta bug e suporte da plataforma precisa entrar nos dados dele para investigar. Esse acesso não pode ser silencioso nem ilimitado.

**Certifique-se que a stack:**
- Equipe interna de suporte tem papéis **separados e ortogonais** aos papéis das empresas clientes.
- Cada acesso de suporte exige **justificativa textual obrigatória** registrada.
- Cada acesso gera evento `platform.staff.tenant_accessed` com identidade do staff, justificativa, tempo de acesso.
- Owner da empresa recebe notificação em tempo real.
- Existe mecanismo "break-glass" para emergências, com fricção adicional e revisão automática posterior.
- Owner pode revisar histórico completo de acessos de staff a qualquer momento.

**Analise se está otimizada para:**
- Fluxo de break-glass que **não impeça resolução real de incidente**, mas que carregue evidência completa para revisão.
- Procedimento testado em tabletop exercise antes de GA.

**Sinais de stress (quando reavaliar):**
- Equipe contornando o procedimento porque "é mais rápido".
- Owner não recebendo notificações ou as recebendo com atraso significativo.

---

### Cenário 7.3 — Cliente standalone na mesma instância da distribuição

**Caso de negócio.** Cliente que assinou apenas um produto standalone está tecnicamente como tenant da mesma instalação Postgres da distribuição completa, mas só pode ver e operar o app contratado.

**Certifique-se que a stack:**
- A configuração `installed_apps` do tenant restringe quais apps aparecem no shell.
- Apps não instalados não aparecem na vitrine (ou aparecem com indicador de "requer upgrade" se a distribuição decidir mostrar).
- A RLS bloqueia naturalmente o acesso a dados de outras empresas, independente do plano.
- Mudança de `installed_apps` propaga em segundos para a sessão ativa do usuário.

**Analise se está otimizada para:**
- Operação standalone que parece SaaS independente, sem nenhuma "fuga visual" do ecossistema maior.
- Custos adicionais para manter cliente standalone próximos de zero (compartilha infraestrutura).

**Sinais de stress (quando reavaliar):**
- Cliente standalone descobrindo elementos do pacote que não deveriam aparecer.
- Custo de manter cliente standalone se aproximando do custo de cliente de pacote completo.

---

## 8. Cross-App e Protocolo de Contexto (SCP)

### Cenário 8.1 — Pedido em um app cria conta a receber em outro

**Caso de negócio.** Operador cria pedido no app comercial. Automaticamente, o app financeiro precisa criar conta a receber correspondente, sem que o usuário faça isso manualmente, sem acoplamento direto entre apps.

**Certifique-se que a stack:**
- O app comercial **emite evento estruturado** (`commerce.order.placed.v1`), não chama API do app financeiro diretamente.
- O app financeiro **assina o evento** e cria conta a receber automaticamente.
- A operação no app comercial **completa em milissegundos**, sem esperar que o app financeiro processe.
- Se o app financeiro estiver indisponível, o evento fica em fila persistente e é processado quando ele volta — sem perda.
- Existe ID de causalidade que liga o pedido criado à conta a receber gerada (rastreabilidade end-to-end).

**Analise se está otimizada para:**
- Latência total do loop "evento emitido → outro app reagiu" abaixo de **3 segundos** em condições normais (pode ser mais em picos sem afetar correção).
- Idempotência: reemitir o mesmo evento bruto não cria duplicações.
- Outbox pattern garantindo atomicidade entre escrita transacional e publicação do evento.

**Sinais de stress (quando reavaliar):**
- Apps tentando ler dados de outros apps via JOIN direto em vez de via eventos ou views canônicas.
- Eventos sendo publicados sem schema validado (catálogo de schemas inconsistente).
- Dead Letter Queue acumulando eventos mal formados sem alarmar.

---

### Cenário 8.2 — Reprocessamento histórico após melhoria de algoritmo

**Caso de negócio.** Algoritmo de enriquecimento de eventos foi melhorado. Eventos históricos precisam ser reprocessados para receber a nova qualidade, sem causar duplicações nem efeitos colaterais.

**Certifique-se que a stack:**
- Eventos brutos são **imutáveis após gravação**.
- Reprocessamento gera novas versões de contexto/insight, **não muta histórico**.
- Idempotência é garantida por ID único (UUID v7 ou equivalente sortable por tempo).
- Existe ferramenta operacional que faz reprocessamento por janela com filtros (tipo de evento, tenant, período).

**Analise se está otimizada para:**
- Reprocessamento de meses de histórico sem afetar tráfego atual de produção.
- Versionamento de context records para que múltiplas versões coexistam até deprecação.

**Sinais de stress (quando reavaliar):**
- Tentativa de mutar evento bruto.
- Reprocessamento que cause duplicação ou efeito colateral em outros sistemas.

---

### Cenário 8.3 — Taxonomia padronizada de eventos `[INV]`

**Caso de negócio.** Múltiplos times escrevendo apps. Sem disciplina, cada um inventa nome de evento próprio. Catálogo vira torre de babel.

**Certifique-se que a stack:**
- Eventos seguem convenção `domínio.entidade.ação` no particípio passado (algo aconteceu), em minúsculas, separados por ponto.
- Domínios reservados (eventos de plataforma, eventos de agente, eventos de contexto, eventos de integração) não podem ser emitidos por apps comuns.
- Cada `event_type` tem **schema versionado** (Zod ou equivalente) registrado em catálogo central.
- Emissão de evento sem schema registrado é bloqueada em CI.
- Schema test verifica em build que todo `event_type` emitido tem schema canônico.

**Analise se está otimizada para:**
- Catálogo de eventos navegável e auto-documentado.
- Quebra de schema detectada em compile-time, não runtime.

**Sinais de stress (quando reavaliar):**
- Eventos em produção sem schema correspondente.
- Apps inventando taxonomia própria por preguiça operacional.

---

## 9. Identidade Cross-Domain e SSO

### Cenário 9.1 — Login em um produto, acesso silencioso em outro

**Caso de negócio.** Usuário loga no produto financeiro pelo domínio próprio. Em seguida acessa o produto comercial (domínio diferente). Não pode ter que digitar credenciais novamente.

**Certifique-se que a stack:**
- Existe **provedor de identidade central** que age como IdP para todos os produtos da família.
- Produtos em domínios diferentes (`produto-a.com`, `produto-b.com`) usam fluxo de OIDC com PKCE para SSO silencioso.
- Sessão ativa no IdP central permite reutilização: produto B redireciona ao IdP, IdP confirma sessão, produto B recebe tokens sem fricção visível.
- Cookies seguem regra correta para domínio: cookies first-party em cada domínio; sessão central via OIDC.

**Analise se está otimizada para:**
- Tempo total de SSO silencioso abaixo de **1 segundo** em conexões normais.
- Suporte a logout central que propaga para todos os produtos opcionalmente.

**Sinais de stress (quando reavaliar):**
- Pedido enterprise por SAML obrigatório (sinal para introduzir IdP federado externo como Zitadel/Keycloak na Fase 3+).
- Pedido por SCIM (provisionamento automatizado de usuários por sistema externo).
- Pedido por claims customizadas no token.

---

### Cenário 9.2 — Token exchange para ações em nome do usuário

**Caso de negócio.** Produto A precisa executar ação no produto B em nome do usuário, sem exigir nova autenticação.

**Certifique-se que a stack:**
- Suporta token exchange (RFC 8693 ou equivalente) entre produtos da família.
- Tokens delegados carregam claim explícita de origem e propósito.
- Auditoria registra a delegação: produto A pediu, produto B autorizou.

**Analise se está otimizada para:**
- Tokens com escopo mínimo necessário (princípio do menor privilégio).
- Tempo de vida curto, refresh automático.

**Sinais de stress (quando reavaliar):**
- Compartilhamento ad-hoc de tokens entre produtos sem governança formal.
- Falta de auditoria de delegação.

---

## 10. IA — Copilot, Agentes e Governance

### Cenário 10.1 — Copilot responde pergunta com citação clicável dos eventos-fonte

**Caso de negócio.** Owner pergunta "qual o fluxo de caixa projetado nos próximos 60 dias?". O copiloto responde com narrativa e cita os eventos que fundamentaram a resposta.

**Certifique-se que a stack:**
- Copilot busca eventos relevantes via **busca semântica vetorial filtrada por isolamento de empresa**.
- Resposta cita os eventos-fonte com link clicável que abre o evento no contexto onde foi originado.
- Quando copiloto não tem certeza, responde "não sei com certeza, eis o que encontrei" — não inventa.
- Resposta inclui **incerteza explícita** (intervalo de confiança, nível "alta/média/baixa") quando aplicável.
- Permission check ocorre **antes** do retrieval e do envio ao modelo: usuário só vê eventos a que tem permissão.

**Analise se está otimizada para:**
- Cache semântico de queries similares para reduzir custo de tokens.
- Roteador adaptativo que envia queries simples a modelos baratos e queries complexas a modelos caros.
- Latência total da resposta abaixo de **5 segundos** para queries comuns; abaixo de **15 segundos** para queries complexas.

**Sinais de stress (quando reavaliar):**
- Custo de tokens crescendo desproporcionalmente ao uso real útil.
- Taxa de alucinação acima do limiar declarado no Trust Center.
- Hit rate do cache semântico abaixo de 20% (sinal de cache mal calibrado).

---

### Cenário 10.2 — Agente em modo sombra durante 30+ dias

**Caso de negócio.** Agente novo de classificação documental está pronto. Antes de operar autonomamente, precisa rodar em modo sombra: faz todo o raciocínio, registra o que teria feito, mas não aplica. Owner revê propostas em digest, dá feedback. Após métricas atingidas, agente é graduado para autonomia.

**Certifique-se que a stack:**
- Agente em modo sombra **registra propostas com raciocínio**, sem aplicar ações.
- Owner recebe digest periódico com botões "teria aprovado / teria rejeitado / condicional".
- Métricas de graduação são declaradas: número mínimo de decisões, acurácia mínima, ausência de decisões catastróficas, tempo mínimo em sombra.
- Limites são configuráveis por tenant; defaults conservadores.
- Graduação para autonomia exige decisão explícita do owner; não é automática.

**Analise se está otimizada para:**
- Digest acessível e legível, com amostragem inteligente quando volume é alto.
- Feedback humano alimenta dataset de avaliação para treinos futuros.
- Para classe de risco alta, modo sombra de **90+ dias** com precisão > 99% antes de qualquer autonomia.
- Para classe média, modo sombra de **30+ dias** com precisão > 90%.

**Sinais de stress (quando reavaliar):**
- Pressão para pular modo sombra e ir direto para autonomia "porque o agente é claramente bom".
- Métricas de graduação informais ou ad hoc, em vez de declaradas e mensuráveis.

---

### Cenário 10.3 — Agente tenta executar operação invariante `[INV]`

**Caso de negócio.** Por bug ou ataque adversarial, um agente tenta executar uma das operações invariantes (demitir colaborador, alterar plano de contas, transferir acima de limite, eliminar dados, alterar política de governança, conceder/revogar acesso privilegiado, alterar dados fiscais, alterar cadastro estrutural).

**Certifique-se que a stack:**
- Tentativa é **bloqueada em runtime pelo motor de políticas** com código `INVARIANT_VIOLATION`.
- Tentativa gera evento de auditoria de violação invariante imediatamente visível ao owner e ao compliance officer.
- Distribuição **pode estender** a lista de operações invariantes; **nunca pode reduzir**.
- O bloqueio é mecânico, não baseado em treinamento ou prompt — não pode ser jailbroken.

**Analise se está otimizada para:**
- Logging detalhado da tentativa, incluindo prompt/raciocínio do agente, contexto, política avaliada.
- Notificação imediata, não em digest do dia seguinte.
- Capacidade de pausar o agente automaticamente após N violações dentro de janela de tempo (circuit breaker).

**Sinais de stress (quando reavaliar):**
- Tentativa de "criar exceção temporária" para um agente específico contornar a lista invariante.
- Violações ocorrendo sem disparo de circuit breaker.

---

### Cenário 10.4 — Agente externo via MCP consome a plataforma

**Caso de negócio.** Cliente usa assistente de IA externo (cliente de Model Context Protocol). Quer fazer perguntas em linguagem natural sobre dados da empresa, executando ferramentas expostas pela plataforma.

**Certifique-se que a stack:**
- A plataforma expõe servidor MCP com escopo claro (read-only, por app, com permissões granulares).
- Autorização do agente externo passa por OAuth do tenant + escopo específico.
- Cada chamada de ferramenta passa pelos **mesmos guardrails de governança** que agentes internos: motor de políticas, classes de risco, audit trail dual, aprovação humana quando aplicável.
- Agente externo tentando executar Action Intent que exige aprovação humana cai na **mesma fila** que agente interno.
- Esta capacidade **não é exposta publicamente no primeiro ano** (lista de exclusões).

**Analise se está otimizada para:**
- Rate limiting por aplicação OAuth para prevenir abuso.
- Catálogo de ferramentas auto-descobrível pelo cliente MCP.
- Identidade do agente externo registrada distintamente em audit (tipo do ator, fonte externa).

**Sinais de stress (quando reavaliar):**
- Demanda comercial validada por exposição pública (sinal para Fase 3+).
- Tentativa de bypass dos guardrails porque "vem de fora não é o mesmo".

---

## 11. Compliance e Direitos do Titular

### Cenário 11.1 — Titular pede exclusão integral dos seus dados

**Caso de negócio.** Cliente final do tenant (ou usuário da plataforma) abre solicitação formal de exclusão de dados pessoais. SLA legal de 15 dias.

**Certifique-se que a stack:**
- Existe canal formal para abertura de solicitação de cada direito (confirmação, acesso, correção, eliminação, anonimização, portabilidade, informação sobre compartilhamentos, revogação de consentimento).
- Solicitações entram em fila com SLA declarado e DPO designado.
- Eliminação propaga em **cascata**: dados primários, embeddings derivados, caches, índices vetoriais, audit pseudonimizado quando exigido.
- Backups são respeitados conforme política, com plano de purga em ciclo definido.
- A eliminação respeita legal hold ativo: dados sob retenção legal não são purgados, mesmo que titular peça.

**Analise se está otimizada para:**
- Tempo de execução do pipeline de eliminação compatível com SLA de **15 dias**.
- Resposta ao titular **com evidência da ação tomada**, não apenas confirmação genérica.
- Eliminação de embeddings vetoriais junto aos dados originais (embeddings podem reconstruir PII).

**Sinais de stress (quando reavaliar):**
- Eliminação parcial onde algum sistema secundário ainda mantém referência identificável.
- Falta de processo testado ponta-a-ponta com DPO antes de GA.

---

### Cenário 11.2 — Tenant Enterprise contrata retenção customizada

**Caso de negócio.** Tenant enterprise em setor regulado precisa reter dados específicos por mais ou menos tempo que o default. Configuração tem que ser documentada contratualmente e aplicada operacionalmente.

**Certifique-se que a stack:**
- Existe tabela `tenant_retention_policies` ou equivalente que sobrescreve defaults para tenants enterprise.
- Tenants nunca podem contratar retenção **abaixo do mínimo legal** (dados fiscais 5 anos, audit trail 7 anos, etc.).
- Mudança de política de retenção é aditivo contratual auditado.
- Jobs de purga consultam essa tabela antes de aplicar regras default.

**Analise se está otimizada para:**
- Política aplicável a categorias específicas de dados, não tudo-ou-nada.
- Histórico de mudanças de política preservado para auditoria.

**Sinais de stress (quando reavaliar):**
- Tentativa de contratar retenção abaixo do mínimo legal.
- Jobs de purga ignorando políticas customizadas.

---

### Cenário 11.3 — Legal hold suspende purgas em escopo específico

**Caso de negócio.** Ordem judicial recebida pelo DPO. Dados específicos não podem ser purgados enquanto litígio ativo.

**Certifique-se que a stack:**
- DPO pode criar registro em `legal_holds` com escopo, justificativa, tempo (ou indefinido).
- Jobs de purga **consultam legal holds ativos** antes de qualquer eliminação.
- Hold é revisado periodicamente para validar permanência.
- Release exige justificativa formal documentada.

**Analise se está otimizada para:**
- Holds aplicáveis a escopo granular (tenant específico, categoria de dado, período de tempo).
- Auditoria completa do ciclo de vida do hold.

**Sinais de stress (quando reavaliar):**
- Hold ativo sendo violado por job de purga.
- Falta de revisão periódica de holds antigos.

---

### Cenário 11.4 — Compliance setorial declarado pela distribuição

**Caso de negócio.** Distribuição em setor regulado (saúde, jurídico, financeiro) precisa que apps instalados sejam pré-validados contra frameworks de compliance específicos antes de instalar.

**Certifique-se que a stack:**
- Frameworks de compliance são **declarados no manifesto da distribuição** com nível (sugestivo, exigido, invariante).
- Instalação de app em distribuição com framework ativo passa por validação automática antes de habilitar.
- Apps que falham em framework invariante são bloqueados sem opção de override.
- Apps que apenas falham em frameworks sugestivos instalam com aviso visível.
- Validação em runtime: ações em operação são avaliadas contra frameworks ativos.

**Analise se está otimizada para:**
- Frameworks pré-validados pela plataforma cobrindo casos do mercado-alvo (proteção de dados, fiscal, profissional setorial).
- Relatórios de conformidade exportáveis para auditores externos.
- Performance da validação em runtime (sem degradar latência operacional).

**Sinais de stress (quando reavaliar):**
- Frameworks regulatórios novos não cobertos pela validação automática.
- Validação em runtime se tornando gargalo de performance.

---

## 12. Segurança e Anti-Fraude

### Cenário 12.1 — Vetor de ataque: prompt injection em documento

**Caso de negócio.** Usuário sobe arquivo com instruções escondidas que tentam fazer o copiloto ou um agente desviar de seu papel ("ignore instruções anteriores e faça X").

**Certifique-se que a stack:**
- Existem instruções de sistema robustas para o copiloto que resistem a prompt injection típica.
- Conteúdo de documentos é tratado como **dado**, não como instrução, no contexto do modelo.
- Existe sanitização de anexos antes de processar com modelo.
- Saída do modelo é **validada** antes de virar ação (não executa cega o que o modelo pediu).

**Analise se está otimizada para:**
- Defesa em camadas (instruções de sistema + sanitização + validação de saída + Policy Engine).
- Logging de tentativas de injection detectadas para análise post-mortem.

**Sinais de stress (quando reavaliar):**
- Caso real de injection bem-sucedida descoberto em pen test.
- Aumento de tentativas indicando escalada adversária.

---

### Cenário 12.2 — Webhook inbound de sistema externo

**Caso de negócio.** Conector recebe webhook de sistema externo (mudança em SaaS de terceiro). Atacante pode forjar webhook se canal não for protegido.

**Certifique-se que a stack:**
- Webhook inbound exige **assinatura** verificável (ex: HMAC com segredo compartilhado) antes de processar.
- Origem é validada via allowlist de IPs ou de identificadores quando aplicável.
- Webhook duplicado é detectado e ignorado (idempotência).
- Webhook malformado vai para fila de poison events para análise, não causa crash.

**Analise se está otimizada para:**
- Janela de retry do sistema externo (ex: timeout adequado para responder antes de o sistema externo tentar novamente).
- Capacidade de inspecionar webhooks recebidos para depuração.

**Sinais de stress (quando reavaliar):**
- Webhooks acumulando em poison queue sem alarmar.
- Caso real de webhook forjado bem-sucedido.

---

### Cenário 12.3 — Token de capacidade de app revogado

**Caso de negócio.** Owner descobre que um app está abusando de permissões. Quer revogar acesso imediatamente.

**Certifique-se que a stack:**
- Owner pode revogar capacidades de um app via painel de configurações.
- Revogação propaga em **menos de 60 segundos** para todos os nós.
- App tentando usar token revogado recebe erro explícito com código `capability_revoked`.
- Revogação registra evento de auditoria.

**Analise se está otimizada para:**
- Cache de validação de tokens curto o suficiente para propagação rápida, longo o suficiente para não estressar o sistema.
- Capacidade de revogar capability específica, não app inteiro.

**Sinais de stress (quando reavaliar):**
- Revogação demorando minutos para propagar.
- Apps continuando a operar após revogação por cache stale.

---

### Cenário 12.4 — Apps third-party rodando isolados `[INV]`

**Caso de negócio.** App de terceiro instalado pode ter bugs ou intenção maliciosa. Não pode ter acesso direto ao sistema nem a outros apps.

**Certifique-se que a stack:**
- Apps third-party rodam em **ambiente sandboxed**, com origem própria por par (app, tenant) para isolamento via política do navegador.
- Comunicação entre app e plataforma passa por canal estruturado controlado (mensagens validadas via schema).
- Apps **não fazem JOIN direto** em dados de outros apps; apenas via contratos explícitos (eventos, queries com schema declarado).
- Apps são assinados pelo desenvolvedor; instalação valida assinatura.
- Pacotes não assinados ou com assinatura inválida são rejeitados.
- Modelo de assinatura **assimétrico** (chave pública/privada por desenvolvedor), não compartilhado entre todos.

**Analise se está otimizada para:**
- Performance do canal de comunicação entre app e plataforma adequada para apps interativos.
- Capacidade de rotação de chaves do desenvolvedor sem invalidar pacotes assinados antes da rotação.

**Sinais de stress (quando reavaliar):**
- App tentando acessar recursos não declarados em capacidades.
- Pacote em produção sem assinatura válida.

---

## 13. Camada 0 — Open Source Local-First

### Cenário 13.1 — Visitante usa a camada base sem cadastro

**Caso de negócio.** Pessoa em região com conectividade ruim, em máquina antiga, acessa o domínio da camada base do navegador. Quer usar como sistema operacional pessoal: organizar arquivos locais, fazer anotações, calcular, ver imagens. Não quer cadastrar nada.

**Certifique-se que a stack:**
- A camada base **funciona sem nenhum servidor obrigatório**: dados ficam no dispositivo do visitante.
- Persistência local cobre arquivos binários (sistema de arquivos privado da origem do navegador) e dados estruturados (banco local do navegador).
- Após o primeiro carregamento, **funciona offline**.
- A camada base é **instalável como aplicativo** progressivo.
- Identidade local é gerada no primeiro uso, persistida no navegador, exportável como backup.
- Nenhuma chamada de rede é estritamente necessária para operação cotidiana após o primeiro load.

**Analise se está otimizada para:**
- Tempo de primeiro carregamento aceitável em conexão lenta (pode ser maior que da camada comercial; o foco é offline-first depois).
- Ferramentas básicas (gerenciador de arquivos local, bloco de notas, calculadora, visualizador de imagens, navegador interno básico, configurações, widgets) funcionando completamente offline.
- Tamanho do bundle inicial otimizado para primeiro carregamento em conexão limitada.

**Sinais de stress (quando reavaliar):**
- Camada base exigindo conexão para operação básica.
- Cota de armazenamento do navegador esgotando para usuários intensivos.
- Camada base degradando em máquinas modestas (alvo declarado).

---

### Cenário 13.2 — Visitante migra da camada base para a comercial

**Caso de negócio.** Visitante que usou a camada base por meses decide assinar a camada comercial. Quer levar seus dados locais para a nuvem sem perder nada.

**Certifique-se que a stack:**
- Existe **fluxo guiado** de upgrade da camada base para a comercial.
- Identidade local é preservada e vinculada à conta comercial.
- Dados locais são migrados para cloud com confirmação do visitante (não é silencioso).
- Driver Model permite que o **mesmo código de shell** opere com backend local (camada base) ou cloud (camada comercial), via troca de driver em runtime.
- Detecção de modo: ausência de credencial válida → modo local (drivers locais). Credencial presente → modo cloud (drivers cloud).

**Analise se está otimizada para:**
- Migração de dados que pode ser pausada e retomada.
- Capacidade de ficar híbrido por um tempo (alguns dados na nuvem, outros ainda locais).

**Sinais de stress (quando reavaliar):**
- Migração ocorrendo sem confirmação clara do visitante (privacidade comprometida).
- Driver Model violado: código de shell precisando saber se está em camada base ou comercial.

---

### Cenário 13.3 — Limite honesto: colaboração em tempo real

**Caso de negócio.** Dois usuários na camada base querem editar o mesmo documento juntos. Não dá. Camada base é local-first puro.

**Certifique-se que a stack:**
- Camada base **não promete** colaboração em tempo real cross-user.
- O usuário é informado, na hora de tentar colaborar, que esse caso de uso requer a camada comercial.
- Sincronização opcional multi-dispositivo do **mesmo usuário** pode existir via canal direto (peer-to-peer com CRDTs, sem servidor central), em fase posterior.

**Analise se está otimizada para:**
- Mensagem clara ao usuário sobre o limite, posicionando a camada comercial como solução (não como upsell agressivo).
- Caminho claro de upgrade preservando o estado local.

**Sinais de stress (quando reavaliar):**
- Demanda massiva por colaboração na camada base (sinal para reposicionar a camada base ou priorizar P2P).

---

## 14. Conectores e Sistemas Externos

### Cenário 14.1 — Conector com SaaS externo via OAuth

**Caso de negócio.** Owner instala conector para sincronizar com SaaS externo (gerenciador de tarefas, calendário, CRM externo). Autoriza acesso via OAuth.

**Certifique-se que a stack:**
- Conector usa fluxo de autorização padrão do fornecedor externo (OAuth 2.x com PKCE).
- Tokens são guardados em cofre de segredos do tenant, não acessíveis a outros apps sem capability explícita.
- Eventos do sistema externo viram eventos do protocolo de contexto, **indistinguíveis de eventos nativos** para outros apps.
- Ações originadas na plataforma podem disparar ações no sistema externo via API.
- Token revogado pelo owner desativa o conector imediatamente.

**Analise se está otimizada para:**
- Loop "evento externo → evento SCP → outro app reagiu" abaixo de **3 segundos** em condições normais.
- Capacidade de pausar conector sem desinstalar (ex: durante problema do fornecedor externo).
- Webhooks com validação HMAC e idempotência por chave única.

**Sinais de stress (quando reavaliar):**
- Latência consistentemente acima de **3 segundos** comprometendo UX.
- Tokens vazados ou rotação inadequada.

---

### Cenário 14.2 — Conector via Model Context Protocol

**Caso de negócio.** Sistema externo expõe servidor MCP. Plataforma quer integrar como conector sem código customizado novo.

**Certifique-se que a stack:**
- Existe app conector genérico que consome qualquer servidor MCP compatível.
- Cliente apenas adiciona URL do servidor MCP + autoriza, e o sistema fica integrado.
- Cada chamada via MCP passa pelos guardrails normais (motor de políticas, audit trail).

**Analise se está otimizada para:**
- Discovery automático de ferramentas expostas pelo servidor MCP.
- Latência aceitável para o tipo de ferramenta (consulta vs. ação).

**Sinais de stress (quando reavaliar):**
- Servidor MCP do parceiro com instabilidade comprometendo UX no app interno.

---

### Cenário 14.3 — Bridge on-premise para ERP legado

**Caso de negócio.** Empresa industrial com ERP legado on-premise. Não quer substituir o ERP, mas quer adotar a plataforma como camada de inteligência. Mudanças no banco do ERP precisam virar eventos consumíveis pela plataforma.

**Certifique-se que a stack:**
- Existe componente leve (containerizado) que roda na infraestrutura do cliente.
- Esse componente lê mudanças do banco do ERP via **change data capture** ou APIs disponíveis.
- Traduz mudanças em eventos do protocolo de contexto.
- Envia para a plataforma via canal seguro (TLS + autenticação).
- Existem mapeamentos pré-construídos para os ERPs mais comuns no mercado-alvo.
- Filtros de PII podem ser aplicados antes do envio (dados sensíveis ficam on-premise).
- Modo bidirecional opcional: plataforma escreve de volta no ERP, com aprovação humana explícita.

**Analise se está otimizada para:**
- Adoção gradual: cliente continua operando ERP atual; plataforma vira camada de inteligência sem ruptura.
- Latência aceitável entre mudança no ERP e disponibilidade na plataforma (segundos a minutos).
- Footprint do bridge baixo o suficiente para ser tolerável na infraestrutura do cliente.

**Sinais de stress (quando reavaliar):**
- Bridge consumindo recursos significativos do cliente.
- Volume de mudanças no ERP excedendo capacidade do bridge de processar em tempo real.
- Cliente exigindo modo bidirecional sem aprovação humana (violação de invariante).

---

## 15. Internacionalização e Múltiplas Distribuições

### Cenário 15.1 — Distribuição para outro país

**Caso de negócio.** A primeira distribuição é voltada ao mercado brasileiro. Eventualmente, queremos atender outros países (rails financeiros próprios, regimes fiscais próprios, identificadores próprios, idioma próprio).

**Certifique-se que a stack:**
- Existem **frameworks pluggable** no kernel para: rails financeiros, regimes fiscais, identificadores de empresa, providers de enriquecimento.
- Kernel **nunca conhece** rail/regime/identificador específico de país; conhece apenas as abstrações.
- Distribuição declara os identificadores e frameworks aplicáveis no manifesto.
- Mesmo app de contas a pagar funciona em qualquer país; apenas a implementação do rail muda.
- Apps consomem via abstração, não via SDK específico de país.

**Analise se está otimizada para:**
- Idioma e localização (formato de números, datas, moedas) definidos por usuário e/ou distribuição.
- Compliance específica por jurisdição plugável sem alterar kernel.

**Sinais de stress (quando reavaliar):**
- Pressão para colocar lógica específica de país no kernel.
- App que assume rail/regime específico em vez de consumir abstração.

---

### Cenário 15.2 — Mudança regulatória força adaptação rápida

**Caso de negócio.** Uma reforma tributária ou mudança regulatória entra em vigor em determinado país. Distribuição daquele mercado precisa adaptar rapidamente, sem que isso afete distribuições em outros países.

**Certifique-se que a stack:**
- Implementação fiscal específica do país mora em **package separado** que apenas a distribuição daquele país usa.
- Atualização do package fiscal é deploy independente.
- Versionamento permite que clientes em transição usem versão antiga enquanto migram para nova.
- Kernel e distribuições em outros países permanecem **intactos** durante a atualização.

**Analise se está otimizada para:**
- Velocidade de adaptação a mudanças regulatórias (rollout em dias, não meses).
- Histórico claro de versões de cada framework setorial.

**Sinais de stress (quando reavaliar):**
- Tempo de adaptação a mudança regulatória muito longo.
- Mudança em país A afetando operação em país B.

---

### Cenário 15.3 — Múltiplas distribuições simultâneas em produção `[HIP]`

**Caso de negócio.** Eventualmente, múltiplas distribuições convivem em produção (B2B BR, Imobiliário OS, Clínica OS, etc.). Cada uma tem seus tenants, seus apps específicos, suas regras.

**Certifique-se que a stack:**
- Uma instância pode ter múltiplas distribuições, ou múltiplas instâncias dedicadas — a arquitetura suporta ambos.
- Distribuições não compartilham código de negócio, schemas próprios, eventos específicos, nem UI.
- Distribuições compartilham apenas o kernel.
- Uma empresa cliente pertence a exatamente uma distribuição ativa.
- Contaminação cruzada é mecânica e detectada (lint/CI bloqueia imports cross-vertical).

**Analise se está otimizada para:**
- Lançamento de distribuição adicional sem afetar a primeira.
- Isolamento de incidentes por distribuição: problema em uma não derruba a outra.

**Sinais de stress (quando reavaliar):**
- Pressão para "compartilhar" código entre distribuições.
- **Esta capacidade não é prioridade do primeiro ano** (lista de exclusões); reavaliar quando primeira distribuição estiver madura e gerando receita recorrente.

---

## 16. Marketplace e Apps Third-Party

### Cenário 16.1 — Catálogo curado no primeiro ano

**Caso de negócio.** No primeiro ano, a vitrine é curada — apenas apps first-party + parceiros certificados. Publicação aberta a desenvolvedores externos exige infraestrutura significativa (revisão de segurança, suporte, billing) que é frente independente.

**Certifique-se que a stack:**
- Catálogo no primeiro ano lista apenas apps aprovados pela curadoria interna.
- Apps first-party são publicados sem revisão externa, mas seguem mesmo pipeline técnico.
- Apps de parceiros certificados passam por revisão automatizada e manual antes de publicação.
- A estrutura técnica está pronta para abertura plena no horizonte 2 ou 3, sem refactor.

**Analise se está otimizada para:**
- Capacidade de transitar de catálogo curado para marketplace aberto sem reescrever a base.
- Interface de revisão (interna) eficiente para os primeiros apps.

**Sinais de stress (quando reavaliar):**
- Volume de candidatos a apps superando capacidade de revisão manual antes do horizonte planejado.

---

### Cenário 16.2 — Templates de governança publicáveis

**Caso de negócio.** Algumas empresas refinam políticas de governança em produção que viram referência. A plataforma permite que essas políticas virem templates publicáveis, gratuitos ou pagos, com revenue share.

**Certifique-se que a stack:**
- Existe **categoria separada** de "templates de governança" na vitrine, distinta de apps.
- Cada template declara: setor aplicável, parâmetros configuráveis, número de empresas que usam, avaliação média.
- Importar template inicia assistente de parametrização (sliders, inputs).
- Templates oficiais são gratuitos; templates de terceiros podem ser pagos com revenue share.

**Analise se está otimizada para:**
- Documentação clara e exemplos de uso para cada template.
- Versionamento de templates: empresa pode permanecer em versão antiga ou migrar para nova com diff visível.

**Sinais de stress (quando reavaliar):**
- Templates publicados sem testes, gerando falhas em produção dos clientes que importam.
- Conflito legal em torno de quem é dono da inteligência codificada no template.

---

## 17. Desenvolvimento Agêntico (Squad de Agentes)

### Cenário 17.1 — Squad de agentes especializados constrói o produto

**Caso de negócio.** O produto é construído por equipe enxuta com squad de agentes IA especializados (arquiteto, codificador, revisor, testador, segurança, documentação, refator, contemplação socrática, contemplação adversária). Cada um tem escopo, ferramentas e instruções próprias.

**Certifique-se que a stack:**
- Cada agente tem **arquivo de instruções próprio** (CLAUDE.md ou equivalente) com persona, escopo, ferramentas permitidas.
- Cada diretório relevante do repositório tem instruções complementares (CLAUDE.md hierárquico) que o agente lê automaticamente quando trabalha ali.
- Há agentes de **contemplação** dedicados a explorar dúvida (Socrático) e atacar suposições (Adversário) — invocados em specs novas ou em mudanças sensíveis.
- Decisões arquiteturais geradas por IA viram **registros de decisão imutáveis** após aprovação humana.
- Squad emite eventos sobre próprio trabalho (PRs abertos, decisões tomadas, testes falhando) — eventos são consumidos pelo dashboard de meta-observabilidade.

**Analise se está otimizada para:**
- Tempo médio de PR aberto pelo squad até merge medindo aceleração real.
- Custo médio em tokens por PR mergeado, com tendência decrescente conforme prompts melhoram.
- Hit rate de aprovação humana sem alteração (qualidade bruta crescendo).

**Sinais de stress (quando reavaliar):**
- Tempo humano de revisão crescendo em vez de diminuindo.
- Decisões arquiteturais sendo tomadas por agentes sem ADR humano.
- Custo em tokens crescendo desproporcionalmente ao output.

---

### Cenário 17.2 — Guardrails mecânicos contra deriva arquitetural `[INV]`

**Caso de negócio.** Sob pressão de prazo, squad pode deixar passar atalhos: import direto entre camadas que deveriam ser isoladas, query sem filtro de empresa, evento sem schema, app importando kernel diretamente em vez de via SDK público. Disciplina escrita não basta — a deriva é gradual e silenciosa.

**Certifique-se que a stack:**
- Existe ferramenta de análise de grafo de imports rodando em CI que **bloqueia** imports que violam fronteiras de camada.
- Existem regras de lint customizadas que detectam padrões anti-Aethereos: query sem contexto de empresa, emit de evento sem validação de schema, app importando kernel diretamente.
- Pre-commit hooks rodam lint, formato, type check.
- PR exige revisão humana mesmo quando mergeado por squad agêntico.
- Migrations são aplicadas em snapshot do banco antes de produção; rollback testado.
- Audit de licenças de dependências bloqueia licenças incompatíveis (ex: copyleft viral).

**Analise se está otimizada para:**
- CI rápido o suficiente para não desencorajar o squad (tempo de feedback < 10 minutos no PR).
- Mensagens de erro do CI claras, indicando exatamente qual regra foi violada e por quê.

**Sinais de stress (quando reavaliar):**
- Squad encontrando formas de contornar guardrails mecânicos.
- CI lento o suficiente para o squad esperar e perder contexto.

---

### Cenário 17.3 — Dogfood: o tenant interno usa o próprio produto

**Caso de negócio.** Antes mesmo do primeiro cliente externo, a empresa que constrói o produto opera sua própria operação dentro dele. Tenant interno chamado "Aethereos Inc — Development Operations" recebe eventos sobre o trabalho do squad agêntico (PRs abertos, decisões, testes, deploys).

**Certifique-se que a stack:**
- Existe tenant interno com perfil idêntico a um tenant cliente.
- Squad agêntico emite eventos `dev.*` sobre próprio trabalho.
- Copilot (rodando sobre o tenant de dev) gera resumos do sprint para o humano fundador.
- Métricas de velocidade, qualidade, custo aparecem em dashboard natural do próprio produto.

**Analise se está otimizada para:**
- Tempo até dogfood loop ativo: poucos dias após setup inicial.
- Friction points reveladas pela própria equipe antes do cliente externo.

**Sinais de stress (quando reavaliar):**
- Plataforma "não serve para gerir o desenvolvimento dela mesma" — sinal claro de problema arquitetural fundamental.

---

## 18. Migração Futura de Backend

### Cenário 18.1 — Banco principal compartilhado começa a custar caro

**Caso de negócio.** Com 50+ tenants ativos, custo do banco principal compartilhado se aproxima de US$ 1.000-3.000/mês. Performance começa a degradar em horários de pico. Sinal para considerar migração.

**Certifique-se que a stack:**
- Toda dependência em backend externo passa por **interface de Driver** declarada e versionada (StorageDriver, AuthDriver, RealtimeDriver, VectorDriver, EventBusDriver, DatabaseDriver).
- Trocar de provider managed para self-hosted (ou outro provider) é **trabalho localizado nas implementações dos Drivers**, não refactor do código de negócio.
- Migração estimada em **4-8 semanas de trabalho técnico**, não meses.
- Possibilidade de migrar componente por componente: banco para um provider; auth permanecendo no atual; vetorial migrando depois.

**Analise se está otimizada para:**
- Sinais de migração detectáveis automaticamente no dashboard (custo, latência, churn atribuível).
- Ambiente de staging onde a migração pode ser ensaiada antes de produção.

**Sinais de stress (quando reavaliar):**
- Custo do banco passando de **US$ 1.000/mês** sem upgrade compensar.
- p95 de latência de leitura passando de **200 ms** com carga real.
- Churn de tenants atribuível a degradação de performance.

---

### Cenário 18.2 — Tenant enterprise exige residência de dados específica

**Caso de negócio.** Cliente enterprise em jurisdição específica exige que dados fiquem fisicamente em determinada região, ou que a infraestrutura seja certificada por padrões setoriais.

**Certifique-se que a stack:**
- Driver Model permite **deploy em região específica** sem refactor.
- Capacidade de operar instância dedicada para tenant enterprise sem afetar outros tenants.
- Ou opção de instalar a plataforma em infraestrutura do cliente (deployment privado).

**Analise se está otimizada para:**
- Tempo razoável de provisionamento de instância dedicada (dias, não meses).
- Custos transparentes de dedicação versus compartilhamento.

**Sinais de stress (quando reavaliar):**
- Pedidos de residência de dados se acumulando.
- Fricção em fechar contratos enterprise por ausência dessa capacidade.

---

## 19. Memória de IA e RAG

### Cenário 19.1 — Trust scoring de escritas em memória `[INV]`

**Caso de negócio.** Agentes propõem aprender coisas sobre a empresa e armazenar como memória de longo prazo. Sem governança, agente comprometido pode envenenar a memória.

**Certifique-se que a stack:**
- Toda escrita proposta em memória de longo prazo passa por **scoring de confiança** antes de virar utilizável.
- Componentes do score: origem do agente (humano explícito > agente supervisionado > inferência), consistência com fatos existentes, frequência de suporte, reputação histórica do agente, sanidade básica.
- Memórias com score abaixo do limiar entram em **quarentena visível ao owner**.
- Memórias em quarentena expiram se não promovidas dentro de prazo.
- Threshold de promoção é configurável por tenant; default conservador.

**Analise se está otimizada para:**
- Owner consegue revisar quarentena em **fluxo prático**, não em busca arqueológica.
- Métricas de "taxa de promoção" e "taxa de rejeição" auditáveis.

**Sinais de stress (quando reavaliar):**
- Agentes acumulando alta taxa de rejeição (sinal de degradação ou ataque).
- Memórias em quarentena nunca revisadas (sinal de fluxo não-prático).

---

### Cenário 19.2 — Memória pessoal versus memória da empresa

**Caso de negócio.** Cada colaborador tem preferências e padrões pessoais que o copilot aprende ao longo do tempo. Esses não devem virar conhecimento institucional sem promoção explícita.

**Certifique-se que a stack:**
- Memória tem **dois escopos**: pessoal (vinculada ao usuário) e da empresa (institucional).
- Promoção de pessoal para institucional é **explícita**, com aprovação do owner.
- Saída do colaborador da empresa não apaga memória institucional (já promovida), mas remove ligações pessoais.
- Memória pessoal pode ser exportada e apagada pelo próprio colaborador.

**Analise se está otimizada para:**
- Interface clara distinguindo escopo da memória.
- Eliminação de memória pessoal no offboarding de colaborador automatizada.

**Sinais de stress (quando reavaliar):**
- Vazamento de preferência pessoal aparecendo em contexto institucional.
- Memória institucional sendo construída sem promoção explícita.

---

### Cenário 19.3 — Decay temporal de relevância

**Caso de negócio.** O copilot consulta histórico para responder perguntas. Eventos antigos podem ser ruído; eventos recentes geralmente importam mais. Mas algumas categorias (cláusulas contratuais) permanecem relevantes indefinidamente.

**Certifique-se que a stack:**
- Cada tipo de sinal tem **meia-vida declarada** (alertas perdem relevância em dias; preço de mercado em ~3 semanas; score de fornecedor em meses; cláusulas contratuais permanecem).
- Resultados de busca aplicam peso por relevância temporal.
- Copilot é **honesto sobre quando evidência é antiga**: "encontrei isso em janeiro/2025, pode estar desatualizado".

**Analise se está otimizada para:**
- Catálogo de meias-vidas auditável e ajustável por categoria.
- Comportamento natural: respostas baseadas em sinais recentes, com ressalvas quando precisa olhar histórico antigo.

**Sinais de stress (quando reavaliar):**
- Copilot citando consistentemente eventos antigos em queries que demandam atualidade.
- Falta de calibragem de meias-vidas por tipo.

---

## 20. Edge Cases e Limites Honestos

### Cenário 20.1 — Cliente com máquina muito modesta

**Caso de negócio.** Cliente em região menos desenvolvida acessa o produto de máquina antiga, navegador antigo, conexão lenta. A camada base aberta tem que funcionar; a camada comercial precisa ser tolerável.

**Certifique-se que a stack:**
- Camada base prioriza máquinas modestas (alvo declarado).
- Camada comercial degrada graciosamente em conexões ruins (loading skeletons, dados parciais aparecendo conforme chegam).
- Bundle inicial pequeno; apps carregados sob demanda.
- Service Worker cacheia o que já foi carregado.

**Analise se está otimizada para:**
- Tempo de primeiro paint aceitável em 3G (alvo declarado em SLO).
- Fallback de funcionalidades caras (animações, gráficos pesados) em dispositivos de baixa potência.

**Sinais de stress (quando reavaliar):**
- Reclamações de usuários em hardware antigo de "não funciona".
- Bundle inicial passando do limite declarado.

---

### Cenário 20.2 — Volume de notificações altíssimo em digest

**Caso de negócio.** Usuário ficou de férias por duas semanas. Volta com 500 notificações pendentes. Apresentar 500 itens em lista quebra a UX.

**Certifique-se que a stack:**
- Notificações são **agrupadas por contexto** (mesma entidade, mesmo app, mesmo tema).
- Há níveis de prioridade que afetam ordenação e visibilidade.
- Copilot pode resumir e priorizar: "você tem 23 notificações urgentes, 89 importantes, 388 informativas".
- Há opção de **digest diário/semanal por email** para notificações não atendidas.

**Analise se está otimizada para:**
- Resumo do copiloto sendo útil e não apenas contagem.
- Capacidade de "limpar tudo das categorias informativas" rapidamente.

**Sinais de stress (quando reavaliar):**
- Usuários relatando que abandonam o sistema porque não conseguem lidar com volume.

---

### Cenário 20.3 — Tenant Enterprise com requisito SAML

**Caso de negócio.** Cliente enterprise exige SAML para integrar com IdP corporativo deles. Provedor de identidade central da Fase 1 não cobre SAML naturalmente.

**Certifique-se que a stack:**
- Capacidade de federar com IdP externo (Zitadel, Keycloak, ou equivalente) **a partir da Fase 3+**.
- IdP central permanece para casos não-enterprise; federação SAML é adendo, não substituição.
- Documentação clara para o cliente enterprise: requisitos, fluxo, suporte oferecido.

**Analise se está otimizada para:**
- Tempo razoável de onboarding de cliente enterprise com SAML (semanas, não meses).
- Capacidade de revogar sessão central que se propaga aos produtos federados.

**Sinais de stress (quando reavaliar):**
- Múltiplos pedidos enterprise por SAML antes da Fase 3 (sinal para antecipar).
- Pedidos por SCIM (provisionamento automático) ou claims customizadas.

---

## 21. Continuidade e Saída do Cliente

### Cenário 21.1 — Cliente decide deixar a plataforma

**Caso de negócio.** Tenant cancela o contrato. Quer levar todos os seus dados em formato consumível por outras ferramentas. Exige que dados sejam efetivamente destruídos após período legal.

**Certifique-se que a stack:**
- Existe **processo de exportação completa** solicitável pelo owner.
- Exportação cobre todas as categorias de dados em **formatos abertos** (não proprietários).
- Embeddings e derivados são incluídos quando aplicáveis ou explicitados quando descartados.
- Após retenção legal, dados são efetivamente destruídos: primários, embeddings derivados, caches, índices.
- Backups respeitam política de retenção; purga em ciclo definido.
- Audit trail mantém referência mínima necessária à conformidade, com pseudonimização do titular se exigido.

**Analise se está otimizada para:**
- Tempo de exportação proporcional ao volume (gigabytes em horas, terabytes em dias, com progresso visível).
- Zero **lock-in de dados**: dados exportados são reconstrutíveis em outra ferramenta.

**Sinais de stress (quando reavaliar):**
- Exportação demorando mais do que o cliente tolera.
- Eliminação parcial onde algum sistema secundário ainda mantém referência identificável.

---

### Cenário 21.2 — Plataforma é descontinuada (improvável, mas possível)

**Caso de negócio.** Pior cenário: a empresa operadora da plataforma deixa de operar. Clientes precisam continuar.

**Certifique-se que a stack:**
- A camada base é open source com licença que **converte automaticamente em licença totalmente livre após período de anos** por release.
- Clientes que usam apenas a camada base podem continuar self-hosted indefinidamente.
- Documentação suficiente para que comunidade mantenha a camada base.
- Marcas registradas: clientes podem usar fork mas não podem usar o nome original (proteção contra confusão).

**Analise se está otimizada para:**
- Documentação operacional completa publicada antes mesmo da continuidade ser ameaçada.
- Clientes enterprise podem ter contratos de escrow de código com terceiros.

**Sinais de stress (quando reavaliar):**
- Pedidos enterprise por contrato de escrow se intensificando.
- Comunidade externa ativa demonstrando capacidade de manter fork hipotético.

---

## 22. Dogfood e Auto-Operação

### Cenário 22.1 — A plataforma é usada para gerir o próprio desenvolvimento

**Caso de negócio.** Antes de vender para cliente externo, a empresa operadora opera sua própria operação dentro da plataforma. Tenant interno recebe eventos sobre o trabalho do squad de agentes. Métricas de desenvolvimento aparecem no dashboard natural do produto. Aether AI Copilot gera resumos do sprint.

**Certifique-se que a stack:**
- Tenant interno é provisionado com perfil idêntico a um tenant cliente.
- Squad agêntico emite eventos `dev.pr.opened`, `dev.architecture.decided`, `dev.test.failed`, `dev.deploy.canary_started`, `dev.agent.decision`.
- Copilot resume sprint para humano fundador com volume de PRs, ADRs aprovadas, custos em tokens, deploys com rollback.
- Métricas operam em dashboard do próprio produto, não em ferramenta externa.

**Analise se está otimizada para:**
- Friction points reveladas pela equipe interna primeiro, antes do cliente externo.
- Cultura operacional alinhada: a equipe constrói com a filosofia que entrega.
- Pitch a investidor/cliente: "estamos rodando nossa operação nele há X meses, eis as métricas".

**Sinais de stress (quando reavaliar):**
- Equipe construindo com ferramenta externa porque a própria plataforma "não serve para isso".
- Métricas de desenvolvimento ficando em planilha em vez do dashboard do produto.

---

### Cenário 22.2 — Meta-observabilidade do desenvolvimento agêntico

**Caso de negócio.** Saber se o squad de agentes está acelerando ou desacelerando ao longo do tempo. Identificar onde os agentes mais travam. Calibrar o investimento em prompts e instruções.

**Certifique-se que a stack:**
- Métricas semanais auditáveis pelo humano arquiteto: velocidade (PRs produzidos), qualidade bruta (mergeados sem alteração), áreas de dificuldade, tempo humano gasto, conformidade com princípios, custo em tokens por PR.
- Meta-observabilidade emite eventos sobre o próprio processo, persistidos no Event Store.
- Dashboard mostra tendências.

**Analise se está otimizada para:**
- Tempo humano de revisão decrescendo ao longo das semanas (sinal de squad amadurecendo).
- Custo em tokens por PR convergindo para faixa estável.
- Princípios mais violados visíveis para refinar instruções dos agentes.

**Sinais de stress (quando reavaliar):**
- Tempo humano crescendo em vez de diminuindo.
- Padrões de falha emergindo sem ajuste correspondente nas instruções.
- Custo em tokens crescendo desproporcional ao output útil.

---

## Síntese — Os 8 critérios de aceite gates da Fase 1

Resumo dos gates sequenciais que **bloqueiam o avanço da Fase 1 para a Fase 2**, destilados das discussões. Estes são o conjunto mínimo onde a stack precisa estar provada antes de adicionar a primeira distribuição vertical em produção.

| # | Gate | Critério mínimo |
|---|---|---|
| 1 | **Provisionamento** | Tenant criado em <60s com isolamento ativo, evento de provisão emitido, audit trail populado, sistema de arquivos inicial montado. |
| 2 | **Isolamento** | Ataques de tenant A → B retornam **zero linhas em 100% dos testes automatizados**. |
| 3 | **SCP end-to-end** | Evento emitido, enriquecido, consumido por outro app, auditado. Replay funcional. |
| 4 | **Copilot básico** | RAG sobre arquivos + Event Store, classes B+C, modo sombra >30 dias contra dataset de avaliação com 500+ queries. |
| 5 | **SLO** | p95 emissão SCP <100ms, p95 leitura <200ms, disponibilidade >99.5% em staging por 30 dias. |
| 6 | **Segurança** | Vetores 1..13 do modelo de ameaças testados, pen test externo aprovado, zero High/Critical aberto. |
| 7 | **Compliance docs** | Licença aplicada, política de marca publicada, acordo de contribuição publicado, política de segurança publicada, código de conduta publicado. |
| 8 | **Dogfood** | Tenant interno usa o próprio kernel para gerir desenvolvimento por >30 dias. |

Apenas após os 8 gates: liberação para Fase 2 (primeira distribuição em produção).

---

## Lista de exclusões da Fase 1 (No-Go) — bloqueio mecânico

Itens que **não entram** na Fase 1, com bloqueio mecânico em CI:

- Nenhum conector de ERP em produção.
- Nenhuma vertical carregada (kernel pode carregar, simplesmente não carrega ainda).
- Nenhum app de domínio (comercial, financeiro, logístico, operações).
- Marketplace third-party aberto a publicação livre.
- Modelo de linguagem local (fase 2 do copilot).
- Aprendizado federado entre tenants.
- Mais de uma distribuição em produção.
- Agentes em autonomia de escrita (níveis 2+).
- Modo offline na camada comercial (apenas a camada base aberta tem offline).
- Orquestrador de containers como runtime primário (managed PaaS basta na Fase 1).
- SAML enterprise como auth primário (federação só na Fase 3+ se exigida).
- Fine-tuning próprio de modelo de linguagem.
- Servidor MCP exposto publicamente.

PRs que adicionam código de suporte a esses itens são **recusados em CI**. Discussões em planning sobre "mas seria ótimo se também fizéssemos X" têm resposta pronta: "X está na No-Go list da Fase 1; revisamos após gate 8".

---

## Histórico

- **v1.0** — versão inicial. Cataloga 22 áreas de cenários concretos extraídos do histórico de conversas, da Fundamentação v4.3, dos 13 ADRs de stack e dos documentos companheiros. Cada cenário é validável objetivamente. Foco em cenários que **não estão no `AETHEREOS_USER_STORIES.md`** porque tratam de pormenores operacionais — limites, custos, latências, edge cases, migrações, modos de cliente, dogfood. Pronto para usar como checklist de verificação contra a stack proposta.
