-- ============================================================
-- 25_audit_log.sql
-- Tabela de auditoria + triggers automáticos para INSERT/UPDATE/DELETE
-- nas tabelas de dados sensíveis
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL,        -- VIEW | INSERT | UPDATE | DELETE
  resource_type TEXT NOT NULL,        -- patient | consultation | medical_record | guardian | ...
  resource_id   UUID,
  resource_name TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx   ON audit_logs(resource_type, resource_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin vê todos os logs
CREATE POLICY "audit_logs: admin vê tudo"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Qualquer usuário autenticado pode inserir (frontend + triggers)
CREATE POLICY "audit_logs: autenticado insere"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Função genérica de log para triggers
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
  v_user_id       UUID;
  v_user_email    TEXT := '';
BEGIN
  -- Determina ação
  IF TG_OP = 'INSERT' THEN
    v_action      := 'INSERT';
    v_resource_id := NEW.id;
    -- Tenta pegar nome do registro (paciente, responsável, etc.)
    v_resource_name := COALESCE(
      NEW.full_name,
      (NEW.date::TEXT),
      ''
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action      := 'UPDATE';
    v_resource_id := NEW.id;
    v_resource_name := COALESCE(
      NEW.full_name,
      (NEW.date::TEXT),
      ''
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action      := 'DELETE';
    v_resource_id := OLD.id;
    v_resource_name := COALESCE(
      OLD.full_name,
      (OLD.date::TEXT),
      ''
    );
  END IF;

  -- Tenta obter o usuário autenticado da sessão atual
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Não loga se não houver usuário (ex: migrations diretas no SQL Editor)
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Busca o e-mail do usuário
  SELECT email INTO v_user_email
  FROM auth.users WHERE id = v_user_id;

  INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
  VALUES (v_user_id, COALESCE(v_user_email, ''), v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name, ''));

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ============================================================
-- Triggers nas tabelas sensíveis
-- ============================================================

-- patients
DROP TRIGGER IF EXISTS trg_audit_patients ON patients;
CREATE TRIGGER trg_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- guardians
DROP TRIGGER IF EXISTS trg_audit_guardians ON guardians;
CREATE TRIGGER trg_audit_guardians
  AFTER INSERT OR UPDATE OR DELETE ON guardians
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- consultations
DROP TRIGGER IF EXISTS trg_audit_consultations ON consultations;
CREATE TRIGGER trg_audit_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- medical_records
DROP TRIGGER IF EXISTS trg_audit_medical_records ON medical_records;
CREATE TRIGGER trg_audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- medical_record_exams
DROP TRIGGER IF EXISTS trg_audit_mr_exams ON medical_record_exams;
CREATE TRIGGER trg_audit_mr_exams
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_exams
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- medical_record_medications
DROP TRIGGER IF EXISTS trg_audit_mr_medications ON medical_record_medications;
CREATE TRIGGER trg_audit_mr_medications
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_medications
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- medical_record_conducts
DROP TRIGGER IF EXISTS trg_audit_mr_conducts ON medical_record_conducts;
CREATE TRIGGER trg_audit_mr_conducts
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_conducts
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
