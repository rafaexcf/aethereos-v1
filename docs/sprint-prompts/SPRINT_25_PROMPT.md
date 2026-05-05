# SPRINT 25 — Catálogo Open Source: Registrar 80+ Apps e Jogos na Magic Store

> **Objetivo:** Registrar ~80 apps e jogos open-source no kernel.app_registry como iframe ou weblink. Validar quais URLs aceitam iframe. Apps que aceitam viram iframe (abrem dentro do shell). Apps que bloqueiam viram weblink (abrem em nova aba). Catalogo imediatamente disponivel na Magic Store.
> **NAO inclui:** self-hosted apps, Developer Console, monetizacao, features novas.
> **Estimativa:** 3-5 horas. Custo: $20-35.

---

## CONTEXTO INICIAL OBRIGATORIO

Voce e Claude Code em ~/Projetos/aethereos.

### Leituras obrigatorias antes de tocar em codigo

1. CLAUDE.md
2. SPRINT_LOG.md — confirmar Sprint 24 documentado
3. git log --oneline -5 — confirmar HEAD
4. kernel.app_registry — schema atual (id, slug, name, description, icon, color, category, app_type, entry_mode, entry_url, status, etc.)
5. apps/shell-commercial/src/components/os/IframeAppFrame.tsx — como iframes sao renderizados
6. Quantos apps ja existem: SELECT count(\*) FROM kernel.app_registry;

### Estado atual

- 52 apps nativos ja registrados no app_registry
- IframeAppFrame funciona com sandbox (allow-scripts allow-same-origin allow-popups allow-forms)
- Magic Store le do banco via appRegistryStore
- Apps iframe abrem como tab no shell
- Apps weblink abrem em nova aba via window.open()

---

## MILESTONES

### MX136 — Validar quais URLs aceitam iframe

O que fazer:

1. Criar script temporario tools/validate-iframe.ts (ou .mjs) que:
   - Recebe lista de URLs
   - Para cada URL: faz HEAD request e verifica headers X-Frame-Options e Content-Security-Policy frame-ancestors
   - Se X-Frame-Options: DENY ou SAMEORIGIN → weblink
   - Se CSP frame-ancestors: 'self' ou 'none' → weblink
   - Se nenhum bloqueio → iframe (provavelmente funciona)
   - Resultado: JSON com { url, mode: 'iframe' | 'weblink', reason }

2. Testar as seguintes URLs (lista completa abaixo). Registrar resultado.

3. Se o script nao conseguir detectar headers (CORS block no HEAD), marcar como 'weblink' por seguranca e testar manualmente os mais importantes.

4. NAO gastar mais de 1h nessa validacao. Se muitas URLs forem incertas, default para weblink.

Lista de URLs para validar:

- https://excalidraw.com
- https://app.diagrams.net
- https://www.tldraw.com
- https://stackedit.io/app
- https://mermaid.live
- https://markmap.js.org/repl
- https://hoppscotch.io
- https://editor.swagger.io
- https://jsoncrack.com/editor
- https://jsonhero.io
- https://gchq.github.io/CyberChef
- https://it-tools.tech
- https://squoosh.app
- https://jakearchibald.github.io/svgomg/
- https://viliusle.github.io/miniPaint/
- https://audiomass.co
- https://www.sharedrop.io
- https://snapdrop.net
- https://monkeytype.com
- https://play2048.co
- https://hexgl.bkcore.com
- https://hextris.io
- https://lichess.org
- https://openscope.co
- https://www.photopea.com
- https://studio.polotno.com
- https://sqlime.org
- https://webhook.site
- https://regex101.com
- https://vscode.dev
- https://app.affine.pro
- https://pomofocus.io
- https://loremipsum.io

Criterio de aceite: Lista de URLs com modo validado (iframe ou weblink).

Commit: chore(tools): iframe validation script + results (MX136)

---

### MX137 — Migration seed: registrar todos os apps

O que fazer:

1. Criar migration (ou seed SQL) que insere os apps no kernel.app_registry.

2. IMPORTANTE: usar INSERT ... ON CONFLICT (id) DO NOTHING para nao duplicar com os 52 existentes.

3. Categorias a usar (devem existir no CHECK constraint do app_registry — verificar e adicionar se necessario):
   - productivity
   - dev-tools
   - design
   - ai
   - utilities
   - games
   - data

   Se o CHECK constraint atual nao aceita essas categorias, ALTER TABLE para adicionar.

