-- 77_audit_consultation_rich_name.sql
-- Recria fn_audit_log com resource_name enriquecido para consultations.
-- Formato: Paciente: X | Data/Hora: DD/MM/YYYY HH:MM | Especialidade: Y | Terapeuta: Z | Tipo: W | Sala: K | Status: S
-- NÃO altera log_view_audit (já corrigido em 60_fix_log_view_audit_uuid.sql com p_resource_id TEXT).

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_resource_name   TEXT := '';
  v_resource_id     UUID;
  v_action          TEXT;
  v_user_id         UUID := NULL;
  v_user_email      TEXT := '';
  v_user_name       TEXT := '';
  v_rec             RECORD;
  v_mr_label        TEXT := '';
  -- consultation rich name
  v_patient_name    TEXT := '';
  v_therapist_name  TEXT := '';
  v_spec_label      TEXT := '';
  v_appt_type_name  TEXT := '';
  v_room_name       TEXT := '';
  v_status_name     TEXT := '';
  v_date_time_str   TEXT := '';
BEGIN
  -- Extrai user_id do JWT
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
      -- patient
      BEGIN
        SELECT full_name INTO v_patient_name FROM patients WHERE id = v_rec.patient_id;
      EXCEPTION WHEN OTHERS THEN v_patient_name := ''; END;
      -- therapist
      BEGIN
        SELECT name INTO v_therapist_name FROM therapists WHERE id = v_rec.therapist_id;
      EXCEPTION WHEN OTHERS THEN v_therapist_name := ''; END;
      -- specialty label (fallback para a key se não encontrar label)
      BEGIN
        SELECT label INTO v_spec_label FROM specialties WHERE key = v_rec.specialty;
      EXCEPTION WHEN OTHERS THEN v_spec_label := ''; END;
      IF COALESCE(v_spec_label, '') = '' THEN
        v_spec_label := COALESCE(v_rec.specialty, '');
      END IF;
      -- appointment type
      BEGIN
        IF v_rec.appointment_type_id IS NOT NULL THEN
          SELECT name INTO v_appt_type_name FROM appointment_types WHERE id = v_rec.appointment_type_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_appt_type_name := ''; END;
      -- room
      BEGIN
        IF v_rec.room_id IS NOT NULL THEN
          SELECT name INTO v_room_name FROM rooms WHERE id = v_rec.room_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_room_name := ''; END;
      -- consultation status
      BEGIN
        IF v_rec.consultation_status_id IS NOT NULL THEN
          SELECT name INTO v_status_name FROM consultation_statuses WHERE id = v_rec.consultation_status_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_status_name := ''; END;
      -- data/hora
      v_date_time_str := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '—');
      IF COALESCE(v_rec.time::TEXT, '') <> '' THEN
        v_date_time_str := v_date_time_str || ' ' || v_rec.time;
      END IF;
      -- monta resource_name
      v_resource_name :=
        'Paciente: '         || COALESCE(NULLIF(v_patient_name,   ''), '—') ||
        ' | Data/Hora: '     || v_date_time_str                             ||
        ' | Especialidade: ' || COALESCE(NULLIF(v_spec_label,     ''), '—') ||
        ' | Terapeuta: '     || COALESCE(NULLIF(v_therapist_name, ''), '—') ||
        ' | Tipo: '          || COALESCE(NULLIF(v_appt_type_name, ''), '—') ||
        ' | Sala: '          || COALESCE(NULLIF(v_room_name,      ''), '—') ||
        ' | Status: '        || COALESCE(NULLIF(v_status_name,    ''), '—');
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        v_resource_name := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '');
      EXCEPTION WHEN OTHERS THEN
        v_resource_name := '';
      END;
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
