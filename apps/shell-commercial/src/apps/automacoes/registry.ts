import type { CloudDrivers } from "../../lib/drivers";

export type TriggerId =
  | "task.created"
  | "note.created"
  | "event.upcoming"
  | "notification.received"
  | "time.daily";

export type ActionId = "notify" | "create_task" | "create_note" | "webhook";

export interface TriggerFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "time" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface TriggerDef {
  id: TriggerId;
  label: string;
  description: string;
  realtimeTable: string | null;
  fields: TriggerFieldDef[];
  describe: (config: Record<string, unknown>) => string;
}

export interface ActionFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface ActionDef {
  id: ActionId;
  label: string;
  description: string;
  fields: ActionFieldDef[];
  describe: (config: Record<string, unknown>) => string;
}

export interface TriggerPayload {
  triggerId: TriggerId;
  timestamp: string;
  row: Record<string, unknown> | null;
  fields: Record<string, string | number | null>;
}

export interface ActionContext {
  drivers: CloudDrivers;
  userId: string;
  companyId: string;
  payload: TriggerPayload;
  config: Record<string, unknown>;
}

export type ActionExecutor = (ctx: ActionContext) => Promise<void>;

export const TRIGGER_DEFS: TriggerDef[] = [
  {
    id: "task.created",
    label: "Quando uma tarefa for criada",
    description: "Dispara ao inserir uma nova tarefa em kernel.tasks.",
    realtimeTable: "tasks",
    fields: [
      {
        key: "list_id",
        label: "Lista (opcional)",
        type: "text",
        required: false,
        placeholder: "UUID da lista — vazio = qualquer lista",
        helpText: "Filtra apenas tarefas criadas nesta lista.",
      },
    ],
    describe: (cfg) => {
      const listId = typeof cfg["list_id"] === "string" ? cfg["list_id"] : "";
      return listId.length > 0
        ? `Tarefa criada na lista ${listId.slice(0, 8)}…`
        : "Tarefa criada (qualquer lista)";
    },
  },
  {
    id: "note.created",
    label: "Quando uma nota for criada",
    description: "Dispara ao inserir uma nova nota em kernel.notes.",
    realtimeTable: "notes",
    fields: [],
    describe: () => "Nota criada",
  },
  {
    id: "event.upcoming",
    label: "Antes de um evento de calendário",
    description:
      "Verificação a cada minuto: dispara N minutos antes de um evento.",
    realtimeTable: null,
    fields: [
      {
        key: "minutes_before",
        label: "Minutos antes",
        type: "number",
        required: true,
        placeholder: "15",
      },
    ],
    describe: (cfg) => {
      const m =
        typeof cfg["minutes_before"] === "number" ? cfg["minutes_before"] : 15;
      return `${m} minutos antes de um evento`;
    },
  },
  {
    id: "notification.received",
    label: "Quando uma notificação chegar",
    description: "Dispara ao inserir notificação em kernel.notifications.",
    realtimeTable: "notifications",
    fields: [
      {
        key: "type",
        label: "Tipo (opcional)",
        type: "select",
        required: false,
        options: [
          { value: "", label: "Qualquer tipo" },
          { value: "info", label: "info" },
          { value: "warning", label: "warning" },
          { value: "error", label: "error" },
          { value: "success", label: "success" },
        ],
      },
      {
        key: "source_app",
        label: "App de origem (opcional)",
        type: "text",
        required: false,
        placeholder: "ex: tarefas, calendar",
      },
    ],
    describe: (cfg) => {
      const type = typeof cfg["type"] === "string" ? cfg["type"] : "";
      const src =
        typeof cfg["source_app"] === "string" ? cfg["source_app"] : "";
      const parts = [
        type.length > 0 ? `tipo=${type}` : null,
        src.length > 0 ? `de=${src}` : null,
      ].filter((p): p is string => p !== null);
      return parts.length > 0
        ? `Notificação recebida (${parts.join(", ")})`
        : "Qualquer notificação recebida";
    },
  },
  {
    id: "time.daily",
    label: "Todos os dias em um horário",
    description: "Dispara uma vez por dia no horário HH:MM (timezone local).",
    realtimeTable: null,
    fields: [
      {
        key: "time",
        label: "Horário (HH:MM)",
        type: "time",
        required: true,
        placeholder: "09:00",
      },
    ],
    describe: (cfg) => {
      const t = typeof cfg["time"] === "string" ? cfg["time"] : "??:??";
      return `Todos os dias às ${t}`;
    },
  },
];

