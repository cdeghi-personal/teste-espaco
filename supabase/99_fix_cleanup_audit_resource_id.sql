-- Migration 99: Corrige tipo do resource_id no INSERT de audit_logs
-- dentro de cleanup_inactive_patient_data (uuid, não text)

CREATE OR REPLACE FUNCTION cleanup_inactive_patient_data(
  p_patient_id uuid,
  p_confirm    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name TEXT;
  v_deleted      BOOLEAN;
  v_uid          uuid;
  v_cons_ids     UUID[];
  v_mr_ids       UUID[];
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  -- 1. Apenas admin pode executar
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Apenas administradores podem executar a limpeza de dados.');
  END IF;

  -- 2. Confirmação obrigatória
  IF p_confirm IS DISTINCT FROM 'LIMPAR' THEN
    RETURN jsonb_build_object('error', 'Confirmação inválida. Digite LIMPAR para prosseguir.');
  END IF;

  -- 3. Valida paciente e estado inativo
  SELECT full_name, deleted
    INTO v_patient_name, v_deleted
    FROM patients
   WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Paciente não encontrado.');
  END IF;

  IF NOT v_deleted THEN
    RETURN jsonb_build_object('error', 'Paciente está ativo. Desative o paciente antes de limpar os dados transacionais.');
  END IF;

  -- Coleta IDs auxiliares
  SELECT ARRAY(SELECT id FROM consultations WHERE patient_id = p_patient_id)
    INTO v_cons_ids;

  SELECT ARRAY(SELECT id FROM medical_records WHERE patient_id = p_patient_id)
    INTO v_mr_ids;

  -- Exclusão em ordem de dependência de FK
  DELETE FROM consultation_activities    WHERE consultation_id = ANY(v_cons_ids);
  DELETE FROM consultation_conflicts     WHERE consultation_id = ANY(v_cons_ids);
  DELETE FROM consultation_therapists    WHERE consultation_id = ANY(v_cons_ids);
  DELETE FROM patient_prepaid_ledger     WHERE patient_id = p_patient_id;
  DELETE FROM medical_record_exams       WHERE medical_record_id = ANY(v_mr_ids);
  DELETE FROM medical_record_medications WHERE medical_record_id = ANY(v_mr_ids);
  DELETE FROM medical_record_conducts    WHERE medical_record_id = ANY(v_mr_ids);
  DELETE FROM consultations              WHERE patient_id = p_patient_id;
  DELETE FROM consultation_series        WHERE patient_id = p_patient_id;
  DELETE FROM patient_prepaid_packages   WHERE patient_id = p_patient_id;
  DELETE FROM payment_demonstratives     WHERE patient_id = p_patient_id;
  DELETE FROM payment_invoices           WHERE patient_id = p_patient_id;
  DELETE FROM convenio_reports           WHERE patient_id = p_patient_id;
  DELETE FROM medical_records            WHERE patient_id = p_patient_id;
  DELETE FROM patient_guardians              WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialties            WHERE patient_id = p_patient_id;
  DELETE FROM patient_conditions             WHERE patient_id = p_patient_id;
  DELETE FROM patient_involved_therapists    WHERE patient_id = p_patient_id;
  DELETE FROM patient_external_therapists    WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialty_report_settings   WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialty_payment_history   WHERE patient_id = p_patient_id;

  -- Registra auditoria (resource_id é uuid — sem cast para text)
  INSERT INTO audit_logs (
    user_id, user_email, user_name, action,
    resource_type, resource_id, resource_name
  )
  SELECT
    v_uid,
    u.email,
    COALESCE(
      (SELECT name FROM therapists WHERE user_id = v_uid LIMIT 1),
      (u.raw_user_meta_data->>'full_name'),
      (u.raw_user_meta_data->>'name'),
      u.email
    ),
    'DELETE',
    'patients',
    p_patient_id,
    v_patient_name || ' | Limpeza de dados transacionais (CLEANUP)'
  FROM auth.users u
  WHERE u.id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'patient_name', v_patient_name,
    'patient_id', p_patient_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_inactive_patient_data(uuid, text) TO authenticated;
