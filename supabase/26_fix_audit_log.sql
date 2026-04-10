-- ============================================================
-- 26_fix_audit_log.sql
-- Reescreve a lógica de auditoria:
-- - Triggers NO BANCO apenas para INSERT/UPDATE/DELETE (sem depender de auth.uid)
-- - auth.uid() via current_setting que é mais confiável no Supabase
-- - VIEW logs vêm apenas do frontend (já implementado)
-- ============================================================

-- Recria a tabela se não existir
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  user_email    TEXT NOT NULL DEFAULT '',
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  resource_name TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx   ON audit_logs(resource_type, resource_id);

-- Habilita RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas se existirem
DROP POLICY IF EXISTS "audit_logs: admin vê tudo" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: autenticado insere" ON audit_logs;

-- Admin vê todos os logs
CREATE POLICY "audit_logs: admin vê tudo"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Qualquer usuário autenticado pode inserir
CREATE POLICY "audit_logs: autenticado insere"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Função de trigger — usa current_setting para obter user_id
-- e não aborta se não houver usuário (ex: operações admin diretas)
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
  v_jwt_claims    TEXT;
BEGIN
  -- Tenta extrair o user_id do JWT via current_setting (funciona no Supabase)
  BEGIN
    v_jwt_claims := current_setting('request.jwt.claims', true);
    IF v_jwt_claims IS NOT NULL AND v_jwt_claims <> '' THEN
      v_user_id := (v_jwt_claims::jsonb ->> 'sub')::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Se não houver usuário (migração direta no SQL Editor), não loga
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Busca email do usuário
  BEGIN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_email := '';
  END;

  -- Determina ação e nome do recurso
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_resource_id := NEW.id;
    v_resource_name := COALESCE(NEW.full_name, NEW.date::TEXT, '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_resource_id := NEW.id;
    v_resource_name := COALESCE(NEW.full_name, NEW.date::TEXT, '');
  ELSE
    v_action := 'DELETE';
    v_resource_id := OLD.id;
    v_resource_name := COALESCE(OLD.full_name, OLD.date::TEXT, '');
  END IF;

  -- Insere o log (ignora erros para não quebrar a operação principal)
  BEGIN
    INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
    VALUES (v_user_id, v_user_email, v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name, ''));
  EXCEPTION WHEN OTHERS THEN
    -- silently ignore
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ============================================================
-- Remove triggers antigos e recria
-- ============================================================
DROP TRIGGER IF EXISTS trg_audit_patients              ON patients;
DROP TRIGGER IF EXISTS trg_audit_guardians             ON guardians;
DROP TRIGGER IF EXISTS trg_audit_consultations         ON consultations;
DROP TRIGGER IF EXISTS trg_audit_medical_records       ON medical_records;
DROP TRIGGER IF EXISTS trg_audit_mr_exams              ON medical_record_exams;
DROP TRIGGER IF EXISTS trg_audit_mr_medications        ON medical_record_medications;
DROP TRIGGER IF EXISTS trg_audit_mr_conducts           ON medical_record_conducts;

CREATE TRIGGER trg_audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_guardians
  AFTER INSERT OR UPDATE OR DELETE ON guardians
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_medical_records
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_mr_exams
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_exams
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_mr_medications
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_medications
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_mr_conducts
  AFTER INSERT OR UPDATE OR DELETE ON medical_record_conducts
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ============================================================
-- Teste: insere um log de teste para verificar funcionamento
-- (pode ser deletado depois)
-- ============================================================
-- INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, resource_name)
-- VALUES (NULL, 'teste@sistema.com', 'INSERT', 'patients', gen_random_uuid(), 'Teste Manual');
