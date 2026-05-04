-- Sprint 21 MX112 — Seed kernel.app_registry com os 31 apps nativos do
-- shell-commercial (registry.ts) + 22 apps externos do catalogo da Magic
-- Store (verticais, AI weblinks, jogos, puter). Total: 53 entries.
--
-- Idempotente via ON CONFLICT (id) DO NOTHING.

-- Normaliza inconsistencia historica: company_modules usava 'comercio_digital'
-- (underscore), catalogo usa 'comercio-digital' (hyphen). Alinha tudo no
-- formato hyphenated antes de seedar.
UPDATE kernel.company_modules
   SET module = 'comercio-digital'
 WHERE module = 'comercio_digital';

-- ─── Apps nativos (31 entries do APP_REGISTRY) ──────────────────────────────
-- Todos: app_type='native', entry_mode='internal'.

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, license, developer_name,
   show_in_dock, closeable, has_internal_nav, always_enabled, opens_as_modal,
   installable, offline_capable, tags, sort_order)
VALUES
  ('mesa','mesa','Mesa','Desktop principal — wallpaper, icones, widgets.',
   'Mesa eh o desktop do OS. Hospeda icones de apps, widgets e wallpaper. Sempre ativa, nao pode ser fechada.',
   'Monitor','#64748b','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,false,false,true,false,false,true,
   ARRAY['sistema','desktop'],10),

  ('drive','drive','Drive','Armazenamento de arquivos com pastas e busca.',
   'Drive multi-tenant com upload, pastas, busca e versionamento. RLS por company_id em kernel.files.',
   'HardDrive','#06b6d4','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,true,false,false,true,false,
   ARRAY['arquivos','storage','documentos'],20),

  ('pessoas','pessoas','Pessoas','Cadastro de pessoas e contatos da empresa.',
   'Modulo de pessoas: contatos, clientes, fornecedores, colaboradores. Integra com RH e Comercio.',
   'Contact','#8b5cf6','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,true,false,false,true,false,
   ARRAY['contatos','clientes','crm'],30),

  ('chat','chat','Mensagens','Chat interno por canais e mensagens diretas.',
   'Chat real-time entre membros da company. Canais publicos/privados, DMs, presenca.',
   'MessageSquare','#06b6d4','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,false,false,false,true,false,
   ARRAY['mensagens','chat','colaboracao'],40),

  ('rh','rh','RH','Gestao de colaboradores e estrutura organizacional.',
   'RH: cadastro de colaboradores, cargos, departamentos, integracao com Pessoas.',
   'Users','#8b5cf6','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,true,false,false,true,false,
   ARRAY['rh','colaboradores','organograma'],50),

  ('magic-store','magic-store','AE Magic Store','Catalogo de apps disponiveis na plataforma.',
   'Loja de apps do Aethereos: instale verticais, AI assistants, utilitarios e jogos.',
   'Store','#0ea5e9','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,false,true,false,false,false,
   ARRAY['sistema','apps','marketplace'],15),

  ('weather','weather','Tempo','Previsao do tempo com geolocalizacao — Open-Meteo.',
   'Widget de tempo usando Open-Meteo (API aberta, sem chave). Mostra condicoes atuais e previsao de 7 dias.',
   'CloudSun','#60a5fa','utilities','native','internal',
   'BUSL-1.1 (Aethereos) + Open-Meteo (CC-BY 4.0)','Aethereos',
   false,true,false,false,false,true,false,
   ARRAY['clima','tempo','open-meteo'],100),

  ('settings','settings','Configuracoes','Preferencias do usuario, IA, aparencia, integracoes.',
   'Painel de configuracoes: perfil, empresa, aparencia, IA (BYOK), integracoes, planos, sistema.',
   'Settings','#64748b','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,true,true,false,false,false,true,
   ARRAY['sistema','configuracoes','perfil'],60),

  ('notifications','notifications','Notificacoes','Central de notificacoes do OS.',
   'Lista todas as notificacoes recebidas pelo usuario na company atual.',
   'Bell','#8b5cf6','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,false,true,
   ARRAY['sistema','notificacoes'],110),

  ('gestor','gestor','Gestor','Painel executivo com indicadores da empresa.',
   'Dashboard executivo: faturamento, vendas, produtividade. Agrega dados de outros modulos.',
   'BriefcaseBusiness','#6366f1','optional','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,false,
   ARRAY['gestao','dashboard','indicadores'],90),

  ('ae-ai','ae-ai','Aether AI','Copilot conversacional com BYOK + RAG da empresa.',
   'Aether AI Copilot: chat com seu LLM (BYOK) + Shadow Mode para acoes propostas + RAG via pgvector.',
   'Bot','#8b5cf6','ai','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   true,false,false,true,true,false,false,
   ARRAY['ia','copilot','assistente'],25),

  ('calendar','calendar','Calendario','Agenda visual com eventos, lembretes e multiplos calendarios.',
   'Calendario do OS com visualizacoes mes/semana/dia, eventos com lembretes, calendarios coloridos por categoria.',
   'CalendarDays','#8b5cf6','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','agenda','calendario'],120),

  ('governanca','governanca','Governanca','Agentes, capabilities, invariantes, shadow mode, context engine.',
   'App admin para revisao de agentes do Copilot, capabilities, invariantes (Fundamentacao 12.4), proposals shadow mode e Context Engine (Sprint 19).',
   'Shield','#ef4444','system','native','internal',
   'Proprietario (Aethereos)','Aethereos',
   false,true,true,false,false,false,false,
   ARRAY['admin','seguranca','governanca'],500),

  ('auditoria','auditoria','Auditoria','Log de acoes e eventos para compliance.',
   'Visualizacao do kernel.audit_log: quem fez o que e quando. Filtros por actor, action, recurso.',
   'ClipboardList','#f59e0b','system','native','internal',
   'Proprietario (Aethereos)','Aethereos',
   false,true,true,false,false,false,false,
   ARRAY['admin','auditoria','compliance'],510),

  ('bloco-de-notas','bloco-de-notas','Bloco de Notas','Notas rapidas com etiquetas, busca e sincronizacao.',
   'Bloco de Notas do OS: edicao em texto rico, etiquetas coloridas, busca instantanea e sincronizacao multi-dispositivo via kernel.notes.',
   'StickyNote','#f59e0b','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','notas'],130),

  ('tarefas','tarefas','Tarefas','Lista de tarefas com priorizacao e prazos.',
   'Gestor de tarefas pessoais com listas, prioridades, prazos e visualizacoes Hoje/Semana/Mes.',
   'ListChecks','#3b82f6','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','tarefas','todo'],140),

  ('agenda-telefonica','agenda-telefonica','Contatos Telefonicos','Agenda telefonica com numeros, ramais e grupos.',
   'Agenda telefonica empresarial: numeros internos, ramais, grupos por departamento.',
   'BookUser','#10b981','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['contatos','telefonia'],150),

  ('calculadora','calculadora','Calculadora','Calculadora cientifica com historico — embarcada no OS.',
   'Calculadora padrao do Aethereos OS, com modo cientifico, historico e atalhos de teclado. App nativo do shell, totalmente offline.',
   'Calculator','#f97316','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,true,true,
   ARRAY['produtividade','matematica'],160),

  ('relogio','relogio','Relogio','Relogio mundial, alarmes, cronometro e timer.',
   'Relogio com fusos horarios mundiais, despertadores recorrentes, cronometro e timer pomodoro.',
   'Clock','#6366f1','utilities','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,true,true,
   ARRAY['utilitario','tempo','alarme'],170),

  ('camera','camera','Camera','Camera para foto e video direto do navegador.',
   'Captura de foto/video via getUserMedia. Salva em kernel.media_files com RLS por company.',
   'Camera','#1a1a2e','utilities','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,false,false,
   ARRAY['utilitario','camera','video'],180),

  ('gravador-de-voz','gravador-de-voz','Gravador de Voz','Gravador de audio com transcricao automatica.',
   'Gravacao de audio via Web Audio API. Salva em kernel.voice_recordings.',
   'Mic','#ef4444','utilities','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,false,false,
   ARRAY['utilitario','audio','gravacao'],190),

  ('enquetes','enquetes','Enquetes','Enquetes e votacoes anonimas ou identificadas.',
   'Cria enquetes com opcoes multiplas, voto anonimo ou identificado, resultados em tempo real.',
   'Vote','#6366f1','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,true,true,
   ARRAY['produtividade','enquete','votacao'],200),

  ('navegador','navegador','Navegador','Mini-navegador embarcado para abrir links sem sair do OS.',
   'Navegador interno em iframe para abrir paginas externas sem perder o contexto do OS. Respeita politicas X-Frame-Options dos sites.',
   'Globe','#0ea5e9','utilities','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,true,true,
   ARRAY['navegador','browser'],210),

  ('kanban','kanban','Kanban','Quadros Kanban para gestao visual de tarefas.',
   'Quadros Kanban com colunas customizaveis, cards arrastaveis e etiquetas. Multi-tenant via RLS por company_id.',
   'Kanban','#6366f1','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','tarefas','agile'],220),

  ('lixeira','lixeira','Lixeira','Lixeira global do OS com restauracao.',
   'Lixeira centralizada que recebe arquivos, notas, tarefas etc. excluidos dos apps. TTL 30 dias para purga definitiva.',
   'Trash2','#64748b','system','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,false,false,
   ARRAY['sistema','lixeira'],520),

  ('planilhas','planilhas','Planilhas','Editor de planilhas estilo spreadsheet.',
   'Editor de planilhas com formulas basicas, multiplas abas, exportacao CSV.',
   'Grid3x3','#10b981','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','planilha','spreadsheet'],230),

  ('documentos','documentos','Documentos','Editor de documentos com texto rico.',
   'Editor de documentos texto rico (rich-text) com formatacao, listas, links e exportacao.',
   'FileText','#3b82f6','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','documentos','editor'],240),

  ('apresentacoes','apresentacoes','Apresentacoes','Editor de apresentacoes (slides).',
   'Editor de slides com layouts pre-prontos, transicoes simples e exportacao em PDF.',
   'Monitor','#f59e0b','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,true,
   ARRAY['produtividade','apresentacao','slides'],250),

  ('pdf','pdf','PDF','Visualizador de PDFs com anotacoes.',
   'Leitor de PDF com anotacoes salvas em kernel.pdf_notes (RLS por company).',
   'FileText','#ef4444','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,false,false,false,false,true,
   ARRAY['produtividade','pdf','documentos'],260),

  ('automacoes','automacoes','Automacoes','Triggers e workflows que reagem a eventos SCP.',
   'Builder visual de automacoes: trigger SCP -> condicoes -> acoes (notif, email, webhook).',
   'Workflow','#10b981','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,true,false,
   ARRAY['produtividade','automacao','workflows'],270),

  ('reuniao','reuniao','Reunioes','Sala de reuniao com video, audio e gravacao.',
   'Conferencia via WebRTC, gravacoes em kernel.meetings + storage kernel-meetings.',
   'Video','#0ea5e9','productivity','native','internal',
   'BUSL-1.1 (Aethereos)','Aethereos',
   false,true,true,false,false,false,false,
   ARRAY['produtividade','reuniao','video'],280)
