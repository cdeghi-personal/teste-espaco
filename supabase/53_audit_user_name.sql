-- 53_audit_user_name.sql
-- Adiciona user_name em audit_logs e atualiza fn_audit_log + log_view_audit
-- para resolver: nome do terapeuta > display name do auth.users > e-mail.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT '';

-- Helper inline de resolução de nome (usado nas duas funções abaixo)
-- Prioridade: therapists.name → user_metadata.full_name/name → email

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
  v_user_name     TEXT := '';
  v_rec           RECORD;
  v_mr_label      TEXT := '';
BEGIN
  -- Extrai user_id do JWT
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    -- Email
    BEGIN
      SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_email := '';
    END;

    -- Nome: 1) terapeuta  2) display name  3) e-mail
    BEGIN
      SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_name := '';
    END;

    IF COALESCE(v_user_name, '') = '' THEN
      BEGIN
        SELECT COALESCE(
          raw_user_meta_data->>'full_name',
          raw_user_meta_data->>'name'
        ) INTO v_user_name
        FROM auth.users WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN
        v_user_name := '';
      END;
    END IF;

    IF COALESCE(v_user_name, '') = '' THEN
      v_user_name := v_user_email;
    END IF;
  END IF;

  -- Define action e registro de referência
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE'; v_rec := OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT'; v_rec := NEW;
  ELSE
    v_action := 'UPDATE'; v_rec := NEW;
  END IF;

  v_resource_id := v_rec.id;

  -- ── Resource name por tabela ────────────────────────────────
  IF TG_TABLE_NAME = 'consultations' THEN
    BEGIN
      SELECT
        p.full_name
        || ' | ' || to_char(v_rec.date, 'DD/MM/YYYY')
        || CASE WHEN v_rec.time IS NOT NULL AND v_rec.time <> '' THEN ' ' || v_rec.time ELSE '' END
        || ' | ' || COALESCE(v_rec.specialty, '')
        || ' | ' || t.name
      INTO v_resource_name
      FROM   patients   p
      JOIN   therapists t ON t.id = v_rec.therapist_id
      WHERE  p.id = v_rec.patient_id;
      IF v_resource_name IS NULL THEN
        v_resource_name := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      BEGIN v_resource_name := to_char(v_rec.date, 'DD/MM/YYYY'); EXCEPTION WHEN OTHERS THEN v_resource_name := ''; END;
    END;

  ELSIF TG_TABLE_NAME IN ('medical_record_exams','medical_record_medications','medical_record_conducts') THEN
    v_mr_label := CASE TG_TABLE_NAME
      WHEN 'medical_record_exams'        THEN 'Exames'
      WHEN 'medical_record_medications'  THEN 'Medicamentos'
      WHEN 'medical_record_conducts'     THEN 'Conduta'
      ELSE TG_TABLE_NAME
    END;
    BEGIN
      SELECT p.full_name || ' | ' || v_mr_label
      INTO   v_resource_name
      FROM   medical_records mr
      JOIN   patients p ON p.id = mr.patient_id
      WHERE  mr.id = v_rec.medical_record_id;
      IF v_resource_name IS NULL THEN v_resource_name := v_mr_label; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_resource_name := v_mr_label;
    END;

  ELSE
    -- Fallback genérico: full_name → name → label → date
    BEGIN v_resource_name := v_rec.full_name;
    EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.name;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.label;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.date::TEXT;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;
  END IF;

  -- Insere o log
  BEGIN
    INSERT INTO audit_logs (user_id, user_email, user_name, action, resource_type, resource_id, resource_name)
    VALUES (v_user_id, COALESCE(v_user_email,''), COALESCE(v_user_name,''), v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name,''));
  EXCEPTION WHEN OTHERS THEN
    -- não quebra a operação principal
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

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
  VALUES (v_user_id, COALESCE(v_user_email,''), COALESCE(v_user_name,''), 'VIEW',
          p_resource_type, p_resource_id, COALESCE(p_resource_name,''));
END;
$$;

GRANT EXECUTE ON FUNCTION log_view_audit(TEXT, UUID, TEXT) TO authenticated;