-- 56_audit_history_table.sql
-- Implementa retenção em dois níveis para o log de auditoria:
--   audit_logs         → últimos 90 dias  (acesso pelo painel)
--   audit_logs_history → de 90 dias a 1 ano (arquivo; mesmo schema)
-- Cron diário (03:00 UTC):
--   1) Move audit_logs com mais de 90 dias → audit_logs_history
--   2) Deleta audit_logs_history com mais de 1 ano

-- ── Tabela de histórico ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs_history (
  id            UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID,
  user_email    TEXT      NOT NULL DEFAULT '',
  user_name     TEXT      NOT NULL DEFAULT '',
  action        TEXT      NOT NULL,
  resource_type TEXT      NOT NULL DEFAULT '',
  resource_id   UUID,
  resource_name TEXT      NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at   TIMESTAMPTZ NOT NULL DEFAULT now()  -- quando foi movido para cá
);

ALTER TABLE audit_logs_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_history_admin_select" ON audit_logs_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT ON audit_logs_history TO authenticated;

-- ── Função de manutenção ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION maintain_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- 1) Move registros com mais de 90 dias para o histórico
  INSERT INTO audit_logs_history
    (id, user_id, user_email, user_name, action, resource_type, resource_id, resource_name, created_at)
  SELECT
    id, user_id, user_email, user_name, action, resource_type, resource_id, resource_name, created_at
  FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- 2) Purge do histórico com mais de 1 ano
  DELETE FROM audit_logs_history
  WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- ── Cron: substitui o job anterior ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('cleanup-audit-logs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-audit-logs'
);

SELECT cron.unschedule('maintain-audit-logs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'maintain-audit-logs'
);

SELECT cron.schedule(
  'maintain-audit-logs',
  '0 3 * * *',
  $$SELECT public.maintain_audit_logs()$$
);