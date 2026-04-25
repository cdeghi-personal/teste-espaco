-- 48_support_reprovado.sql
-- Fluxo de aprovação/reprovação da resposta pelo usuário solicitante.
-- 1) Adiciona coluna note em support_ticket_history
-- 2) RPC approve_support_ticket: fecha chamado + desmarca nova_resposta
-- 3) RPC reject_support_ticket: reprovado_usuario + desmarca nova_resposta + registra comentário

ALTER TABLE support_ticket_history ADD COLUMN IF NOT EXISTS note TEXT;

-- RPC: usuário aprova a resposta → fecha o chamado
CREATE OR REPLACE FUNCTION approve_support_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_user_name TEXT := 'Usuário';
BEGIN
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  -- Só age se o ticket pertence ao usuário E ainda está com nova_resposta = true
  IF NOT EXISTS (
    SELECT 1 FROM support_tickets
    WHERE id = p_ticket_id
      AND created_by_id = v_user_id
      AND nova_resposta = true
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.full_name, au.email)
  INTO   v_user_name
  FROM   auth.users au
  LEFT JOIN therapists t ON t.user_id = au.id
  WHERE  au.id = v_user_id;

  UPDATE support_tickets
  SET nova_resposta = false,
      status = 'fechado',
      updated_at = NOW()
  WHERE id = p_ticket_id;

  INSERT INTO support_ticket_history (ticket_id, status, changed_by)
  VALUES (p_ticket_id, 'fechado', COALESCE(v_user_name, 'Usuário'));
END;
$$;

-- RPC: usuário reprova a resposta → muda para reprovado_usuario + grava comentário no histórico
CREATE OR REPLACE FUNCTION reject_support_ticket(p_ticket_id UUID, p_comment TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_user_name TEXT := 'Usuário';
BEGIN
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM support_tickets
    WHERE id = p_ticket_id
      AND created_by_id = v_user_id
      AND nova_resposta = true
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.full_name, au.email)
  INTO   v_user_name
  FROM   auth.users au
  LEFT JOIN therapists t ON t.user_id = au.id
  WHERE  au.id = v_user_id;

  UPDATE support_tickets
  SET nova_resposta = false,
      status = 'reprovado_usuario',
      updated_at = NOW()
  WHERE id = p_ticket_id;

  INSERT INTO support_ticket_history (ticket_id, status, changed_by, note)
  VALUES (p_ticket_id, 'reprovado_usuario', COALESCE(v_user_name, 'Usuário'), NULLIF(TRIM(p_comment), ''));
END;
$$;

GRANT EXECUTE ON FUNCTION approve_support_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_support_ticket(UUID, TEXT) TO authenticated;