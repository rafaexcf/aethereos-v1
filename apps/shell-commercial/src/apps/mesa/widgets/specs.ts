// Sprint 26: catalogo de widgets instalaveis na Mesa.
//
// Cada appId tem 1 widget canonico. defaultSize define o footprint inicial em
// pixels (mesma unidade do MesaItem.size). Manter sizes em multiplos de 20 pra
// alinhar com o grid sutil 90x90 da Mesa.

export interface WidgetSpec {
  appId: string;
  label: string;
  description: string;
  defaultSize: { w: number; h: number };
}

export const WIDGET_SPECS: WidgetSpec[] = [
  {
    appId: "relogio",
    label: "Relógio",
    description: "Hora e data atualizadas em tempo real.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "bloco-de-notas",
    label: "Notas",
    description: "Atalho rápido para suas notas.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "calendar",
    label: "Calendário",
    description: "Mini calendário com o dia atual destacado.",
    defaultSize: { w: 240, h: 240 },
  },
  {
    appId: "weather",
    label: "Clima",
    description: "Temperatura e condição atual.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "kanban",
    label: "Kanban",
    description: "Visão geral dos seus quadros.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "agenda-telefonica",
    label: "Contatos",
    description: "Acesso rápido aos contatos telefônicos.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "tarefas",
    label: "Tarefas",
    description: "Tarefas pendentes do dia.",
    defaultSize: { w: 240, h: 220 },
  },
  {
    appId: "calculadora",
    label: "Calculadora",
    description: "Calculadora rápida na Mesa.",
    defaultSize: { w: 180, h: 180 },
  },
  {
    appId: "gravador-de-voz",
    label: "Gravador de Voz",
    description: "Gravar áudio em um clique.",
    defaultSize: { w: 200, h: 140 },
  },
  {
    appId: "magic-store",
    label: "Æ Magic Store",
    description: "Atalho para a loja de apps.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "chat",
    label: "Mensagens",
    description: "Mensagens recentes e não lidas.",
    defaultSize: { w: 220, h: 140 },
  },
  {
    appId: "drive",
    label: "Drive",
    description: "Acesso rápido ao seu Drive.",
    defaultSize: { w: 220, h: 140 },
  },
];

export function getWidgetSpec(appId: string): WidgetSpec | undefined {
  return WIDGET_SPECS.find((s) => s.appId === appId);
}
