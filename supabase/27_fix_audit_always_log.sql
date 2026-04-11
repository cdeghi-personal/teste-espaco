-- ============================================================
-- 27_fix_audit_always_log.sql
-- Remove o guard de NULL no user_id — o trigger agora SEMPRE
-- grava o log, mesmo sem conseguir identificar o usuário.
-- Isso resolve o problema e também serve como diagnóstico.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource_name TEXT := '';
  v_resource_id   UUID;
  v_action        TEXT;
  v_user_id       UUID := NULL;
  v_user_email    TEXT := '';
BEGIN
  -- Tenta extrair user_id do JWT (não aborta se falhar)
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Tenta buscar email (não aborta se falhar)
  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_email := '';
    END;
  END IF;

  -- Determina ação e recurso
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

  -- Insere log SEMPRE (sem guard de NULL) — ignora erros silenciosamente
  BEGIN
    INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
    VALUES (v_user_id, COALESCE(v_user_email, ''), v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name, ''));
  EXCEPTION WHEN OTHERS THEN
    -- não quebra a operação principal
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
