-- ============================================================
-- 30_fix_audit_resource_name.sql
-- Correção: COALESCE(NEW.full_name, NEW.date::TEXT, '') falha
-- em tabelas sem coluna "date" (ex: patients, guardians).
-- Fix: tenta full_name primeiro, depois date, cada um em
-- sub-bloco BEGIN/EXCEPTION para capturar campo inexistente.
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
  v_rec           RECORD;
BEGIN
  -- Extrai user_id do JWT (não aborta se falhar)
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Busca email
  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_email := '';
    END;
  END IF;

  -- Define action e registro de referência
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_rec    := OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_rec    := NEW;
  ELSE
    v_action := 'UPDATE';
    v_rec    := NEW;
  END IF;

  v_resource_id := v_rec.id;

  -- Tenta pegar full_name (patients, guardians, therapists...)
  BEGIN
    v_resource_name := v_rec.full_name;
  EXCEPTION WHEN undefined_column THEN
    v_resource_name := '';
  END;

  -- Se vazio, tenta date (consultations, appointments...)
  IF COALESCE(v_resource_name, '') = '' THEN
    BEGIN
      v_resource_name := v_rec.date::TEXT;
    EXCEPTION WHEN undefined_column THEN
      v_resource_name := '';
    END;
  END IF;

  -- Insere o log
  BEGIN
    INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
    VALUES (
      v_user_id,
      COALESCE(v_user_email, ''),
      v_action,
      TG_TABLE_NAME,
      v_resource_id,
      COALESCE(v_resource_name, '')
    );
  EXCEPTION WHEN OTHERS THEN
    -- não quebra a operação principal
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
