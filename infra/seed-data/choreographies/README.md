# Coreografias de exemplo

Coreografias declarativas em YAML que o wizard de Automacoes (MX229)
oferece como templates pré-construídos. Editáveis no Studio antes do
salvamento.

## Como inserir manualmente em company de dev

```sql
INSERT INTO kernel.choreographies (
  company_id, name, description, choreography_yaml, choreography_json,
  status, trigger_event_type, steps, created_by
) VALUES (
  '<company-uuid>',
  'Novo contato → vendas',
  'Enriquece contato recém-criado e avisa o time de vendas',
  '<conteúdo do YAML como string>',
  '<conteúdo parseado como JSONB>'::jsonb,
  'active',
  'kernel.contact.created',
  '[
    {"id":"enrich","intent":"kernel.contact.update","emit":"kernel.contact.enriched"},
    {"id":"notify_sales","intent":"kernel.notification.send","inputs":{"title":"Novo contato criado","body":"{{trigger.payload.full_name}} foi adicionado"},"emit":"kernel.notification.sent"}
  ]'::jsonb,
  '<owner-user-uuid>'
);
```

## Coreografias disponíveis

| Arquivo                 | Trigger                  | Suporta inline? | Notas                           |
| ----------------------- | ------------------------ | --------------- | ------------------------------- |
| `contact-to-sales.yaml` | `kernel.contact.created` | sim             | 2 steps sem wait                |
| `task-escalation.yaml`  | `kernel.task.overdue`    | NÃO             | usa `wait: "2 days"` — Temporal |

Para validar manualmente:

1. Insira a coreografia (status='active') para uma company seed
2. Emita o evento trigger via SQL no `kernel.scp_outbox`
3. O outbox poller do scp-worker entrega ao `ChoreographyConsumer`
4. Verificar `kernel.choreography_executions` para acompanhar o status
