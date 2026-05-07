/**
 * Super Sprint D / MX230 — Choreography templates.
 *
 * Templates pré-construídos que o gestor pode usar como ponto de partida.
 * São puramente UI — armazenados como texto YAML; quando o usuário aceita,
 * são salvos em kernel.choreographies (não há tabela de templates).
 */

export interface ChoreographyTemplate {
  id: string;
  name: string;
  description: string;
  category: "comunicação" | "operação" | "governança";
  yaml: string;
}

export const CHOREOGRAPHY_TEMPLATES: ChoreographyTemplate[] = [
  {
    id: "notify-team-on-contact",
    name: "Notificar equipe quando contato criado",
    description:
      "Avisa todos os membros da empresa quando um novo contato é adicionado.",
    category: "comunicação",
    yaml: `name: "Novo contato → equipe"
description: "Notifica a equipe sobre cada novo contato"
trigger_event_type: "kernel.contact.created"
trigger_condition: null
error_handling:
  on_failure: "notify_human"
steps:
  - id: "notify_team"
    description: "Notifica todos os membros"
    intent: "kernel.notification.send"
    inputs:
      title: "Novo contato"
      body: "{{trigger.payload.full_name}} foi adicionado"
    emit: "kernel.notification.sent"
`,
  },
  {
    id: "escalate-overdue-task",
    name: "Escalar tarefa atrasada",
    description:
      "Alerta o responsável; se não resolver em 2 dias, escala para o gerente.",
    category: "operação",
    yaml: `name: "Tarefa atrasada → escalar"
description: "Alerta responsável + escala para gerente após 2 dias"
trigger_event_type: "kernel.task.overdue"
trigger_condition: null
error_handling:
  on_failure: "notify_human"
steps:
  - id: "alert_assignee"
    intent: "kernel.notification.send"
    inputs:
      title: "Tarefa atrasada"
      body: "{{trigger.payload.title}} está em atraso"
    emit: "kernel.task.alert_sent"
  - id: "wait_2_days"
    wait: "2 days"
  - id: "escalate"
    intent: "kernel.notification.send"
    inputs:
      title: "Escalação — tarefa atrasada"
      body: "{{trigger.payload.title}} segue sem resolução"
`,
  },
  {
    id: "weekly-data-backup",
    name: "Backup semanal de dados",
    description:
      "Solicita exportação LGPD da empresa toda segunda-feira (manual por enquanto).",
    category: "governança",
    yaml: `name: "Backup semanal"
description: "Lembrete semanal de exportação de dados (cron real virá em sprint futuro)"
trigger_event_type: "platform.scheduler.weekly_monday"
trigger_condition: null
error_handling:
  on_failure: "notify_human"
steps:
  - id: "request_export"
    intent: "kernel.notification.send"
    inputs:
      title: "Hora do backup"
      body: "Lembrete: solicite exportação dos dados em Gestor > LGPD"
    emit: "platform.lgpd.export_reminded"
`,
  },
  {
    id: "alert-large-file-uploaded",
    name: "Alerta arquivo grande",
    description: "Notifica admins quando um arquivo acima de 10MB é enviado.",
    category: "operação",
    yaml: `name: "Arquivo grande → admin"
description: "Avisa admins de uploads acima de 10 MB"
trigger_event_type: "kernel.file.uploaded"
trigger_condition:
  size_bytes:
    above: 10485760
error_handling:
  on_failure: "skip"
steps:
  - id: "notify_admin"
    intent: "kernel.notification.send"
    inputs:
      title: "Arquivo grande enviado"
      body: "{{trigger.payload.name}} ({{trigger.payload.size_bytes}} bytes) foi enviado por {{trigger.actor_id}}"
    emit: "kernel.notification.sent"
`,
  },
  {
    id: "daily-summary",
    name: "Resumo diário",
    description: "Notifica resumo do dia (cron real virá em sprint futuro).",
    category: "comunicação",
    yaml: `name: "Resumo diário"
description: "Notificação no fim do dia com resumo de atividades"
trigger_event_type: "platform.scheduler.daily_18h"
trigger_condition: null
error_handling:
  on_failure: "skip"
steps:
  - id: "send_summary"
    intent: "kernel.notification.send"
    inputs:
      title: "Resumo do dia"
      body: "Confira o que aconteceu hoje no seu Aethereos"
    emit: "platform.summary.daily_sent"
`,
  },
];

export function findTemplate(id: string): ChoreographyTemplate | undefined {
  return CHOREOGRAPHY_TEMPLATES.find((t) => t.id === id);
}