export const ACTION_DEFS: ActionDef[] = [
  {
    id: "notify",
    label: "Emitir notificação",
    description: "Cria uma notificação em kernel.notifications.",
    fields: [
      {
        key: "title",
        label: "Título",
        type: "text",
        required: true,
        placeholder: "Ex: Nova tarefa criada — {{trigger.title}}",
        helpText: "Suporta {{trigger.title}} e {{trigger.body}}.",
      },
      {
        key: "body",
        label: "Corpo",
        type: "textarea",
        required: false,
        placeholder: "Texto opcional",
      },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        required: false,
        options: [
          { value: "info", label: "info" },
          { value: "success", label: "success" },
          { value: "warning", label: "warning" },
          { value: "error", label: "error" },
        ],
      },
    ],
    describe: (cfg) => {
      const t =
        typeof cfg["title"] === "string" ? cfg["title"] : "(sem título)";
      return `Emitir notificação "${t}"`;
    },
  },
  {
    id: "create_task",
    label: "Criar tarefa",
    description: "Insere uma tarefa em kernel.tasks.",
    fields: [
      {
        key: "title",
        label: "Título da tarefa",
        type: "text",
        required: true,
        placeholder: "Ex: Acompanhar — {{trigger.title}}",
      },
      {
        key: "list_id",
        label: "Lista destino (opcional)",
        type: "text",
        required: false,
        placeholder: "UUID — vazio = sem lista",
      },
    ],
    describe: (cfg) => {
      const t =
        typeof cfg["title"] === "string" ? cfg["title"] : "(sem título)";
      return `Criar tarefa "${t}"`;
    },
  },
  {
    id: "create_note",
    label: "Criar nota",
    description: "Insere uma nota em kernel.notes.",
    fields: [
      {
        key: "title",
        label: "Título da nota",
        type: "text",
        required: false,
        placeholder: "Opcional",
      },
      {
        key: "content",
        label: "Conteúdo",
        type: "textarea",
        required: true,
        placeholder: "Conteúdo da nota — suporta {{trigger.*}}",
      },
    ],
    describe: (cfg) => {
      const t =
        typeof cfg["title"] === "string" && cfg["title"].length > 0
          ? cfg["title"]
          : typeof cfg["content"] === "string"
            ? cfg["content"].slice(0, 30)
            : "(vazia)";
      return `Criar nota "${t}"`;
    },
  },
  {
    id: "webhook",
    label: "Chamar webhook (POST JSON)",
    description: "Faz POST com payload JSON do trigger. Sem auth headers.",
    fields: [
      {
        key: "url",
        label: "URL",
        type: "url",
        required: true,
        placeholder: "https://example.com/hook",
      },
    ],
    describe: (cfg) => {
      const u = typeof cfg["url"] === "string" ? cfg["url"] : "(sem url)";
      return `POST ${u}`;
    },
  },
];

export function getTriggerDef(id: string): TriggerDef | undefined {
  return TRIGGER_DEFS.find((t) => t.id === id);
}

export function getActionDef(id: string): ActionDef | undefined {
  return ACTION_DEFS.find((a) => a.id === id);
}

function templateString(tpl: string, payload: TriggerPayload): string {
  return tpl.replace(/\{\{trigger\.([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    if (payload.row !== null && key in payload.row) {
      const val = payload.row[key];
      if (typeof val === "string" || typeof val === "number")
        return String(val);
    }
    if (key in payload.fields) {
      const val = payload.fields[key];
      if (val !== null && val !== undefined) return String(val);
    }
    return "";
  });
}

function getStringField(cfg: Record<string, unknown>, key: string): string {
  const v = cfg[key];
  return typeof v === "string" ? v : "";
}

export const ACTION_EXECUTORS: Record<ActionId, ActionExecutor> = {
  notify: async ({ drivers, userId, companyId, payload, config }) => {
    const titleTpl = getStringField(config, "title");
    const bodyTpl = getStringField(config, "body");
    const type = getStringField(config, "type");
    const title = templateString(
      titleTpl.length > 0 ? titleTpl : "Automação disparada",
      payload,
    );
    const body = templateString(bodyTpl, payload);
    await drivers.data.from("notifications").insert({
      user_id: userId,
      company_id: companyId,
      type: type.length > 0 ? type : "info",
      title: title.slice(0, 200),
      body,
      source_app: "automacoes",
      metadata: { trigger: payload.triggerId },
    });
  },
  create_task: async ({ drivers, userId, companyId, payload, config }) => {
    const titleTpl = getStringField(config, "title");
    const listId = getStringField(config, "list_id");
    const title = templateString(
      titleTpl.length > 0 ? titleTpl : "Tarefa via automação",
      payload,
    );
    await drivers.data.from("tasks").insert({
      user_id: userId,
      company_id: companyId,
      title: title.slice(0, 500),
      list_id: listId.length > 0 ? listId : null,
      status: "pending",
      priority: "medium",
      position: 0,
    });
  },
  create_note: async ({ drivers, userId, companyId, payload, config }) => {
    const titleTpl = getStringField(config, "title");
    const contentTpl = getStringField(config, "content");
    const title = templateString(titleTpl, payload);
    const content = templateString(contentTpl, payload);
    await drivers.data.from("notes").insert({
      user_id: userId,
      company_id: companyId,
      title,
      content,
    });
  },
  webhook: async ({ config, payload }) => {
    const url = getStringField(config, "url");
    if (url.length === 0) return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger: payload.triggerId,
        timestamp: payload.timestamp,
        row: payload.row,
        fields: payload.fields,
      }),
    });
  },
};
