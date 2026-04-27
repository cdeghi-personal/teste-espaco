-- 60_fix_log_view_audit_uuid.sql
-- O script 53 recriou log_view_audit com p_resource_id UUID, revertendo
-- o fix do script 33 (que usava TEXT para compatibilidade com PostgREST).
-- Resultado: dois overloads conflitantes — chamadas do frontend falhavam
-- silenciosamente pois o tipo enviado (string JSON) não resolvia para UUID.
--
-- Fix: recria a versão TEXT (com user_name do script 53) e dropa a UUID.

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
  v_user_name  TEXT := '';
BEGIN
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN v_user_email := ''; END;

    BEGIN
      SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN v_user_name := ''; END;

    IF COALESCE(v_user_name, '') = '' THEN
      BEGIN
        SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
        INTO v_user_name FROM auth.users WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN v_user_name := ''; END;
    END IF;

    IF COALESCE(v_user_name, '') = '' THEN
      v_user_name := v_user_email;
    END IF;
  END IF;

  INSERT INTO audit_logs (user_id, user_email, user_name, action, resource_type, resource_id, resource_name)
  VALUES (
    v_user_id,
    COALESCE(v_user_email, ''),
    COALESCE(v_user_name, ''),
    'VIEW',
    p_resource_type,
    CASE WHEN p_resource_id IS NOT NULL THEN p_resource_id::UUID ELSE NULL END,
    COALESCE(p_resource_name, '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, TEXT, TEXT) TO anon;

-- Remove a versão UUID que o script 53 criou erroneamente
DROP FUNCTION IF EXISTS log_view_audit(TEXT, UUID, TEXT);