ON CONFLICT (id) DO NOTHING;

-- ─── Verticais (Camada 2 standalone) — entry_mode='weblink' ─────────────────

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, entry_url, external_url, status, license,
   developer_name, show_in_dock, closeable, has_internal_nav, always_enabled,
   installable, offline_capable, tags, sort_order)
VALUES
  ('comercio-digital','comercio-digital','Comercio Digital',
   'Catalogo, cotacoes e vendas online B2B com fiscais integrados.',
   'App standalone para gestao completa de comercio B2B: catalogo de produtos com NCM, cotacoes, pedidos de venda, NF-e, integracoes com transportadoras. Requer aprovacao da plataforma para ativacao.',
   'ShoppingCart','#f0fc05','vertical','external_shortcut','weblink',
   'https://comercio.aethereos.io','https://comercio.aethereos.io',
   'published','Proprietario (Aethereos)','Aethereos',
   false,true,false,false,true,false,
   ARRAY['vendas','fiscal','ncm','nfe'],300),

  ('logitix','logitix','LOGITIX',
   'Logistica, fretes, transportadoras e rastreamento de entregas.',
   'Plataforma de gestao logistica: cotacao de fretes, integracao com transportadoras, rastreamento em tempo real, romaneios e gestao de ocorrencias.',
   'Truck','#059669','vertical','external_shortcut','weblink',
   'https://logitix.aethereos.io','https://logitix.aethereos.io',
   'draft','Proprietario (Aethereos)','Aethereos',
   false,true,false,false,false,false,
   ARRAY['logistica','fretes','transporte'],310),

  ('erp','erp','ERP',
   'Gestao financeira, fiscal e contabil para sua empresa.',
   'ERP completo: contas a pagar e receber, fluxo de caixa, DRE, gestao fiscal (SPED, NFe, CTe), integracao contabil e relatorios gerenciais.',
   'BarChart3','#7c3aed','vertical','external_shortcut','weblink',
   'https://erp.aethereos.io','https://erp.aethereos.io',
   'draft','Proprietario (Aethereos)','Aethereos',
   false,true,false,false,false,false,
   ARRAY['financeiro','fiscal','contabil'],320),

  ('kwix','kwix','Kwix CRM',
   'CRM de vendas, pipeline e gestao de oportunidades.',
   'CRM focado em vendas B2B: pipeline Kanban, gestao de oportunidades, acompanhamento de propostas e metricas de conversao.',
   'TrendingUp','#f97316','vertical','external_shortcut','weblink',
   'https://kwix.aethereos.io','https://kwix.aethereos.io',
   'draft','Proprietario (Aethereos)','Aethereos',
   false,true,false,false,false,false,
   ARRAY['crm','vendas','pipeline'],330),

  ('autergon','autergon','Autergon',
   'Automacoes, workflows e integracoes entre sistemas.',
   'Plataforma de automacao de processos: triggers, acoes condicionais, webhooks, integracao com APIs externas e orquestracao de workflows.',
   'Zap','#8b5cf6','vertical','external_shortcut','weblink',
   'https://autergon.aethereos.io','https://autergon.aethereos.io',
   'draft','Proprietario (Aethereos)','Aethereos',
   false,true,false,false,false,false,
   ARRAY['automacao','workflows','integracoes'],340)
