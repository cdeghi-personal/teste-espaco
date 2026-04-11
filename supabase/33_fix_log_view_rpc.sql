-- ============================================================
-- 33_fix_log_view_rpc.sql
-- Dois problemas na função anterior:
-- 1) p_resource_id era UUID: PostgREST não resolve o overload
--    quando o frontend manda string JSON → "function not found"
-- 2) GRANT só para authenticated: se o cliente ainda não
--    carregou a sessão, a chamada vai como anon e é negada
-- Fix: p_resource_id vira TEXT (cast interno) + GRANT para anon
-- ============================================================

CREATE OR REPLACE FUNCTION log_view_audit(
  p_resource_type TEXT,
  p_resource_id   TEXT    DEFAULT NULL,
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
    CASE WHEN p_resource_id IS NOT NULL THEN p_resource_id::UUID ELSE NULL END,
    COALESCE(p_resource_name, '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, TEXT, TEXT) TO anon;

-- Remove a versão antiga (assinatura diferente) se existir
DROP FUNCTION IF EXISTS log_view_audit(TEXT, UUID, TEXT);
