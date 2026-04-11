-- ============================================================
-- 32_log_view_rpc.sql
-- Cria função RPC para registrar VIEW logs.
-- Usa SECURITY DEFINER + SET row_security = off, igual à
-- fn_audit_log dos triggers (que já funciona). Lê o usuário
-- de request.jwt.claims — disponível no contexto PostgREST.
-- O frontend chama supabase.rpc('log_view_audit', {...})
-- em vez de fazer INSERT direto (que depende de grants/RLS).
-- ============================================================

CREATE OR REPLACE FUNCTION log_view_audit(
  p_resource_type TEXT,
  p_resource_id   UUID    DEFAULT NULL,
  p_resource_name TEXT    DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id    UUID;
  v_user_email TEXT := '';
BEGIN
  -- Lê user_id do JWT (mesmo mecanismo que fn_audit_log)
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_email := '';
    END;
  END IF;

  INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
  VALUES (
    v_user_id,
    COALESCE(v_user_email, ''),
    'VIEW',
    p_resource_type,
    p_resource_id,
    COALESCE(p_resource_name, '')
  );
END;
$$;

-- Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, UUID, TEXT) TO authenticated;
