-- 107_audit_consultation_new_format.sql
-- Altera o formato de resource_name para consultations no log de auditoria.
-- Novo formato: <Paciente> | <Terapeuta> | <DD/MM/YYYY> | <HH:MM> | <Tipo> | <Status>
-- Exemplo: Helena Souza | Fabiana Sarilho | 14/07/2026 | 09:00 | Atendimento | Realizada
-- Aplica-se a INSERT, UPDATE e DELETE (triggers).
-- VIEW é tratado pelo frontend via buildConsultationResourceName (DataContext).

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
  -- consultation fields
  v_patient_name    TEXT := '';
  v_therapist_name  TEXT := '';
  v_status_name     TEXT := '';
  v_date_str        TEXT := '';
  v_time_str        TEXT := '';
  v_type_str        TEXT := '';
BEGIN
  -- Extrai user_id do JWT (operações via SQL Editor sem JWT retornam NULL e são ignoradas)
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

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
      -- paciente
      BEGIN
        IF v_rec.patient_id IS NOT NULL THEN
          SELECT full_name INTO v_patient_name FROM patients WHERE id = v_rec.patient_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_patient_name := ''; END;

      -- terapeuta responsável
      BEGIN
        SELECT name INTO v_therapist_name FROM therapists WHERE id = v_rec.therapist_id;
      EXCEPTION WHEN OTHERS THEN v_therapist_name := ''; END;

      -- status do atendimento
      BEGIN
        IF v_rec.consultation_status_id IS NOT NULL THEN
          SELECT name INTO v_status_name FROM consultation_statuses WHERE id = v_rec.consultation_status_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_status_name := ''; END;

      -- data formatada
      v_date_str := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '—');

      -- hora (HH:MM — primeiros 5 chars de time)
      IF COALESCE(v_rec.time::TEXT, '') <> '' THEN
        v_time_str := left(v_rec.time::TEXT, 5);
      ELSE
        v_time_str := '—';
      END IF;

      -- tipo do evento
      v_type_str := CASE WHEN v_rec.event_type = 'INTERVIEW' THEN 'Entrevista' ELSE 'Atendimento' END;

      -- monta resource_name no formato padronizado
      v_resource_name :=
        COALESCE(NULLIF(v_patient_name,   ''), '—') || ' | ' ||
        COALESCE(NULLIF(v_therapist_name, ''), '—') || ' | ' ||
        v_date_str                                   || ' | ' ||
        v_time_str                                   || ' | ' ||
        v_type_str                                   || ' | ' ||
        COALESCE(NULLIF(v_status_name,    ''), '—');

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
