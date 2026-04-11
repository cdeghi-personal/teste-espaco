-- ============================================================
-- 29_audit_debug.sql
-- Versão de diagnóstico: remove EXCEPTION para que o erro
-- real apareça quando o trigger disparar.
-- ATENÇÃO: operações em pacientes/consultas vão falhar e
-- mostrar o erro até você rodar o script de fix.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_resource_name TEXT := '';
  v_resource_id   UUID;
  v_action        TEXT;
  v_user_id       UUID := NULL;
  v_user_email    TEXT := '';
BEGIN
  -- Extrai user_id do JWT
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Busca email
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  END IF;

  -- Determina ação
  IF TG_OP = 'INSERT' THEN
    v_action        := 'INSERT';
    v_resource_id   := NEW.id;
    v_resource_name := COALESCE(NEW.full_name, NEW.date::TEXT, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action        := 'UPDATE';
    v_resource_id   := NEW.id;
    v_resource_name := COALESCE(NEW.full_name, NEW.date::TEXT, '');
  ELSE
    v_action        := 'DELETE';
    v_resource_id   := OLD.id;
    v_resource_name := COALESCE(OLD.full_name, OLD.date::TEXT, '');
  END IF;

  -- INSERT SEM exception handler — o erro vai aparecer
  INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
  VALUES (
    v_user_id,
    COALESCE(v_user_email, ''),
    v_action,
    TG_TABLE_NAME,
    v_resource_id,
    COALESCE(v_resource_name, '')
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
