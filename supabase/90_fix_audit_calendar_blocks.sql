-- 90_fix_audit_calendar_blocks.sql
-- ORDEM CRÍTICA:
--   1. Corrige os triggers de auditoria (sem isso qualquer UPDATE falha com NULL email)
--   2. Remove constraints antigas
--   3. Migra dados TOTAL→RIGID / PARTIAL→FLEX
--   4. Adiciona novas constraints RIGID/FLEX

-- ─── 1. Corrige fn_audit_calendar_blocks ─────────────────────────────────────
-- Guarda: se não há JWT (SQL Editor, migrations), retorna sem gravar no audit_logs.

CREATE OR REPLACE FUNCTION fn_audit_calendar_blocks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record          RECORD;
  v_action          text;
  v_user_id         uuid;
  v_user_email      text;
  v_user_name       text;
  v_resource_name   text;
  v_therapist_name  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record := OLD; v_action := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_record := NEW; v_action := 'INSERT';
  ELSE
    v_record := NEW; v_action := 'UPDATE';
  END IF;

  BEGIN
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL; v_user_email := NULL;
  END;

  IF v_user_email IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  IF v_user_name IS NULL THEN
    BEGIN v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'full_name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN
    BEGIN v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN v_user_name := v_user_email; END IF;

  BEGIN
    SELECT name INTO v_therapist_name FROM therapists WHERE id = v_record.therapist_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_therapist_name := NULL; END;

  v_resource_name :=
    'Terapeuta: ' || COALESCE(v_therapist_name, v_record.therapist_id::text)
    || ' | Data: ' || to_char(v_record.date, 'DD/MM/YYYY')
    || ' | ' || v_record.start_time || '–' || v_record.end_time
    || ' | Tipo: ' || v_record.block_type
    || CASE WHEN v_record.description IS NOT NULL THEN ' | ' || v_record.description ELSE '' END
    || CASE WHEN v_record.cancelled THEN ' | Cancelado' ELSE '' END;

  INSERT INTO audit_logs (action, resource_type, resource_id, resource_name, user_id, user_email, user_name)
  VALUES (v_action, 'calendar_blocks', v_record.id, v_resource_name, v_user_id, v_user_email, v_user_name);

  RETURN v_record;
END;
$$;

-- ─── 2. Corrige fn_audit_calendar_block_series ───────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_calendar_block_series()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record          RECORD;
  v_action          text;
  v_user_id         uuid;
  v_user_email      text;
  v_user_name       text;
  v_resource_name   text;
  v_therapist_name  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record := OLD; v_action := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_record := NEW; v_action := 'INSERT';
  ELSE
    v_record := NEW; v_action := 'UPDATE';
  END IF;

  BEGIN
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL; v_user_email := NULL;
  END;

  IF v_user_email IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  BEGIN
    SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  IF v_user_name IS NULL THEN
    BEGIN v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'full_name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN
    BEGIN v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN v_user_name := v_user_email; END IF;

  BEGIN
    SELECT name INTO v_therapist_name FROM therapists WHERE id = v_record.therapist_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_therapist_name := NULL; END;

  v_resource_name :=
    'Terapeuta: ' || COALESCE(v_therapist_name, v_record.therapist_id::text)
    || ' | Início: ' || to_char(v_record.start_date, 'DD/MM/YYYY')
    || ' | Tipo: ' || v_record.block_type;

  INSERT INTO audit_logs (action, resource_type, resource_id, resource_name, user_id, user_email, user_name)
  VALUES (v_action, 'calendar_block_series', v_record.id, v_resource_name, v_user_id, v_user_email, v_user_name);

  RETURN v_record;
END;
$$;

-- ─── 3. Remove constraints antigas (idempotente) ─────────────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'calendar_blocks' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%block_type%'
  LOOP
    EXECUTE 'ALTER TABLE calendar_blocks DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;
  FOR r IN
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'calendar_block_series' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%block_type%'
  LOOP
    EXECUTE 'ALTER TABLE calendar_block_series DROP CONSTRAINT ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- ─── 4. Migra dados existentes ────────────────────────────────────────────────

UPDATE calendar_blocks       SET block_type = 'RIGID' WHERE block_type = 'TOTAL';
UPDATE calendar_blocks       SET block_type = 'FLEX'  WHERE block_type = 'PARTIAL';
UPDATE calendar_block_series SET block_type = 'RIGID' WHERE block_type = 'TOTAL';
UPDATE calendar_block_series SET block_type = 'FLEX'  WHERE block_type = 'PARTIAL';

-- ─── 5. Adiciona novas constraints ───────────────────────────────────────────

ALTER TABLE calendar_blocks
  ADD CONSTRAINT calendar_blocks_block_type_check
  CHECK (block_type IN ('RIGID', 'FLEX'));

ALTER TABLE calendar_block_series
  ADD CONSTRAINT calendar_block_series_block_type_check
  CHECK (block_type IN ('RIGID', 'FLEX'));
