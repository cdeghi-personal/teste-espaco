-- Migration 94: RPCs de limpeza definitiva de dados transacionais de paciente inativo
-- get_patient_cleanup_summary: retorna contagens por tabela (sem executar nada)
-- cleanup_inactive_patient_data: executa a limpeza após validações de segurança

-- ─── 1. Sumário (somente leitura) ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_patient_cleanup_summary(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_name TEXT;
  v_deleted      BOOLEAN;
  v_cons_ids     UUID[];
  v_mr_ids       UUID[];
  r              jsonb;
BEGIN
  SET LOCAL row_security = off;

  -- Valida existência e inatividade
  SELECT full_name, deleted
    INTO v_patient_name, v_deleted
    FROM patients
   WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Paciente não encontrado.');
  END IF;

  IF NOT v_deleted THEN
    RETURN jsonb_build_object('error', 'O paciente está ativo. A limpeza só é permitida para pacientes inativos (deleted = true).');
  END IF;

  -- Coleta IDs auxiliares
  SELECT ARRAY(SELECT id FROM consultations WHERE patient_id = p_patient_id)
    INTO v_cons_ids;

  SELECT ARRAY(SELECT id FROM medical_records WHERE patient_id = p_patient_id)
    INTO v_mr_ids;

  -- Monta sumário
  r := jsonb_build_object(
    'patient_name',    v_patient_name,
    'patient_id',      p_patient_id,

    'consultations',               (SELECT COUNT(*) FROM consultations         WHERE patient_id = p_patient_id),
    'consultation_therapists',     (SELECT COUNT(*) FROM consultation_therapists
                                     WHERE consultation_id = ANY(v_cons_ids)),
    'consultation_conflicts',      (SELECT COUNT(*) FROM consultation_conflicts
                                     WHERE consultation_id = ANY(v_cons_ids)),
    'consultation_activities',     (SELECT COUNT(*) FROM consultation_activities
                                     WHERE consultation_id = ANY(v_cons_ids)),
    'consultation_series',         (SELECT COUNT(*) FROM consultation_series     WHERE patient_id = p_patient_id),

    'medical_records',             (SELECT COUNT(*) FROM medical_records         WHERE patient_id = p_patient_id),
    'medical_record_exams',        (SELECT COUNT(*) FROM medical_record_exams
                                     WHERE medical_record_id = ANY(v_mr_ids)),
    'medical_record_medications',  (SELECT COUNT(*) FROM medical_record_medications
                                     WHERE medical_record_id = ANY(v_mr_ids)),
    'medical_record_conducts',     (SELECT COUNT(*) FROM medical_record_conducts
                                     WHERE medical_record_id = ANY(v_mr_ids)),

    'prepaid_packages',            (SELECT COUNT(*) FROM patient_prepaid_packages WHERE patient_id = p_patient_id),
    'prepaid_ledger',              (SELECT COUNT(*) FROM patient_prepaid_ledger   WHERE patient_id = p_patient_id),

    'payment_demonstratives',      (SELECT COUNT(*) FROM payment_demonstratives  WHERE patient_id = p_patient_id),
    'payment_invoices',            (SELECT COUNT(*) FROM payment_invoices         WHERE patient_id = p_patient_id),

    'convenio_reports',            (SELECT COUNT(*) FROM convenio_reports         WHERE patient_id = p_patient_id),
    'report_settings',             (SELECT COUNT(*) FROM patient_specialty_report_settings WHERE patient_id = p_patient_id),
    'specialty_payment_history',   (SELECT COUNT(*) FROM patient_specialty_payment_history WHERE patient_id = p_patient_id),

    'patient_guardians',           (SELECT COUNT(*) FROM patient_guardians        WHERE patient_id = p_patient_id),
    'patient_specialties',         (SELECT COUNT(*) FROM patient_specialties      WHERE patient_id = p_patient_id),
    'patient_conditions',          (SELECT COUNT(*) FROM patient_conditions        WHERE patient_id = p_patient_id),
    'patient_involved_therapists', (SELECT COUNT(*) FROM patient_involved_therapists WHERE patient_id = p_patient_id),
    'patient_external_therapists', (SELECT COUNT(*) FROM patient_external_therapists WHERE patient_id = p_patient_id)
  );

  RETURN r;
END;
$$;

GRANT EXECUTE ON FUNCTION get_patient_cleanup_summary(uuid) TO authenticated;


-- ─── 2. Execução da limpeza ───────────────────────────────────────────────────

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
  v_is_admin     BOOLEAN;
  v_cons_ids     UUID[];
  v_mr_ids       UUID[];
BEGIN
  SET LOCAL row_security = off;

  -- 1. Apenas admin pode executar
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
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

  -- ─── Exclusão em ordem de dependência de FK ──────────────────────────────

  -- 3a. Filhas de consultations (algumas podem cascadear, mas explicitamos)
  DELETE FROM consultation_activities    WHERE consultation_id = ANY(v_cons_ids);
  DELETE FROM consultation_conflicts     WHERE consultation_id = ANY(v_cons_ids);
  DELETE FROM consultation_therapists    WHERE consultation_id = ANY(v_cons_ids);

  -- 3b. Pré-pago (ledger antes dos pacotes)
  DELETE FROM patient_prepaid_ledger     WHERE patient_id = p_patient_id;

  -- 3c. Filhas de medical_records
  DELETE FROM medical_record_exams       WHERE medical_record_id = ANY(v_mr_ids);
  DELETE FROM medical_record_medications WHERE medical_record_id = ANY(v_mr_ids);
  DELETE FROM medical_record_conducts    WHERE medical_record_id = ANY(v_mr_ids);

  -- 4. Transacionais principais
  DELETE FROM consultations              WHERE patient_id = p_patient_id;
  DELETE FROM consultation_series        WHERE patient_id = p_patient_id;
  DELETE FROM patient_prepaid_packages   WHERE patient_id = p_patient_id;
  DELETE FROM payment_demonstratives     WHERE patient_id = p_patient_id;
  DELETE FROM payment_invoices           WHERE patient_id = p_patient_id;
  DELETE FROM convenio_reports           WHERE patient_id = p_patient_id;
  DELETE FROM medical_records            WHERE patient_id = p_patient_id;

  -- 5. Relações e configurações do paciente
  DELETE FROM patient_guardians              WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialties            WHERE patient_id = p_patient_id;
  DELETE FROM patient_conditions             WHERE patient_id = p_patient_id;
  DELETE FROM patient_involved_therapists    WHERE patient_id = p_patient_id;
  DELETE FROM patient_external_therapists    WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialty_report_settings   WHERE patient_id = p_patient_id;
  DELETE FROM patient_specialty_payment_history   WHERE patient_id = p_patient_id;

  -- 6. Registra auditoria
  INSERT INTO audit_logs (
    user_id, user_email, user_name, action,
    resource_type, resource_id, resource_name
  )
  SELECT
    auth.uid(),
    u.email,
    COALESCE(
      (SELECT name FROM therapists WHERE user_id = auth.uid() LIMIT 1),
      (u.raw_user_meta_data->>'full_name'),
      (u.raw_user_meta_data->>'name'),
      u.email
    ),
    'DELETE',
    'patients',
    p_patient_id::text,
    v_patient_name || ' | Limpeza de dados transacionais (CLEANUP)'
  FROM auth.users u
  WHERE u.id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'patient_name', v_patient_name,
    'patient_id', p_patient_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_inactive_patient_data(uuid, text) TO authenticated;