4. Para CADA app, inserir com os campos:
   - id: slug unico (ex: excalidraw, draw-io, hoppscotch)
   - slug: mesmo que id
   - name: nome do app
   - description: descricao curta (1 linha)
   - long_description: descricao mais detalhada (2-3 linhas)
   - icon: nome do icone Lucide mais proximo (Pencil, Code, Gamepad2, etc.)
   - color: cor hex tematica
   - category: uma das categorias acima
   - app_type: 'open_source' para open source, 'embedded_external' para proprietarios
   - entry_mode: 'iframe' ou 'weblink' (baseado no resultado do MX136)
   - entry_url: URL do app
   - external_url: mesma URL (para link "Visitar site")
   - version: '1.0.0'
   - status: 'published'
   - pricing_model: 'free'
   - license: 'MIT', 'Apache-2.0', 'GPL-3.0', etc.
   - developer_name: nome do projeto/empresa
   - show_in_dock: false (apps externos nao vao pro Dock por default)
   - closeable: true
   - has_internal_nav: false
   - always_enabled: false
   - installable: true
   - tags: ARRAY de tags relevantes
   - sort_order: 200+ (depois dos nativos)

5. Lista completa de apps a registrar (EXCLUINDO self-hosted):

--- PRODUTIVIDADE ---
excalidraw | Excalidraw | Whiteboard colaborativo | https://excalidraw.com | MIT | Pencil | #6c5ce7
draw-io | draw.io | Editor de diagramas | https://app.diagrams.net | Apache-2.0 | GitBranch | #f09819
tldraw | Tldraw | Canvas infinito para desenho | https://www.tldraw.com | Apache-2.0 | PenTool | #1e90ff
affine | AFFiNE | Workspace Notion + Miro open source | https://app.affine.pro | MIT | Layout | #5b57d1
stackedit | StackEdit | Editor Markdown com preview | https://stackedit.io/app | Apache-2.0 | FileText | #0288d1
mermaid-live | Mermaid Live | Editor de diagramas como codigo | https://mermaid.live | MIT | GitBranch | #ff6f61
markmap | Markmap | Mapas mentais de Markdown | https://markmap.js.org/repl | MIT | Network | #10ac84
cal-com | Cal.com | Agendamento de reunioes | https://cal.com | AGPL-3.0 | Calendar | #292929
rallly | Rallly | Enquetes de agendamento | https://rallly.co | AGPL-3.0 | CalendarCheck | #4f46e5

--- DESIGN & MIDIA ---
photopea | Photopea | Photoshop no browser | https://www.photopea.com | Proprietario | Image | #18a497
squoosh | Squoosh | Compressor de imagens (Google) | https://squoosh.app | Apache-2.0 | ImageDown | #ff6347
svgomg | SVGOMG | Otimizador SVG | https://jakearchibald.github.io/svgomg/ | MIT | FileImage | #ffb13b
minipaint | MiniPaint | Editor de imagens web | https://viliusle.github.io/miniPaint/ | MIT | Paintbrush | #2196f3
polotno | Polotno Studio | Editor de designs canvas | https://studio.polotno.com | MIT | Palette | #8b5cf6
audiomass | AudioMass | Editor de audio no browser | https://audiomass.co | MIT | Music | #e91e63
slidev | Slidev | Apresentacoes como codigo | https://sli.dev | MIT | Presentation | #2b90b6
canva | Canva | Design tool | https://www.canva.com | Proprietario | Palette | #00c4cc
figma | Figma | Design & prototipagem | https://www.figma.com | Proprietario | Figma | #f24e1e

--- IA ---
claude | Claude | Assistente IA Anthropic | https://claude.ai | Proprietario | Bot | #d4a574
chatgpt | ChatGPT | Assistente IA OpenAI | https://chat.openai.com | Proprietario | Bot | #10a37f
gemini | Gemini | Assistente IA Google | https://gemini.google.com | Proprietario | Sparkles | #4285f4
perplexity | Perplexity | Search com AI | https://www.perplexity.ai | Proprietario | Search | #20808d
huggingchat | HuggingChat | Chat com modelos open source | https://huggingface.co/chat | Apache-2.0 | Bot | #ff9d00
puter-ai | Puter AI | IA gratuita via Puter | https://puter.com | AGPL-3.0 | Cpu | #3b82f6
poe | Poe | Agregador de bots IA | https://poe.com | Proprietario | MessageCircle | #6c63ff
copilot | Microsoft Copilot | IA da Microsoft | https://copilot.microsoft.com | Proprietario | Bot | #0078d4
grok | Grok | IA do X/Twitter | https://grok.x.ai | Proprietario | Zap | #1da1f2

