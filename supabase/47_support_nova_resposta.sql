-- 47_support_nova_resposta.sql
-- Flag nova_resposta em support_tickets: admin notifica usuário sobre resposta.
-- RPC mark_support_ticket_read: desmarca o flag e registra visualização no histórico.

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS nova_resposta BOOLEAN NOT NULL DEFAULT false;

-- RPC chamada pelo frontend quando o usuário (não-admin) abre um ticket com nova_resposta = true.
-- Desmarca o flag e insere entrada no histórico de mudanças.
CREATE OR REPLACE FUNCTION mark_support_ticket_read(p_ticket_id UUID)
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

  -- Resolve o nome do usuário
  SELECT COALESCE(t.full_name, au.email)
  INTO   v_user_name
  FROM   auth.users au
  LEFT JOIN therapists t ON t.user_id = au.id
  WHERE  au.id = v_user_id;

  -- Desmarca o flag
  UPDATE support_tickets SET nova_resposta = false WHERE id = p_ticket_id;

  -- Registra no histórico
  INSERT INTO support_ticket_history (ticket_id, status, changed_by)
  VALUES (p_ticket_id, 'visualizado', COALESCE(v_user_name, 'Usuário'));
END;
$$;

GRANT EXECUTE ON FUNCTION mark_support_ticket_read(UUID) TO authenticated;