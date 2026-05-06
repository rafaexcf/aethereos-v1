-- Super Sprint A / MX198 — Seed inicial de 25 action intents.
-- Idempotente via ON CONFLICT DO NOTHING.

INSERT INTO kernel.action_intents (id, category, description, risk_class, effects)
VALUES
  -- Kernel — Contatos
  ('kernel.contact.create',  'kernel', 'Criar contato',                'A', ARRAY['data.write']),
  ('kernel.contact.update',  'kernel', 'Atualizar contato',            'A', ARRAY['data.write']),
  ('kernel.contact.delete',  'kernel', 'Remover contato',              'B', ARRAY['data.delete']),

  -- Kernel — Arquivos
  ('kernel.file.upload',     'kernel', 'Enviar arquivo',               'A', ARRAY['storage.write']),
  ('kernel.file.delete',     'kernel', 'Excluir arquivo',              'B', ARRAY['storage.delete']),
  ('kernel.file.restore',    'kernel', 'Restaurar arquivo da lixeira', 'A', ARRAY['storage.write']),

  -- Kernel — Tarefas
  ('kernel.task.create',     'kernel', 'Criar tarefa',                 'A', ARRAY['data.write']),
  ('kernel.task.complete',   'kernel', 'Completar tarefa',             'A', ARRAY['data.write']),
  ('kernel.task.delete',     'kernel', 'Excluir tarefa',               'A', ARRAY['data.delete']),

  -- Kernel — Comunicação
  ('kernel.channel.create',     'kernel', 'Criar canal',               'A', ARRAY['data.write']),
  ('kernel.message.send',       'kernel', 'Enviar mensagem',           'A', ARRAY['communication']),
  ('kernel.notification.send',  'kernel', 'Enviar notificação',        'A', ARRAY['communication']),

  -- Kernel — Equipe (sensível)
  ('kernel.user.invite',       'kernel', 'Convidar colaborador',       'B', ARRAY['identity.write']),
  ('kernel.user.suspend',      'kernel', 'Suspender colaborador',      'B', ARRAY['identity.write']),
  ('kernel.user.remove',       'kernel', 'Remover colaborador',        'C', ARRAY['identity.delete']),
  ('kernel.user.change_role',  'kernel', 'Alterar role',               'C', ARRAY['identity.privileged']),

  -- Kernel — Apps
  ('kernel.app.install',     'kernel', 'Instalar app',                 'A', ARRAY['config.write']),
  ('kernel.app.uninstall',   'kernel', 'Desinstalar app',              'B', ARRAY['config.write']),

  -- Kernel — Configuração
  ('kernel.settings.update', 'kernel', 'Alterar configuração',         'B', ARRAY['config.write']),
  ('kernel.export.data',     'kernel', 'Exportar dados da empresa',    'C', ARRAY['data.export']),

  -- Kernel — IA
  ('kernel.ai.query',        'kernel', 'Pergunta ao Copilot',          'A', ARRAY['ai.read']),
  ('kernel.ai.propose',      'kernel', 'Criar proposal',               'A', ARRAY['ai.write']),
  ('kernel.ai.execute',      'kernel', 'Executar ação proposta',       'B', ARRAY['ai.execute']),

  -- Kernel — Políticas
  ('kernel.policy.create',   'kernel', 'Criar política',               'B', ARRAY['governance.write']),
  ('kernel.policy.update',   'kernel', 'Alterar política',             'C', ARRAY['governance.privileged'])
ON CONFLICT (id) DO NOTHING;

-- Atualizar reversibility para intents reversíveis dentro de janela curta.
-- (Atualização separada porque o INSERT acima é idempotente — re-runs não tocam.)
UPDATE kernel.action_intents
   SET reversibility = '{"window_minutes": 60, "inverse_intent": "kernel.contact.create"}'::jsonb
 WHERE id = 'kernel.contact.delete' AND reversibility IS NULL;

UPDATE kernel.action_intents
   SET reversibility = '{"window_minutes": 1440, "inverse_intent": "kernel.file.restore"}'::jsonb
 WHERE id = 'kernel.file.delete' AND reversibility IS NULL;

UPDATE kernel.action_intents
   SET reversibility = '{"window_minutes": 60, "inverse_intent": "kernel.task.create"}'::jsonb
 WHERE id = 'kernel.task.delete' AND reversibility IS NULL;