--- UTILIDADES ---
sharedrop | ShareDrop | Transferencia de arquivos P2P | https://www.sharedrop.io | MIT | Share2 | #3498db
monkeytype | MonkeyType | Teste de velocidade digitacao | https://monkeytype.com | GPL-3.0 | Keyboard | #e2b714
pomofocus | Pomofocus | Timer Pomodoro | https://pomofocus.io | Proprietario | Timer | #d95550
lorem-ipsum | Lorem Ipsum | Gerador de texto placeholder | https://loremipsum.io | Proprietario | Text | #64748b
speedtest | SpeedTest | Teste de velocidade internet | https://fast.com | Proprietario | Wifi | #e50914
qrcode-gen | QR Code Generator | Gerador de QR Code | https://www.qrcode-monkey.com | Proprietario | QrCode | #000000
color-hunt | Color Hunt | Paletas de cores | https://colorhunt.co | Proprietario | Palette | #ff6b6b
emojipedia | Emojipedia | Enciclopedia de emojis | https://emojipedia.org | Proprietario | Smile | #ffcc33
removebg | Remove.bg | Remover fundo de imagens | https://www.remove.bg | Proprietario | Eraser | #1460ff
tinypng | TinyPNG | Compressor de PNG/JPEG | https://tinypng.com | Proprietario | FileImage | #a5ce3a
temp-mail | Temp Mail | Email temporario | https://temp-mail.org | Proprietario | Mail | #1a73e8

--- JOGOS ---
game-2048 | 2048 | Puzzle numerico classico | https://play2048.co | MIT | Grid3x3 | #edc22e
game-hexgl | HexGL | Corrida futurista 3D WebGL | https://hexgl.bkcore.com | MIT | Rocket | #00ff88
game-hextris | Hextris | Tetris hexagonal | https://hextris.io | GPL-3.0 | Hexagon | #e91e63
game-lichess | Lichess | Xadrez online | https://lichess.org | AGPL-3.0 | Crown | #fff
game-openscope | OpenScope ATC | Simulador controle aereo | https://openscope.co | MIT | Plane | #1e90ff
game-pacman | Pacman HTML5 | Pac-Man classico | https://passer-by.com/pacman/ | MIT | Ghost | #ffeb3b
game-chess | Chess.com | Xadrez online | https://www.chess.com | Proprietario | Crown | #769656
game-wordle | Wordle | Jogo de palavras diario | https://www.nytimes.com/games/wordle | Proprietario | LetterText | #6aaa64
game-sudoku | Sudoku Web | Sudoku classico | https://sudoku.com | Proprietario | Grid3x3 | #344861
game-crossword | Crossword | Palavras cruzadas | https://www.nytimes.com/crosswords | Proprietario | LetterText | #121212
game-minesweeper | Minesweeper | Campo minado online | https://minesweeper.online | Proprietario | Bomb | #c0c0c0
game-solitaire | Solitaire | Paciencia classica | https://solitaire.io | Proprietario | Club | #006600
game-snake-io | Slither.io | Snake multiplayer | https://slither.io | Proprietario | Bug | #4ade80
game-agar | Agar.io | Celulas multiplayer | https://agar.io | Proprietario | Circle | #22d3ee
game-geoguessr | GeoGuessr | Quiz geografico | https://www.geoguessr.com | Proprietario | MapPin | #2ea840

Criterio de aceite: 80+ apps inseridos no app_registry. SELECT count(\*) retorna 130+.

Commit: feat(seed): register 80+ open source apps and games in app_registry (MX137)

---

### MX138 — Atualizar categorias da Magic Store

O que fazer:

1. Se o CHECK constraint de category no app_registry nao inclui as novas categorias (dev-tools, design, ai, data, games), ALTER TABLE para adicionar.

