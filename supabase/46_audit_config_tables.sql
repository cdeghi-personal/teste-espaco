-- 46_audit_config_tables.sql
-- 1) Atualiza fn_audit_log: fallback de resource_name inclui "name" e "label"
--    (além de full_name e date já existentes), cobrindo tabelas de configuração.
-- 2) Adiciona triggers INSERT/UPDATE/DELETE nas tabelas de parâmetros do sistema:
--    therapists, specialties, payment_methods, diagnoses, patient_statuses,
--    consultation_statuses, appointment_types, rooms, age_ranges.

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
  v_mr_label      TEXT := '';
BEGIN
  -- Extrai user_id do JWT
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
        || ' | ' || t.full_name
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
    INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
    VALUES (v_user_id, COALESCE(v_user_email,''), v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name,''));
  EXCEPTION WHEN OTHERS THEN
    -- não quebra a operação principal
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ── Triggers para parâmetros do sistema ─────────────────────────────

DROP TRIGGER IF EXISTS trg_audit_therapists ON therapists;
CREATE TRIGGER trg_audit_therapists
  AFTER INSERT OR UPDATE OR DELETE ON therapists
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_specialties ON specialties;
CREATE TRIGGER trg_audit_specialties
  AFTER INSERT OR UPDATE OR DELETE ON specialties
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_payment_methods ON payment_methods;
CREATE TRIGGER trg_audit_payment_methods
  AFTER INSERT OR UPDATE OR DELETE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_diagnoses ON diagnoses;
CREATE TRIGGER trg_audit_diagnoses
  AFTER INSERT OR UPDATE OR DELETE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_patient_statuses ON patient_statuses;
CREATE TRIGGER trg_audit_patient_statuses
  AFTER INSERT OR UPDATE OR DELETE ON patient_statuses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_consultation_statuses ON consultation_statuses;
CREATE TRIGGER trg_audit_consultation_statuses
  AFTER INSERT OR UPDATE OR DELETE ON consultation_statuses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_appointment_types ON appointment_types;
CREATE TRIGGER trg_audit_appointment_types
  AFTER INSERT OR UPDATE OR DELETE ON appointment_types
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_rooms ON rooms;
CREATE TRIGGER trg_audit_rooms
  AFTER INSERT OR UPDATE OR DELETE ON rooms
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

DROP TRIGGER IF EXISTS trg_audit_age_ranges ON age_ranges;
CREATE TRIGGER trg_audit_age_ranges
  AFTER INSERT OR UPDATE OR DELETE ON age_ranges
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();