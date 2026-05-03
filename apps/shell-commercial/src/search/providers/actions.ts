import type { SearchProvider, SearchResult, SearchContext } from "../types";

interface QuickAction {
  keywords: string[];
  result: (ctx: SearchContext) => SearchResult;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    keywords: ["nova nota", "criar nota", "nota", "notas", "bloco", "note"],
    result: (ctx) => ({
      id: "action-new-note",
      type: "action",
      title: "Nova nota",
      subtitle: "Abrir Bloco de Notas",
      icon: "StickyNote",
      iconColor: "#f59e0b",
      action: () => {
        ctx.openApp("bloco-de-notas", "Bloco de Notas");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: [
      "nova tarefa",
      "criar tarefa",
      "tarefa",
      "tarefas",
      "task",
      "todo",
    ],
    result: (ctx) => ({
      id: "action-new-task",
      type: "action",
      title: "Nova tarefa",
      subtitle: "Abrir Tarefas",
      icon: "ListChecks",
      iconColor: "#3b82f6",
      action: () => {
        ctx.openApp("tarefas", "Tarefas");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["calculadora", "calc", "calcular", "calculator", "matemática"],
    result: (ctx) => ({
      id: "action-calculator",
      type: "action",
      title: "Abrir Calculadora",
      subtitle: "App Calculadora",
      icon: "Calculator",
      iconColor: "#f97316",
      action: () => {
        ctx.openApp("calculadora", "Calculadora");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["câmera", "camera", "foto", "fotografia", "gravar vídeo"],
    result: (ctx) => ({
      id: "action-camera",
      type: "action",
      title: "Abrir Câmera",
      subtitle: "App Câmera",
      icon: "Camera",
      iconColor: "#1a1a2e",
      action: () => {
        ctx.openApp("camera", "Câmera");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["gravar voz", "gravador", "microfone", "áudio", "audio"],
    result: (ctx) => ({
      id: "action-voice",
      type: "action",
      title: "Gravar voz",
      subtitle: "App Gravador de Voz",
      icon: "Mic",
      iconColor: "#ef4444",
      action: () => {
        ctx.openApp("gravador-de-voz", "Gravador de Voz");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["novo contato", "contato", "agenda", "telefone", "contatos"],
    result: (ctx) => ({
      id: "action-new-contact",
      type: "action",
      title: "Novo contato",
      subtitle: "Abrir Agenda Telefônica",
      icon: "BookUser",
      iconColor: "#10b981",
      action: () => {
        ctx.openApp("agenda-telefonica", "Agenda Telefônica");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["kanban", "quadro", "board", "projeto"],
    result: (ctx) => ({
      id: "action-kanban",
      type: "action",
      title: "Abrir Kanban",
      subtitle: "App Kanban",
      icon: "Kanban",
      iconColor: "#6366f1",
      action: () => {
        ctx.openApp("kanban", "Kanban");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: [
      "relógio",
      "relogio",
      "cronômetro",
      "timer",
      "alarme",
      "pomodoro",
    ],
    result: (ctx) => ({
      id: "action-clock",
      type: "action",
      title: "Abrir Relógio",
      subtitle: "Cronômetro, Timer, Alarmes, Pomodoro",
      icon: "Clock",
      iconColor: "#6366f1",
      action: () => {
        ctx.openApp("relogio", "Relógio");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["navegador", "browser", "internet", "web", "site", "url"],
    result: (ctx) => ({
      id: "action-browser",
      type: "action",
      title: "Abrir Navegador",
      subtitle: "Navegar na internet",
      icon: "Globe",
      iconColor: "#0ea5e9",
      action: () => {
        ctx.openApp("navegador", "Navegador");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["drive", "arquivos", "arquivo", "files", "upload"],
    result: (ctx) => ({
      id: "action-drive",
      type: "action",
      title: "Abrir Drive",
      subtitle: "Gerenciar arquivos",
      icon: "HardDrive",
      iconColor: "#06b6d4",
      action: () => {
        ctx.openApp("drive", "Drive");
        ctx.closeSearch();
      },
    }),
  },
  {
    keywords: ["configurações", "config", "settings", "preferências"],
    result: (ctx) => ({
      id: "action-settings",
      type: "action",
      title: "Configurações",
      subtitle: "Preferências do sistema",
      icon: "Settings",
      iconColor: "#64748b",
      action: () => {
        ctx.openApp("settings", "Configurações");
        ctx.closeSearch();
      },
    }),
  },
];

export const actionsProvider: SearchProvider = {
  id: "actions",
  label: "Ações rápidas",
  icon: "Zap",
  maxResults: 4,

  async search(query, ctx) {
    if (!query.trim()) {
      // Show default quick actions when query is empty
      return [0, 1, 2, 7]
        .map((i) => QUICK_ACTIONS[i])
        .filter((a): a is (typeof QUICK_ACTIONS)[number] => a !== undefined)
        .map((a) => a.result(ctx));
    }

    const q = query.toLowerCase();
    const matched: SearchResult[] = [];
    for (const action of QUICK_ACTIONS) {
      const matches = action.keywords.some((kw) => {
        const firstWord = kw.split(" ")[0] ?? "";
        return kw.includes(q) || (firstWord !== "" && q.includes(firstWord));
      });
      if (matches) {
        matched.push(action.result(ctx));
        if (matched.length >= 4) break;
      }
    }
    return matched;
  },
};
