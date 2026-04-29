# Aethereos — User Stories para Spec-Driven Development

> Documento condensado a partir de toda a Fundamentação, documentos companheiros e histórico de conversas do projeto. **Foco exclusivo em ideia, intenção e necessidade.** Nenhuma menção a tecnologias, stack, frameworks, bancos de dados, linguagens ou bibliotecas. Cada *user story* descreve uma capacidade observável pelo usuário e seus critérios de aceitação funcionais — pronto para alimentar especificações detalhadas em qualquer stack que venha a ser escolhida.

---

## Sumário

- [Visão e Tese](#visão-e-tese)
- [Personas](#personas)
- [Convenções](#convenções)
- [Epic 1 — Identidade em Três Camadas](#epic-1--identidade-em-três-camadas)
- [Epic 2 — Sistema Operacional no Navegador](#epic-2--sistema-operacional-no-navegador)
- [Epic 3 — Apps Essenciais do Kernel](#epic-3--apps-essenciais-do-kernel)
- [Epic 4 — Loja Universal de Aplicativos](#epic-4--loja-universal-de-aplicativos)
- [Epic 5 — Distribuições Verticais Declarativas](#epic-5--distribuições-verticais-declarativas)
- [Epic 6 — Multi-Empresa e Isolamento](#epic-6--multi-empresa-e-isolamento)
- [Epic 7 — Protocolo de Contexto entre Apps](#epic-7--protocolo-de-contexto-entre-apps)
- [Epic 8 — Família de Produtos: Standalone e Integrados](#epic-8--família-de-produtos-standalone-e-integrados)
- [Epic 9 — Identidade Unificada e SSO](#epic-9--identidade-unificada-e-sso)
- [Epic 10 — Onboarding e Provisionamento](#epic-10--onboarding-e-provisionamento)
- [Epic 11 — Conectores de Sistemas Externos](#epic-11--conectores-de-sistemas-externos)
- [Epic 12 — Compliance-as-Code](#epic-12--compliance-as-code)
- [Epic 13 — Copiloto de IA Nativo](#epic-13--copiloto-de-ia-nativo)
- [Epic 14 — Agentes de IA com Cidadania](#epic-14--agentes-de-ia-com-cidadania)
- [Epic 15 — Governance-as-Code](#epic-15--governance-as-code)
- [Epic 16 — Trust Center e Qualidade da IA](#epic-16--trust-center-e-qualidade-da-ia)
- [Epic 17 — Auditoria Dual e Circuit Breaker](#epic-17--auditoria-dual-e-circuit-breaker)
- [Epic 18 — Memória Estruturada para IA](#epic-18--memória-estruturada-para-ia)
- [Epic 19 — Capabilities Emergentes do Protocolo de Contexto](#epic-19--capabilities-emergentes-do-protocolo-de-contexto)
- [Epic 20 — Inteligência Coletiva Cross-Tenant](#epic-20--inteligência-coletiva-cross-tenant)
- [Epic 21 — Ciclo de Vida de Dados e Direitos do Titular](#epic-21--ciclo-de-vida-de-dados-e-direitos-do-titular)
- [Epic 22 — Ecossistema de Desenvolvedores Third-Party](#epic-22--ecossistema-de-desenvolvedores-third-party)
- [Epic 23 — Monetização e Tiers](#epic-23--monetização-e-tiers)
- [Epic 24 — Academia e Certificação](#epic-24--academia-e-certificação)
- [Epic 25 — Proteção do Ecossistema](#epic-25--proteção-do-ecossistema)
- [Epic 26 — Adoção Gradual sem Ruptura](#epic-26--adoção-gradual-sem-ruptura)
- [Restrições Invariantes](#restrições-invariantes)
- [Lista do Que NÃO Entra no Primeiro Ano](#lista-do-que-não-entra-no-primeiro-ano)

---

## Visão e Tese

O Aethereos é, simultaneamente e sem contradição, três coisas:

1. **Uma plataforma-base aberta** que oferece uma experiência de sistema operacional rodando dentro do navegador, acessível a qualquer pessoa em qualquer máquina, mesmo antiga ou modesta. Inclui ferramentas básicas (drive de arquivos, calculadora, bloco de notas, navegador interno, configurações, widgets) e age como um "sistema operacional pessoal no navegador".
2. **Uma camada comercial proprietária** construída sobre essa base, que adiciona uma loja de aplicativos, isolamento por empresa, comunicação contextualizada entre apps, copiloto de IA nativo, governança e cobrança. É o equivalente conceitual aos serviços oficiais que diferenciam um celular de fabricante de um Android cru.
3. **Distribuições verticais especializadas** (a primeira é voltada a pequenas e médias empresas industriais e comerciais brasileiras) que empacotam a camada comercial junto com um conjunto curado de produtos SaaS pré-instalados, branding próprio, regras de compliance e fluxo de onboarding específico do setor.

A tese central repousa em três proposições:

- **Contexto supera dado.** Operações B2B não tomam decisões com dados crus; tomam com dados enriquecidos por histórico, comparações, sinais externos e métricas derivadas. A plataforma existe para transformar dados em contexto.
- **Inteligência escala com ecossistema.** Uma plataforma de uma empresa só gera inteligência limitada por essa empresa. Uma plataforma compartilhada por muitas — com isolamento rigoroso e opt-in explícito — gera inteligência qualitativamente diferente: benchmarks anonimizados, propagação de risco, padrões coletivos.
- **O futuro do software B2B é operado por IA.** Sistemas pensados só para humanos serão dívida técnica. Sistemas pensados desde o início onde humanos e agentes são cidadãos de primeira classe — com humano retendo autoridade final — são o futuro. A ambição é AI-native estrutural, não decorativa.

A intenção comercial é que clientes possam:

- Adotar **um único produto SaaS** standalone (porta de entrada de baixa fricção),
- Migrar para **um pacote integrado** (uma distribuição vertical inteira, sem perder dados nem fazer migração),
- Construir **suas próprias distribuições** quando o ecossistema amadurecer (para uso interno ou comercial certificado).

A migração entre essas modalidades é trivial — sem ruptura, sem perda de histórico, sem reconfiguração.

---

## Personas

| Persona | Descrição |
|---|---|
| **Operador da plataforma** | A organização que mantém, evolui e opera a plataforma como um todo (kernel + serviços proprietários + primeira distribuição vertical). |
| **Construtor de distribuição** | Time da própria organização ou parceiros certificados que constroem distribuições verticais empacotadas para um setor ou mercado. |
| **Empresa cliente (tenant)** | Organização que assina uma distribuição ou um SaaS standalone. Tem um responsável legal e múltiplos colaboradores. |
| **Owner da empresa cliente** | Pessoa-chave na empresa cliente, com autoridade máxima sobre dados, políticas, agentes e cobrança. |
| **Admin da empresa cliente** | Gestor da configuração diária: usuários, permissões, apps instalados, integrações. |
| **Operador final** | Colaborador da empresa cliente que usa o sistema dia-a-dia para realizar trabalho B2B (vendas, compras, financeiro, logística etc.). |
| **Cliente standalone** | Empresa que adota apenas um produto SaaS individual sem conhecer o restante do ecossistema. Pode evoluir para tenant pleno depois. |
| **Visitante público** | Qualquer pessoa que acessa a base aberta da plataforma a partir do navegador, sem necessariamente assinar nada — usa as ferramentas básicas como um sistema operacional pessoal. |
| **Desenvolvedor de aplicativo third-party** | Pessoa ou empresa externa que constrói e publica aplicativos na loja de aplicativos. |
| **Integrador de conector** | Especialista que constrói pontes entre sistemas externos (ERPs legados, SaaS de terceiros) e a plataforma. |
| **Agente de IA — assistivo** | Cidadão de software com identidade própria, sob supervisão humana, que sugere ações para humanos executarem. |
| **Agente de IA — operacional** | Cidadão de software que executa ações autônomas dentro de limites de política e autonomia gradualmente conquistados. |
| **Agente de IA externo** | Agente operado por um cliente de IA externo (como assistentes de terceiros) que consome a plataforma como ferramenta. |
| **DPO / Encarregado** | Pessoa responsável por proteção de dados, compliance regulatório e atendimento a direitos do titular. |
| **Compliance officer** | Responsável por governança, definição de políticas e auditoria. |
| **Auditor externo** | Pessoa de fora da organização que precisa verificar conformidade, integridade de dados e responsabilidade de decisões. |
| **Equipe interna de suporte (staff)** | Pessoas da organização operadora que precisam acessar dados de clientes, com autorização explícita e auditada, para suporte técnico. |

---

## Convenções

- **`[INV]`** — invariante. Se for violado, a tese do produto se quebra. Não muda sem revisão constitucional.
- **`[DEC]`** — decisão atual. Pode mudar mediante decisão formal e nova evidência.
- **`[HIP]`** — hipótese a validar. Aposta sobre comportamento de mercado/usuário.
- **Critérios de aceitação** descrevem comportamento observável; não descrevem implementação.
- Termo **"ecossistema documental"** é evitado para não confundir com epics; uso apenas o termo "plataforma" no sentido amplo.

---

## Epic 1 — Identidade em Três Camadas

> A plataforma se organiza em três camadas conceitualmente distintas e com licenciamentos diferentes. Cada camada é consumível independentemente da camada acima dela, mas a camada acima depende das de baixo.

### US-1.1 — Camada base aberta utilizável sem cadastro `[INV]`

**Como** visitante público,  
**Eu quero** acessar uma versão aberta da plataforma diretamente do meu navegador, sem precisar criar conta nem ter conexão constante,  
**Para que** eu possa usar um conjunto de ferramentas pessoais (como um sistema operacional pessoal) inclusive em máquinas antigas, modestas ou em locais com conectividade ruim.

**Critérios de aceitação**
- A camada base oferece ferramentas funcionais mínimas: gerenciador de arquivos, bloco de notas, calculadora, visualizador de imagens, terminal básico, configurações de aparência e idioma.
- Toda a experiência da camada base funciona sem qualquer servidor obrigatório: dados ficam no dispositivo do usuário.
- A camada base funciona offline depois do primeiro carregamento.
- A camada base é distribuída sob licença que permite uso, modificação e redistribuição, transitando automaticamente para uma licença totalmente livre após um período pré-definido de anos.
- Customizações desta camada por terceiros precisam atribuir a origem; oferecer a camada base como serviço hospedado concorrente à plataforma comercial é proibido pela licença.

### US-1.2 — Camada comercial proprietária sobre a base aberta `[INV]`

**Como** empresa cliente,  
**Eu quero** uma versão da plataforma que adicione, sobre a base aberta, capacidades de uso B2B real (loja de apps, isolamento por empresa, copiloto de IA, cobrança, integração entre apps, governança),  
**Para que** eu tenha um sistema operacional B2B pronto para operação séria, sem precisar montar essa infraestrutura por conta própria.

**Critérios de aceitação**
- A camada comercial é proprietária e fechada; clientes consomem como serviço.
- Visualmente e em estrutura, a camada comercial é continuação natural da camada base — não é um produto desconectado.
- Sem chave de licença válida, o sistema degrada para a experiência da camada base, sem quebrar.
- Apenas distribuições oficiais ou parceiros certificados recebem chave válida da camada comercial.

### US-1.3 — Distribuições verticais como empacotamento `[INV]`

**Como** construtor de distribuição,  
**Eu quero** publicar uma distribuição vertical especializada que combine a camada comercial com branding, apps pré-instalados, políticas e fluxo de onboarding específicos de um setor ou mercado,  
**Para que** clientes daquele setor cheguem a uma experiência pronta, opinionada e relevante para seu contexto, sem precisar montar a configuração eles mesmos.

**Critérios de aceitação**
- Uma distribuição é configuração declarativa, não código próprio: criar uma nova distribuição não exige rebuild nem redeploy do kernel.
- Uma distribuição declara: nome, branding (logo, cores, identidade), apps pré-instalados, regras de filtro da loja de apps, frameworks de compliance, fluxo de onboarding, políticas padrão, identificadores de empresa exigidos.
- Uma empresa cliente pertence a exatamente uma distribuição ativa.
- Distribuições adicionais podem ser construídas pelo operador da plataforma, parceiros certificados, empresas para uso interno, ou comunidade.

### US-1.4 — Migração entre modalidades sem ruptura `[INV]`

**Como** cliente standalone (que adotou só um SaaS individual),  
**Eu quero** poder migrar para o pacote completo de uma distribuição sem perder histórico, sem precisar reconfigurar nada manualmente, sem downtime,  
**Para que** o crescimento natural da minha empresa não seja punido por um custo de migração desproporcional.

**Critérios de aceitação**
- A migração é uma simples ativação de apps adicionais para a empresa cliente; não há transferência de dados.
- Histórico já existente continua disponível e indistinguível de histórico criado após a migração.
- Permissões, usuários e configurações pessoais permanecem.
- A migração reversa (desativar apps adicionais) também não causa perda de dados, apenas restringe acesso.

---

## Epic 2 — Sistema Operacional no Navegador

> A experiência de uso é a de um sistema operacional pessoal/profissional dentro do navegador: barra superior, dock, abas, mesa (área de trabalho), múltiplas janelas/abas com contexto preservado.

### US-2.1 — Shell visual familiar `[INV]`

**Como** operador final,  
**Eu quero** uma interface que se pareça e se comporte como um sistema operacional moderno (barra superior, dock inferior, abas, área de trabalho personalizável),  
**Para que** o tempo de adaptação seja mínimo e eu possa operar múltiplos apps simultaneamente sem perder contexto.

**Critérios de aceitação**
- Existe uma barra superior com identidade da empresa ativa, relógio, indicador de conexão, notificações, atalho do copiloto, menu do usuário e seletor de empresa quando o usuário pertence a múltiplas.
- Existe uma barra de abas onde cada app aberto é uma aba; abas podem ser fechadas e reordenadas; a "Mesa" é uma aba pinada que nunca fecha.
- Existe uma dock inferior com ícones de apps pinados (sempre visíveis) e apps em execução.
- A "Mesa" é a área de trabalho principal, com wallpaper personalizável, ícones de atalho e widgets de informação atualizados em tempo real.
- O comportamento de abas espelha o de navegadores modernos: clique para ativar, X para fechar, arrastar para reordenar, atalhos de teclado para alternar e fechar.

### US-2.2 — Múltiplas abas com estado preservado

**Como** operador final,  
**Eu quero** alternar entre abas de apps diferentes sem perder estado (formulários abertos, filtros aplicados, scroll position),  
**Para que** eu possa multitarefar sem ter que refazer trabalho ao trocar de contexto.

**Critérios de aceitação**
- Trocar de aba não desmonta o app que ficou em segundo plano.
- Estado efêmero de sessão (abas abertas, ordem, filtros, formulários parcialmente preenchidos) sobrevive a recarregamento da página dentro da mesma sessão.
- Cada aba tem sua própria URL representando "qual app, qual entidade, qual modo de visualização". Compartilhar a URL leva o destinatário (autenticado) ao mesmo lugar.

### US-2.3 — Mesa personalizável por usuário

**Como** operador final,  
**Eu quero** organizar minha Mesa com widgets relevantes para meu trabalho (alertas, indicadores, atalhos, sugestões do copiloto),  
**Para que** eu tenha um painel personalizado e atualizado em tempo real, sem ter que abrir múltiplos apps para ter visão geral.

**Critérios de aceitação**
- Widgets podem ser arrastados, redimensionados e removidos.
- Widgets vêm de três fontes: do kernel (genéricos), da distribuição (relevantes ao setor), de apps específicos instalados.
- Layout da Mesa é persistido por par (usuário, empresa) — o mesmo usuário pode ter Mesas diferentes em empresas diferentes.
- Widgets são "superfícies de agência": pontos onde o usuário (ou um agente autorizado) toma ação imediata com contexto mínimo.

### US-2.4 — Ícones na dock e apps fixos

**Como** operador final,  
**Eu quero** fixar meus apps mais usados na dock e ter feedback visual de quais estão abertos,  
**Para que** eu acesse apps em um clique e veja em tempo real o que está rodando.

**Critérios de aceitação**
- Apps pinados ficam sempre visíveis na dock; apps não pinados aparecem na dock somente enquanto abertos.
- Há feedback visual claro distinguindo "pinado", "rodando", "rodando e pinado".
- O usuário escolhe quais apps pinar; preferência é persistida por empresa.

### US-2.5 — Notificações unificadas

**Como** operador final,  
**Eu quero** receber notificações de todos os apps em uma central única, com agrupamento, prioridade e resumo inteligente,  
**Para que** eu não seja bombardeado e consiga focar no que realmente importa.

**Critérios de aceitação**
- Existe central única de notificações acessível pela barra superior, com badge indicando contagem de não lidas.
- Notificações são agrupadas por contexto (mesma entidade, mesmo app, mesmo tema).
- Notificações têm níveis de prioridade que afetam ordenação e visibilidade.
- O copiloto pode resumir e priorizar notificações acumuladas (ex: "você tem 23 novas; três são urgentes").
- Há a opção de receber resumo diário ou semanal por email para notificações não atendidas.

---

## Epic 3 — Apps Essenciais do Kernel

> Um conjunto de apps invariantes está sempre presente em qualquer distribuição. Não podem ser desinstalados nem substituídos por equivalentes de terceiros. Garantem experiência mínima consistente.

### US-3.1 — Gerenciador de arquivos (Drive) `[INV]`

**Como** operador final,  
**Eu quero** um gerenciador de arquivos unificado da empresa, com pastas organizadas por contexto (pessoais, da empresa, de cada app instalado, de integrações montadas),  
**Para que** eu encontre e organize documentos sem ter que conhecer a infraestrutura por trás.

**Critérios de aceitação**
- Hierarquia padrão de pastas: arquivos pessoais do usuário, arquivos compartilhados da empresa, pastas próprias de cada app instalado, configurações do sistema, integrações externas montadas como pastas.
- Suporta links de compartilhamento protegidos com expiração configurável.
- Suporta versionamento de arquivos e lixeira com tempo de retenção.
- Suporta busca textual no conteúdo dos documentos.
- Cada app instalado recebe automaticamente uma pasta dedicada para seus arquivos.

### US-3.2 — Cadastro de pessoas (RH) `[INV]`

**Como** admin da empresa cliente,  
**Eu quero** um registro unificado de todas as pessoas relacionadas à empresa (colaboradores formais, prestadores, parceiros, contatos externos),  
**Para que** outros apps e o copiloto possam usar essa lista como fonte única de verdade.

**Critérios de aceitação**
- Cada registro tem tipo, papel, departamento, datas relevantes, documentos anexados, histórico de eventos.
- Integra com o gerenciador de arquivos para anexar contratos e documentos.
- Integra com a comunicação interna para notificações.
- Funciona inclusive para empresas solo (que mantêm prestadores e parceiros).

### US-3.3 — Comunicação interna básica `[INV]`

**Como** operador final,  
**Eu quero** conversar com colegas da minha empresa em conversas diretas e canais, sem ter que sair para outra ferramenta,  
**Para que** comunicação operacional fique no mesmo ambiente onde o trabalho acontece.

**Critérios de aceitação**
- Conversas diretas (1-a-1) e canais (multi-participante).
- Envio de texto e anexos referenciando o gerenciador de arquivos.
- Menções a pessoas e indicador de leitura.
- Presença online de outros usuários da mesma empresa.
- Histórico persistente.
- Não pretende competir com ferramentas dedicadas de mensageria; cobre o suficiente para um time operar sem precisar sair da plataforma.

### US-3.4 — Painel central de configurações `[INV]`

**Como** owner ou admin da empresa cliente,  
**Eu quero** um painel central onde eu acesse todas as configurações relevantes — meu perfil, dados da empresa, distribuição, plano, integrações, agentes, políticas,  
**Para que** eu não precise procurar em múltiplos apps onde uma configuração está.

**Critérios de aceitação**
- Quatro grandes áreas: Perfil, Empresa, Distribuição/Plano, Sistema.
- Acesso a configurações restrito por papel.
- Mudanças geram trilha de auditoria.

### US-3.5 — Dashboard com widgets de múltiplos apps

**Como** owner ou admin,  
**Eu quero** um dashboard central que agregue widgets dos apps instalados (financeiro, logístico, comercial, RH),  
**Para que** eu tenha visão consolidada da operação sem abrir cada app individualmente.

**Critérios de aceitação**
- Cada app instalado pode contribuir widgets ao dashboard central.
- Widgets se atualizam em tempo real quando os dados subjacentes mudam.
- Layout é responsivo e personalizável pelo usuário.

### US-3.6 — Copiloto de IA acessível em qualquer lugar

> Detalhado no Epic 13. Aqui apenas reconhece-se que o copiloto é um app invariante do kernel, acessível por atalho global em qualquer tela.

---

## Epic 4 — Loja Universal de Aplicativos

> Existe um catálogo único de apps. Cada distribuição vê uma "vitrine filtrada" por suas regras de compatibilidade. Não existem lojas separadas.

### US-4.1 — Catálogo único com vitrines filtradas `[INV]`

**Como** operador da plataforma,  
**Eu quero** um catálogo central único que liste todos os apps publicáveis e que entregue, para cada empresa cliente, uma vitrine filtrada por distribuição, plano, país, restrições do tenant,  
**Para que** o custo de operação da loja não cresça linearmente com o número de distribuições.

**Critérios de aceitação**
- Existe uma única tabela conceitual de apps publicados; vitrines são consultas filtradas, não bancos separados.
- Filtros consideram: distribuição ativa do tenant, país, plano contratado, exclusões específicas do tenant, apps recomendados/featured pela distribuição.
- Apps sinalizados como universais aparecem em qualquer distribuição compatível.
- Apps específicos de distribuição só aparecem na vitrine daquela distribuição.

### US-4.2 — Instalação, atualização e desinstalação de apps por tenant

**Como** admin da empresa cliente,  
**Eu quero** instalar, atualizar e desinstalar apps da loja com revisão clara de permissões antes de confirmar,  
**Para que** eu mantenha controle sobre o que executa dentro da minha empresa.

**Critérios de aceitação**
- Antes da instalação, a empresa vê: o que o app faz, quais permissões pede, qual desenvolvedor é responsável, qual o pricing, quais eventos emite/consome, com quais frameworks de compliance é compatível.
- Permissões pedidas são apresentadas em linguagem clara, não em jargão técnico.
- Atualização de app não pode pedir permissões adicionais sem confirmação explícita; se pedir, sinaliza isso claramente.
- Desinstalação é reversível dentro de um período curto (lixeira do app), com dados preservados nesse período.

### US-4.3 — Apps invariantes não desinstaláveis `[INV]`

**Como** operador da plataforma,  
**Eu quero** garantir que os apps essenciais (Drive, RH, Comunicação, Configurações, Dashboard, Notificações, Copiloto, Loja) nunca sejam desinstalados ou substituídos por equivalentes,  
**Para que** a experiência mínima consistente do produto esteja sempre garantida.

**Critérios de aceitação**
- Tentativa de desinstalar um app invariante é bloqueada com mensagem explicativa.
- Apps invariantes têm o mesmo pipeline técnico de apps regulares, mas estão marcados como invariantes na configuração da distribuição.

### US-4.4 — Vitrine destaca apps relevantes para o contexto

**Como** operador final,  
**Eu quero** que a vitrine destaque apps relevantes para a minha distribuição e meu uso, em vez de me apresentar centenas de apps irrelevantes,  
**Para que** a descoberta seja útil e não exaustiva.

**Critérios de aceitação**
- Apps em destaque pela distribuição aparecem primeiro.
- Apps recomendados pela distribuição aparecem em seção separada.
- Apps já instalados não aparecem na lista de novos.
- Apps explicitamente excluídos pela distribuição não aparecem.

### US-4.5 — Templates de governança publicáveis na loja

**Como** compliance officer,  
**Eu quero** que a loja inclua, além de apps, templates de políticas de governança que outras empresas testaram e validaram,  
**Para que** eu possa começar com configurações maduras em vez de escrever políticas do zero.

**Critérios de aceitação**
- Existe categoria de "templates de governança" na loja, separada de apps.
- Cada template declara: setor aplicável, tamanho de empresa adequado, parâmetros configuráveis, quantas empresas o usam, avaliação média.
- Importar template gera políticas configuráveis via assistente, com sliders e inputs para os parâmetros.
- Existe documentação clara e exemplos de uso para cada template.

---

## Epic 5 — Distribuições Verticais Declarativas

> Uma distribuição vertical é configuração, não código. Criar uma nova distribuição é um trabalho de configuração e curadoria, não de engenharia.

### US-5.1 — Manifesto declarativo de distribuição `[INV]`

**Como** construtor de distribuição,  
**Eu quero** descrever uma distribuição inteira em um documento estruturado declarativo (sem precisar escrever código novo do kernel),  
**Para que** o lançamento de uma nova distribuição não precise de rebuild ou redeploy do kernel.

**Critérios de aceitação**
- O manifesto da distribuição declara: identificador, nome, slogan, branding (logo, cores, papel de parede, favicon, identidade visual), apps pré-instalados, regras de filtro da vitrine, fluxo de onboarding, frameworks de compliance, políticas padrão, idioma e fuso horário default, identificador primário de empresa exigido (varia por mercado/setor).
- A criação de nova distribuição é operação de configuração, executável por pessoas não-desenvolvedoras com permissões adequadas.
- Mudanças no manifesto são versionadas e reversíveis.

### US-5.2 — Aplicação de branding em runtime

**Como** operador final de uma distribuição,  
**Eu quero** que a interface adote a identidade visual da minha distribuição (logo, cores, mensagens, papel de parede),  
**Para que** o produto pareça construído para mim, não um sistema genérico.

**Critérios de aceitação**
- Cores, logo e identidade visual são aplicados em runtime a partir do manifesto da distribuição.
- A estrutura visual (dock, barra superior, abas) é invariante entre distribuições; só estilo muda.
- Papéis de parede da distribuição ficam disponíveis para usuários escolherem.

### US-5.3 — Apps pré-instalados na distribuição

**Como** owner de empresa cliente,  
**Eu quero** que ao iniciar minha conta, os apps relevantes para minha distribuição já estejam instalados, pinados e configurados com defaults sensatos,  
**Para que** eu não tenha que fazer setup manual app por app antes de começar a usar.

**Critérios de aceitação**
- Apps declarados no manifesto da distribuição são instalados no provisionamento da empresa.
- Cada app pré-instalado pode ter configuração default declarada na distribuição.
- Apps marcados como "fixos na dock" ou "destacados na Mesa" pela distribuição já aparecem assim no primeiro login.
- A empresa pode reverter qualquer default depois.

### US-5.4 — Onboarding específico da distribuição `[INV]`

**Como** owner que está cadastrando sua empresa,  
**Eu quero** um fluxo de onboarding que pergunte exatamente o identificador certo do meu mercado (CNPJ, equivalente local, registros profissionais como CRECI, OAB, CFM, CNES, dependendo da distribuição) e enriqueça automaticamente com dados públicos disponíveis,  
**Para que** eu chegue ao desktop funcional rapidamente, com dados básicos já corretos.

**Critérios de aceitação**
- O identificador exigido é específico da distribuição.
- Dados públicos disponíveis sobre a empresa são consultados e pré-preenchidos quando possível (razão social, endereço, status cadastral, atividade econômica).
- O usuário apenas confirma ou ajusta os dados pré-preenchidos.
- O processo completo, do cadastro à chegada no desktop funcional, leva tipicamente menos de 90 segundos.

### US-5.5 — Hooks de comportamento específico da distribuição

**Como** construtor de distribuição,  
**Eu quero** poder adicionar pequenos pontos de extensão para casos onde o JSON declarativo não basta (ex: validação fiscal específica, classificação setorial, formatação de documentos regulatórios),  
**Para que** distribuições em setores regulados consigam o nível de especialização exigido sem corromper o kernel.

**Critérios de aceitação**
- Pontos de extensão são versionados e assinados; o kernel rejeita extensões não verificadas.
- Cada extensão tem timeout estrito; se falhar, o sistema continua funcional em modo degenerado e registra a falha.
- Extensões rodam isoladas e não têm acesso direto ao restante do sistema.
- Toda invocação de extensão é auditável.
- O número de hooks de uma distribuição é monitorado: distribuições com excesso são revisadas para evitar virar produtos disfarçados.

### US-5.6 — Coexistência de múltiplas distribuições no longo prazo `[HIP]`

**Como** operador da plataforma,  
**Eu quero** que diferentes distribuições possam coexistir na mesma instalação (ou em instalações dedicadas) sem se contaminarem,  
**Para que** o modelo "uma instalação suportando muitas distribuições" seja viável quando o ecossistema crescer.

**Critérios de aceitação**
- Uma empresa pertence a exatamente uma distribuição ativa.
- Distribuições não compartilham código de negócio, schemas próprios, eventos específicos, nem UI entre si.
- Distribuições compartilham apenas o kernel.
- Não está previsto suportar múltiplas distribuições simultâneas em produção no primeiro ano (ver lista de exclusões); este é um requisito de horizonte mais longo.

---

## Epic 6 — Multi-Empresa e Isolamento

> Isolamento por empresa é invariante absoluto. Bug em código nunca pode causar vazamento entre empresas. Usuários podem pertencer a múltiplas empresas e alternar entre elas.

### US-6.1 — Isolamento absoluto entre empresas `[INV]`

**Como** owner da empresa cliente,  
**Eu quero** garantia absoluta de que nenhum dado meu pode jamais ser visto por outra empresa,  
**Para que** eu confie no sistema com dados sensíveis.

**Critérios de aceitação**
- Toda consulta de dados é filtrada automaticamente por empresa, em camada de defesa que existe abaixo da aplicação.
- Bugs na aplicação não conseguem vazar dados entre empresas; o filtro é aplicado em última instância na camada de armazenamento.
- Tentativas (acidentais ou maliciosas) de acessar dados de outra empresa retornam zero resultados, não erros que entreguem informação.
- Auditorias periódicas validam o isolamento.

### US-6.2 — Usuários pertencendo a múltiplas empresas

**Como** consultor que atende várias empresas,  
**Eu quero** uma única conta que me dê acesso a múltiplas empresas, com troca rápida entre elas e contexto isolado em cada uma,  
**Para que** eu não precise ter contas separadas e relogar.

**Critérios de aceitação**
- O mesmo usuário pode pertencer a múltiplas empresas, com papel diferente em cada.
- Em qualquer momento, o usuário opera como ator de uma única empresa ativa; a troca é explícita e visível na interface.
- Permissões são resolvidas pelo par (usuário, empresa ativa), não pelo usuário globalmente.
- Preferências (layout da Mesa, apps pinados) são persistidas por par (usuário, empresa).

### US-6.3 — Papéis padrão e estendíveis

**Como** admin da empresa cliente,  
**Eu quero** atribuir papéis padronizados aos usuários (proprietário, administrador, gestor, membro, visualizador) e que distribuições possam refinar permissões dentro desses papéis,  
**Para que** a configuração inicial seja simples mas a especialização setorial seja possível.

**Critérios de aceitação**
- Existem cinco papéis padrão definidos no kernel.
- Distribuições podem refinar permissões dentro de papéis existentes, mas não podem criar papéis novos.
- Mudanças de papel são auditadas.

### US-6.4 — Acesso de equipe interna de suporte com auditoria

**Como** owner da empresa cliente,  
**Eu quero** que qualquer acesso da equipe interna de suporte da plataforma aos meus dados seja explícito, autorizado, justificado e me notifique,  
**Para que** suporte técnico não vire vetor de violação de privacidade.

**Critérios de aceitação**
- Equipe interna de suporte tem papéis separados e ortogonais aos papéis das empresas clientes.
- Cada acesso de suporte exige justificativa textual obrigatória.
- Cada acesso gera registro de auditoria imutável e notificação ao owner da empresa em tempo real.
- Existe mecanismo "break-glass" para emergências, com fricção adicional e revisão automática posterior.
- O owner pode revisar todo histórico de acessos da equipe interna a qualquer momento.

### US-6.5 — Independência operacional entre apps dentro do tenant

**Como** operador da plataforma,  
**Eu quero** que cada app first-party tenha autonomia operacional dentro do isolamento da empresa (próprios espaços de dados, ciclos de release independentes, evolução em cadência própria),  
**Para que** times responsáveis por apps diferentes não fiquem bloqueados uns pelos outros.

**Critérios de aceitação**
- Apps maduros têm seus próprios espaços de dados separados, dentro do isolamento da empresa.
- Apps nunca acessam dados de outros apps diretamente; apenas via contratos de dados explícitos (eventos, queries com schema declarado).
- Atualizações de um app não interferem em outros apps ativos.
- Backups e restaurações podem ser feitos por app específico.

---

## Epic 7 — Protocolo de Contexto entre Apps

> Todo evento de negócio passa por um barramento universal que enriquece o evento com contexto antes de outros apps consumirem. Existem quatro camadas explícitas: evento bruto, contexto enriquecido, insight derivado, ação governada.

### US-7.1 — Toda ação de negócio gera evento auditável `[INV]`

**Como** auditor externo,  
**Eu quero** que toda ação relevante de negócio em qualquer app gere um evento estruturado, imutável, com identidade do ator (humano ou agente), timestamp preciso, empresa de origem, tipo padronizado,  
**Para que** auditoria forense seja possível sem depender da boa-fé das aplicações.

**Critérios de aceitação**
- Eventos são imutáveis após gravação; nenhuma operação altera evento já registrado.
- Eventos têm tipo padronizado seguindo taxonomia hierárquica (`domínio.entidade.ação` no particípio passado).
- Eventos seguem padrão de versionamento; eventos antigos continuam interpretáveis enquanto consumidores existirem.
- Toda emissão de evento é validada contra schema antes de aceitar; emissão inválida falha de forma explícita.

### US-7.2 — Enriquecimento assíncrono não bloqueia emissão `[INV]`

**Como** operador final que cria um pedido,  
**Eu quero** que minha ação se complete em milissegundos, mesmo se o sistema de enriquecimento estiver lento ou parcialmente indisponível,  
**Para que** a operação não dependa de capacidades sofisticadas para fazer o básico.

**Critérios de aceitação**
- A confirmação da ação retorna em poucas dezenas de milissegundos após persistir o evento bruto.
- O enriquecimento (comparações históricas, sinais externos, métricas derivadas) acontece em segundo plano e não bloqueia o usuário.
- Apps críticos continuam operacionais mesmo se a camada de enriquecimento estiver indisponível por horas — apenas perdem inteligência adicional, sem quebra funcional.
- A degradação é graceful e visível: a UI mostra dados básicos quando o enriquecimento ainda não chegou, e enriquece à medida que chega.

### US-7.3 — Contexto enriquecido com incerteza explícita `[INV]`

**Como** operador final que recebe uma sugestão automatizada,  
**Eu quero** entender o nível de confiança da sugestão e o que a fundamenta,  
**Para que** eu decida com base em uma estimativa honesta, não em um número fingido de certeza.

**Critérios de aceitação**
- Toda saída derivada (score, classificação, previsão, anomalia detectada) carrega indicador explícito de confiança ou incerteza.
- Para previsões numéricas: intervalos de confiança ou bandas.
- Para classificações: nível de confiança ("alta", "média", "baixa") com justificativa textual.
- Para discordância entre fontes: o sistema mostra a divergência e a recomendação resultante, em vez de esconder o conflito.

### US-7.4 — Insights apresentados ao humano com citação rastreável

**Como** operador final que vê um insight,  
**Eu quero** poder clicar e ver os eventos originais que sustentaram aquela conclusão,  
**Para que** eu possa verificar e auditar a inferência se precisar.

**Critérios de aceitação**
- Cada insight referencia os eventos-fonte que o geraram.
- A interface permite navegar do insight aos eventos-fonte com um clique.
- Insights têm tempo de vida (TTL) — não acumulam para sempre como eventos brutos.
- Insights não executam ações por si — são proposições, não comandos.

### US-7.5 — Ação governada como camada separada `[INV]`

**Como** owner da empresa cliente,  
**Eu quero** garantia de que toda ação executada (especialmente por agentes) passa por avaliação de política antes de ser executada,  
**Para que** insights nunca virem ações executadas silenciosamente.

**Critérios de aceitação**
- Ação é decisão separada de insight; existe sempre um momento explícito de "decidir executar".
- Toda ação passa por avaliação de política antes de executar, sem exceção.
- Ações de classe de risco alta exigem aprovação humana adicional, mesmo se a política permitiria automação.
- Ação executada gera registro com referência ao insight de origem, à política avaliada e ao resultado.

### US-7.6 — Reprocessamento idempotente de eventos

**Como** operador da plataforma,  
**Eu quero** poder reprocessar histórico de eventos quando algoritmos de enriquecimento melhoram, sem causar duplicações nem efeitos colaterais,  
**Para que** o sistema melhore retroativamente sem caos.

**Critérios de aceitação**
- Eventos brutos permanecem intocáveis; reprocessamento gera novas versões de contexto/insight, não muta histórico.
- Idempotência é garantida — reemitir o mesmo evento bruto não cria duplicações.
- Existe ferramenta operacional para reprocessar janelas históricas com filtros.

---

## Epic 8 — Família de Produtos: Standalone e Integrados

> Existe um conjunto de produtos SaaS construídos sobre a plataforma que têm vida comercial própria (domínio próprio, marca própria, mercado próprio) e que, quando o cliente também adota a plataforma, rodam integrados como apps nativos.

### US-8.1 — Cada produto SaaS funciona standalone com domínio próprio `[INV]`

**Como** cliente que só quer um produto específico,  
**Eu quero** acessar aquele produto pelo domínio próprio dele, com landing pública, login, dashboard e suporte independentes da plataforma,  
**Para que** eu possa usá-lo sem precisar conhecer ou adotar o ecossistema todo.

**Critérios de aceitação**
- Cada produto da família tem domínio próprio e identidade comercial autônoma.
- A experiência standalone tem landing pública otimizada para SEO, fluxo de cadastro próprio, dashboard próprio.
- Cliente standalone usa o produto sem nunca ver branding da plataforma maior.

### US-8.2 — O mesmo produto roda embedado em uma distribuição

**Como** cliente que adotou uma distribuição completa,  
**Eu quero** que cada produto da família apareça como app integrado no meu desktop, dentro do ambiente da distribuição, comunicando com os demais apps,  
**Para que** eu tenha experiência integrada em vez de múltiplas ferramentas isoladas.

**Critérios de aceitação**
- O mesmo produto opera em duas modalidades: standalone (com seu shell próprio) e embedado (sem shell, dentro do desktop da distribuição).
- A versão embedada herda a identidade visual da distribuição.
- A integração entre produtos da família passa pelo protocolo de contexto.

### US-8.3 — Eventos sempre emitidos, independente da modalidade

**Como** cliente que pode migrar entre modalidades,  
**Eu quero** que meu histórico de eventos esteja preservado e disponível tanto na modalidade standalone quanto integrada,  
**Para que** ao migrar para o pacote completo, o copiloto e os outros apps tenham acesso ao histórico inteiro.

**Critérios de aceitação**
- Eventos são emitidos em ambas as modalidades.
- Migração entre modalidades não exige importação ou conversão de dados.
- Apps integrados consomem eventos uns dos outros via protocolo de contexto, indistinguivelmente da origem.

### US-8.4 — Caminho de upsell natural

**Como** operador da plataforma,  
**Eu quero** que clientes que entram via produto standalone descubram naturalmente o pacote integrado quando a empresa cresce,  
**Para que** o produto único seja porta de entrada de baixa fricção e o pacote seja upsell orgânico.

**Critérios de aceitação**
- Nas modalidades standalone, há sinalização discreta sobre a possibilidade de integrar com outros produtos da família.
- A mensagem de venda compara claramente: produto único versus pacote integrado.
- A migração para o pacote é frictionless conforme US-1.4.

### US-8.5 — Produtos da primeira distribuição

**Como** owner de uma empresa industrial ou comercial brasileira (a primeira distribuição-alvo),  
**Eu quero** que a distribuição inclua produtos para minhas operações principais — comercial/marketplace, logística, financeiro, operações/automação,  
**Para que** eu cubra com a distribuição as áreas críticas do meu negócio sem precisar comprar SaaS desconectados.

**Critérios de aceitação**
- A primeira distribuição traz pré-instalados pelo menos os domínios: comercial (gestão de produtos, pedidos, clientes), logística (entregas, rotas, transportadoras), financeiro (contas a pagar/receber, conciliação, fluxo de caixa), operações (workflows e automações).
- Cada um desses produtos existe também standalone com domínio próprio e marca própria.
- Eles se comunicam entre si via protocolo de contexto e via copiloto, sem que o usuário precise transferir dados manualmente.

---

## Epic 9 — Identidade Unificada e SSO

> Usuários que usam múltiplos produtos da família precisam de uma identidade única, sem precisar relogar a cada produto, mesmo quando os produtos vivem em domínios diferentes.

### US-9.1 — Identidade única para todos os produtos `[INV]`

**Como** usuário que usa múltiplos produtos da família,  
**Eu quero** uma única identidade reconhecida em todos os produtos, sem precisar criar conta separada em cada um,  
**Para que** minha identidade seja consistente e revogável centralmente.

**Critérios de aceitação**
- Existe um provedor de identidade central da plataforma.
- Cadastro em um produto cria a identidade central; outros produtos a reconhecem.
- Revogar acesso é operação central, propaga em todos os produtos.

### US-9.2 — SSO silencioso entre produtos em domínios distintos

**Como** usuário logado em um produto da família,  
**Eu quero** acessar outro produto da família em domínio diferente sem ter que digitar credenciais novamente,  
**Para que** a transição entre produtos seja fluida.

**Critérios de aceitação**
- Após login em qualquer produto, abrir outro produto da mesma família reconhece a sessão e estabelece acesso sem fricção visível.
- A sessão respeita políticas de tempo limite e MFA configurados centralmente.
- Logout em qualquer produto pode opcionalmente disparar logout em todos.

### US-9.3 — Autenticação multifator opcional ou obrigatória conforme contexto

**Como** owner de empresa em distribuição regulada,  
**Eu quero** poder exigir autenticação multifator para papéis sensíveis,  
**Para que** o nível de segurança acompanhe o risco do contexto.

**Critérios de aceitação**
- MFA é opcional por default; pode ser exigido para papéis específicos (proprietário, administrador) por configuração.
- Distribuições reguladas podem tornar MFA obrigatório por papel via política da distribuição.
- O sistema suporta múltiplos fatores possíveis (aplicativo gerador, chaves físicas, SMS quando inevitável).

---

## Epic 10 — Onboarding e Provisionamento

### US-10.1 — Onboarding em menos de 90 segundos `[HIP]`

**Como** owner cadastrando empresa nova,  
**Eu quero** chegar a um desktop funcional, com apps instalados e copiloto pronto, em menos de 90 segundos,  
**Para que** eu já comece a tirar valor antes mesmo da decisão de assinar.

**Critérios de aceitação**
- O fluxo é: nome do workspace → escolha de distribuição → identificador da empresa → enriquecimento automático → escolha de plano → desktop funcional.
- O tempo total típico fica abaixo de 90 segundos.
- Em caso de erro de enriquecimento (identificador inválido, fonte indisponível), o usuário pode preencher manualmente sem bloqueio.

### US-10.2 — Provisionamento automático ao final do onboarding

**Como** owner que completou cadastro,  
**Eu quero** que minha empresa seja provisionada automaticamente — apps instalados, papéis criados, pastas montadas, copiloto inicializado, distribuição aplicada,  
**Para que** eu não precise fazer setup manual.

**Critérios de aceitação**
- Imediatamente após cadastro, o sistema cria a empresa, aplica a distribuição (branding, políticas, apps), monta pastas iniciais, gera Mesa padrão.
- O copiloto é configurado com contexto inicial sobre a empresa.
- Um evento de provisionamento é registrado para auditoria.

### US-10.3 — Convite de colaboradores

**Como** owner ou admin,  
**Eu quero** convidar colaboradores por email com um papel pré-atribuído,  
**Para que** o time entre rapidamente sem que eu precise configurar cada um manualmente.

**Critérios de aceitação**
- Convite é gerado com link único.
- O convidado completa cadastro no provedor de identidade e entra na empresa com o papel atribuído.
- Convites têm validade configurável e podem ser revogados.

---

## Epic 11 — Conectores de Sistemas Externos

> Apps especiais que fazem ponte com sistemas externos (SaaS de terceiros, ERPs legados) traduzindo eventos e ações em ambas as direções.

### US-11.1 — Conectores como ponte bidirecional

**Como** admin que usa um SaaS externo (ex: gerenciador de tarefas, calendário, CRM externo),  
**Eu quero** instalar um conector que sincronize ações e eventos entre o sistema externo e a plataforma,  
**Para que** dados do sistema externo apareçam para meus apps na plataforma como se fossem nativos.

**Critérios de aceitação**
- Conector autoriza acesso ao sistema externo via fluxo padrão de autorização do fornecedor.
- Eventos do sistema externo viram eventos do protocolo de contexto da plataforma, indistinguíveis de eventos nativos para outros apps.
- Ações originadas na plataforma podem disparar ações no sistema externo.
- O conector tem identidade e tokens revogáveis a qualquer momento.

### US-11.2 — Modalidades de visualização do conteúdo externo

**Como** operador final,  
**Eu quero** que conectores escolham a melhor forma de mostrar o sistema externo (visualização integrada quando possível, interface nativa construída sobre a API quando o sistema externo não permite incorporação, ou janela separada com barra de status sincronizada),  
**Para que** a integração seja sempre tão fluida quanto a tecnologia do sistema externo permitir.

**Critérios de aceitação**
- A modalidade é declarada pelo conector e configurável pelo usuário em alguns casos.
- A escolha respeita as restrições técnicas do sistema externo (ex: alguns sistemas bloqueiam incorporação).
- A experiência é coerente com o restante do desktop independente da modalidade.

### US-11.3 — Conexão com sistemas legados on-premise (Bridge)

**Como** owner com ERP legado on-premise (sistemas tradicionais da indústria),  
**Eu quero** conectar meu ERP existente à plataforma sem ter que substituí-lo, com leitura de mudanças do banco do ERP que viram eventos contextualizados,  
**Para que** eu adote a plataforma como camada de inteligência sem ruptura de operação.

**Critérios de aceitação**
- Existe componente que roda na infraestrutura do cliente, lendo mudanças do banco do ERP, traduzindo para o protocolo de contexto, e enviando à plataforma via canal seguro.
- Mapeamentos pré-construídos para os ERPs mais comuns no mercado-alvo.
- Filtros de privacidade aplicados antes do envio (PII pode ficar restrita on-premise).
- Modo bidirecional opcional: ações da plataforma podem ser escritas de volta no ERP, com aprovação humana explícita.
- A adoção é gradual: cliente continua operando o ERP atual; a plataforma vira camada de inteligência sobre o que já existe.

### US-11.4 — Plataforma como ferramenta de agentes externos `[DEC]`

**Como** cliente que usa assistentes de IA externos,  
**Eu quero** que a plataforma exponha capacidades como ferramentas que agentes externos podem invocar,  
**Para que** eu opere a plataforma também através de assistentes que já uso fora dela.

**Critérios de aceitação**
- A plataforma expõe um catálogo descoberto de ferramentas tipadas (com descrição de parâmetros e efeitos).
- Cada chamada de agente externo passa pelos mesmos guardrails de governança que agentes internos: políticas, classes de risco, audit trail, aprovação humana quando aplicável.
- Autorização explícita pelo owner é obrigatória.
- Esta capacidade não é exposta publicamente no primeiro ano (ver lista de exclusões).

---

## Epic 12 — Compliance-as-Code

### US-12.1 — Frameworks de compliance declarados pela distribuição

**Como** construtor de distribuição em setor regulado,  
**Eu quero** declarar quais frameworks de compliance se aplicam à distribuição (proteção de dados, regras fiscais, requisitos profissionais setoriais),  
**Para que** o sistema valide automaticamente conformidade na instalação de apps e na operação.

**Critérios de aceitação**
- Cada framework declarado tem identificador, nome, nível de obrigatoriedade (sugestivo, exigido, invariante) e regras associadas.
- Frameworks pré-validados pela plataforma cobrem os casos mais comuns do mercado-alvo.
- Distribuições reguladas (saúde, jurídico, financeiro) trazem frameworks setoriais ativos por default.

### US-12.2 — Validação automática pré-instalação de apps

**Como** admin instalando um app,  
**Eu quero** que o sistema bloqueie a instalação se o app violar algum framework de compliance ativo na distribuição,  
**Para que** eu não introduza acidentalmente um app não-conforme.

**Critérios de aceitação**
- Instalação avalia o app contra todos os frameworks ativos.
- Falhas são apresentadas com mensagem clara: "este app não declara X, exigido pelo framework Y".
- Apps que apenas avisam (frameworks sugestivos) instalam com aviso.
- Apps que violam frameworks invariantes são bloqueados sem opção de override.

### US-12.3 — Validação em runtime durante operação

**Como** auditor,  
**Eu quero** que ações em runtime sejam avaliadas contra os frameworks ativos e bloqueadas se violarem,  
**Para que** conformidade seja garantida em operação, não só em instalação.

**Critérios de aceitação**
- O motor de políticas avalia toda ação significativa contra frameworks ativos.
- Violações são bloqueadas e auditadas com rationale.
- Logs de avaliação são consultáveis pelo compliance officer.

### US-12.4 — Vantagem por compliance pré-validado

**Como** owner em setor regulado,  
**Eu quero** que entrar em produção com a plataforma me poupe da auditoria manual cara que sistemas tradicionais exigem,  
**Para que** eu chegue ao mercado regulado mais rápido e mais barato.

**Critérios de aceitação**
- Frameworks pré-validados cobrem os requisitos mínimos das jurisdições e setores ativamente atendidos.
- A plataforma fornece relatórios de conformidade exportáveis para auditores externos.
- No longo prazo, parcerias com órgãos certificadores podem reduzir auditoria manual em operações padrão.

---

## Epic 13 — Copiloto de IA Nativo

> O copiloto é um app invariante do kernel, acessível em qualquer tela, com leitura sobre dados da empresa e capaz de explicar, sugerir e (mediante governança) executar.

### US-13.1 — Copiloto acessível em qualquer lugar `[INV]`

**Como** operador final,  
**Eu quero** acessar o copiloto por atalho global de teclado ou por botão persistente, em qualquer tela de qualquer app,  
**Para que** eu não precise interromper meu fluxo para perguntar algo.

**Critérios de aceitação**
- Atalho de teclado global abre o copiloto em qualquer contexto.
- Há botão persistente acessível na barra superior.
- O copiloto se abre sobre o contexto atual e tem ciência do app onde o usuário está.

### US-13.2 — Perguntas em linguagem natural com citação dos eventos-fonte

**Como** owner,  
**Eu quero** perguntar coisas como "qual o fluxo de caixa projetado?" ou "quais pedidos atrasaram esta semana?" e receber resposta natural com links clicáveis para os eventos originais,  
**Para que** eu confie na resposta podendo verificar e auditar.

**Critérios de aceitação**
- O copiloto entende perguntas em linguagem natural sobre dados da empresa.
- A resposta cita eventos-fonte, e os eventos são clicáveis para inspeção.
- Quando o copiloto não tem certeza, ele responde "não sei com certeza, eis o que encontrei" — não inventa.
- A resposta respeita o isolamento da empresa (RLS): copiloto nunca acessa dados de outras empresas.

### US-13.3 — Copiloto resume e prioriza notificações

**Como** owner ou admin com volume alto de notificações,  
**Eu quero** que o copiloto me apresente um resumo do que aconteceu desde minha última sessão, priorizando o que é urgente,  
**Para que** eu não comece o dia perdido em uma fila de notificações.

**Critérios de aceitação**
- O copiloto pode gerar digest diário, semanal, ou sob demanda.
- O digest agrupa por contexto e prioriza por urgência declarada.
- A apresentação é narrativa, não apenas lista.

### US-13.4 — Sugestões de próxima ação contextual

**Como** operador final,  
**Eu quero** que o copiloto me sugira próximas ações relevantes ("você tem 5 aprovações pendentes há mais de 2 horas", "este fornecedor teve atraso recorrente, considerar revisão") sem reorganizar minha interface por mim,  
**Para que** a IA ajude sem invadir meu controle.

**Critérios de aceitação**
- Sugestões aparecem em superfícies dedicadas (widget na Mesa, notificações).
- O copiloto nunca executa ações automaticamente; apenas sugere.
- Sugestões respeitam preferências do usuário (frequência, tipos de sugestão).
- Sugestões podem ser dispensadas e o copiloto aprende com isso.

### US-13.5 — Evolução em fases

**Como** operador da plataforma,  
**Eu quero** que o copiloto evolua em fases declaradas: primeiro, integração com modelo de fronteira via API; depois, modelo especializado fine-tuned em dados do domínio; depois, modelo proprietário treinado no ecossistema acumulado,  
**Para que** custo, latência, soberania de dados e diferenciação evoluam conforme o ecossistema cresce.

**Critérios de aceitação**
- A fase atual é declarada e visível.
- Cada fase tem critério explícito de transição (volume de uso, qualidade comprovada, evidência de viabilidade econômica).
- Apps consomem o copiloto através de interface estável; mudanças de fase são transparentes para apps.

### US-13.6 — Quotas e quota-aware degradation

**Como** owner que assina um plano,  
**Eu quero** que o uso do copiloto respeite as quotas do meu plano com degradação previsível,  
**Para que** eu não tenha surpresas de cobrança nem o sistema fique fora do ar por excesso de uso.

**Critérios de aceitação**
- Cada plano declara quota de uso de IA (perguntas/mês, tokens/mês ou equivalente).
- Aproximação da quota é avisada explicitamente.
- Esgotamento da quota leva a degradação graceful, não a quebra.
- Há opção clara de upgrade quando quota é insuficiente.

---

## Epic 14 — Agentes de IA com Cidadania

> Agentes de IA são identidades autenticadas no sistema, com capacidades restringidas por política, audit trail próprio e supervisão humana obrigatória.

### US-14.1 — Agentes têm identidade autenticada `[INV]`

**Como** auditor,  
**Eu quero** que toda ação executada por um agente seja atribuída a uma identidade específica de agente, com supervisor humano declarado,  
**Para que** responsabilidade e cadeia de comando sejam sempre claras.

**Critérios de aceitação**
- Cada agente tem identificador único, nome, tipo, ferramentas permitidas, prefixos de eventos permitidos, nível de autonomia, supervisor humano obrigatório.
- Toda ação ou evento gerado por agente carrega marca explícita de "ator do tipo agente" e referencia o supervisor humano.
- Responsabilidade legal e de cobrança continua com humano e organização — agentes não têm personalidade jurídica.

### US-14.2 — Níveis de autonomia explícitos `[INV]`

**Como** owner,  
**Eu quero** controlar o nível de autonomia de cada agente em uma escala explícita (sem IA, sugere-humano-executa, executa-com-aprovação, executa-com-limites, executa-com-discricionariedade),  
**Para que** eu module risco sem perder benefício.

**Critérios de aceitação**
- Existe escala explícita de autonomia, do nível 0 (sem IA) ao nível superior (alta discricionariedade).
- Mudança de nível exige decisão explícita do owner.
- Nível padrão para qualquer agente novo é o mais conservador (sugestão, não execução).

### US-14.3 — No primeiro ano, autonomia restrita `[INV]`

**Como** owner com aversão a risco regulatório no primeiro ano de adoção,  
**Eu quero** garantia de que nenhum agente executa ações irreversíveis autonomamente no primeiro ano,  
**Para que** o lançamento comercial tenha disciplina compatível com o estado da regulação.

**Critérios de aceitação**
- No primeiro ano comercial de qualquer distribuição, agentes operam exclusivamente em níveis 0 e 1 (sugestão, não execução de ação irreversível).
- Modo de coleta passiva ("modo sombra") pode registrar o que o agente teria feito, mas não executa.
- A arquitetura está pronta para autonomia maior; o lançamento comercial não está. Esta é regra invariante do primeiro ano.

### US-14.4 — Vocabulário estruturado de ações (Action Intents)

**Como** desenvolvedor de agente,  
**Eu quero** que ações executáveis por agentes sejam declaradas em um vocabulário estruturado, descobrível e auditado,  
**Para que** governança seja granular ("este agente pode fazer X mas não Y") e ações sejam padronizadas.

**Critérios de aceitação**
- Cada Action Intent tem identificador único, descrição, parâmetros tipados, efeitos declarados, reversibilidade declarada, intent inverso quando aplicável.
- Antes de executar, agente declara explicitamente o Intent que pretende executar com seus parâmetros e raciocínio.
- A biblioteca de Intents cresce incrementalmente; novos Intents seguem ciclo de revisão.

### US-14.5 — Operações invariantes nunca autônomas `[INV]`

**Como** auditor,  
**Eu quero** garantia de que existe um conjunto de operações que **nenhum agente jamais executa autonomamente**, em qualquer circunstância,  
**Para que** os limites mais sensíveis sejam absolutos, não negociáveis.

**Critérios de aceitação**
- Lista mínima invariante: demissão de colaborador, alteração estrutural de cadastro de fornecedores/clientes, alteração de plano de contas, transferência financeira acima de limite, alteração de políticas de governança, concessão ou revogação de acesso privilegiado, exclusão de dados, alteração de informações fiscais.
- Para essas operações, agente sempre gera solicitação de aprovação humana, com SLA de resposta e escalonamento em timeout.
- Distribuições podem estender essa lista, nunca reduzir.
- Tentativas de violação geram alerta de violação invariante e bloqueio.

### US-14.6 — Modo sombra como rampa para autonomia

**Como** owner cauteloso,  
**Eu quero** que agentes que aspiram a autonomia maior passem antes por um modo onde executam todo o raciocínio mas não aplicam a ação, apenas registram o que teriam feito,  
**Para que** eu valide que o agente decide bem antes de deixá-lo agir.

**Critérios de aceitação**
- Em modo sombra, o agente registra a proposta com raciocínio.
- O humano recebe digest periódico das propostas, com botões "teria aprovado", "não teria aprovado", "condicional".
- Métricas mínimas para graduação são declaradas: número mínimo de decisões, acurácia mínima, ausência de decisões catastróficas, tempo mínimo em modo sombra.
- Limites são configuráveis, com defaults conservadores.

### US-14.7 — Humano como autoridade final `[INV]`

**Como** humano em conflito com agente,  
**Eu quero** garantia de que minha decisão sempre prevalece e o agente recebe atualização do estado sem questionar,  
**Para que** a cadeia de responsabilidade seja inequívoca.

**Critérios de aceitação**
- Em qualquer disputa entre humano e agente, a decisão humana prevalece.
- O agente é informado da decisão humana e a respeita sem retrógrada.
- Override humano é registrado.

---

## Epic 15 — Governance-as-Code

### US-15.1 — Políticas declarativas legíveis e versionadas

**Como** compliance officer,  
**Eu quero** declarar políticas de governança em formato estruturado legível, versionado, com histórico,  
**Para que** governança seja artefato auditável, não conhecimento tribal.

**Critérios de aceitação**
- Políticas são documentos estruturados que declaram: a quem se aplicam, o que permitem, o que negam, o que exige aprovação humana, condições (limites, scores, horários).
- Mudanças de políticas são versionadas com histórico completo (quem mudou, quando, o quê).
- Políticas podem ser exportadas, importadas, revisadas em diff.

### US-15.2 — Editor visual de políticas

**Como** compliance officer não-técnico,  
**Eu quero** um editor visual onde eu monte políticas arrastando condições e ações, sem ter que escrever sintaxe,  
**Para que** governança seja acessível a quem entende as regras de negócio sem programar.

**Critérios de aceitação**
- O editor permite construir políticas por composição visual.
- Para usuários técnicos, a representação estruturada subjacente é visível e editável.
- Templates de políticas pré-construídas (ver US-4.5) são importáveis e parametrizáveis via assistente.

### US-15.3 — Simulação antes de publicar

**Como** compliance officer prestes a publicar política nova,  
**Eu quero** simular o efeito da política sobre o histórico recente de decisões,  
**Para que** eu veja em concreto o impacto antes de comprometer produção.

**Critérios de aceitação**
- O sistema executa a política proposta sobre uma janela histórica e reporta: quantas ações teriam sido permitidas, negadas, escaladas para aprovação.
- O relatório lista exemplos representativos de cada categoria.
- A simulação não causa nenhum efeito colateral em dados reais.

### US-15.4 — Diff entre versões de política

**Como** auditor revendo mudança de política,  
**Eu quero** ver o que mudou em uma versão de política em comparação com a anterior, em formato de diff visual,  
**Para que** eu entenda rapidamente a evolução.

**Critérios de aceitação**
- Diff destaca adições, remoções e modificações de regras.
- Cada versão tem timestamp e autor identificado.
- Histórico inteiro é navegável.

### US-15.5 — Preservação da intenção original em linguagem natural `[INV]`

**Como** auditor avaliando se a política executada corresponde à intenção declarada,  
**Eu quero** que cada política guarde a intenção original em linguagem natural junto com a tradução estruturada,  
**Para que** eu possa comparar literal e espírito da regra quando casos de fronteira surgem.

**Critérios de aceitação**
- A política guarda dois artefatos: o estruturado executável e o textual em linguagem natural.
- Para cada regra estruturada, há nota de tradução: o que foi mapeado, o que não foi e por quê.
- Auditor pode revisar casos onde execução literal e intenção declarada estão em tensão.

### US-15.6 — Modo "explicar decisão"

**Como** auditor revisando ação bloqueada ou escalada,  
**Eu quero** ver a cadeia completa: qual política aplicou, qual condição disparou, qual rationale,  
**Para que** governança seja rastreável e questionável.

**Critérios de aceitação**
- Para qualquer ação registrada, é possível pedir "por quê?" e receber explicação estruturada.
- A explicação cita política, versão, condição e parâmetros relevantes.
- Decisões humanas que sobrescreveram política também são explicáveis.

### US-15.7 — Templates de governança como ativos da plataforma

**Como** operador da plataforma,  
**Eu quero** que políticas refinadas em produção possam virar templates publicáveis na loja, oficiais ou de terceiros, gratuitos ou pagos,  
**Para que** o conhecimento operacional acumulado vire ativo da plataforma e barreira contra imitadores.

**Critérios de aceitação**
- Templates declaram: setor aplicável, tamanho de empresa, parâmetros configuráveis, validações de uso.
- Importar template inicia assistente de parametrização.
- Templates oficiais são gratuitos; templates de parceiros podem ser pagos com revenue share.

---

## Epic 16 — Trust Center e Qualidade da IA

### US-16.1 — Métricas formais de qualidade da IA `[INV]`

**Como** owner ou compliance officer,  
**Eu quero** ver métricas formais e atualizadas da qualidade do copiloto e dos agentes — acurácia, taxa de alucinação, taxa de citação ancorada, taxa de override humano, latência, custo por consulta,  
**Para que** confiança no sistema seja baseada em evidência, não opinião.

**Critérios de aceitação**
- Existe painel central de métricas de qualidade da IA, com tendências.
- Métricas são atualizadas automaticamente com base em dataset de referência e em uso real.
- Há regressão automática: degradação acima de limite dispara alerta e, em casos extremos, rollback.

### US-16.2 — Dataset de avaliação curado por distribuição

**Como** operador da plataforma,  
**Eu quero** manter um dataset de perguntas reais e respostas esperadas por distribuição, que evolui com uso e correções humanas,  
**Para que** a qualidade seja medida em termos relevantes ao contexto.

**Critérios de aceitação**
- Cada distribuição tem dataset inicial específico (perguntas frequentes, casos representativos).
- Correções humanas em produção entram no dataset, garantindo que regressões não se repitam.
- Datasets crescem com uso real.

### US-16.3 — Classificação de risco por feature de IA `[INV]`

**Como** time de produto antes de liberar uma feature de IA,  
**Eu quero** declarar a classe de risco da feature (alto/médio/baixo) e ter automaticamente os mecanismos obrigatórios da classe aplicados,  
**Para que** governança seja mecânica, não baseada em vontade individual.

**Critérios de aceitação**
- Toda feature de IA recebe classificação obrigatória.
- Classe alta: ações irreversíveis. Mecanismos: modo sombra prolongado, aprovação humana sempre, audit expandido, revisão por comitê, throttling, rollout por tenant piloto, autonomia máxima limitada a sugestão.
- Classe média: ações reversíveis. Mecanismos: modo sombra moderado, aprovação no primeiro uso, audit padrão, revisão periódica, autonomia máxima limitada a execução com limites.
- Classe baixa: consulta/leitura. Mecanismos: métricas, kill switch, quota.
- Liberação sem classificação declarada é bloqueada.

### US-16.4 — Relatório público de confiança

**Como** plataforma vendendo a clientes que exigem transparência,  
**Eu quero** publicar relatório agregado anônimo das métricas de qualidade,  
**Para que** clientes empresariais e reguladores tenham acesso à transparência operacional sem precisar pedir auditoria.

**Critérios de aceitação**
- O relatório é agregado, anônimo, e atualizado periodicamente.
- Contém métricas-chave de qualidade.
- Está disponível em endereço público.

---

## Epic 17 — Auditoria Dual e Circuit Breaker

### US-17.1 — Auditoria distinguindo humano e agente `[INV]`

**Como** auditor,  
**Eu quero** consultar trilha de auditoria com distinção explícita entre ações de humanos e ações de agentes, com rationale dos agentes registrado,  
**Para que** eu responda perguntas como "isto foi humano ou automático?" via consulta simples, não investigação forense.

**Critérios de aceitação**
- Cada registro de auditoria carrega: tipo de ator (humano, agente, sistema), identidade do ator, supervisor (se agente), ação realizada, entidade afetada, estado antes/depois, decisão da política aplicável, rationale do agente quando aplicável, reversibilidade.
- Consultas naturais possíveis: "todas ações do usuário X no último mês", "todas ações de agentes ontem", "quem aprovou esta ação".
- Trilha é imutável; alterações geram novos registros, não modificam históricos.

### US-17.2 — Reversão e janela reversível

**Como** owner,  
**Eu quero** que ações reversíveis tenham janela explícita de tempo onde possam ser desfeitas, e a reversão seja registrada,  
**Para que** erros recentes sejam corrigíveis sem trauma operacional.

**Critérios de aceitação**
- Cada ação registra se é reversível e a janela de tempo da reversibilidade.
- Dentro da janela, owner ou ator pode disparar a reversão.
- Reversão gera novo registro referenciando a ação original.

### US-17.3 — Circuit breaker contra deriva coletiva `[INV]`

**Como** owner,  
**Eu quero** que o sistema detecte automaticamente padrões anômalos de comportamento de agentes (taxa de reversão crescente, divergência crescente entre proposta e decisão humana, distribuição anômala de saídas) e pause autonomia desses agentes para revisão,  
**Para que** degradação gradual não cause dano grande antes de ser notada.

**Critérios de aceitação**
- O sistema monitora métricas agregadas dos agentes em janelas de tempo configuráveis.
- Limiares de pausa são configuráveis, com defaults conservadores.
- Disparo do circuit breaker pausa o agente específico, não todo o sistema, e notifica responsáveis.
- Retomada exige revisão humana e justificativa.

### US-17.4 — Notarização imutável para eventos críticos `[DEC]`

**Como** auditor externo,  
**Eu quero** que eventos críticos tenham hash criptográfico publicado em sistema independente da plataforma (timestamping público ou cartórios digitais),  
**Para que** integridade seja matematicamente provável independente da boa-fé da plataforma.

**Critérios de aceitação**
- Eventos sinalizados como críticos podem ser notarizados.
- A notarização inclui hash do conteúdo do evento e referência ao registro externo.
- Auditor pode verificar a notarização sem depender da plataforma.

---

## Epic 18 — Memória Estruturada para IA

> O copiloto e os agentes precisam de memória estruturada em camadas, não apenas contexto da conversa atual. A memória tem governança, scoring de confiança, expurgo controlado.

### US-18.1 — Três camadas de memória explícitas `[DEC]`

**Como** desenvolvedor de agente,  
**Eu quero** que a memória disponível seja organizada em camadas explícitas: estado de sessão imediato, conhecimento factual recuperável, aprendizados estruturados de longo prazo,  
**Para que** cada tipo de informação tenha o tratamento adequado.

**Critérios de aceitação**
- Camada A (memória de trabalho): estado de sessão imediato, com TTL curto.
- Camada B (memória semântica): conhecimento factual recuperável, indexado para busca semântica e relacional.
- Camada C (memória episódica): aprendizados estruturados, perfis evolutivos, "cartões de habilidade" versionados.

### US-18.2 — Trust scoring de toda escrita em memória `[INV]`

**Como** owner,  
**Eu quero** que toda escrita em memória de longo prazo passe por um scoring de confiança antes de virar memória utilizável,  
**Para que** memória não seja envenenada por agentes comprometidos ou inferências mal calibradas.

**Critérios de aceitação**
- Cada escrita proposta passa por scoring com componentes: origem (humano explícito, agente supervisionado, inferência), consistência com fatos existentes, frequência, reputação histórica do agente, sanidade básica.
- Memórias com score baixo entram em quarentena visível ao owner.
- Memórias em quarentena expiram se não promovidas dentro de prazo.
- Threshold de promoção é configurável por tenant, com default conservador.

### US-18.3 — Memória pessoal e de empresa separadas

**Como** colaborador,  
**Eu quero** que minhas preferências e padrões pessoais sejam memorizados separadamente do conhecimento institucional da empresa,  
**Para que** minhas peculiaridades não contaminem o conhecimento corporativo, e vice-versa.

**Critérios de aceitação**
- Memória tem dois escopos: pessoal (vinculada a usuário) e tenant (institucional).
- Promoção de pessoal para institucional é explícita.
- Saída do colaborador da empresa não apaga memória institucional, mas remove as ligações pessoais.

### US-18.4 — Memória governada com expurgo controlado

**Como** owner,  
**Eu quero** poder revisar, editar, marcar como deprecada e apagar memórias específicas do tenant,  
**Para que** governança alcance a memória, não apenas eventos e ações.

**Critérios de aceitação**
- Existe interface para revisão de memórias institucionais.
- Memórias podem ser marcadas como obsoletas (substituídas por outra) ou apagadas.
- Apagamento gera registro de auditoria e propaga para qualquer derivação (busca semântica, citações).

### US-18.5 — Decay de relevância temporal

**Como** copiloto consultando histórico,  
**Eu quero** que eventos antigos pesem menos que recentes, com meias-vidas declaradas por tipo de sinal,  
**Para que** análises não sejam dominadas por ruído antigo nem desconectadas do contexto histórico.

**Critérios de aceitação**
- Cada tipo de sinal tem meia-vida declarada (alertas perdem relevância em dias; cláusulas contratuais permanecem indefinidamente).
- Resultados de busca apresentam peso por relevância temporal.
- O copiloto é honesto sobre quando a evidência é fresca ou antiga.

---

## Epic 19 — Capabilities Emergentes do Protocolo de Contexto

### US-19.1 — Grafo vivo da empresa

**Como** owner,  
**Eu quero** visualizar minha empresa como um grafo navegável de entidades (clientes, fornecedores, produtos, contratos, pedidos, contas) e relações (aprova, fornece para, depende de, etc.),  
**Para que** eu compreenda visualmente como as partes do meu negócio se conectam.

**Critérios de aceitação**
- O grafo é construído automaticamente a partir do histórico de eventos.
- Cada relação tem metadados: data de início, validade atual, força, eventos-fonte que a sustentam.
- O grafo é navegável: clicar em nó mostra contratos, pedidos, histórico, dependências.

### US-19.2 — Análise de impacto via grafo

**Como** owner avaliando risco,  
**Eu quero** perguntar "se este fornecedor parar, o que é afetado?" e receber resposta com travessia do grafo,  
**Para que** gestão de risco seja proativa, não só reativa.

**Critérios de aceitação**
- Existe consulta padrão de impacto descendente (o que depende deste nó).
- A consulta retorna lista priorizada com explicação de cada caminho.
- O copiloto pode gerar relatório narrativo a partir da consulta.

### US-19.3 — Mineração de processos automática

**Como** owner,  
**Eu quero** ver como meus processos realmente acontecem (não como foram documentados), com gargalos, retrabalho, desvios e variabilidade,  
**Para que** eu identifique perdas operacionais sem precisar contratar consultoria.

**Critérios de aceitação**
- A partir do histórico de eventos, o sistema reconstrói fluxos reais entre etapas.
- Cada aresta do fluxo carrega métricas: tempo médio de espera, taxa de sucesso, taxa de retrabalho.
- Etapas com maior atraso ou maior incidência de erro são destacadas.
- O copiloto sugere onde automatizar, onde investigar, onde ajustar.

### US-19.4 — Trace de jornada de entidade de negócio

**Como** auditor investigando atraso de pedido,  
**Eu quero** ver a jornada completa do pedido como sequência de etapas (criação, validação fiscal, aprovação financeira, despacho logístico, entrega), com tempos e atores,  
**Para que** eu identifique exatamente onde o gargalo está.

**Critérios de aceitação**
- Cada entidade de negócio (pedido, fatura, contrato) tem trace navegável da jornada.
- Cada etapa mostra ator, app responsável, tempo de espera, resultado.
- Tempos comparados com baseline da empresa permitem identificar desvios.
- Há painel para o gestor (com foco em métricas de negócio) e para o desenvolvedor (com foco em métricas técnicas).

### US-19.5 — Simulação contrafactual (Digital Twin) `[HIP]`

**Como** owner avaliando decisão,  
**Eu quero** perguntar "e se eu der 10% de desconto a este cliente, qual o impacto no fluxo de caixa de 90 dias?",  
**Para que** eu experimente o futuro antes de decidir.

**Critérios de aceitação**
- O sistema simula cenário projetado a partir do estado atual e do histórico.
- Resultados são apresentados como cenários (otimista, base, pessimista).
- A simulação não é certeza; usa intervalos de confiança e premissas declaradas.
- Esta capacidade evolui em fases; no primeiro ano, opera em modo simplificado (snapshot, sem simulação Monte Carlo).

---

## Epic 20 — Inteligência Coletiva Cross-Tenant

### US-20.1 — Benchmarks anonimizados opt-in `[INV]`

**Como** owner curioso sobre como meus números se comparam ao mercado,  
**Eu quero** poder optar por contribuir dados anonimizados para benchmarks coletivos e em troca consultar benchmarks agregados,  
**Para que** decisões internas sejam informadas por evidência setorial.

**Critérios de aceitação**
- Participação é opt-in explícito por empresa, com revogação a qualquer momento.
- Dados contribuídos são anonimizados antes de sair do tenant; nenhum dado bruto sai.
- Benchmarks consultáveis sempre respeitam k-anonimidade (mínimo de empresas contribuintes), supressão de outliers, ruído estatístico, defasagem temporal mínima.
- Auditoria de quem consultou quais benchmarks é mantida (meta-auditoria).

### US-20.2 — Garantias matemáticas, não política `[INV]`

**Como** DPO,  
**Eu quero** que a privacidade dos benchmarks seja garantida por construção matemática, não por política operacional,  
**Para que** mesmo erros operacionais não consigam vazar dados individuais.

**Critérios de aceitação**
- Consultas com menos do que o limiar mínimo de empresas retornam "amostra insuficiente".
- O sistema aplica supressão de outliers e ruído antes de retornar agregados.
- Defasagem temporal impede cruzamento com dados em tempo real.
- Auditoria de consultas registra solicitações e seus resultados.

### US-20.3 — Evolução para garantias mais fortes `[HIP]`

**Como** operador da plataforma,  
**Eu quero** que a evolução técnica das garantias de privacidade siga uma direção declarada (privacidade diferencial formal e, eventualmente, provas de zero conhecimento),  
**Para que** o ecossistema responda à elevação do nível regulatório vindouro.

**Critérios de aceitação**
- A direção evolutiva é pública: k-anonimidade básica → privacidade diferencial → provas de zero conhecimento.
- Cada salto exige nova versão claramente sinalizada.
- Esta evolução é capability de horizonte mais longo, não exigência do primeiro ano.

---

## Epic 21 — Ciclo de Vida de Dados e Direitos do Titular

### US-21.1 — Direitos do titular operacionalizados `[INV]`

**Como** titular de dados (cliente final do tenant ou usuário da plataforma),  
**Eu quero** poder solicitar e exercer todos os direitos previstos em proteção de dados (confirmação de tratamento, acesso, correção, anonimização/eliminação, portabilidade, informação sobre compartilhamentos, revogação de consentimento) com prazo de resposta claro,  
**Para que** meus direitos sejam efetivos, não apenas declarados.

**Critérios de aceitação**
- Existe canal para o titular abrir solicitação de cada direito.
- Solicitações entram em fila com SLA declarado.
- DPO designado revisa e responde dentro do prazo legal aplicável.
- Resposta é registrada com evidência da ação tomada.

### US-21.2 — Retenção declarada por categoria de dado `[INV]`

**Como** DPO,  
**Eu quero** que cada categoria de dado tenha política de retenção explícita: tempo de retenção operacional, tempo em arquivo frio, momento de destruição,  
**Para que** o sistema respeite princípios de minimização e finalidade.

**Critérios de aceitação**
- Categorias de dados estão declaradas (dados de domínio do tenant, eventos, audit, credenciais, dados de usuário, billing, telemetria, logs).
- Cada categoria tem retenção operacional e arquivamento frio declarados.
- Tenants Enterprise podem contratar retenções diferentes (dentro dos mínimos legais).
- Jobs de purga consultam políticas e respeitam legal hold ativo.

### US-21.3 — Legal hold suspende purgas

**Como** DPO recebendo ordem judicial,  
**Eu quero** poder marcar dados específicos como "sob retenção legal" para suspender qualquer purga,  
**Para que** obrigações judiciais sejam cumpridas sem caos.

**Critérios de aceitação**
- DPO pode criar registro de retenção legal com escopo, justificativa e prazo (ou indefinido).
- Jobs de purga consultam registros ativos antes de deletar; dados cobertos são pulados.
- Retenção legal é revisada periodicamente para validar permanência.

### US-21.4 — Exportação completa de dados do tenant

**Como** owner que decide deixar a plataforma,  
**Eu quero** exportar todos os meus dados em formato consumível por outras ferramentas, dentro do prazo legal,  
**Para que** soberania sobre meus dados seja efetiva.

**Critérios de aceitação**
- Existe processo de exportação completa solicitado pelo owner.
- A exportação cobre todas as categorias relevantes em formatos abertos.
- Embeddings e derivados são incluídos quando aplicáveis ou explicitados quando descartados.

### US-21.5 — Eliminação real após retenção legal

**Como** titular pedindo eliminação,  
**Eu quero** garantia de que após retenção legal, os dados sejam efetivamente destruídos, incluindo backups, embeddings derivados e referências em audit não essencial,  
**Para que** o "direito ao esquecimento" seja real.

**Critérios de aceitação**
- Eliminação propaga em cascata: dados primários, embeddings derivados, caches, índices.
- Backups são respeitados conforme política, mas com plano de purga em ciclo definido.
- Audit trail mantém referência mínima necessária à conformidade, com pseudonimização do titular.

---

## Epic 22 — Ecossistema de Desenvolvedores Third-Party

> A arquitetura abre, com disciplina, espaço para desenvolvedores externos publicarem apps. No primeiro ano, este ecossistema é restrito; abertura plena vem após PMF.

### US-22.1 — Conta de desenvolvedor com acordo formal

**Como** desenvolvedor externo,  
**Eu quero** criar conta de desenvolvedor, aceitar acordo formal e receber permissão para publicar,  
**Para que** minha presença no ecossistema seja legalmente clara.

**Critérios de aceitação**
- Cadastro de desenvolvedor exige aceite de acordo formal de desenvolvedor.
- Há identidade de desenvolvedor com chaves cryptográficas associadas.
- Há mecanismo de revogação em caso de descumprimento.

### US-22.2 — Publicação de app passa por revisão

**Como** operador da plataforma,  
**Eu quero** que apps publicados passem por revisão automática (validação de manifesto, testes de segurança, conformidade) e revisão manual (conteúdo apropriado),  
**Para que** o catálogo mantenha padrão de qualidade e segurança.

**Critérios de aceitação**
- Submissão de app dispara pipeline de revisão.
- Falhas automáticas são reportadas com mensagem clara para o desenvolvedor corrigir.
- Aprovação manual é necessária antes de listagem pública.

### US-22.3 — Apps assinam suas publicações `[INV]`

**Como** owner instalando um app,  
**Eu quero** garantia de que o pacote do app foi assinado pelo desenvolvedor registrado e não foi adulterado em trânsito,  
**Para que** eu confie na origem.

**Critérios de aceitação**
- Cada pacote de app é assinado pelo desenvolvedor antes de publicação.
- A plataforma valida a assinatura antes de instalar; pacotes não assinados ou com assinatura inválida são rejeitados.
- O modelo é compatível com rotação de chaves (chave comprometida pode ser revogada sem invalidar pacotes assinados antes da revogação).

### US-22.4 — Apps declaram capacidades explícitas `[INV]`

**Como** owner instalando um app,  
**Eu quero** ver declaração explícita do que o app pode fazer (quais operações, sobre quais recursos, em quais janelas de tempo) e poder revogar capacidades a qualquer momento,  
**Para que** o controle de permissões seja granular e revogável, não tudo-ou-nada.

**Critérios de aceitação**
- Cada app declara conjunto explícito de capacidades pedidas com justificativa.
- Owner aprova ou nega capacidades individualmente na instalação.
- Owner pode revogar capacidades a qualquer momento; revogação propaga rapidamente para todos os nós.
- App que tenta usar capacidade revogada recebe erro explícito.

### US-22.5 — Revenue share competitivo

**Como** desenvolvedor decidindo onde publicar,  
**Eu quero** termos de revenue share mais favoráveis que os de lojas tradicionais,  
**Para que** publicar nesta plataforma seja vantajoso comercialmente.

**Critérios de aceitação**
- Apps gratuitos: zero revenue share.
- Apps pagos/assinatura: percentual menor que o de Apple/Google nos primeiros anos e nos anos subsequentes.
- Apps Enterprise com venda direta: revenue share negociado caso a caso.

### US-22.6 — Apps third-party rodam isolados `[INV]`

**Como** owner,  
**Eu quero** garantia de que apps third-party rodam em ambiente isolado, sem acesso a dados ou apps que não declararam consumir,  
**Para que** apps de terceiros não comprometam o sistema.

**Critérios de aceitação**
- Cada app third-party roda em ambiente sandboxed.
- Comunicação entre app e a plataforma passa por canal estruturado controlado.
- Apps não fazem JOIN direto em dados de outros apps; apenas via contratos de dados explícitos (eventos, queries com schema).

---

## Epic 23 — Monetização e Tiers

### US-23.1 — Tiers claros: standalone, bundle, enterprise

**Como** cliente avaliando,  
**Eu quero** opções de assinatura claras: produto único standalone, bundle integrado da distribuição, bundle enterprise com agentes customizados e SLA dedicado,  
**Para que** eu escolha conforme meu tamanho e maturidade.

**Critérios de aceitação**
- Standalone: cliente paga só pelo produto único; usa standalone, sem integração nativa.
- Bundle: cliente paga assinatura única que dá acesso a todos os apps nativos da distribuição + sistema operacional + comunicação entre apps + copiloto com quotas padrão + vitrine filtrada completa.
- Enterprise: bundle + agentes customizados + governança avançada + SLA + suporte prioritário + consultoria de compliance.

### US-23.2 — Cobrança transparente e auditável

**Como** owner,  
**Eu quero** entender exatamente o que estou pagando e ver detalhamento por componente (assinatura base, uso adicional de copiloto, apps de terceiros, etc.),  
**Para que** custo seja previsível.

**Critérios de aceitação**
- Painel financeiro mostra cobrança detalhada por linha.
- Avisos antes de exceder quotas com risco de cobrança adicional.
- Histórico de cobranças exportável.

### US-23.3 — Programa de certificação de distribuições terceiras

**Como** parceiro construindo distribuição,  
**Eu quero** programa formal de certificação ("compatível com a plataforma") com requisitos técnicos, suite de testes e licenciamento,  
**Para que** minha distribuição tenha selo oficial e eu tenha acesso aos serviços proprietários.

**Critérios de aceitação**
- Existe definição pública de compatibilidade.
- Existe suite de testes automatizados para validação.
- Selo é licenciado via contrato com renovação periódica.
- Apenas distribuições certificadas têm acesso aos serviços proprietários.

---

## Epic 24 — Academia e Certificação

### US-24.1 — Trilhas de aprendizado por papel

**Como** novo operador final,  
**Eu quero** trilhas de aprendizado dentro do próprio sistema, com módulos práticos e certificação ao final,  
**Para que** eu adote a plataforma de forma estruturada e ganhe credencial verificável.

**Critérios de aceitação**
- Trilhas existem para: operadores finais (por distribuição), desenvolvedores (fundamentos, arquitetura de apps, conectores, agentes), parceiros integradores.
- Módulos rodam dentro do próprio sistema, com o copiloto como tutor contextual.
- Certificações são emitidas em formato verificável externamente.

### US-24.2 — Modelo freemium de certificação

**Como** operador da plataforma,  
**Eu quero** que trilhas básicas de operador sejam gratuitas (reduz fricção de adoção) e certificações profissionais sejam pagas,  
**Para que** academia seja simultaneamente acelerador de adoção e linha de receita.

**Critérios de aceitação**
- Trilhas básicas de operador final são gratuitas.
- Certificações profissionais (desenvolvedor, integrador) são pagas com preços por complexidade.
- Trilhas de parceiro envolvem contrato comercial e anuidade.
- Academias enterprise podem ser contratadas para times inteiros.

### US-24.3 — Certificação alimenta credibilidade na loja

**Como** cliente avaliando app de terceiro,  
**Eu quero** ver se o desenvolvedor tem certificação oficial e o nível dela,  
**Para que** confiabilidade do desenvolvedor seja visível.

**Critérios de aceitação**
- Desenvolvedores certificados ganham selo no perfil da loja.
- Apps de desenvolvedores certificados podem receber destaque na vitrine.
- Tiering de qualidade é explícito.

---

## Epic 25 — Proteção do Ecossistema

### US-25.1 — Licenciamento defensável da camada base `[INV]`

**Como** operador da plataforma,  
**Eu quero** que a camada base aberta tenha licença que permita uso, modificação e distribuição para a maioria dos casos, mas proíba ofertar a camada base como serviço hospedado concorrente à plataforma comercial,  
**Para que** o ecossistema aberto cresça sem habilitar fork hostil que destrua o modelo comercial.

**Critérios de aceitação**
- A licença é pública, redação profissional, com cláusula explícita de uso adicional restritivo a serviço concorrente.
- A licença converte automaticamente em licença totalmente livre após período declarado de anos por release.
- A cláusula de uso adicional é explícita e legalmente clara, evitando ambiguidade.

### US-25.2 — Serviços proprietários separados arquiteturalmente `[INV]`

**Como** operador da plataforma,  
**Eu quero** que serviços proprietários (loja oficial, copiloto, identidade federada, inteligência coletiva, cobrança) estejam em base de código separada, consumida pelo kernel via interfaces e chave de licença,  
**Para que** fork da camada base resulte em produto mutilado que dificilmente justifica reimplementação.

**Critérios de aceitação**
- Serviços proprietários estão em base de código separada e fechada.
- Sem chave de licença válida, o sistema degrada graciosamente.
- A arquitetura, não a licença, é o que força o uso dos serviços oficiais.

### US-25.3 — Marca registrada e política agressiva `[INV]`

**Como** operador da plataforma,  
**Eu quero** que o nome da plataforma seja marca registrada nas jurisdições principais, com política clara de uso e ação imediata contra forks que tentem usar o nome,  
**Para que** clientes que procuram a plataforma genuína nunca cheguem a fork hostil.

**Critérios de aceitação**
- Marca está registrada nas jurisdições principais antes do lançamento público.
- Política de uso da marca é pública e clara.
- Uso indevido por fork dispara cease-and-desist imediato.

### US-25.4 — Acordos com contribuidores externos

**Como** operador da plataforma,  
**Eu quero** que toda contribuição externa de código exija acordo de licenciamento que dê à plataforma direitos amplos sobre a contribuição,  
**Para que** eventual mudança futura de licença seja viável sem rastrear cada contribuidor.

**Critérios de aceitação**
- Pull requests externos são bloqueados sem acordo assinado.
- O acordo permite relicenciamento futuro pela organização operadora.
- Histórico de aceites é mantido auditável.

---

## Epic 26 — Adoção Gradual sem Ruptura

### US-26.1 — Adoção sem substituir sistemas existentes `[INV]`

**Como** owner com sistemas legados,  
**Eu quero** poder adotar a plataforma como camada de inteligência sobre sistemas legados (ERP, CRM próprios), sem precisar substituí-los como pré-requisito,  
**Para que** a barreira de adoção seja mínima.

**Critérios de aceitação**
- Conectores e bridges (ver Epic 11) viabilizam coexistência.
- Substituição gradual de módulos do legado por apps da plataforma é caminho disponível, não obrigatório.
- A venda pode ser feita como "mantenha seu legado, ganhe inteligência em cima".

### US-26.2 — Modo degenerado para qualquer componente sofisticado `[INV]`

**Como** operador da plataforma lançando produto,  
**Eu quero** que cada componente sofisticado (engine de contexto, motor de políticas, copiloto, grafo de empresa, etc.) tenha versão degenerada mínima que funciona sem a sofisticação,  
**Para que** o sistema possa entrar em produção com qualquer subset de componentes implementados em modo pleno, evoluindo onde houver retorno de investimento.

**Critérios de aceitação**
- Cada componente declara seu modo degenerado.
- O sistema opera com qualquer combinação de componentes em modo pleno ou degenerado, sem quebra.
- Modo degenerado é default em planos básicos e ambientes de desenvolvimento; modo pleno é licenciado.
- Componentes "saltam" do degenerado para o pleno quando estão prontos, individualmente.

### US-26.3 — Lançamento por tenant piloto

**Como** operador da plataforma lançando feature de risco alto,  
**Eu quero** ativar a feature primeiro em poucos tenants piloto consentidos, monitorar, e expandir em ondas,  
**Para que** problemas em produção apareçam em pequena escala antes de afetar a base toda.

**Critérios de aceitação**
- Features de risco alto têm rollout obrigatório por ondas: 1-3 piloto → 5-10% → expansão.
- Janelas mínimas entre ondas são respeitadas.
- Cada onda tem critérios de seguir/parar declarados.
- Feature flags por tenant são parte da operação, não exceção.

---

## Restrições Invariantes

Estas regras valem em qualquer cenário e não são negociáveis sem revisão constitucional formal. Toda especificação derivada deste documento deve respeitá-las.

| # | Restrição |
|---|---|
| **R1** | Isolamento por empresa é absoluto. Bug em código nunca pode causar vazamento entre empresas. |
| **R2** | Toda ação significativa de negócio gera evento estruturado, imutável, auditável. |
| **R3** | Toda ação de agente passa por motor de políticas antes de executar, sem exceção. |
| **R4** | Humano é autoridade final em qualquer disputa com agente. Agentes não sobrescrevem humanos. |
| **R5** | Operações invariantes (lista do Epic 14) jamais são executadas autonomamente por agente. |
| **R6** | Toda saída derivada de IA carrega quantificação explícita de incerteza. |
| **R7** | Toda funcionalidade sofisticada tem versão degenerada mínima funcional. |
| **R8** | Toda feature que envolve IA declara classe de risco e tem mecanismos da classe automaticamente aplicados. |
| **R9** | Dados de cliente final do tenant contam como dados pessoais sob a lei aplicável; a plataforma é processador, o tenant é controlador, conformidade é integral. |
| **R10** | Apps de terceiros rodam isolados, com capacidades declaradas, assinados pelo desenvolvedor, com permissões revogáveis. |
| **R11** | Contribuintes externos assinam acordo de licença antes de qualquer merge. |
| **R12** | Acessos de equipe interna a dados de cliente exigem justificativa, geram registro imutável e notificam o owner. |
| **R13** | Código do kernel é invariante: muda apenas quando a mudança é genericamente útil para múltiplas distribuições. |
| **R14** | Distribuições são isoladas entre si; nunca importam código de outra distribuição. |
| **R15** | Configuração declarativa é preferida a código customizado. Código customizado em distribuição é último recurso, com justificativa formal. |

---

## Lista do Que NÃO Entra no Primeiro Ano

Consolidação explícita do que **não** será entregue no primeiro ano de qualquer distribuição comercial. Esta lista funciona como contrato entre engenharia, produto e liderança, evitando arrasto de pet-features para o MVP.

| Item | Razão |
|---|---|
| Loja aberta a publicação third-party livre | Catálogo no primeiro ano é curado: apenas first-party + parceiros certificados. Abertura plena exige infraestrutura (revisão de segurança, suporte a desenvolvedores externos, resolução de disputas, billing de parceiros) que é frente independente. |
| Autonomia de escrita por agentes | Agentes operam exclusivamente em níveis 0-1 (sugestão, sem execução irreversível). Nenhum agente executa ação irreversível autonomamente no primeiro ano, qualquer que seja o desempenho em modo sombra. |
| Modo offline-first completo | Operação plena offline com fila de eventos local, resolução de conflitos e replicação ordenada é frente quase independente. Deferida até prova de demanda. |
| Múltiplas distribuições simultâneas em produção | Uma distribuição apenas no primeiro ano. Pluralidade é promessa arquitetural validada quando a primeira está madura. |
| Inteligência coletiva avançada cross-tenant | Benchmarks simples opt-in com k-anonimidade são possíveis; aprendizado federado, privacidade diferencial formal e simulação cross-tenant são deferidos. |
| Simulação contrafactual pesada (Digital Twin avançado) | No primeiro ano, opera em modo simplificado (snapshot do estado atual, sem Monte Carlo nem agentes simulados). |
| Plataforma exposta como ferramenta para agentes externos | Capacidade existe na arquitetura mas exposição pública é deferida até maturidade demonstrada. |
| Agentes complexos com planejamento profundo multi-step | No primeiro ano agentes são assistivos, não planejadores. "Organize meu trabalho da próxima semana" não é caso de uso. |
| Engine de contexto federado entre tenants | Federação dentro de um tenant é válida; entre tenants é deferida. |
| Privacidade diferencial formal com gerenciamento de orçamento | K-anonimidade simples basta para o primeiro ano. |

---

## Histórico

- **v1.0** — versão inicial. Consolida ideia, intenção e necessidade extraídas de toda a fundamentação, documentos companheiros e histórico de conversas. Foco exclusivo em comportamento observável e valor para personas; nenhuma menção a tecnologias ou stack. Pronta para alimentar especificações detalhadas em qualquer escolha técnica.