ON CONFLICT (id) DO NOTHING;

-- ─── AI weblinks (provedores bloqueiam iframe via X-Frame-Options) ──────────

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, entry_url, external_url, license, developer_name,
   show_in_dock, closeable, has_internal_nav, installable, offline_capable,
   tags, sort_order)
VALUES
  ('ai-claude','ai-claude','Claude',
   'Assistente de IA da Anthropic — raciocinio longo e codigo.',
   'Claude eh o assistente de IA da Anthropic com janela de contexto ampla, otimo desempenho em raciocinio complexo, escrita e codigo. Abre em nova aba — claude.ai bloqueia incorporacao direta por X-Frame-Options.',
   'Sparkles','#d97706','ai','external_shortcut','weblink',
   'https://claude.ai','https://claude.ai',
   'Servico de terceiros (Anthropic)','Anthropic',
   false,true,false,true,false,
   ARRAY['ia','assistente','anthropic'],400),

  ('ai-chatgpt','ai-chatgpt','ChatGPT',
   'Assistente de IA da OpenAI — GPT-4 e modelos multimodais.',
   'ChatGPT da OpenAI: chat conversacional, geracao de imagens DALL-E, navegacao web, analise de arquivos. Abre em nova aba (provedor bloqueia iframe).',
   'MessageSquare','#10a37f','ai','external_shortcut','weblink',
   'https://chat.openai.com','https://chat.openai.com',
   'Servico de terceiros (OpenAI)','OpenAI',
   false,true,false,true,false,
   ARRAY['ia','openai','gpt'],410),

  ('ai-gemini','ai-gemini','Gemini',
   'IA multimodal do Google — Gemini 1.5 Pro com 1M de contexto.',
   'Gemini do Google: modelo multimodal nativo (texto, imagem, audio, video), integracao com Google Workspace. Abre em nova aba.',
   'Sparkles','#4285f4','ai','external_shortcut','weblink',
   'https://gemini.google.com','https://gemini.google.com',
   'Servico de terceiros (Google)','Google',
   false,true,false,true,false,
   ARRAY['ia','google','multimodal'],420),

  ('ai-perplexity','ai-perplexity','Perplexity',
   'Motor de busca conversacional com citacoes em tempo real.',
   'Perplexity AI: respostas baseadas em busca em tempo real com citacoes de fontes. Excelente para pesquisa rapida e factual. Abre em nova aba.',
   'Search','#1fb8cd','ai','external_shortcut','weblink',
   'https://www.perplexity.ai','https://www.perplexity.ai',
   'Servico de terceiros (Perplexity)','Perplexity',
   false,true,false,true,false,
   ARRAY['ia','busca','pesquisa'],430),

  ('ai-huggingchat','ai-huggingchat','HuggingChat',
   'Chat aberto com modelos da comunidade Hugging Face.',
   'HuggingChat hospeda modelos open-source (Llama, Mistral, Command R+, etc.) sem necessidade de chave de API. Bom para experimentacao. Abre em nova aba.',
   'Bot','#ffd21e','ai','open_source','weblink',
   'https://huggingface.co/chat','https://huggingface.co/chat',
   'Open-source (Apache-2.0 — modelos variam)','Hugging Face',
   false,true,false,true,false,
   ARRAY['ia','open-source','huggingface'],440)
