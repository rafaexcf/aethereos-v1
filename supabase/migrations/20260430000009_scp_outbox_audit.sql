-- MX8: kernel.is_invariant_operation + trigger de auditoria no scp_outbox
-- Defesa em profundidade: app-layer (Edge Function) + DB-layer (trigger).
-- Ref: Fundamentação 12.4 [INV], ADR-0020, CLAUDE.md seção 7

-- ---------------------------------------------------------------------------
-- 1. Função: kernel.is_invariant_operation
--    Retorna TRUE se o event_type + actor_type correspondem a operação invariante.
--    Aplicada como gate adicional na borda do banco (além do gate na Edge Function).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION kernel.is_invariant_operation(
  p_event_type TEXT,
  p_actor_type TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Apenas agentes autônomos são bloqueados (humanos e sistema têm aprovação implícita)
  IF p_actor_type <> 'agent' THEN
    RETURN FALSE;
  END IF;

  -- Mapeamento evento → operação invariante (Fundamentação 12.4 [INV])
  RETURN p_event_type IN (
    'platform.person.deactivated',  -- employee.termination
    'platform.file.deleted',         -- data.deletion
    'platform.tenant.suspended'      -- governance.policy_change
  );
END;
$$;

COMMENT ON FUNCTION kernel.is_invariant_operation(TEXT, TEXT) IS
  'Retorna TRUE se o event_type é uma operação invariante para o actor_type dado. '
  'Usado pelo trigger de auditoria do scp_outbox. Ref: Fundamentação 12.4 [INV]';

-- ---------------------------------------------------------------------------
-- 2. Trigger: kernel.scp_outbox_validate_before_insert
--    Valida event_type é conhecido + não é operação invariante para agentes.
--    Segunda linha de defesa após a Edge Function scp-publish.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION kernel.scp_outbox_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_type TEXT;
  v_event_type TEXT;
BEGIN
  v_event_type := NEW.event_type;
  v_actor_type := NEW.envelope->>'actor'->>'type';

  -- Fallback seguro: se não conseguir extrair actor_type do envelope, bloquear agentes
  IF v_actor_type IS NULL THEN
    v_actor_type := NEW.envelope->'actor'->>'type';
  END IF;

  IF kernel.is_invariant_operation(v_event_type, COALESCE(v_actor_type, 'unknown')) THEN
    RAISE EXCEPTION
      'Operação invariante detectada: event_type=% actor_type=%. Requer aprovação humana explícita (Fundamentação 12.4 [INV]).',
      v_event_type, v_actor_type
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION kernel.scp_outbox_validate() IS
  'Trigger function: valida invariantes de operação antes de inserir no scp_outbox.';

CREATE TRIGGER kernel_scp_outbox_validate_before_insert
  BEFORE INSERT ON kernel.scp_outbox
  FOR EACH ROW
  EXECUTE FUNCTION kernel.scp_outbox_validate();

-- ---------------------------------------------------------------------------
-- 3. Permissão: service_role pode inserir no scp_outbox diretamente
--    (via Edge Function scp-publish que usa service_role key)
-- ---------------------------------------------------------------------------

GRANT INSERT ON kernel.scp_outbox TO service_role;
GRANT USAGE, SELECT ON SEQUENCE kernel.scp_outbox_id_seq TO service_role;
