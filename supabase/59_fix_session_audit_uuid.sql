-- Fix: resource_id e UUID na tabela audit_logs — remover do INSERT para ficar NULL.
-- O tipo do evento vai apenas em resource_name.

CREATE OR REPLACE FUNCTION log_session_audit(p_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id UUID;
  v_email   TEXT;
  v_name    TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Resolve nome: terapeuta → full_name metadata → name metadata → email
  SELECT name INTO v_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  IF v_name IS NULL THEN
    SELECT COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      email
    ) INTO v_name FROM auth.users WHERE id = v_user_id;
  END IF;

  INSERT INTO audit_logs (user_id, user_email, user_name, action, resource_type, resource_name)
  VALUES (
    v_user_id, v_email, v_name,
    'LOGIN',
    'session',
    CASE p_type
      WHEN 'login'           THEN 'Login via formulario'
      WHEN 'sessao_retomada' THEN 'Sessao retomada'
      ELSE p_type
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_session_audit(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_session_audit(TEXT) TO anon;