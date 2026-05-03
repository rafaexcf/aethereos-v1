// ADR-0024: Magic Store é launcher e catálogo de apps disponíveis na Camada 1.
// Inclui verticais standalone (Camada 2 via URL externa), apps internos do OS,
// links de IA, jogos open-source e utilitários. Persistência de "instalados"
// vive em kernel.company_modules (RLS por company_id).

export type MagicStoreCategory =
  | "all"
  | "vertical"
  | "optional"
  | "ai"
  | "productivity"
  | "games"
  | "utilities"
  | "puter"
  | "beta"
  | "coming_soon"
  | "installed";

export type MagicStoreSourceType = "internal" | "iframe" | "weblink";

export interface MagicStoreSource {
  type: MagicStoreSourceType;
  target: string;
}

export interface MagicStoreApp {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: Exclude<
    MagicStoreCategory,
    "all" | "beta" | "coming_soon" | "installed"
  >;
  type: "standalone" | "module";
  source: MagicStoreSource;
  externalUrl?: string;
  moduleKey?: string;
  status: "available" | "coming_soon" | "beta";
  license: string;
  offlineCapable: boolean;
  installable: boolean;
  requiresPro?: boolean;
  tags: string[];
}

export const MAGIC_STORE_CATALOG: MagicStoreApp[] = [
  // ─── Verticais B2B (Camada 2 standalone) ───────────────────────────────
  {
    id: "comercio-digital",
    name: "Comércio Digital",
    description:
      "Catálogo, cotações e vendas online B2B com fiscais integrados.",
    longDescription:
      "App standalone para gestão completa de comércio B2B: catálogo de produtos com NCM, cotações, pedidos de venda, NF-e, integrações com transportadoras. Requer aprovação da plataforma para ativação.",
    icon: "ShoppingCart",
    color: "#f0fc05",
    category: "vertical",
    type: "standalone",
    source: {
      type: "weblink",
      target:
        import.meta.env["VITE_COMERCIO_DIGITAL_URL"] ??
        "https://comercio.aethereos.io",
    },
    externalUrl:
      import.meta.env["VITE_COMERCIO_DIGITAL_URL"] ??
      "https://comercio.aethereos.io",
    status: "beta",
    license: "Proprietário (Aethereos)",
    offlineCapable: false,
    installable: true,
    requiresPro: true,
    tags: ["vendas", "fiscal", "ncm", "nfe"],
  },
  {
    id: "logitix",
    name: "LOGITIX",
    description:
      "Logística, fretes, transportadoras e rastreamento de entregas.",
    longDescription:
      "Plataforma de gestão logística: cotação de fretes, integração com transportadoras, rastreamento em tempo real, romaneios e gestão de ocorrências.",
    icon: "Truck",
    color: "#059669",
    category: "vertical",
    type: "standalone",
    source: {
      type: "weblink",
      target:
        import.meta.env["VITE_LOGITIX_URL"] ?? "https://logitix.aethereos.io",
    },
    externalUrl:
      import.meta.env["VITE_LOGITIX_URL"] ?? "https://logitix.aethereos.io",
    status: "coming_soon",
    license: "Proprietário (Aethereos)",
    offlineCapable: false,
    installable: false,
    requiresPro: true,
    tags: ["logística", "fretes", "transporte"],
  },
  {
    id: "erp",
    name: "ERP",
    description: "Gestão financeira, fiscal e contábil para sua empresa.",
    longDescription:
      "ERP completo: contas a pagar e receber, fluxo de caixa, DRE, gestão fiscal (SPED, NFe, CTe), integração contábil e relatórios gerenciais.",
    icon: "BarChart3",
    color: "#7c3aed",
    category: "vertical",
    type: "standalone",
    source: {
      type: "weblink",
      target: import.meta.env["VITE_ERP_URL"] ?? "https://erp.aethereos.io",
    },
    externalUrl: import.meta.env["VITE_ERP_URL"] ?? "https://erp.aethereos.io",
    status: "coming_soon",
    license: "Proprietário (Aethereos)",
    offlineCapable: false,
    installable: false,
    requiresPro: true,
    tags: ["financeiro", "fiscal", "contábil"],
  },
  {
    id: "kwix",
    name: "Kwix CRM",
    description: "CRM de vendas, pipeline e gestão de oportunidades.",
    longDescription:
      "CRM focado em vendas B2B: pipeline Kanban, gestão de oportunidades, acompanhamento de propostas e métricas de conversão.",
    icon: "TrendingUp",
    color: "#f97316",
    category: "vertical",
    type: "standalone",
    source: {
      type: "weblink",
      target: import.meta.env["VITE_KWIX_URL"] ?? "https://kwix.aethereos.io",
    },
    externalUrl:
      import.meta.env["VITE_KWIX_URL"] ?? "https://kwix.aethereos.io",
    status: "coming_soon",
    license: "Proprietário (Aethereos)",
    offlineCapable: false,
    installable: false,
    requiresPro: true,
    tags: ["crm", "vendas", "pipeline"],
  },
  {
    id: "autergon",
    name: "Autergon",
    description: "Automações, workflows e integrações entre sistemas.",
    longDescription:
      "Plataforma de automação de processos: triggers, ações condicionais, webhooks, integração com APIs externas e orquestração de workflows.",
    icon: "Zap",
    color: "#8b5cf6",
    category: "vertical",
    type: "standalone",
    source: {
      type: "weblink",
      target:
        import.meta.env["VITE_AUTERGON_URL"] ?? "https://autergon.aethereos.io",
    },
    externalUrl:
      import.meta.env["VITE_AUTERGON_URL"] ?? "https://autergon.aethereos.io",
    status: "coming_soon",
    license: "Proprietário (Aethereos)",
    offlineCapable: false,
    installable: false,
    requiresPro: true,
    tags: ["automação", "workflows", "integrações"],
  },

  // ─── Inteligência Artificial (weblinks — provedores bloqueiam iframe) ──
  {
    id: "ai-claude",
    name: "Claude",
    description: "Assistente de IA da Anthropic — raciocínio longo e código.",
    longDescription:
      "Claude é o assistente de IA da Anthropic com janela de contexto ampla, ótimo desempenho em raciocínio complexo, escrita e código. Abre em nova aba — claude.ai bloqueia incorporação direta por X-Frame-Options.",
    icon: "Sparkles",
    color: "#d97706",
    category: "ai",
    type: "standalone",
    source: { type: "weblink", target: "https://claude.ai" },
    status: "available",
    license: "Serviço de terceiros (Anthropic)",
    offlineCapable: false,
    installable: true,
    tags: ["ia", "assistente", "anthropic"],
  },
  {
    id: "ai-chatgpt",
    name: "ChatGPT",
    description: "Assistente de IA da OpenAI — GPT-4 e modelos multimodais.",
    longDescription:
      "ChatGPT da OpenAI: chat conversacional, geração de imagens DALL·E, navegação web, análise de arquivos. Abre em nova aba (provedor bloqueia iframe).",
    icon: "MessageSquare",
    color: "#10a37f",
    category: "ai",
    type: "standalone",
    source: { type: "weblink", target: "https://chat.openai.com" },
    status: "available",
    license: "Serviço de terceiros (OpenAI)",
    offlineCapable: false,
    installable: true,
    tags: ["ia", "openai", "gpt"],
  },
  {
    id: "ai-gemini",
    name: "Gemini",
    description: "IA multimodal do Google — Gemini 1.5 Pro com 1M de contexto.",
    longDescription:
      "Gemini do Google: modelo multimodal nativo (texto, imagem, áudio, vídeo), integração com Google Workspace. Abre em nova aba.",
    icon: "Sparkles",
    color: "#4285f4",
    category: "ai",
    type: "standalone",
    source: { type: "weblink", target: "https://gemini.google.com" },
    status: "available",
    license: "Serviço de terceiros (Google)",
    offlineCapable: false,
    installable: true,
    tags: ["ia", "google", "multimodal"],
  },
  {
    id: "ai-perplexity",
    name: "Perplexity",
    description: "Motor de busca conversacional com citações em tempo real.",
    longDescription:
      "Perplexity AI: respostas baseadas em busca em tempo real com citações de fontes. Excelente para pesquisa rápida e factual. Abre em nova aba.",
    icon: "Search",
    color: "#1fb8cd",
    category: "ai",
    type: "standalone",
    source: { type: "weblink", target: "https://www.perplexity.ai" },
    status: "available",
    license: "Serviço de terceiros (Perplexity)",
    offlineCapable: false,
    installable: true,
    tags: ["ia", "busca", "pesquisa"],
  },
  {
    id: "ai-huggingchat",
    name: "HuggingChat",
    description: "Chat aberto com modelos da comunidade Hugging Face.",
    longDescription:
      "HuggingChat hospeda modelos open-source (Llama, Mistral, Command R+, etc.) sem necessidade de chave de API. Bom para experimentação. Abre em nova aba.",
    icon: "Bot",
    color: "#ffd21e",
    category: "ai",
    type: "standalone",
    source: { type: "weblink", target: "https://huggingface.co/chat" },
    status: "available",
    license: "Open-source (Apache-2.0 — modelos variam)",
    offlineCapable: false,
    installable: true,
    tags: ["ia", "open-source", "huggingface"],
  },

  // ─── Puter (OS web open-source) ────────────────────────────────────────
  {
    id: "puter-os",
    name: "Puter",
    description: "OS web open-source com Drive, terminal e apps gratuitos.",
    longDescription:
      "Puter é um sistema operacional inteiro que roda no navegador — gratuito, open-source (AGPL-3.0) e privado. Inclui Drive, terminal, editor, browser de apps. Abre em nova aba (puter.com gerencia próprio domínio e auth).",
    icon: "Globe",
    color: "#3b82f6",
    category: "puter",
    type: "standalone",
    source: { type: "weblink", target: "https://puter.com" },
    status: "available",
    license: "AGPL-3.0",
    offlineCapable: false,
    installable: true,
    tags: ["os", "open-source", "drive", "terminal"],
  },

  // ─── Apps internos do OS (já fazem parte do shell, "install" registra
  //     visibilidade no launcher da company) ───────────────────────────────
  {
    id: "calculadora",
    name: "Calculadora",
    description: "Calculadora científica com histórico — embarcada no OS.",
    longDescription:
      "Calculadora padrão do Aethereos OS, com modo científico, histórico e atalhos de teclado. App nativo do shell, totalmente offline.",
    icon: "Calculator",
    color: "#f97316",
    category: "productivity",
    type: "module",
    source: { type: "internal", target: "calculadora" },
    moduleKey: "calculadora",
    status: "available",
    license: "BUSL-1.1 (Aethereos)",
    offlineCapable: true,
    installable: true,
    tags: ["produtividade", "matemática"],
  },
  {
    id: "bloco-de-notas",
    name: "Bloco de Notas",
    description: "Notas rápidas com etiquetas, busca e sincronização.",
    longDescription:
      "Bloco de Notas do OS: edição em texto rico, etiquetas coloridas, busca instantânea e sincronização multi-dispositivo via kernel.notes.",
    icon: "StickyNote",
    color: "#f59e0b",
    category: "productivity",
    type: "module",
    source: { type: "internal", target: "bloco-de-notas" },
    moduleKey: "bloco-de-notas",
    status: "available",
    license: "BUSL-1.1 (Aethereos)",
    offlineCapable: true,
    installable: true,
    tags: ["produtividade", "notas"],
  },
  {
    id: "kanban",
    name: "Kanban",
    description: "Quadros Kanban para gestão visual de tarefas.",
    longDescription:
      "Quadros Kanban com colunas customizáveis, cards arrastáveis e etiquetas. Multi-tenant via RLS por company_id.",
    icon: "Kanban",
    color: "#6366f1",
    category: "productivity",
    type: "module",
    source: { type: "internal", target: "kanban" },
    moduleKey: "kanban",
    status: "available",
    license: "BUSL-1.1 (Aethereos)",
    offlineCapable: true,
    installable: true,
    tags: ["produtividade", "tarefas", "agile"],
  },
  {
    id: "calendar",
    name: "Calendário",
    description:
      "Agenda visual com eventos, lembretes e múltiplos calendários.",
    longDescription:
      "Calendário do OS com visualizações mês/semana/dia, eventos com lembretes, calendários coloridos por categoria.",
    icon: "CalendarDays",
    color: "#8b5cf6",
    category: "productivity",
    type: "module",
    source: { type: "internal", target: "calendar" },
    moduleKey: "calendar",
    status: "available",
    license: "BUSL-1.1 (Aethereos)",
    offlineCapable: true,
    installable: true,
    tags: ["produtividade", "agenda", "calendário"],
  },

  // ─── Utilitários ───────────────────────────────────────────────────────
  {
    id: "weather",
    name: "Tempo",
    description: "Previsão do tempo com geolocalização — Open-Meteo.",
    longDescription:
      "Widget de tempo usando Open-Meteo (API aberta, sem chave). Mostra condições atuais e previsão de 7 dias.",
    icon: "CloudSun",
    color: "#60a5fa",
    category: "utilities",
    type: "module",
    source: { type: "internal", target: "weather" },
    moduleKey: "weather",
    status: "available",
    license: "BUSL-1.1 (Aethereos) + Open-Meteo (CC-BY 4.0)",
    offlineCapable: false,
    installable: true,
    tags: ["clima", "tempo", "open-meteo"],
  },
  {
    id: "navegador",
    name: "Navegador",
    description: "Mini-navegador embarcado para abrir links sem sair do OS.",
    longDescription:
      "Navegador interno em iframe para abrir páginas externas sem perder o contexto do OS. Respeita políticas X-Frame-Options dos sites.",
    icon: "Globe",
    color: "#0ea5e9",
    category: "utilities",
    type: "module",
    source: { type: "internal", target: "navegador" },
    moduleKey: "navegador",
    status: "available",
    license: "BUSL-1.1 (Aethereos)",
    offlineCapable: true,
    installable: true,
    tags: ["navegador", "browser"],
  },

  // ─── Jogos open-source / domínio público ──────────────────────────────
  // Todos como "weblink" — abrir em nova aba evita iframe quebrado por
  // X-Frame-Options/CSP de hosts externos. URLs apontam para implementações
  // notórias com licença MIT/Apache/CC ou domínio público.
  {
    id: "game-2048",
    name: "2048",
    description: "Clássico puzzle de tiles — combine números até 2048.",
    longDescription:
      "Implementação original de Gabriele Cirulli (MIT). 2048 é um quebra-cabeças onde você desliza tiles numéricos para combinar pares iguais até alcançar o tile 2048.",
    icon: "Grid3x3",
    color: "#edc22e",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://play2048.co/" },
    status: "available",
    license: "MIT (Gabriele Cirulli)",
    offlineCapable: true,
    installable: true,
    tags: ["puzzle", "single-player", "open-source"],
  },
  {
    id: "game-tetris",
    name: "Tetris (open-source)",
    description: "Encaixe tetraminós antes que a tela encha.",
    longDescription:
      "Implementação open-source de Tetris, jogabilidade clássica com peças tetraminós. (Marca Tetris® é da The Tetris Company; este é um clone livre).",
    icon: "Layers",
    color: "#a855f7",
    category: "games",
    type: "standalone",
    source: {
      type: "weblink",
      target: "https://chvin.github.io/react-tetris/",
    },
    status: "available",
    license: "MIT (chvin/react-tetris)",
    offlineCapable: false,
    installable: true,
    tags: ["puzzle", "arcade", "open-source"],
  },
  {
    id: "game-snake",
    name: "Snake",
    description: "Cobrinha clássica — coma maçãs e cresça sem se morder.",
    longDescription:
      "Versão open-source do clássico Snake. Controles WASD/setas; coma frutas para crescer e evitar colisões.",
    icon: "Zap",
    color: "#22c55e",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://patorjk.com/games/snake/" },
    status: "available",
    license: "MIT (Patrick Gillespie)",
    offlineCapable: true,
    installable: true,
    tags: ["arcade", "single-player", "retro"],
  },
  {
    id: "game-tic-tac-toe",
    name: "Jogo da Velha",
    description: "Jogo da velha clássico para dois jogadores.",
    longDescription:
      "Tic-Tac-Toe — domínio público. Implementações abertas estão em diversos repositórios; abre o tutorial oficial do React (interativo e jogável).",
    icon: "LayoutGrid",
    color: "#06b6d4",
    category: "games",
    type: "standalone",
    source: {
      type: "weblink",
      target: "https://react.dev/learn/tutorial-tic-tac-toe",
    },
    status: "available",
    license: "Domínio público / CC-BY-4.0 (React docs)",
    offlineCapable: true,
    installable: true,
    tags: ["puzzle", "multi-player", "domínio-público"],
  },
  {
    id: "game-chess",
    name: "Lichess",
    description: "Servidor de xadrez open-source, sem anúncios e gratuito.",
    longDescription:
      "Lichess.org é o maior servidor de xadrez open-source do mundo (AGPL-3.0). Jogue contra humanos, IA, faça puzzles e aprenda táticas.",
    icon: "Building2",
    color: "#769656",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://lichess.org" },
    status: "available",
    license: "AGPL-3.0",
    offlineCapable: false,
    installable: true,
    tags: ["board", "estratégia", "open-source"],
  },
  {
    id: "game-minesweeper",
    name: "Minesweeper",
    description:
      "Caça-Minas clássico — descubra células sem explodir as minas.",
    longDescription:
      "Implementação aberta de Minesweeper (Caça-Minas). Marque minas com flags e revele todas as células seguras para vencer.",
    icon: "Package",
    color: "#ef4444",
    category: "games",
    type: "standalone",
    source: {
      type: "weblink",
      target: "https://minesweeper.online/",
    },
    status: "available",
    license: "Free-to-play (jogo clássico de domínio público)",
    offlineCapable: false,
    installable: true,
    tags: ["puzzle", "lógica", "single-player"],
  },
  {
    id: "game-sudoku",
    name: "Sudoku",
    description: "Sudoku diário — preencha a grade 9×9 sem repetir números.",
    longDescription:
      "Sudoku.com versão web — quebra-cabeça lógico clássico. Várias dificuldades, dicas e modo diário.",
    icon: "Grid3x3",
    color: "#3b82f6",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://sudoku.com/" },
    status: "available",
    license: "Free-to-play (Sudoku é de domínio público)",
    offlineCapable: false,
    installable: true,
    tags: ["puzzle", "lógica"],
  },
  {
    id: "game-wordle",
    name: "Wordle (open-source)",
    description: "Adivinhe a palavra de 5 letras em 6 tentativas.",
    longDescription:
      "Reactle: clone open-source (MIT) do Wordle, com lógica idêntica ao original. Em inglês.",
    icon: "Tag",
    color: "#6aaa64",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://reactle.vercel.app/" },
    status: "available",
    license: "MIT (cwackerfuss/react-wordle)",
    offlineCapable: false,
    installable: true,
    tags: ["palavras", "puzzle", "diário"],
  },
  {
    id: "game-asteroids",
    name: "Asteroids",
    description:
      "Asteroids clássico — destrua asteroides em uma nave triangular.",
    longDescription:
      "Implementação open-source do clássico Asteroids da Atari (1979). Controles por teclado, gráficos vetoriais.",
    icon: "Zap",
    color: "#facc15",
    category: "games",
    type: "standalone",
    source: {
      type: "weblink",
      target: "https://freeasteroids.org/",
    },
    status: "available",
    license: "Free (clone público; Asteroids™ é da Atari)",
    offlineCapable: false,
    installable: true,
    tags: ["arcade", "retro", "espaço"],
  },
  {
    id: "game-pacman",
    name: "Pac-Man (clone)",
    description: "Pac-Man jogável em HTML5 — clone open-source.",
    longDescription:
      "Clone de Pac-Man em JavaScript, jogável no browser. (Marca Pac-Man™ é da Bandai Namco; este é um clone aberto para fins educacionais.)",
    icon: "Puzzle",
    color: "#fde047",
    category: "games",
    type: "standalone",
    source: { type: "weblink", target: "https://pacman.platzh1rsch.ch/" },
    status: "available",
    license: "Open-source (clone)",
    offlineCapable: false,
    installable: true,
    tags: ["arcade", "retro"],
  },
];

export function filterCatalog(
  catalog: MagicStoreApp[],
  category: MagicStoreCategory,
  installedIds?: ReadonlySet<string>,
): MagicStoreApp[] {
  if (category === "all") return catalog;
  if (category === "beta") return catalog.filter((a) => a.status === "beta");
  if (category === "coming_soon")
    return catalog.filter((a) => a.status === "coming_soon");
  if (category === "installed") {
    if (installedIds === undefined) return [];
    return catalog.filter((a) => installedIds.has(a.id));
  }
  return catalog.filter((a) => a.category === category);
}

export function searchCatalog(
  catalog: MagicStoreApp[],
  query: string,
): MagicStoreApp[] {
  const q = query.trim().toLowerCase();
  if (q === "") return catalog;
  return catalog.filter((a) => {
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.description.toLowerCase().includes(q)) return true;
    if (a.tags.some((t) => t.toLowerCase().includes(q))) return true;
    return false;
  });
}