2. No MagicStoreApp, atualizar SIDEBAR_CONFIGS para incluir as novas categorias:
   - Dev Tools (icone Code)
   - Design & Midia (icone Palette)
   - IA (icone Bot)
   - Dados & BI (icone BarChart3)
   - Jogos (icone Gamepad2)

3. Verificar que os filtros da sidebar funcionam com as novas categorias.

4. A StoreFrontPage (homepage) deve mostrar carrosseis das novas categorias.

Criterio de aceite: Magic Store mostra apps organizados nas novas categorias. Filtros funcionam.

Commit: feat(magic-store): add new categories for open source catalog (MX138)

---

### MX139 — Instalar modulos padrao para companies existentes

O que fazer:

1. Os apps novos nao devem ser auto-instalados (sao opcionais).

2. Verificar que apps existentes (dos 52 nativos) continuam instalados para companies existentes.

3. O fluxo de install na Magic Store funciona: usuario clica Instalar → INSERT em company_modules → app aparece no Dock/Mesa.

4. Para os apps open source, o botao Abrir:
   - Se entry_mode=iframe: abre como tab com IframeAppFrame
   - Se entry_mode=weblink: window.open() em nova aba

5. Testar pelo menos 3 apps iframe e 3 weblinks manualmente (ou via E2E se possivel).

Criterio de aceite: Install/open funciona para apps open source novos.

Commit: feat(magic-store): verify install + open flow for open source apps (MX139)

---

### MX140 — Testes + documentacao

O que fazer:

1. Rodar suite E2E completa:
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Resultado esperado: 33+ passed, 0 failed. Nenhum E2E quebrado.

3. Atualizar SPRINT_LOG.md com Sprint 25.

4. Commitar o catalogo AETHEREOS_OPEN_SOURCE_APPS_CATALOG.md na raiz do repo como referencia.

Criterio de aceite: Testes passam, docs atualizados.

Commit: docs: sprint 25 — open source apps catalog (MX140)

---

## REGRAS INVIOLAVEIS

R1. Commit por milestone com mensagem feat/fix/docs/chore(scope): descricao (MXN).
R2. Milestone so comeca apos anterior ter criterio de aceite e commit.
R3. Apos 3 tentativas de fix de bug especifico, marcar BLOQUEADO, registrar, pular.
R4. Antes de cada commit: pnpm typecheck && pnpm lint.
R5. Nao execute fora de ~/Projetos/aethereos.
R6. NAO quebrar os 33+ E2E existentes.
R7. Apps que bloqueiam iframe (X-Frame-Options DENY/SAMEORIGIN) devem ser registrados como weblink, NAO iframe.
R8. Se na duvida sobre iframe: registrar como weblink (seguro). Usuario pode abrir em nova aba.
R9. Todas as URLs devem ser HTTPS (exceto localhost para dev).
R10. NAO registrar apps que requerem self-host (nao ha infraestrutura para isso agora).
R11. show_in_dock = false para todos os apps externos (so aparecem no Dock se usuario instalar).
R12. sort_order >= 200 para apps open source (nativos ficam primeiro).

---

## TERMINO DO SPRINT

Quando MX140 estiver commitado:

1. Rode o gate final:
   pnpm typecheck && pnpm lint
   set -a; source tooling/e2e/.env.local; set +a
   pnpm test:e2e:full

2. Reporte:
   - Total de apps no registry: \_\_\_
   - Novos apps iframe: \_\_\_
   - Novos apps weblink: \_\_\_
   - E2E: X passed

3. Pare aqui. Nao inicie Sprint 26.

---

## PROMPT DE RETOMADA

Estou retomando Sprint 25 (Catalogo Open Source) no Aethereos.

Antes de qualquer acao:

1. Leia CLAUDE.md
2. Leia SPRINT_LOG.md
3. Rode: git log --oneline -10 && git status
4. Identifique a proxima milestone MX136-MX140 nao concluida
5. Continue a partir dela

Lembrar:

- Registrar ~80 apps (iframe ou weblink) no kernel.app_registry
- Validar headers de iframe antes de registrar
- Novas categorias: dev-tools, design, ai, data, games
- Apps externos tem show_in_dock=false e sort_order >= 200
- INSERT ON CONFLICT DO NOTHING (idempotente)
- 33+ E2E existentes nao podem quebrar

Roadmap em SPRINT_25_PROMPT.md na raiz.