ON CONFLICT (id) DO NOTHING;

-- ─── Puter (OS web open-source) ──────────────────────────────────────────────

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, entry_url, external_url, license, developer_name,
   show_in_dock, closeable, has_internal_nav, installable, offline_capable,
   tags, sort_order)
VALUES
  ('puter-os','puter-os','Puter',
   'OS web open-source com Drive, terminal e apps gratuitos.',
   'Puter eh um sistema operacional inteiro que roda no navegador — gratuito, open-source (AGPL-3.0) e privado. Inclui Drive, terminal, editor, browser de apps. Abre em nova aba (puter.com gerencia proprio dominio e auth).',
   'Globe','#3b82f6','puter','open_source','weblink',
   'https://puter.com','https://puter.com',
   'AGPL-3.0','Puter',
   false,true,false,true,false,
   ARRAY['os','open-source','drive','terminal'],450)
ON CONFLICT (id) DO NOTHING;

-- ─── Jogos open-source / dominio publico (weblink) ──────────────────────────

INSERT INTO kernel.app_registry
  (id, slug, name, description, long_description, icon, color, category,
   app_type, entry_mode, entry_url, external_url, license, developer_name,
   show_in_dock, closeable, has_internal_nav, installable, offline_capable,
   tags, sort_order)
VALUES
  ('game-2048','game-2048','2048',
   'Junte os tiles ate chegar a 2048.',
   '2048 — quebra-cabeca classico. Implementacao open-source (MIT) por Gabriele Cirulli.',
   'Hash','#f59e0b','games','open_source','weblink',
   'https://play2048.co/','https://play2048.co/',
   'MIT (Gabriele Cirulli)','Gabriele Cirulli',
   false,true,false,true,false,
   ARRAY['puzzle','classico'],600),

  ('game-tetris','game-tetris','Tetris',
   'Tetris classico no navegador.',
   'Tetris jogavel em HTML5. Versao open-source.',
   'Grid3x3','#3b82f6','games','open_source','weblink',
   'https://tetris.com/play-tetris','https://tetris.com/play-tetris',
   'Free-to-play','Tetris',
   false,true,false,true,false,
   ARRAY['puzzle','retro'],610),

  ('game-snake','game-snake','Snake',
   'Snake classico — coma as macas, nao bata na parede.',
   'Snake nostalgico em HTML5. Open-source.',
   'Move','#10b981','games','open_source','weblink',
   'https://playsnake.org/','https://playsnake.org/',
   'Free-to-play','Snake',
   false,true,false,true,false,
   ARRAY['arcade','retro'],620),

  ('game-tic-tac-toe','game-tic-tac-toe','Jogo da Velha',
   'Tic-Tac-Toe online.',
   'Jogo da velha simples para 1 ou 2 jogadores.',
   'X','#8b5cf6','games','open_source','weblink',
   'https://playtictactoe.org/','https://playtictactoe.org/',
   'Free-to-play','Free Web',
   false,true,false,true,false,
   ARRAY['classico'],630),

  ('game-chess','game-chess','Chess (Lichess)',
   'Xadrez online — Lichess (open-source AGPL).',
   'Lichess: plataforma de xadrez completamente gratuita e open-source (AGPL-3.0). Sem ads, sem premium.',
   'Crown','#22c55e','games','open_source','weblink',
   'https://lichess.org/','https://lichess.org/',
   'AGPL-3.0','Lichess',
   false,true,false,true,false,
   ARRAY['estrategia','classico'],640),

  ('game-minesweeper','game-minesweeper','Campo Minado',
   'Minesweeper classico no browser.',
   'Implementacao do Campo Minado em HTML5/JS, open-source.',
   'Bomb','#ef4444','games','open_source','weblink',
   'https://minesweeper.online/','https://minesweeper.online/',
   'Free-to-play','Minesweeper Online',
   false,true,false,true,false,
   ARRAY['puzzle','classico'],650),

  ('game-sudoku','game-sudoku','Sudoku',
   'Sudoku diario — preencha a grade 9x9 sem repetir numeros.',
   'Sudoku.com versao web — quebra-cabeca logico classico.',
   'Grid3x3','#3b82f6','games','open_source','weblink',
   'https://sudoku.com/','https://sudoku.com/',
   'Free-to-play (dominio publico)','Sudoku.com',
   false,true,false,true,false,
   ARRAY['puzzle','logica'],660),

  ('game-wordle','game-wordle','Wordle (open-source)',
   'Adivinhe a palavra de 5 letras em 6 tentativas.',
   'Reactle: clone open-source (MIT) do Wordle, com logica identica ao original. Em ingles.',
   'Tag','#6aaa64','games','open_source','weblink',
   'https://reactle.vercel.app/','https://reactle.vercel.app/',
   'MIT (cwackerfuss/react-wordle)','cwackerfuss',
   false,true,false,true,false,
   ARRAY['palavras','puzzle','diario'],670),

  ('game-asteroids','game-asteroids','Asteroids',
   'Asteroids classico — destrua asteroides em uma nave triangular.',
   'Implementacao open-source do classico Asteroids da Atari (1979).',
   'Zap','#facc15','games','open_source','weblink',
   'https://freeasteroids.org/','https://freeasteroids.org/',
   'Free (clone publico)','Free Asteroids',
   false,true,false,true,false,
   ARRAY['arcade','retro','espaco'],680),

  ('game-pacman','game-pacman','Pac-Man (clone)',
   'Pac-Man jogavel em HTML5 — clone open-source.',
   'Clone de Pac-Man em JavaScript, jogavel no browser. (Marca Pac-Man eh da Bandai Namco; este eh um clone aberto educacional.)',
   'Puzzle','#fde047','games','open_source','weblink',
   'https://www.google.com/logos/2010/pacman10-i.html',
   'https://www.google.com/logos/2010/pacman10-i.html',
   'Free (clone educacional)','Google Doodle',
   false,true,false,true,false,
   ARRAY['arcade','retro'],690)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE kernel.app_registry IS
  'Sprint 21: catalogo central de apps. Global (sem company_id). Apps nativos resolvem componente via COMPONENT_MAP em codigo; iframe/weblink usam entry_url. Seedado em 20260504000006 com 31 nativos + 22 externos.';
