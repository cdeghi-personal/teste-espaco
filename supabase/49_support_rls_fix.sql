-- 49_support_rls_fix.sql
-- Recria as RPCs de aprovação/reprovação com SET row_security = off.
-- Sem esse parâmetro, o Supabase aplica o RLS mesmo dentro de funções
-- SECURITY DEFINER, bloqueando o UPDATE para usuários não-admin.

CREATE OR REPLACE FUNCTION approve_support_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
      status = 'fechado',
      updated_at = NOW()
  WHERE id = p_ticket_id;

  INSERT INTO support_ticket_history (ticket_id, status, changed_by)
  VALUES (p_ticket_id, 'fechado', COALESCE(v_user_name, 'Usuário'));
END;
$$;

CREATE OR REPLACE FUNCTION reject_support_ticket(p_ticket_id UUID, p_comment TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

-- Também corrige mark_support_ticket_read pela mesma razão
CREATE OR REPLACE FUNCTION mark_support_ticket_read(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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

  UPDATE support_tickets SET nova_resposta = false WHERE id = p_ticket_id;

  INSERT INTO support_ticket_history (ticket_id, status, changed_by)
  VALUES (p_ticket_id, 'visualizado', COALESCE(v_user_name, 'Usuário'));
END;
$$;

GRANT EXECUTE ON FUNCTION approve_support_ticket(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION reject_support_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_support_ticket_read(UUID)    TO authenticated;