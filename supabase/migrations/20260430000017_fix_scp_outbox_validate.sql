-- Fix: kernel.scp_outbox_validate usava NEW.envelope->>'actor'->>'type'
-- O operador ->> retorna TEXT; aplicar ->> em TEXT causa erro
-- "operator does not exist: text ->> unknown".
-- Correto: NEW.envelope->'actor'->>'type' (-> retorna jsonb, ->> extrai texto).
-- Bug descoberto durante smoke test manual em 2026-04-30 (bug #11).

CREATE OR REPLACE FUNCTION kernel.scp_outbox_validate()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_actor_type TEXT;
  v_event_type TEXT;
BEGIN
  v_event_type := NEW.event_type;
  v_actor_type := NEW.envelope->'actor'->>'type';
  IF kernel.is_invariant_operation(v_event_type, COALESCE(v_actor_type, 'unknown')) THEN
    RAISE EXCEPTION
      'Operação invariante detectada: event_type=% actor_type=%. Requer aprovação humana explícita (Fundamentação 12.4 [INV]).',
      v_event_type, v_actor_type
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;
